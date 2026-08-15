import { Gauge } from 'lucide-react';
import type { TopicMastery } from '../types';
import { masteryLevel } from '../data/topicMastery';

interface TopicMasteryOverviewProps {
  topics: string[];
  masteries: TopicMastery[];
}

export default function TopicMasteryOverview({ topics, masteries }: TopicMasteryOverviewProps) {
  if (topics.length === 0) return null;
  const byTopic = new Map(masteries.map((item) => [item.topic, item]));
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <Gauge className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> Topic mastery
      </h2>
      <p className="mt-1 text-xs text-slate-400">Updated from diagnostic, quizzes, grading, and reviews.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => {
          const mastery = byTopic.get(topic);
          const score = mastery?.masteryScore ?? 0;
          return (
            <li key={topic} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-slate-100">{topic}</span>
                <span className="text-slate-500 dark:text-slate-400">{score}% · {masteryLevel(score)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${score}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">{mastery ? `${mastery.evidenceCount} evidence point${mastery.evidenceCount === 1 ? '' : 's'}` : 'Take the diagnostic to establish a baseline'}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}