import { Play, Square } from 'lucide-react';
import { useStudySession } from '../context/useStudySession';
import { formatDuration } from '../utils/duration';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function statusLabel(kind: 'active' | 'idle' | 'away'): string {
  if (kind === 'idle') return 'Idle';
  if (kind === 'away') return 'Away';
  return 'Active';
}

function statusClasses(kind: 'active' | 'idle' | 'away'): string {
  if (kind === 'idle') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  if (kind === 'away') return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
}

export default function StudySessionCard() {
  const { phase, elapsedMs, currentLabel, currentKind, report, startSession, endSession } = useStudySession();

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-slate-100">Study session tracker</h2>

      {phase === 'idle' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Track how long you spend on this dashboard, and how much of it was active vs. idle. Nothing leaves your
            browser.
          </p>
          <button
            type="button"
            onClick={startSession}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Start session
          </button>
        </div>
      )}

      {phase === 'active' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatElapsed(elapsedMs)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(currentKind)}`}>
              {statusLabel(currentKind)}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{currentLabel}</span>
          </div>
          <button
            type="button"
            onClick={endSession}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            <Square className="h-4 w-4" aria-hidden="true" />
            End session
          </button>
        </div>
      )}

      {phase === 'ended' && report && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-500/10">
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Active</p>
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                {formatDuration(Math.round(report.activeMs / 60000))}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-500/10">
              <p className="text-xs text-amber-700 dark:text-amber-400">Idle</p>
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                {formatDuration(Math.round(report.idleMs / 60000))}
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400">Away</p>
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {formatDuration(Math.round(report.awayMs / 60000))}
              </p>
            </div>
          </div>

          {report.byLabel.length > 0 && (
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {report.byLabel.map((entry) => (
                <li key={entry.label} className="flex items-center justify-between">
                  <span>{entry.label}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDuration(Math.round(entry.ms / 60000))}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-sm text-slate-600 dark:text-slate-300">{buildInsight(report)}</p>

          <button
            type="button"
            onClick={startSession}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Start a new session
          </button>
        </div>
      )}
    </section>
  );
}

function buildInsight(report: { totalMs: number; activeMs: number; idleMs: number; byLabel: Array<{ label: string; ms: number }> }): string {
  const totalMs = Math.max(report.totalMs, 1);
  const idlePercent = Math.round((report.idleMs / totalMs) * 100);
  if (idlePercent >= 30) {
    return `${idlePercent}% of this session was idle time — consider shorter, more focused blocks.`;
  }
  const top = report.byLabel[0];
  if (top) {
    return `You spent the most time on "${top.label}" (${formatDuration(Math.round(top.ms / 60000))}).`;
  }
  if (report.activeMs === 0) {
    return 'No active time was recorded for this session.';
  }
  return 'Nice, focused session!';
}
