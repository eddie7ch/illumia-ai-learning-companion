import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MAX_FRAMES = 4;
const MAX_FRAME_LENGTH = 900_000;
const MAX_DURATION_SECONDS = 12 * 60 * 60;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const HOURLY_LIMIT = 15;
const DAILY_LIMIT = 40;

interface SessionSummary {
  summary: string;
  observedWork: string[];
  suggestedActivity: string | null;
  privacyNotes: string[];
}

function sanitizeTimeline(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-50).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const raw = item as Record<string, unknown>;
    if (typeof raw.summary !== 'string' || typeof raw.observedAt !== 'string') return [];
    return [{
      id: typeof raw.id === 'string' ? raw.id.slice(0, 100) : crypto.randomUUID(),
      observedAt: raw.observedAt.slice(0, 50),
      summary: raw.summary.slice(0, 500),
      action: typeof raw.action === 'string' ? raw.action.slice(0, 300) : raw.summary.slice(0, 300),
      activityId: typeof raw.activityId === 'string' ? raw.activityId.slice(0, 100) : null,
      activityTitle: typeof raw.activityTitle === 'string' ? raw.activityTitle.slice(0, 300) : null,
      confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0,
      evidence: typeof raw.evidence === 'string' ? raw.evidence.slice(0, 500) : '',
      progressEvidence: typeof raw.progressEvidence === 'string' ? raw.progressEvidence.slice(0, 500) : '',
      suggestedMinutes: typeof raw.suggestedMinutes === 'number' ? Math.max(0, Math.min(5, Math.round(raw.suggestedMinutes))) : 0,
      confusionDetected: raw.confusionDetected === true,
      repeatedAttemptDetected: raw.repeatedAttemptDetected === true,
      question: typeof raw.question === 'string' ? raw.question.slice(0, 300) : null,
    }];
  });
}

function sanitizeSummary(value: unknown): SessionSummary | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.summary !== 'string') return null;
  return {
    summary: raw.summary.slice(0, 1000),
    observedWork: Array.isArray(raw.observedWork)
      ? raw.observedWork.filter((item): item is string => typeof item === 'string').slice(0, 6).map((item) => item.slice(0, 300))
      : [],
    suggestedActivity: typeof raw.suggestedActivity === 'string' ? raw.suggestedActivity.slice(0, 300) : null,
    privacyNotes: Array.isArray(raw.privacyNotes)
      ? raw.privacyNotes.filter((item): item is string => typeof item === 'string').slice(0, 4).map((item) => item.slice(0, 300))
      : [],
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !openAiKey) {
    res.status(500).json({ error: 'Server is missing required configuration.' });
    return;
  }

  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header.' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }
  const userId = userData.user.id;

  const { durationSeconds, frames, observations, storagePath, sizeBytes } = req.body ?? {};
  if (
    typeof durationSeconds !== 'number' ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 0 ||
    durationSeconds > MAX_DURATION_SECONDS ||
    !Array.isArray(frames) ||
    frames.length === 0 ||
    frames.length > MAX_FRAMES
  ) {
    res.status(400).json({ error: 'Missing or invalid session data.' });
    return;
  }
  let validStoragePath: string | null = null;
  if (storagePath !== undefined) {
    if (
      typeof storagePath !== 'string' ||
      storagePath.length > 300 ||
      !storagePath.startsWith(`${userId}/`) ||
      !/^[a-zA-Z0-9/_-]+\.webm$/.test(storagePath)
    ) {
      res.status(400).json({ error: 'Invalid storage path.' });
      return;
    }
    validStoragePath = storagePath;
  }
  const validSizeBytes =
    typeof sizeBytes === 'number' && Number.isFinite(sizeBytes) && sizeBytes >= 0
      ? Math.min(Math.round(sizeBytes), MAX_UPLOAD_BYTES)
      : 0;
  const validFrames = frames.filter(
    (frame): frame is string =>
      typeof frame === 'string' && frame.startsWith('data:image/jpeg;base64,') && frame.length <= MAX_FRAME_LENGTH,
  );
  if (validFrames.length !== frames.length) {
    res.status(400).json({ error: 'One or more frames are invalid or too large.' });
    return;
  }
  const timeline = sanitizeTimeline(observations);

  const now = Date.now();
  const [hourlyResult, dailyResult] = await Promise.all([
    supabase.from('screen_recordings').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 60 * 60 * 1000).toISOString()),
    supabase.from('screen_recordings').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  if (hourlyResult.error || dailyResult.error) {
    res.status(500).json({ error: 'Learning diary storage is not configured.' });
    return;
  }
  if ((hourlyResult.count ?? 0) >= HOURLY_LIMIT || (dailyResult.count ?? 0) >= DAILY_LIMIT) {
    res.status(429).json({ error: 'Learning diary limit reached. Please try again later.' });
    return;
  }

  const imageContent = validFrames.map((url) => ({ type: 'image_url' as const, image_url: { url, detail: 'low' } }));
  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Analyze sampled frames from a learner-approved screen session that was never recorded to video. ' +
              'Describe only visible learning work, as a short diary entry the learner can look back on later. ' +
              'Do not identify people, transcribe secrets, infer sensitive traits, or claim continuous observation. ' +
              'Respond only as JSON: {"summary":string,"observedWork":string[],"suggestedActivity":string|null,"privacyNotes":string[]}.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Summarize what was learned in this session from these sampled frames. Use this sanitized live ' +
                  `observation timeline as additional context: ${JSON.stringify(timeline).slice(0, 15000)}`,
              },
              ...imageContent,
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      res.status(502).json({ error: 'The AI summary service failed.' });
      return;
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    const summary = content ? sanitizeSummary(JSON.parse(content)) : null;
    if (!summary) {
      res.status(502).json({ error: 'The AI summary service returned an unexpected response.' });
      return;
    }

    const savedAnalysis = { ...summary, timeline };
    const { data: inserted, error: insertError } = await supabase
      .from('screen_recordings')
      .insert({
        user_id: userId,
        storage_path: validStoragePath,
        duration_seconds: Math.max(0, Math.round(durationSeconds)),
        size_bytes: validSizeBytes,
        status: validStoragePath ? 'analyzed' : 'summary_only',
        consent_given: true,
        analysis: savedAnalysis,
        analyzed_at: new Date().toISOString(),
      })
      .select('id, created_at')
      .single();
    if (insertError || !inserted) {
      if (validStoragePath) await supabase.storage.from('screen-recordings').remove([validStoragePath]);
      res.status(500).json({ error: 'The summary was generated but could not be saved.' });
      return;
    }
    res.status(200).json({ id: inserted.id, createdAt: inserted.created_at, analysis: savedAnalysis });
  } catch {
    res.status(502).json({ error: 'Could not generate the session summary.' });
  }
}
