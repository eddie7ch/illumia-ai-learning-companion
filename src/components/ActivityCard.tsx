import { useState } from 'react';
import type { Activity } from '../types';

interface ActivityCardProps {
  activity: Activity;
}

const typeLabels: Record<Activity['type'], string> = {
  lesson: 'Lesson',
  exercise: 'Coding exercise',
  quiz: 'Quiz',
};

const statusStyles: Record<Activity['status'], string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'in-progress': 'bg-amber-50 text-amber-700 ring-amber-200',
  'not-started': 'bg-slate-100 text-slate-500 ring-slate-200',
};

const statusLabels: Record<Activity['status'], string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

export default function ActivityCard({ activity }: ActivityCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const hasFeedback = Boolean(activity.feedback);

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {typeLabels[activity.type]} · {activity.topic}
          </p>
          <p className="font-semibold text-slate-900">{activity.title}</p>
          {activity.completedOn && (
            <p className="mt-0.5 text-xs text-slate-400">Completed {activity.completedOn}</p>
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
            onClick={() => setShowFeedback((prev) => !prev)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline"
            aria-expanded={showFeedback}
          >
            {showFeedback ? 'Hide AI feedback' : 'View AI feedback'}
          </button>

          {showFeedback && activity.feedback && (
            <div className="mt-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-slate-500">Score</span>
                <span className="text-xl font-bold text-slate-900">
                  {activity.feedback.score}/100
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Strengths
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {activity.feedback.strengths.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Suggestions
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {activity.feedback.suggestions.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
