import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activities, initialChatMessages, learnerProfile } from '../data/mockData';
import {
  fetchActivities,
  fetchInitialChatMessages,
  fetchLearnerProfile,
  fetchLearningPlan,
  requestTutorReply,
} from './aiService';

describe('aiService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('resolves the learner profile after a simulated delay', async () => {
    const promise = fetchLearnerProfile();
    await vi.advanceTimersByTimeAsync(1500);
    await expect(promise).resolves.toEqual(learnerProfile);
  });

  it('resolves activities after a simulated delay', async () => {
    const promise = fetchActivities();
    await vi.advanceTimersByTimeAsync(1500);
    await expect(promise).resolves.toEqual(activities);
  });

  it('returns the initial chat messages synchronously', () => {
    expect(fetchInitialChatMessages()).toEqual(initialChatMessages);
  });

  it('builds a learning plan from the profile and activities after a delay', async () => {
    const promise = fetchLearningPlan(learnerProfile, activities);
    await vi.advanceTimersByTimeAsync(1500);
    const plan = await promise;
    expect(plan.length).toBeGreaterThan(0);
  });

  it('uses the simulated responder when no API key is provided', async () => {
    const promise = requestTutorReply('Why is my component re-rendering?', [], '');
    await vi.advanceTimersByTimeAsync(1500);
    const reply = await promise;
    expect(reply.text).toMatch(/re-render/i);
    expect(reply.notice).toBeUndefined();
  });

  it('falls back to the simulated responder with a notice when the live call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const promise = requestTutorReply('Why is my component re-rendering?', [], 'sk-test');
    await vi.advanceTimersByTimeAsync(1500);
    const reply = await promise;
    expect(reply.notice).toMatch(/Live AI unavailable/i);
  });
});
