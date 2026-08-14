import type { Activity } from '../types';
import ActivityCard from './ActivityCard';

interface ActivityListProps {
  activities: Activity[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Your activities</h2>
      <ul className="space-y-3">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </ul>
    </section>
  );
}
