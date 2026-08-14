import type { Activity, LearnerProfile, LearningPlanStep } from '../types';

/**
 * Builds a short, personalized learning plan from the learner's current profile
 * and activity history. This simulates the case study's "AI-generated learning
 * plan" capability using simple, deterministic rules rather than a real LLM call.
 */
export function generateLearningPlan(
  profile: LearnerProfile,
  activities: Activity[],
): LearningPlanStep[] {
  const steps: LearningPlanStep[] = [];

  const inProgress = activities.find((activity) => activity.status === 'in-progress');
  const recommendationMatchesInProgress =
    inProgress?.title === profile.recommendation.activityTitle;

  if (inProgress) {
    steps.push({
      id: `plan-${inProgress.id}`,
      title: `Finish "${inProgress.title}"`,
      description: recommendationMatchesInProgress
        ? profile.recommendation.reason
        : "You're already partway through this activity — finishing it builds directly toward your recommended next step.",
    });
  }

  if (!recommendationMatchesInProgress) {
    steps.push({
      id: 'plan-recommendation',
      title: profile.recommendation.activityTitle,
      description: profile.recommendation.reason,
    });
  }

  const upNext = activities.filter(
    (activity) => activity.status === 'not-started' && activity.id !== inProgress?.id,
  );
  upNext.slice(0, 2).forEach((activity) => {
    steps.push({
      id: `plan-${activity.id}`,
      title: activity.title,
      description: `Targets "${activity.topic}" — one of your current improvement areas.`,
    });
  });

  const topStrength = profile.strengths[0];
  if (topStrength) {
    steps.push({
      id: 'plan-reinforce',
      title: 'Apply what you already do well',
      description: `Lean on your strength in "${topStrength}" as you work through the steps above — it will make the new material easier to pick up.`,
    });
  }

  return steps;
}
