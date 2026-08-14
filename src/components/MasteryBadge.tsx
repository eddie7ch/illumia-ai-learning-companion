import { Award } from 'lucide-react';

interface MasteryBadgeProps {
  track: string;
  progress: number;
}

function getTier(progress: number): string {
  if (progress >= 90) return 'Master';
  if (progress >= 75) return 'Practitioner';
  if (progress >= 50) return 'Builder';
  if (progress >= 25) return 'Explorer';
  return 'Newcomer';
}

export default function MasteryBadge({ track, progress }: MasteryBadgeProps) {
  const subject = track.split(' ')[0];
  const tier = getTier(progress);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:ring-indigo-800">
      <Award className="h-3 w-3" aria-hidden="true" />
      {subject} {tier}
    </span>
  );
}
