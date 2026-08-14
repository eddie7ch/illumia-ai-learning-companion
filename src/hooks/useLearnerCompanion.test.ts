import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useLearnerCompanion } from './useLearnerCompanion';
import type { Activity, ChatMessage, LearnerProfile, LearningPlanStep } from '../types';

vi.mock('../services/aiService', () => ({
  fetchLearnerProfile: vi.fn(),
  fetchActivities: vi.fn(),
  fetchLearningPlan: vi.fn(),
  fetchInitialChatMessages: vi.fn(),
  requestTutorReply: vi.fn(),
}));

import {
  fetchActivities,
  fetchInitialChatMessages,
  fetchLearnerProfile,
  fetchLearningPlan,
  requestTutorReply,
} from '../services/aiService';

const profile: LearnerProfile = {
  name: 'Test Learner',
  track: 'React Development',
  overallProgress: 50,
  strengths: [],
  improvementAreas: [],
  recommendation: { activityTitle: 'x', reason: 'y' },
};
const activities: Activity[] = [];
const plan: LearningPlanStep[] = [{ id: 'p1', title: 'Step', description: 'Do it' }];
const welcome: ChatMessage[] = [{ id: 'welcome', role: 'ai', text: 'Hi!' }];

describe('useLearnerCompanion', () => {
  beforeEach(() => {
    vi.mocked(fetchLearnerProfile).mockResolvedValue(profile);
    vi.mocked(fetchActivities).mockResolvedValue(activities);
    vi.mocked(fetchLearningPlan).mockResolvedValue(plan);
    vi.mocked(fetchInitialChatMessages).mockReturnValue(welcome);
    vi.mocked(requestTutorReply).mockResolvedValue({ text: 'answer' });
  });

  it('loads profile, activities, and learning plan then stops loading', async () => {
    const { result } = renderHook(() => useLearnerCompanion());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.profile).toEqual(profile);
    expect(result.current.activities).toEqual(activities);
    expect(result.current.learningPlan).toEqual(plan);
    expect(result.current.messages).toEqual(welcome);
  });

  it('sends a message and appends the learner question plus the AI reply', async () => {
    const { result } = renderHook(() => useLearnerCompanion());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage('Why re-render?');
    });

    expect(result.current.messages.some((message) => message.text === 'Why re-render?')).toBe(true);
    expect(result.current.messages.some((message) => message.text === 'answer')).toBe(true);
    expect(result.current.isThinking).toBe(false);
  });

  it('ignores blank messages', async () => {
    const { result } = renderHook(() => useLearnerCompanion());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = result.current.messages.length;
    await act(async () => {
      await result.current.sendMessage('   ');
    });
    expect(result.current.messages.length).toBe(before);
  });

  it('surfaces a notice when the reply includes one', async () => {
    vi.mocked(requestTutorReply).mockResolvedValueOnce({
      text: 'fallback answer',
      notice: 'Live AI unavailable (bad key). Showing a simulated response instead.',
    });
    const { result } = renderHook(() => useLearnerCompanion());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage('question');
    });

    expect(result.current.liveAiNotice).toMatch(/Live AI unavailable/i);
  });

  it('shows a fallback message and resets isThinking when the reply promise rejects', async () => {
    vi.mocked(requestTutorReply).mockRejectedValueOnce(new Error('catastrophic failure'));
    const { result } = renderHook(() => useLearnerCompanion());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.sendMessage('question');
    });

    expect(result.current.isThinking).toBe(false);
    expect(
      result.current.messages.some((message) => message.text.includes('something went wrong')),
    ).toBe(true);
  });

  it('does not update state after unmount when the reply resolves late', async () => {
    let resolveReply: (value: { text: string }) => void = () => {};
    vi.mocked(requestTutorReply).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReply = resolve;
      }),
    );
    const { result, unmount } = renderHook(() => useLearnerCompanion());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let sendPromise: Promise<void> = Promise.resolve();
    act(() => {
      sendPromise = result.current.sendMessage('question');
    });

    unmount();
    resolveReply({ text: 'too late' });

    // Should not throw/warn about updating an unmounted component.
    await expect(sendPromise).resolves.toBeUndefined();
  });
});
