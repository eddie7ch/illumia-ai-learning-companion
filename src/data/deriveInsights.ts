import type { Activity, Recommendation } from '../types';

/** Aggregates AI feedback across activities into a short strengths/improvements summary. */
export function deriveStrengthsAndImprovements(activities: Activity[]): {
  strengths: string[];
  improvementAreas: string[];
} {
  const strengths = new Set<string>();
  const improvementAreas = new Set<string>();
  activities.forEach((activity) => {
    activity.feedback?.strengths.forEach((item) => strengths.add(item));
    activity.feedback?.suggestions.forEach((item) => improvementAreas.add(item));
  });
  return {
    strengths: [...strengths].slice(0, 5),
    improvementAreas: [...improvementAreas].slice(0, 5),
  };
}

/** Recommends the in-progress activity, else the next not-started one, else "all caught up". */
export function deriveRecommendation(activities: Activity[]): Recommendation {
  const inProgress = activities.find((activity) => activity.status === 'in-progress');
  if (inProgress) {
    return {
      activityTitle: inProgress.title,
      reason: "You're already partway through this — finishing it keeps your momentum going.",
    };
  }

  const notStarted = activities.find((activity) => activity.status === 'not-started');
  if (notStarted) {
    return { activityTitle: notStarted.title, reason: `This is next up in "${notStarted.topic}".` };
  }

  return {
    activityTitle: "You're all caught up",
    reason: 'Add a new activity or course to keep learning.',
  };
}

export function calculateOverallProgress(activities: Activity[]): number {
  if (activities.length === 0) return 0;
  const completed = activities.filter((activity) => activity.status === 'completed').length;
  return Math.round((completed / activities.length) * 100);
}
