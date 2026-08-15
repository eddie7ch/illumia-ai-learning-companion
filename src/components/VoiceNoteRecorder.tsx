import { useEffect, useRef, useState } from 'react';
import { Download, Mic, Square, Trash2 } from 'lucide-react';

interface VoiceNote {
  id: string;
  url: string;
  createdAt: string;
  durationMs: number;
  size: number;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}

export default function VoiceNoteRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const notesRef = useRef<VoiceNote[]>([]);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    notesRef.current.forEach((note) => URL.revokeObjectURL(note.url));
  }, []);

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice notes are not supported in this browser.');
      return;
    }
    setError(null);
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.addEventListener('dataavailable', (event) => {
        const data = (event as BlobEvent).data;
        if (data.size > 0) chunksRef.current.push(data);
      });
      recorder.addEventListener('stop', () => {
        const durationMs = Date.now() - startedAtRef.current;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const note: VoiceNote = {
          id: crypto.randomUUID(),
          url: URL.createObjectURL(blob),
          createdAt: new Date().toISOString(),
          durationMs,
          size: blob.size,
        };
        setNotes((current) => [...current, note]);
        setElapsedMs(durationMs);
        setIsRecording(false);
      }, { once: true });
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      recorder.start(1000);
      setIsRecording(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof DOMException && caughtError.name === 'NotAllowedError'
          ? 'Microphone permission was cancelled or blocked.'
          : 'Voice note recording could not start.',
      );
    }
  };

  const deleteNote = (note: VoiceNote) => {
    URL.revokeObjectURL(note.url);
    setNotes((current) => current.filter((item) => item.id !== note.id));
  };

  return (
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Voice notes</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Record spoken notes locally while explaining your work. Notes are not uploaded automatically.
          </p>
        </div>
        {isRecording ? (
          <button type="button" onClick={stopRecording} className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700">
            <Square className="h-4 w-4" aria-hidden="true" /> Stop note ({formatElapsed(elapsedMs)})
          </button>
        ) : (
          <button type="button" onClick={startRecording} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
            <Mic className="h-4 w-4" aria-hidden="true" /> Record voice note
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {notes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {notes.map((note, index) => (
            <li key={note.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-900/50">
              <span>Voice note {index + 1} ({formatElapsed(note.durationMs)}, {(note.size / 1024).toFixed(1)} KB)</span>
              <div className="flex gap-2">
                <a href={note.url} download={`voice-note-${note.createdAt.replace(/[:.]/g, '-')}.webm`} className="flex items-center gap-1 rounded-md bg-slate-200 px-2 py-1 text-xs dark:bg-slate-700">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download
                </a>
                <button type="button" onClick={() => deleteNote(note)} aria-label={`Delete voice note ${index + 1}`} className="rounded-md bg-rose-100 p-1 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}