import type { Activity, ChatMessage, LearnerProfile, LearningPlanStep } from '../types';
import { activities, initialChatMessages, learnerProfile } from '../data/mockData';
import { getMockAiResponse } from '../data/aiTutor';
import { getLiveAiResponse, LiveAiError } from '../data/liveAi';
import { generateLearningPlan } from '../data/learningPlan';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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
 * OpenAI doesn't reliably start a new line before enumerated list markers (e.g. multiple-choice
 * "A. ... B. ..." or numbered "1. ... 2. ..."), even when instructed to, so replies can render as
 * one jumbled paragraph. Force a line break before each marker so lists always render one per line.
 */
function normalizeListFormatting(text: string): string {
  return text.replace(/ (?=(?:\d+\.|[A-D][.)])\s)/g, '\n').replace(/^\n+/, '');
}

/** Calls the /api/chat serverless function, authenticated with the current Supabase session. */
async function requestServerChatReply(
  question: string,
  history: ChatMessage[],
  progressContext?: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in to use the AI tutor.');

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ question, history: history.slice(-10), context: progressContext }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Request failed with status ${response.status}`);
  }
  const body = await response.json();
  if (!body?.text) throw new Error('The AI response was empty.');
  return normalizeListFormatting(body.text as string);
}

/**
 * Requests a tutor response. Uses a real OpenAI call when the learner supplies their own API
 * key, otherwise tries the app's server-backed AI (rate-limited, see api/chat.ts), falling back
 * to the simulated responder (with a notice) if either live path fails or isn't available.
 * `progressContext` (see `buildProgressContext`) grounds live replies in the learner's real data.
 */
export async function requestTutorReply(
  question: string,
  history: ChatMessage[],
  apiKey: string,
  progressContext?: string,
): Promise<TutorReply> {
  const trimmedKey = apiKey.trim();
  if (trimmedKey) {
    try {
      const text = await getLiveAiResponse(question, trimmedKey, history, progressContext);
      return { text: normalizeListFormatting(text) };
    } catch (error) {
      const message = error instanceof LiveAiError ? error.message : 'Something went wrong.';
      await simulateLatency();
      return {
        text: getMockAiResponse(question),
        notice: `Live AI unavailable (${message}). Showing a simulated response instead.`,
      };
    }
  }

  if (isSupabaseConfigured) {
    try {
      const text = await requestServerChatReply(question, history, progressContext);
      return { text };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
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
