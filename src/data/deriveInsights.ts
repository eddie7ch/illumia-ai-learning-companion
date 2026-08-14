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

const MAX_CONTEXT_ACTIVITIES = 8;
const MAX_CONTEXT_LENGTH = 1500;

/**
 * Builds a short plain-text summary of the learner's real course/activity progress, so AI tutor
 * replies (mock or live) can be grounded in actual data instead of only the typed question.
 */
export function buildProgressContext(activities: Activity[], courseTitle?: string): string {
  const lines: string[] = [];
  if (courseTitle) lines.push(`Course: ${courseTitle}`);
  lines.push(`Overall progress: ${calculateOverallProgress(activities)}%`);

  const completed = activities.filter((activity) => activity.status === 'completed').slice(-MAX_CONTEXT_ACTIVITIES);
  if (completed.length > 0) {
    lines.push('Completed activities:');
    completed.forEach((activity) => {
      const score = activity.feedback ? `, score ${activity.feedback.score}/100` : '';
      const date = activity.completedOn ? ` on ${activity.completedOn}` : '';
      lines.push(`- ${activity.title} (${activity.type}, topic: ${activity.topic})${score}${date}`);
    });
  }

  const inProgress = activities.filter((activity) => activity.status === 'in-progress');
  if (inProgress.length > 0) {
    lines.push('In progress:');
    inProgress.forEach((activity) => lines.push(`- ${activity.title} (${activity.type}, topic: ${activity.topic})`));
  }

  const notStarted = activities.filter((activity) => activity.status === 'not-started').slice(0, MAX_CONTEXT_ACTIVITIES);
  if (notStarted.length > 0) {
    lines.push('Not started:');
    notStarted.forEach((activity) => lines.push(`- ${activity.title} (${activity.type}, topic: ${activity.topic})`));
  }

  return lines.join('\n').slice(0, MAX_CONTEXT_LENGTH);
}
