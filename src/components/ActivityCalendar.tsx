import type { Activity } from '../types';
import { formatDuration } from '../utils/duration';

interface ActivityCalendarProps {
  activities: Activity[];
}

interface DayEntry {
  minutes: number;
  titles: string[];
}

const WEEKS = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function levelForMinutes(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes <= 20) return 1;
  if (minutes <= 45) return 2;
  if (minutes <= 75) return 3;
  return 4;
}

const LEVEL_STYLES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-slate-100 dark:bg-slate-700',
  1: 'bg-emerald-100 dark:bg-emerald-900',
  2: 'bg-emerald-300 dark:bg-emerald-700',
  3: 'bg-emerald-500 dark:bg-emerald-600',
  4: 'bg-emerald-700 dark:bg-emerald-400',
};

export default function ActivityCalendar({ activities }: ActivityCalendarProps) {
  const byDate = new Map<string, DayEntry>();
  activities.forEach((activity) => {
    if (!activity.completedOn) return;
    const entry = byDate.get(activity.completedOn) ?? { minutes: 0, titles: [] };
    entry.minutes += activity.timeSpentMinutes ?? 0;
    entry.titles.push(activity.title);
    byDate.set(activity.completedOn, entry);
  });

  if (byDate.size === 0) {
    return (
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Progress calendar</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          No activity yet. Complete an activity to start building your calendar.
        </p>
      </section>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const gridStart = new Date(today);
  gridStart.setDate(gridStart.getDate() - (WEEKS * 7 - 1));
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const days: Date[] = [];
  for (const d = new Date(gridStart); d <= today; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  const monthLabels = weeks.map((week) => {
    const firstOfMonth = week.find((day) => day.getDate() === 1);
    return firstOfMonth ? MONTH_LABELS[firstOfMonth.getMonth()] : '';
  });

  const sortedDateKeys = [...byDate.keys()].sort();
  const totalMinutes = [...byDate.values()].reduce((sum, entry) => sum + entry.minutes, 0);
  const activeDayCount = byDate.size;

  let longestStreak = 0;
  let runStreak = 0;
  let prevDate: Date | null = null;
  sortedDateKeys.forEach((key) => {
    const date = parseDateKey(key);
    runStreak = prevDate && date.getTime() - prevDate.getTime() === MS_PER_DAY ? runStreak + 1 : 1;
    longestStreak = Math.max(longestStreak, runStreak);
    prevDate = date;
  });

  let currentStreak = 0;
  const cursor = new Date(today);
  if (!byDate.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (byDate.has(toDateKey(cursor))) {
    currentStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const summary =
    `Activity calendar heatmap for the last ${WEEKS} weeks. ` +
    `${formatDuration(totalMinutes)} invested across ${activeDayCount} active day${activeDayCount === 1 ? '' : 's'}, ` +
    `longest streak ${longestStreak} day${longestStreak === 1 ? '' : 's'}.`;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Progress calendar</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {formatDuration(totalMinutes)} invested · {activeDayCount} active day{activeDayCount === 1 ? '' : 's'}
          {currentStreak > 0 && ` · ${currentStreak}-day streak`}
        </p>
      </div>

      <div className="mt-3 overflow-x-auto" role="img" aria-label={summary}>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}
          aria-hidden="true"
        >
          {monthLabels.map((label, index) => (
            <span key={index} className="text-[10px] text-slate-400 dark:text-slate-500">
              {label}
            </span>
          ))}
        </div>
        <div
          className="mt-1 grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${weeks.length}, 12px)`,
            gridTemplateRows: 'repeat(7, 12px)',
            gridAutoFlow: 'column',
          }}
          aria-hidden="true"
        >
          {weeks.map((week) =>
            week.map((day) => {
              const key = toDateKey(day);
              const entry = byDate.get(key);
              const level = levelForMinutes(entry?.minutes ?? 0);
              return (
                <div
                  key={key}
                  title={entry ? `${key}: ${formatDuration(entry.minutes)} — ${entry.titles.join(', ')}` : key}
                  className={`h-3 w-3 rounded-sm ${LEVEL_STYLES[level]}`}
                />
              );
            }),
          )}
        </div>
      </div>

      <ul className="sr-only">
        {sortedDateKeys.map((key) => {
          const entry = byDate.get(key)!;
          return (
            <li key={key}>
              {key}: {formatDuration(entry.minutes)} spent on {entry.titles.join(', ')}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
