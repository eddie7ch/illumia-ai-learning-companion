import type { Activity, ChatMessage, LearnerProfile, LearningPlanStep } from '../types';
import { activities, initialChatMessages, learnerProfile } from '../data/mockData';
import { getMockAiResponse } from '../data/aiTutor';
import { getLiveAiResponse, LiveAiError } from '../data/liveAi';
import { generateLearningPlan } from '../data/learningPlan';

const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 1500;

/** Simulates network latency for the mock endpoints below (1-1.5s, per the case study's AI capabilities). */
function simulateLatency(): Promise<void> {
  const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

export async function fetchLearnerProfile(): Promise<LearnerProfile> {
  await simulateLatency();
  return learnerProfile;
}

export async function fetchActivities(): Promise<Activity[]> {
  await simulateLatency();
  return activities;
}

export function fetchInitialChatMessages(): ChatMessage[] {
  return initialChatMessages;
}

export async function fetchLearningPlan(
  profile: LearnerProfile,
  learnerActivities: Activity[],
): Promise<LearningPlanStep[]> {
  await simulateLatency();
  return generateLearningPlan(profile, learnerActivities);
}

export interface TutorReply {
  text: string;
  notice?: string;
}

/**
 * Requests a tutor response. Uses a real OpenAI call when an API key is supplied, falling back to
 * the simulated responder (with a notice) if the live call fails or no key is provided.
 */
export async function requestTutorReply(
  question: string,
  history: ChatMessage[],
  apiKey: string,
): Promise<TutorReply> {
  const trimmedKey = apiKey.trim();
  if (trimmedKey) {
    try {
      const text = await getLiveAiResponse(question, trimmedKey, history);
      return { text };
    } catch (error) {
      const message = error instanceof LiveAiError ? error.message : 'Something went wrong.';
      await simulateLatency();
      return {
        text: getMockAiResponse(question),
        notice: `Live AI unavailable (${message}). Showing a simulated response instead.`,
      };
    }
  }

  await simulateLatency();
  return { text: getMockAiResponse(question) };
}
