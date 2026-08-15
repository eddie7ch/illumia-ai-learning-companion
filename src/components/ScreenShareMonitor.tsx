import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Brain, Check, Download, MonitorUp, Pause, PictureInPicture2, Play, Square, Trash2, Upload } from 'lucide-react';
import type { Activity } from '../types';
import { hasMeaningfulVisualChange } from '../utils/visualChange';
import FacePresenceMonitor, { type FacePresence } from './FacePresenceMonitor';
import { useStudySession } from '../context/useStudySession';
import { useScreenObservation } from '../context/useScreenObservation';
import {
  deleteScreenRecording,
  listDiaryEntries,
  observeScreen,
  saveSessionSummary,
  uploadRecordingVideo,
  type DiaryEntry,
  type ScreenObservation,
} from '../services/screenRecordingService';

type RecordingState = 'idle' | 'requesting' | 'recording' | 'ready' | 'error';

interface ScreenShareMonitorProps {
  activities: Activity[];
  onConfirmProgress?: (activityId: string, additionalMinutes: number) => void | Promise<void>;
}

interface CapturedFrame {
  dataUrl: string;
  fingerprint: number[];
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

export default function ScreenShareMonitor({ activities, onConfirmProgress }: ScreenShareMonitorProps) {
  const { phase, startSession, setExternalAway } = useStudySession();
  const { publishObservation, setScreenAnalysisActive, clearObservation } = useScreenObservation();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [hasConsent, setHasConsent] = useState(false);
  const [liveObservationEnabled, setLiveObservationEnabled] = useState(true);
  const [questionsEnabled, setQuestionsEnabled] = useState(true);
  const [facePresence, setFacePresence] = useState<FacePresence>('off');
  const [isFloatingIndicator, setIsFloatingIndicator] = useState(false);
  const [isObserving, setIsObserving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [skippedDuplicateCount, setSkippedDuplicateCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recording, setRecording] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [observations, setObservations] = useState<ScreenObservation[]>([]);
  const [confirmedObservationIds, setConfirmedObservationIds] = useState<Set<string>>(new Set());
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [isLoadingDiary, setIsLoadingDiary] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'local' | 'upload' | null>(null);
  const [hasSavedToDiary, setHasSavedToDiary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [observerError, setObserverError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const framesRef = useRef<string[]>([]);
  const observationsRef = useRef<ScreenObservation[]>([]);
  const activitiesRef = useRef(activities);
  const questionsEnabledRef = useRef(true);
  const observationInFlightRef = useRef(false);
  const scheduledObservationRef = useRef<() => void>(() => {});
  const observationAbortRef = useRef<AbortController | null>(null);
  const previousFingerprintRef = useRef<number[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedAtRef = useRef(0);
  const durationRef = useRef(0);
  const stoppingRef = useRef(false);

  useEffect(() => {
    activitiesRef.current = activities;
  }, [activities]);

  useEffect(() => {
    questionsEnabledRef.current = questionsEnabled;
  }, [questionsEnabled]);

  useEffect(() => () => setExternalAway(false), [setExternalAway]);

  useEffect(() => {
    const active = recordingState === 'recording' && liveObservationEnabled && facePresence !== 'away';
    setScreenAnalysisActive(active);
    return () => setScreenAnalysisActive(false);
  }, [recordingState, liveObservationEnabled, facePresence, setScreenAnalysisActive]);

  useEffect(() => {
    let cancelled = false;
    listDiaryEntries()
      .then((entries) => {
        if (!cancelled) setDiaryEntries(entries);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingDiary(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const captureFrame = (archive: boolean): CapturedFrame | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const width = Math.min(640, video.videoWidth || 640);
    const height = Math.max(1, Math.round(width * ((video.videoHeight || 360) / (video.videoWidth || 640))));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    if (archive && framesRef.current.length < 4) framesRef.current.push(dataUrl);

    const fingerprintCanvas = document.createElement('canvas');
    fingerprintCanvas.width = 16;
    fingerprintCanvas.height = 9;
    const fingerprintContext = fingerprintCanvas.getContext('2d');
    fingerprintContext?.drawImage(video, 0, 0, 16, 9);
    const pixels = fingerprintContext && typeof fingerprintContext.getImageData === 'function'
      ? fingerprintContext.getImageData(0, 0, 16, 9).data
      : null;
    const fingerprint = pixels
      ? Array.from({ length: 144 }, (_, index) => {
          const offset = index * 4;
          return Math.round((pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3);
        })
      : Array.from({ length: 144 }, (_, index) => dataUrl.charCodeAt(index % dataUrl.length));
    return { dataUrl, fingerprint };
  };

  const runObservation = async (force = false) => {
    if (observationInFlightRef.current || recorderRef.current?.state !== 'recording' || facePresence === 'away') return;
    const captured = captureFrame(framesRef.current.length < 4);
    if (!captured) return;
    if (!force && !hasMeaningfulVisualChange(previousFingerprintRef.current, captured.fingerprint)) {
      setSkippedDuplicateCount((count) => count + 1);
      return;
    }
    previousFingerprintRef.current = captured.fingerprint;
    observationInFlightRef.current = true;
    const controller = new AbortController();
    observationAbortRef.current = controller;
    setIsObserving(true);
    setObserverError(null);
    try {
      const observation = await observeScreen(
        captured.dataUrl,
        activitiesRef.current,
        observationsRef.current,
        questionsEnabledRef.current,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      observationsRef.current = [...observationsRef.current, observation];
      setObservations(observationsRef.current);
      publishObservation({
        id: observation.id,
        observedAt: observation.observedAt,
        summary: observation.summary,
        action: observation.action,
        evidence: observation.evidence,
        confidence: observation.confidence,
        activityTitle: observation.activityTitle,
      });
    } catch (caughtError) {
      if (!controller.signal.aborted) {
        setObserverError(caughtError instanceof Error ? caughtError.message : 'Live observation failed.');
      }
    } finally {
      observationInFlightRef.current = false;
      observationAbortRef.current = null;
      setIsObserving(false);
    }
  };

  scheduledObservationRef.current = () => {
    void runObservation();
  };

  const stopRecording = () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    captureFrame(true);
    observationAbortRef.current?.abort();
    observationAbortRef.current = null;
    observationInFlightRef.current = false;
    setIsObserving(false);
    setScreenAnalysisActive(false);
    clearObservation();
    durationRef.current = Date.now() - startedAtRef.current;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture().catch(() => undefined);
      setIsFloatingIndicator(false);
    }
  };

  const toggleFloatingIndicator = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled || typeof video.requestPictureInPicture !== 'function') {
      setObserverError('Floating recording status is not supported in this browser.');
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsFloatingIndicator(false);
      } else {
        await video.requestPictureInPicture();
        setIsFloatingIndicator(true);
        video.addEventListener('leavepictureinpicture', () => setIsFloatingIndicator(false), { once: true });
      }
    } catch {
      setObserverError('The floating recording indicator could not be opened.');
    }
  };

  const toggleLiveObservation = () => {
    if (liveObservationEnabled) {
      observationAbortRef.current?.abort();
      observationAbortRef.current = null;
      observationInFlightRef.current = false;
      setIsObserving(false);
    }
    setLiveObservationEnabled((enabled) => !enabled);
  };

  const handlePresenceChange = (presence: FacePresence) => {
    setFacePresence(presence);
    setExternalAway(presence === 'away');
    if (presence === 'away') {
      observationAbortRef.current?.abort();
      observationAbortRef.current = null;
      observationInFlightRef.current = false;
      setIsObserving(false);
    }
  };

  useEffect(() => {
    if (recordingState !== 'recording') return;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    return () => window.clearInterval(timer);
  }, [recordingState]);

  useEffect(() => {
    if (recordingState !== 'recording' || !liveObservationEnabled || facePresence === 'away') return;
    const timer = window.setInterval(() => scheduledObservationRef.current(), 12_000);
    return () => window.clearInterval(timer);
  }, [recordingState, liveObservationEnabled, facePresence]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    observationAbortRef.current?.abort();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === 'undefined') {
      setError('Screen recording is not available in this embedded browser. Open this local URL in Chrome or Edge.');
      setRecordingState('error');
      return;
    }
    if (!hasConsent) {
      setError('Confirm your consent before recording.');
      return;
    }

    if (phase !== 'active') startSession();

    setRecordingState('requesting');
    setError(null);
    setObserverError(null);
    setSummaryError(null);
    clearObservation();
    setAnalysisMode(null);
    setHasSavedToDiary(false);
    setObservations([]);
    observationsRef.current = [];
    setConfirmedObservationIds(new Set());
    setSkippedDuplicateCount(0);
    previousFingerprintRef.current = null;
    framesRef.current = [];
    chunksRef.current = [];
    stoppingRef.current = false;
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingUrl(null);
    setRecording(null);

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('No screen was selected.');
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.addEventListener('dataavailable', (event) => {
        const data = (event as BlobEvent).data;
        if (data.size > 0) chunksRef.current.push(data);
      });
      recorder.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        setRecording(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        setElapsedMs(durationRef.current);
        setRecordingState('ready');
        stoppingRef.current = false;
      }, { once: true });

      streamRef.current = stream;
      recorderRef.current = recorder;
      videoTrack.addEventListener('ended', stopRecording, { once: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      startedAtRef.current = Date.now();
      durationRef.current = 0;
      setElapsedMs(0);
      recorder.start(1000);
      setRecordingState('recording');
    } catch (caughtError) {
      streamRef.current = null;
      setError(
        caughtError instanceof DOMException && caughtError.name === 'NotAllowedError'
          ? 'Screen recording was cancelled or blocked.'
          : caughtError instanceof Error
            ? caughtError.message
            : 'Screen recording could not start.',
      );
      setRecordingState('error');
    }
  };

  const confirmProgress = async (observation: ScreenObservation) => {
    if (!observation.activityId || observation.suggestedMinutes < 1 || !onConfirmProgress) return;
    try {
      await onConfirmProgress(observation.activityId, observation.suggestedMinutes);
      setConfirmedObservationIds((current) => new Set(current).add(observation.id));
    } catch {
      setObserverError('Progress could not be updated. Please try again.');
    }
  };

  /**
   * Saves a short AI summary of what was learned to the diary, from the sampled preview frames and
   * the live observation timeline. In 'upload' mode the full recording is also uploaded to private
   * storage first; in 'local' mode the video itself is never uploaded or stored.
   */
  const saveToLearningDiary = async (mode: 'local' | 'upload') => {
    setSummaryError(null);
    if (framesRef.current.length === 0) {
      setSummaryError('No preview frames were captured, so a diary summary could not be saved.');
      return;
    }
    setAnalysisMode(mode);
    setIsSummarizing(true);
    try {
      const video = mode === 'upload' && recording ? await uploadRecordingVideo(recording) : undefined;
      const entry = await saveSessionSummary(
        Math.round(durationRef.current / 1000),
        framesRef.current,
        observationsRef.current,
        video,
      );
      setDiaryEntries((current) => [entry, ...current]);
      setHasSavedToDiary(true);
    } catch (caughtError) {
      setSummaryError(caughtError instanceof Error ? caughtError.message : 'The session could not be summarized.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const discardRecording = () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecording(null);
    setRecordingUrl(null);
    setObservations([]);
    observationsRef.current = [];
    framesRef.current = [];
    previousFingerprintRef.current = null;
    setConfirmedObservationIds(new Set());
    setSkippedDuplicateCount(0);
    setElapsedMs(0);
    setSummaryError(null);
    setAnalysisMode(null);
    setHasSavedToDiary(false);
    setRecordingState('idle');
  };

  const removeDiaryEntry = async (entryId: string) => {
    setIsDeleting(true);
    setSummaryError(null);
    try {
      await deleteScreenRecording(entryId);
      setDiaryEntries((current) => current.filter((entry) => entry.id !== entryId));
    } catch (caughtError) {
      setSummaryError(caughtError instanceof Error ? caughtError.message : 'The diary entry could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isBusy = recordingState === 'requesting' || isSummarizing;

  return (
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Screen learning observer</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Analyze one reduced frame every 12 seconds while recording. When you stop, choose whether to save an AI
            summary to your learning diary — with the video kept local, or with the full recording uploaded too.
            This also starts your study session timer above.
          </p>
        </div>
        {recordingState === 'recording' ? (
          <button type="button" onClick={stopRecording} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">
            <Square className="h-4 w-4" aria-hidden="true" /> Stop recording
          </button>
        ) : (
          <button type="button" onClick={startRecording} disabled={!hasConsent || isBusy} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            <MonitorUp className="h-4 w-4" aria-hidden="true" />
            {recordingState === 'requesting' ? 'Waiting for permission...' : 'Choose screen and record'}
          </button>
        )}
      </div>

      <label className="mt-3 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={hasConsent} onChange={(event) => setHasConsent(event.target.checked)} disabled={recordingState === 'recording' || isBusy} className="mt-0.5 h-4 w-4 accent-indigo-600" />
        I consent to recording my selected source on this device. If I choose to analyze the session afterward,
        sampled frames are sent to OpenAI for a short learning-diary summary, and the full video is uploaded only if
        I explicitly choose that option.
      </label>

      <FacePresenceMonitor onPresenceChange={handlePresenceChange} />

      {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {observerError && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-400">{observerError}</p>}
      {facePresence === 'away' && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-400">AI screen analysis is paused while you are away.</p>}

      <div className={recordingState === 'recording' ? 'mt-4' : 'hidden'}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase text-rose-600 dark:text-rose-400">Recording now</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={toggleLiveObservation} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
              {liveObservationEnabled ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
              {liveObservationEnabled ? 'Pause AI analysis' : 'Resume AI analysis'}
            </button>
            <button type="button" onClick={() => setQuestionsEnabled((enabled) => !enabled)} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
              {questionsEnabled ? 'Disable questions' : 'Enable questions'}
            </button>
            <button type="button" onClick={toggleFloatingIndicator} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200">
              <PictureInPicture2 className="h-3.5 w-3.5" aria-hidden="true" />
              {isFloatingIndicator ? 'Close floating indicator' : 'Float recording indicator'}
            </button>
            <button type="button" onClick={() => runObservation(true)} disabled={isObserving || facePresence === 'away'} className="flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-200 disabled:opacity-60 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Brain className="h-3.5 w-3.5" aria-hidden="true" /> {isObserving ? 'AI observing...' : 'Analyze now'}
            </button>
            <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatElapsed(elapsedMs)}</span>
          </div>
        </div>
        <video ref={videoRef} autoPlay muted playsInline onLoadedData={() => captureFrame(true)} aria-label="Shared screen preview" className="aspect-video w-full rounded-lg bg-slate-950 object-contain" />
        {skippedDuplicateCount > 0 && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Skipped {skippedDuplicateCount} unchanged frame{skippedDuplicateCount === 1 ? '' : 's'}.</p>}
      </div>

      {observations.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live observation timeline</h4>
          <ol className="mt-2 space-y-2">
            {observations.map((observation) => {
              const confirmed = confirmedObservationIds.has(observation.id);
              return (
                <li key={observation.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400">{new Date(observation.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{observation.summary}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300"><strong>Visible action:</strong> {observation.action}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Evidence: {observation.evidence}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Progress evidence: {observation.progressEvidence}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">{Math.round(observation.confidence * 100)}% confidence</span>
                  </div>
                  {(observation.confusionDetected || observation.repeatedAttemptDetected) && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                      {observation.confusionDetected ? 'Possible confusion detected' : 'Possible repeated attempt detected'}
                    </p>
                  )}
                  {observation.question && <p className="mt-2 rounded-md bg-indigo-50 p-2 text-sm text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200"><strong>AI question:</strong> {observation.question}</p>}
                  {observation.activityId && observation.activityTitle && observation.suggestedMinutes > 0 && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>Suggested: add {observation.suggestedMinutes} min to {observation.activityTitle}</span>
                      <button type="button" onClick={() => confirmProgress(observation)} disabled={confirmed || !onConfirmProgress} className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> {confirmed ? 'Progress added' : 'Confirm progress'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {recording && recordingUrl && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-700 dark:text-slate-200">Recording ready ({formatElapsed(elapsedMs)}, {(recording.size / 1024 / 1024).toFixed(1)} MB)</p>
            <div className="flex flex-wrap gap-2">
              <a href={recordingUrl} download={`learning-session-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`} className="flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100">
                <Download className="h-4 w-4" aria-hidden="true" /> Download locally
              </a>
              <button type="button" onClick={discardRecording} disabled={isSummarizing} className="flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-200 disabled:opacity-60 dark:bg-rose-500/10 dark:text-rose-300">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Discard recording
              </button>
            </div>
          </div>

          {!hasSavedToDiary && (
            <div className="mt-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Want an AI summary of what you learned? Choose whether to keep the video local, or upload the full
                recording too.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => void saveToLearningDiary('local')} disabled={isSummarizing} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <Brain className="h-4 w-4" aria-hidden="true" />
                  {isSummarizing && analysisMode === 'local' ? 'Analyzing...' : 'Analyze (video stays local)'}
                </button>
                <button type="button" onClick={() => void saveToLearningDiary('upload')} disabled={isSummarizing} className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-600 dark:hover:bg-slate-500">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {isSummarizing && analysisMode === 'upload' ? 'Uploading and analyzing...' : 'Analyze + upload full video'}
                </button>
              </div>
            </div>
          )}
          {hasSavedToDiary && (
            <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
              Saved to your learning diary below{analysisMode === 'upload' ? ' (full video uploaded)' : ' (video stayed local)'}.
            </p>
          )}
          {summaryError && (
            <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
              {summaryError}{' '}
              <button type="button" onClick={() => void saveToLearningDiary(analysisMode ?? 'local')} className="font-medium underline">
                Try again
              </button>
            </p>
          )}
        </div>
      )}

      {(isLoadingDiary || diaryEntries.length > 0) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Learning diary</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            A short AI summary is saved whenever you choose to analyze a session. If you also chose to upload the
            full video, it's stored securely in your account — otherwise the video is never uploaded or stored.
          </p>
          {isLoadingDiary ? (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Loading diary...</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {diaryEntries.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">
                        {new Date(entry.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {formatElapsed(entry.durationSeconds * 1000)}
                        {entry.hasStoredVideo && (
                          <span className="ml-2 rounded-full bg-emerald-200 px-1.5 py-0.5 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                            Full video stored
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100">{entry.analysis.summary}</p>
                      {entry.analysis.observedWork.length > 0 && (
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-emerald-800 dark:text-emerald-200">
                          {entry.analysis.observedWork.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      )}
                      {entry.analysis.suggestedActivity && (
                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">Suggested next: {entry.analysis.suggestedActivity}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDiaryEntry(entry.id)}
                      disabled={isDeleting}
                      aria-label="Delete diary entry"
                      className="rounded-md p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}