import type { AiFeedback } from '../types';

interface FeedbackPanelProps {
  feedback: AiFeedback;
}

/** Shared score/strengths/suggestions layout, used for both completed-activity feedback and quiz results. */
export default function FeedbackPanel({ feedback }: FeedbackPanelProps) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">Score</span>
        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{feedback.score}/100</span>
      </div>
      <div className="mt-4 space-y-4">
        {feedback.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Strengths
            </p>
            <ul className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {feedback.strengths.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
        {feedback.suggestions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Suggestions
            </p>
            <ul className="mt-1 space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {feedback.suggestions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
