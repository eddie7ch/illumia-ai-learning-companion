import { useState } from 'react';
import { BookOpen, Code2, HelpCircle, Sparkles } from 'lucide-react';
import type { Activity } from '../types';
import Drawer from './Drawer';

interface ActivityCardProps {
  activity: Activity;
}

const typeLabels: Record<Activity['type'], string> = {
  lesson: 'Lesson',
  exercise: 'Coding exercise',
  quiz: 'Quiz',
};

const typeIcons: Record<Activity['type'], typeof BookOpen> = {
  lesson: BookOpen,
  exercise: Code2,
  quiz: HelpCircle,
};

const statusStyles: Record<Activity['status'], string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
  'in-progress': 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800',
  'not-started': 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600',
};

const statusLabels: Record<Activity['status'], string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

export default function ActivityCard({ activity }: ActivityCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const hasFeedback = Boolean(activity.feedback);
  const TypeIcon = typeIcons[activity.type];

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-800 dark:ring-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {typeLabels[activity.type]} · {activity.topic}
          </p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{activity.title}</p>
          {activity.completedOn && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Completed {activity.completedOn}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusStyles[activity.status]}`}
        >
          {statusLabels[activity.status]}
        </span>
      </div>

      {hasFeedback && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            View AI feedback
          </button>

          <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={activity.title}>
            {activity.feedback && (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Score</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {activity.feedback.score}/100
                  </span>
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Strengths
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {activity.feedback.strengths.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Suggestions
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {activity.feedback.suggestions.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </Drawer>
        </div>
      )}
    </li>
  );
}
