import { supabase } from './supabaseClient';
import type { Activity } from '../types';

export interface ScreenObservation {
  id: string;
  observedAt: string;
  summary: string;
  action: string;
  activityId: string | null;
  activityTitle: string | null;
  confidence: number;
  evidence: string;
  progressEvidence: string;
  suggestedMinutes: number;
  confusionDetected: boolean;
  repeatedAttemptDetected: boolean;
  question: string | null;
}

export interface ScreenRecordingAnalysis {
  summary: string;
  observedWork: string[];
  suggestedActivity: string | null;
  privacyNotes: string[];
  timeline?: ScreenObservation[];
}

export interface DiaryEntry {
  id: string;
  createdAt: string;
  durationSeconds: number;
  analysis: ScreenRecordingAnalysis;
  hasStoredVideo: boolean;
}

export interface UploadedVideo {
  storagePath: string;
  sizeBytes: number;
}

const BUCKET = 'screen-recordings';
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

async function requireSession() {
  if (!supabase) throw new Error('Cloud saving requires Supabase configuration.');
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sign in before saving a session.');
  return { client: supabase, session: data.session };
}

/** Uploads the full recorded video to private storage, for learners who opt into keeping a copy. */
export async function uploadRecordingVideo(video: Blob): Promise<UploadedVideo> {
  if (video.size > MAX_UPLOAD_BYTES) throw new Error('Recording is too large to upload (max 100 MB).');
  const { client, session } = await requireSession();
  const storagePath = `${session.user.id}/${crypto.randomUUID()}.webm`;
  const { error } = await client.storage.from(BUCKET).upload(storagePath, video, { contentType: 'video/webm' });
  if (error) throw error;
  return { storagePath, sizeBytes: video.size };
}

/**
 * Summarizes a finished screen-share session from a few sampled frames and the live observation
 * timeline, and saves that short text summary to the learner's diary. Pass `video` only when the
 * learner opted to also upload the full recording (via uploadRecordingVideo) - otherwise the video
 * itself is never uploaded or stored.
 */
export async function saveSessionSummary(
  durationSeconds: number,
  frames: string[],
  observations: ScreenObservation[] = [],
  video?: UploadedVideo,
): Promise<DiaryEntry> {
  if (frames.length === 0) throw new Error('No preview frames were captured to summarize.');
  const { session } = await requireSession();
  const response = await fetch('/api/save-session-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      durationSeconds,
      frames: frames.slice(0, 4),
      observations: observations.slice(-50),
      storagePath: video?.storagePath,
      sizeBytes: video?.sizeBytes,
    }),
  });
  const result = (await response.json().catch(() => null)) as
    | { id?: string; createdAt?: string; analysis?: ScreenRecordingAnalysis; error?: string }
    | null;
  if (!response.ok || !result?.id || !result?.analysis) {
    throw new Error(result?.error || 'The session could not be summarized.');
  }
  return {
    id: result.id,
    createdAt: result.createdAt || new Date().toISOString(),
    durationSeconds,
    analysis: result.analysis,
    hasStoredVideo: Boolean(video),
  };
}

/** Lists the learner's past diary entries (summaries only), most recent first. */
export async function listDiaryEntries(): Promise<DiaryEntry[]> {
  const { client, session } = await requireSession();
  const { data, error } = await client
    .from('screen_recordings')
    .select('id, created_at, duration_seconds, analysis, storage_path')
    .eq('user_id', session.user.id)
    .not('analysis', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    createdAt: row.created_at as string,
    durationSeconds: row.duration_seconds as number,
    analysis: row.analysis as ScreenRecordingAnalysis,
    hasStoredVideo: Boolean(row.storage_path),
  }));
}

export async function observeScreen(
  frame: string,
  activities: Activity[],
  previousObservations: ScreenObservation[],
  questionsEnabled: boolean,
  signal?: AbortSignal,
): Promise<ScreenObservation> {
  const { session } = await requireSession();
  const response = await fetch('/api/observe-screen', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      frame,
      activities: activities.map(({ id, title, topic, type, status }) => ({ id, title, topic, type, status })),
      previousObservations: previousObservations.slice(-3).map(({ summary, activityTitle, confusionDetected }) => ({
        summary,
        activityTitle,
        confusionDetected,
      })),
      questionsEnabled,
    }),
    signal,
  });
  const result = (await response.json().catch(() => null)) as { observation?: ScreenObservation; error?: string } | null;
  if (!response.ok || !result?.observation) {
    throw new Error(result?.error || 'The screen could not be observed.');
  }
  return result.observation;
}

export async function deleteScreenRecording(recordingId: string): Promise<void> {
  const { client, session } = await requireSession();
  const { data, error: fetchError } = await client
    .from('screen_recordings')
    .select('storage_path')
    .eq('id', recordingId)
    .eq('user_id', session.user.id)
    .single();
  if (fetchError || !data) throw fetchError ?? new Error('Recording not found.');

  if (data.storage_path) {
    const { error: storageError } = await client.storage.from(BUCKET).remove([data.storage_path]);
    if (storageError) throw storageError;
  }
  const { error: rowError } = await client
    .from('screen_recordings')
    .delete()
    .eq('id', recordingId)
    .eq('user_id', session.user.id);
  if (rowError) throw rowError;
}