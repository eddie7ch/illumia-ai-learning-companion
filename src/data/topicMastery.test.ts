import { describe, expect, it } from 'vitest';
import { createTopicMastery, deriveTopicMasteries, dueTopicReviews, masteryLevel, updateTopicMastery } from './topicMastery';
import type { Activity } from '../types';

describe('topic mastery', () => {
  it('maps scores to explainable mastery levels', () => {
    expect(masteryLevel(20)).toBe('New');
    expect(masteryLevel(50)).toBe('Developing');
    expect(masteryLevel(70)).toBe('Proficient');
    expect(masteryLevel(80)).toBe('Strong');
    expect(masteryLevel(95)).toBe('Mastered');
  });

  it('initializes mastery from a diagnostic score', () => {
    const mastery = createTopicMastery('State', 72, new Date('2026-08-15T00:00:00Z'));
    expect(mastery.diagnosticScore).toBe(72);
    expect(mastery.nextReviewAt).toBe('2026-08-16T00:00:00.000Z');
  });

  it('expands review intervals after successful recall', () => {
    const start = createTopicMastery('State', 80, new Date('2026-08-01T00:00:00Z'));
    const first = updateTopicMastery(start, 'State', 90, new Date('2026-08-02T00:00:00Z'));
    const second = updateTopicMastery(first, 'State', 90, new Date('2026-08-03T00:00:00Z'));
    expect(first.reviewIntervalDays).toBe(1);
    expect(second.reviewIntervalDays).toBe(3);
  });

  it('resets review scheduling after weak recall', () => {
    const start = { ...createTopicMastery('State', 90), repetitions: 3, reviewIntervalDays: 8 };
    const updated = updateTopicMastery(start, 'State', 40, new Date('2026-08-15T00:00:00Z'));
    expect(updated.repetitions).toBe(0);
    expect(updated.reviewIntervalDays).toBe(1);
  });

  it('derives topic evidence and identifies due reviews', () => {
    const activities: Activity[] = [
      { id: '1', title: 'State quiz', type: 'quiz', topic: 'State', status: 'completed', completedOn: '2026-08-01', feedback: { score: 80, strengths: [], suggestions: [] } },
      { id: '2', title: 'Testing quiz', type: 'quiz', topic: 'Testing', status: 'completed', completedOn: '2026-08-02', feedback: { score: 55, strengths: [], suggestions: [] } },
    ];
    const masteries = deriveTopicMasteries(activities, new Date('2026-08-15T00:00:00Z'));
    expect(masteries.map((item) => item.topic)).toEqual(['Testing', 'State']);
    expect(dueTopicReviews(masteries, new Date('2026-08-15T00:00:00Z'))).toHaveLength(2);
  });
});