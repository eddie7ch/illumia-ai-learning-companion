import type { SupabaseClient } from '@supabase/supabase-js';

// Demo-wide guardrail: total estimated OpenAI spend across every /api/* endpoint and every user
// is capped at this many US dollars per rolling 24 hours. This is on top of (not instead of) the
// per-endpoint per-user rate limits already in each handler, and OpenAI's own account-wide
// monthly hard limit (see README's "Cost controls & abuse prevention" section).
export const DAILY_AI_BUDGET_USD = 5;
export const REALTIME_SESSION_BUDGET_USD = 0.75;

// gpt-4o-mini pricing per 1M tokens (checked against platform.openai.com/pricing) — update these
// if OpenAI changes pricing or a different model is used.
const PRICE_PER_MILLION_INPUT_TOKENS_USD = 0.15;
const PRICE_PER_MILLION_OUTPUT_TOKENS_USD = 0.6;

interface OpenAiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface RealtimeUsage {
  textInputTokens: number;
  textOutputTokens: number;
  audioInputTokens: number;
  audioOutputTokens: number;
  imageInputTokens: number;
}

export interface RealtimeCostBreakdown {
  textInputCostUsd: number;
  textOutputCostUsd: number;
  audioInputCostUsd: number;
  audioOutputCostUsd: number;
  imageInputCostUsd: number;
  totalCostUsd: number;
}

// gpt-realtime-2.1-mini standard pricing per 1M tokens, checked 2026-08-15.
const REALTIME_MINI_TEXT_INPUT_USD = 0.6;
const REALTIME_MINI_TEXT_OUTPUT_USD = 2.4;
const REALTIME_MINI_AUDIO_INPUT_USD = 10;
const REALTIME_MINI_AUDIO_OUTPUT_USD = 20;
const REALTIME_MINI_IMAGE_INPUT_USD = 0.8;

export function estimateRealtimeCostUsd(usage: RealtimeUsage): RealtimeCostBreakdown {
  const perMillion = (tokens: number, price: number) => Math.max(0, tokens) * price / 1_000_000;
  const costs = {
    textInputCostUsd: perMillion(usage.textInputTokens, REALTIME_MINI_TEXT_INPUT_USD),
    textOutputCostUsd: perMillion(usage.textOutputTokens, REALTIME_MINI_TEXT_OUTPUT_USD),
    audioInputCostUsd: perMillion(usage.audioInputTokens, REALTIME_MINI_AUDIO_INPUT_USD),
    audioOutputCostUsd: perMillion(usage.audioOutputTokens, REALTIME_MINI_AUDIO_OUTPUT_USD),
    imageInputCostUsd: perMillion(usage.imageInputTokens, REALTIME_MINI_IMAGE_INPUT_USD),
  };
  return { ...costs, totalCostUsd: Object.values(costs).reduce((sum, cost) => sum + cost, 0) };
}

export async function getDailyAiCostUsd(supabase: SupabaseClient): Promise<number | null> {
  const { data, error } = await supabase.rpc('ai_usage_daily_cost_usd');
  if (error) return null;
  const cost = Number(data);
  return Number.isFinite(cost) ? cost : null;
}

export function estimateCostUsd(usage: OpenAiUsage | undefined): number {
  if (!usage) return 0;
  const inputCost = (usage.prompt_tokens ?? 0) * (PRICE_PER_MILLION_INPUT_TOKENS_USD / 1_000_000);
  const outputCost = (usage.completion_tokens ?? 0) * (PRICE_PER_MILLION_OUTPUT_TOKENS_USD / 1_000_000);
  return inputCost + outputCost;
}

/**
 * Best-effort shared guardrail: true unless the demo's total estimated OpenAI spend over the last
 * 24 hours (across every endpoint and every user) has already reached DAILY_AI_BUDGET_USD. Fails
 * open on a lookup error (consistent with the other shared global limit in api/chat.ts) so a
 * monitoring hiccup doesn't take down every AI feature at once; not perfectly atomic under
 * concurrent requests, but keeps runaway cost bounded to roughly this amount per day.
 */
export async function isWithinDailyAiBudget(supabase: SupabaseClient): Promise<boolean> {
  const cost = await getDailyAiCostUsd(supabase);
  if (cost === null) return true;
  return cost < DAILY_AI_BUDGET_USD;
}

export async function recordAiUsage(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  usage: OpenAiUsage | undefined,
): Promise<void> {
  await supabase.from('ai_usage_events').insert({
    user_id: userId,
    endpoint,
    estimated_cost_usd: estimateCostUsd(usage),
  });
}

export const AI_BUDGET_EXCEEDED_MESSAGE =
  'This demo has reached its shared AI budget for today. Please try again tomorrow.';
