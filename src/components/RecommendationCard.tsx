import type { Recommendation } from '../types';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  return (
    <section className="rounded-xl bg-indigo-600 p-5 text-white shadow-sm">
      <h2 className="text-sm font-medium text-indigo-100">Recommended next step</h2>
      <p className="mt-1 text-lg font-semibold">{recommendation.activityTitle}</p>
      <p className="mt-2 text-sm text-indigo-100">{recommendation.reason}</p>
    </section>
  );
}
