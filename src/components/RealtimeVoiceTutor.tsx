import { Mic, MicOff, Phone, PhoneOff, Square } from 'lucide-react';
import type { Activity } from '../types';
import { useRealtimeVoiceSession } from '../hooks/useRealtimeVoiceSession';

interface RealtimeVoiceTutorProps {
  activities: Activity[];
}

const PHASE_LABELS = {
  idle: 'Off',
  connecting: 'Connecting...',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  error: 'Unavailable',
} as const;

function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function RealtimeVoiceTutor({ activities }: RealtimeVoiceTutorProps) {
  const voice = useRealtimeVoiceSession();
  const isActive = voice.phase !== 'idle' && voice.phase !== 'error';
  const context = activities.slice(0, 12).map((activity) =>
    `${activity.title} | topic ${activity.topic} | ${activity.status}` +
    (activity.feedback ? ` | score ${activity.feedback.score}` : ''),
  ).join('\n');

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live voice tutor</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Two-way spoken conversation with interruption.</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${voice.phase === 'speaking' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : voice.phase === 'listening' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
          {PHASE_LABELS[voice.phase]}{isActive ? ` · ${formatElapsed(voice.elapsedSeconds)}` : ''}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!isActive ? (
          <button type="button" onClick={() => voice.start(context)} disabled={voice.phase === 'connecting'} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            <Phone className="h-4 w-4" aria-hidden="true" /> Start live voice
          </button>
        ) : (
          <>
            <button type="button" onClick={voice.toggleMute} className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {voice.isMuted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
              {voice.isMuted ? 'Unmute' : 'Mute'}
            </button>
            {voice.phase === 'speaking' && (
              <button type="button" onClick={voice.interrupt} className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <Square className="h-4 w-4" aria-hidden="true" /> Interrupt
              </button>
            )}
            <button type="button" onClick={voice.stop} className="flex items-center gap-1.5 rounded-lg bg-rose-100 px-3 py-1.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <PhoneOff className="h-4 w-4" aria-hidden="true" /> End voice
            </button>
          </>
        )}
      </div>

      {voice.error && <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">{voice.error}</p>}
      {voice.transcripts.length > 0 && (
        <div className="mt-3 max-h-36 space-y-1 overflow-y-auto rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-900/50">
          {voice.transcripts.map((item) => (
            <p key={`${item.role}-${item.id}`} className={item.final ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}>
              <strong>{item.role === 'learner' ? 'You' : 'Tutor'}:</strong> {item.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}