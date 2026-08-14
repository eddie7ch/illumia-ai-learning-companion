import { describe, expect, it } from 'vitest';
import { generateLearningPlan } from './learningPlan';
import type { Activity, LearnerProfile } from '../types';

const profile: LearnerProfile = {
  name: 'Jordan Lee',
  track: 'React Development',
  overallProgress: 62,
  strengths: ['Clear component structure and composition'],
  improvementAreas: ['Performance optimization'],
  recommendation: {
    activityTitle: 'React Performance Optimization',
    reason: 'Your component architecture is strong.',
  },
};

const activities: Activity[] = [
  { id: 'lesson-3', title: 'React Performance Optimization', type: 'lesson', topic: 'Performance', status: 'in-progress' },
  { id: 'exercise-3', title: 'Memoization Challenge', type: 'exercise', topic: 'Performance', status: 'not-started' },
  { id: 'quiz-2', title: 'Testing Fundamentals Quiz', type: 'quiz', topic: 'Testing', status: 'not-started' },
];

describe('generateLearningPlan', () => {
  it('leads with the in-progress activity when one exists', () => {
    const steps = generateLearningPlan(profile, activities);
    expect(steps[0].title).toBe('Finish "React Performance Optimization"');
  });

  it('does not duplicate the recommendation when it matches the in-progress activity', () => {
    const steps = generateLearningPlan(profile, activities);
    const occurrences = steps.filter((step) =>
      step.title.includes('React Performance Optimization'),
    );
    expect(occurrences).toHaveLength(1);
  });

  it('includes up to two upcoming not-started activities', () => {
    const steps = generateLearningPlan(profile, activities);
    expect(steps.some((step) => step.title === 'Memoization Challenge')).toBe(true);
    expect(steps.some((step) => step.title === 'Testing Fundamentals Quiz')).toBe(true);
  });

  it("closes with a reinforcement step referencing the learner's top strength", () => {
    const steps = generateLearningPlan(profile, activities);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.description).toContain('Clear component structure and composition');
  });

  it('includes the recommendation as its own step when it differs from the in-progress activity', () => {
    const noInProgress = activities.filter((activity) => activity.status !== 'in-progress');
    const steps = generateLearningPlan(profile, noInProgress);
    expect(steps[0].title).toBe('React Performance Optimization');
  });

  it('does not list the recommended not-started activity again in "up next"', () => {
    const noInProgressProfile: LearnerProfile = {
      ...profile,
      recommendation: {
        activityTitle: 'Memoization Challenge',
        reason: 'This is next up in "Performance".',
      },
    };
    const noInProgress = activities.filter((activity) => activity.status !== 'in-progress');
    const steps = generateLearningPlan(noInProgressProfile, noInProgress);
    const occurrences = steps.filter((step) => step.title === 'Memoization Challenge');
    expect(occurrences).toHaveLength(1);
  });
});
