import type { LearningPlanStep } from '../types';

interface LearningPlanProps {
  steps: LearningPlanStep[];
}

export default function LearningPlan({ steps }: LearningPlanProps) {
  if (steps.length === 0) return null;

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-sm font-semibold text-slate-900">Your AI-generated learning plan</h2>
      <p className="mt-1 text-xs text-slate-400">
        Generated from your current progress, strengths, and improvement areas.
      </p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">{step.title}</p>
              <p className="text-sm text-slate-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
