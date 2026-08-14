import type { LearnerProfile } from '../types';

interface ProgressOverviewProps {
  profile: LearnerProfile;
}

export default function ProgressOverview({ profile }: ProgressOverviewProps) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">Learning track</h2>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{profile.track}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall progress</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{profile.overallProgress}%</p>
        </div>
      </div>
      <div
        className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
        role="progressbar"
        aria-valuenow={profile.overallProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Overall course progress"
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width] duration-700 ease-out dark:bg-indigo-500"
          style={{ width: `${profile.overallProgress}%` }}
        />
      </div>
    </section>
  );
}
