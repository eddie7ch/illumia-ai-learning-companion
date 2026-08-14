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
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span aria-hidden="true" className="text-emerald-600">
            ✓
          </span>
          Strengths
        </h2>
        <ul className="space-y-2 text-sm text-slate-700">
          {strengths.map((strength) => (
            <li key={strength} className="flex gap-2">
              <span aria-hidden="true" className="text-emerald-600">
                •
              </span>
              <span>{strength}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span aria-hidden="true" className="text-amber-600">
            ↗
          </span>
          Areas for improvement
        </h2>
        <ul className="space-y-2 text-sm text-slate-700">
          {improvementAreas.map((area) => (
            <li key={area} className="flex gap-2">
              <span aria-hidden="true" className="text-amber-600">
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
