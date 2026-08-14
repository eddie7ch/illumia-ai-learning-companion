interface SkeletonBlockProps {
  className?: string;
}

function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="mt-3 h-3 w-full" />
      {Array.from({ length: Math.max(lines - 1, 0) }).map((_, index) => (
        <SkeletonBlock key={index} className="mt-2 h-3 w-5/6" />
      ))}
    </div>
  );
}

/** Placeholder shown while the learner profile/activities are "loading" from the simulated service. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading your dashboard">
      <SkeletonCard lines={2} />
      <SkeletonCard lines={2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
      <SkeletonCard lines={2} />
      <SkeletonCard lines={4} />
      <SkeletonCard lines={5} />
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div
      className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
      role="status"
      aria-label="Loading your AI tutor"
    >
      <SkeletonBlock className="h-4 w-40" />
      <SkeletonBlock className="mt-3 h-16 w-full" />
      <SkeletonBlock className="mt-3 h-9 w-full" />
    </div>
  );
}
