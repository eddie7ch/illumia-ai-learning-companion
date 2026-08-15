import type { Activity, MasteryLevel, TopicMastery } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function masteryLevel(score: number): MasteryLevel {
  if (score >= 90) return 'Mastered';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Proficient';
  if (score >= 35) return 'Developing';
  return 'New';
}

export function scoreToQuality(score: number): number {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  if (score >= 70) return 3;
  if (score >= 60) return 2;
  return 1;
}

export function createTopicMastery(topic: string, score: number, now = new Date()): TopicMastery {
  const masteryScore = clampScore(score);
  return {
    topic,
    masteryScore,
    diagnosticScore: masteryScore,
    evidenceCount: 1,
    lastPracticedAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + DAY_MS).toISOString(),
    reviewIntervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
  };
}

export function updateTopicMastery(
  current: TopicMastery | undefined,
  topic: string,
  score: number,
  now = new Date(),
): TopicMastery {
  if (!current) return createTopicMastery(topic, score, now);

  const normalizedScore = clampScore(score);
  const quality = scoreToQuality(normalizedScore);
  const nextEase = Math.max(
    1.3,
    current.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );
  const repetitions = quality >= 3 ? current.repetitions + 1 : 0;
  const reviewIntervalDays = quality < 3
    ? 1
    : repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : Math.max(4, Math.round(current.reviewIntervalDays * nextEase));

  return {
    ...current,
    topic,
    masteryScore: clampScore(current.masteryScore * 0.65 + normalizedScore * 0.35),
    evidenceCount: current.evidenceCount + 1,
    lastPracticedAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + reviewIntervalDays * DAY_MS).toISOString(),
    reviewIntervalDays,
    easeFactor: Number(nextEase.toFixed(2)),
    repetitions,
  };
}

export function deriveTopicMasteries(activities: Activity[], now = new Date()): TopicMastery[] {
  const byTopic = new Map<string, TopicMastery>();
  activities
    .filter((activity) => activity.feedback)
    .sort((a, b) => (a.completedOn ?? '').localeCompare(b.completedOn ?? ''))
    .forEach((activity) => {
      const practicedAt = activity.completedOn ? new Date(`${activity.completedOn}T12:00:00`) : now;
      byTopic.set(
        activity.topic,
        updateTopicMastery(byTopic.get(activity.topic), activity.topic, activity.feedback!.score, practicedAt),
      );
    });
  return Array.from(byTopic.values()).sort((a, b) => a.masteryScore - b.masteryScore);
}

export function dueTopicReviews(masteries: TopicMastery[], now = new Date()): TopicMastery[] {
  return masteries
    .filter((mastery) => new Date(mastery.nextReviewAt).getTime() <= now.getTime())
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());
}