import type { SupabaseClient } from '@supabase/supabase-js';

// Demo-wide guardrail: total estimated OpenAI spend across every /api/* endpoint and every user
// is capped at this many US dollars per rolling 24 hours. This is on top of (not instead of) the
// per-endpoint per-user rate limits already in each handler, and OpenAI's own account-wide
// monthly hard limit (see README's "Cost controls & abuse prevention" section).
export const DAILY_AI_BUDGET_USD = 5;

// gpt-4o-mini pricing per 1M tokens (checked against platform.openai.com/pricing) — update these
// if OpenAI changes pricing or a different model is used.
const PRICE_PER_MILLION_INPUT_TOKENS_USD = 0.15;
const PRICE_PER_MILLION_OUTPUT_TOKENS_USD = 0.6;

interface OpenAiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
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
  const { data, error } = await supabase.rpc('ai_usage_daily_cost_usd');
  if (error) return true;
  return (Number(data) || 0) < DAILY_AI_BUDGET_USD;
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
