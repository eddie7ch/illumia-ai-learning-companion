import type { Activity } from '../types';

interface ProgressTrendProps {
  activities: Activity[];
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 96;
const PADDING = 12;

export default function ProgressTrend({ activities }: ProgressTrendProps) {
  const scored = activities
    .filter((activity) => activity.feedback && activity.completedOn)
    .sort((a, b) => (a.completedOn! < b.completedOn! ? -1 : 1));

  if (scored.length < 2) return null;

  const scores = scored.map((activity) => activity.feedback!.score);
  const min = Math.min(...scores, 60);
  const max = Math.max(...scores, 100);
  const range = max - min || 1;
  const usableWidth = CHART_WIDTH - PADDING * 2;
  const usableHeight = CHART_HEIGHT - PADDING * 2;

  const points = scores.map((score, index) => {
    const x = PADDING + (index / (scores.length - 1)) * usableWidth;
    const y = PADDING + usableHeight - ((score - min) / range) * usableHeight;
    return { x, y, score, title: scored[index].title, date: scored[index].completedOn! };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const trendLabel =
    lastScore > firstScore ? 'trending up' : lastScore < firstScore ? 'trending down' : 'holding steady';

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Score trend</h2>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        AI feedback scores across your graded activities, {trendLabel} ({firstScore} → {lastScore}).
      </p>

      <svg
        role="img"
        aria-label={`Line chart of AI feedback scores over time, ${trendLabel} from ${firstScore} to ${lastScore}`}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="mt-3 h-24 w-full max-w-xs"
      >
        <path
          d={linePath}
          fill="none"
          className="stroke-indigo-500 dark:stroke-indigo-400"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point) => (
          <circle
            key={`${point.title}-${point.date}`}
            cx={point.x}
            cy={point.y}
            r={3}
            className="fill-indigo-600 dark:fill-indigo-300"
          >
            <title>
              {point.title}: {point.score}/100 ({point.date})
            </title>
          </circle>
        ))}
      </svg>

      <ul className="sr-only">
        {points.map((point) => (
          <li key={`${point.title}-list`}>
            {point.date}: {point.title} scored {point.score} out of 100
          </li>
        ))}
      </ul>
    </section>
  );
}
