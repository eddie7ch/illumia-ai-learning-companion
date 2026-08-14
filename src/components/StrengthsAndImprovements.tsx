import { CheckCircle2, TrendingUp } from 'lucide-react';

interface StrengthsAndImprovementsProps {
  strengths: string[];
  improvementAreas: string[];
}

export default function StrengthsAndImprovements({
  strengths,
  improvementAreas,
}: StrengthsAndImprovementsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Strengths
        </h2>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {strengths.map((strength) => (
            <li key={strength} className="flex gap-2">
              <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400">
                •
              </span>
              <span>{strength}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          Areas for improvement
        </h2>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          {improvementAreas.map((area) => (
            <li key={area} className="flex gap-2">
              <span aria-hidden="true" className="text-amber-600 dark:text-amber-400">
                •
              </span>
              <span>{area}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
