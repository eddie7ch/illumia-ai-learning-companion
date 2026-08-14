import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { activities, initialChatMessages, learnerProfile } from '../data/mockData';

const mockGetSession = vi.fn();
let mockIsSupabaseConfigured = false;

vi.mock('./supabaseClient', () => ({
  get isSupabaseConfigured() {
    return mockIsSupabaseConfigured;
  },
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

const {
  fetchActivities,
  fetchInitialChatMessages,
  fetchLearnerProfile,
  fetchLearningPlan,
  requestTutorReply,
} = await import('./aiService');

describe('aiService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsSupabaseConfigured = false;
    mockGetSession.mockReset();
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

  it('uses the server-backed chat endpoint when no key is given but Supabase is configured', async () => {
    mockIsSupabaseConfigured = true;
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-123' } } });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'Server-backed reply.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const reply = await requestTutorReply('Why is my component re-rendering?', [], '', 'Overall progress: 50%');

    expect(reply).toEqual({ text: 'Server-backed reply.' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token-123' }),
        body: JSON.stringify({
          question: 'Why is my component re-rendering?',
          history: [],
          context: 'Overall progress: 50%',
        }),
      }),
    );
  });

  it('falls back to the simulated responder when the server-backed chat endpoint fails', async () => {
    mockIsSupabaseConfigured = true;
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token-123' } } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Rate limit reached.' }),
      }),
    );

    const promise = requestTutorReply('Why is my component re-rendering?', [], '');
    await vi.advanceTimersByTimeAsync(1500);
    const reply = await promise;

    expect(reply.text).toMatch(/re-render/i);
    expect(reply.notice).toMatch(/Live AI unavailable \(Rate limit reached\.\)/i);
  });
});
