import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';
import type { FaceDetector } from '@mediapipe/tasks-vision';

export type FacePresence = 'off' | 'present' | 'away';

interface FacePresenceMonitorProps {
  onPresenceChange: (presence: FacePresence) => void;
}

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';
const AWAY_AFTER_MS = 10_000;

export default function FacePresenceMonitor({ onPresenceChange }: FacePresenceMonitorProps) {
  const [status, setStatus] = useState<'off' | 'loading' | 'looking' | 'present' | 'away' | 'error'>('off');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastFaceAtRef = useRef(0);
  const reportedPresenceRef = useRef<FacePresence>('off');

  const reportPresence = (presence: FacePresence) => {
    if (reportedPresenceRef.current === presence) return;
    reportedPresenceRef.current = presence;
    onPresenceChange(presence);
  };

  const stopMonitoring = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    detectorRef.current?.close();
    detectorRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('off');
    reportPresence('off');
  };

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    detectorRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startMonitoring = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera presence detection is not supported in this browser.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.6,
      });
      detectorRef.current = detector;
      lastFaceAtRef.current = Date.now();
      setStatus('looking');
      timerRef.current = window.setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !detectorRef.current) return;
        const result = detectorRef.current.detectForVideo(video, performance.now());
        if (result.detections.length > 0) {
          lastFaceAtRef.current = Date.now();
          setStatus('present');
          reportPresence('present');
        } else if (Date.now() - lastFaceAtRef.current >= AWAY_AFTER_MS) {
          setStatus('away');
          reportPresence('away');
        } else {
          setStatus('looking');
        }
      }, 1500);
    } catch (caughtError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError(
        caughtError instanceof DOMException && caughtError.name === 'NotAllowedError'
          ? 'Camera permission was cancelled or blocked.'
          : 'Face presence detection could not start.',
      );
      setStatus('error');
      reportPresence('off');
    }
  };

  const isMonitoring = status === 'looking' || status === 'present' || status === 'away';

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Local camera presence</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Detects only whether a face is present. Camera frames stay in this browser and are never recorded or uploaded.
          </p>
        </div>
        {isMonitoring ? (
          <button type="button" onClick={stopMonitoring} className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700">
            <CameraOff className="h-3.5 w-3.5" aria-hidden="true" /> Stop camera
          </button>
        ) : (
          <button type="button" onClick={startMonitoring} disabled={status === 'loading'} className="flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-1 text-xs text-indigo-700 disabled:opacity-60 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" /> {status === 'loading' ? 'Loading detector...' : 'Start presence detection'}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      <div className={isMonitoring ? 'mt-3 grid gap-3 sm:grid-cols-[160px_1fr] sm:items-center' : 'hidden'}>
        <video ref={videoRef} autoPlay muted playsInline aria-label="Local camera preview" className="aspect-video w-40 scale-x-[-1] rounded-md bg-slate-950 object-cover" />
        <p className={`text-sm font-medium ${status === 'away' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
          {status === 'away' ? 'Away: no face detected for 10 seconds' : status === 'present' ? 'Present: face detected locally' : 'Looking for a face...'}
        </p>
      </div>
    </div>
  );
}