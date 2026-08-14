import { ListChecks } from 'lucide-react';
import type { LearningPlanStep } from '../types';

interface LearningPlanProps {
  steps: LearningPlanStep[];
}

export default function LearningPlan({ steps }: LearningPlanProps) {
  if (steps.length === 0) return null;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <ListChecks className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        Your AI-generated learning plan
      </h2>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Generated from your current progress, strengths, and improvement areas.
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{step.title}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
