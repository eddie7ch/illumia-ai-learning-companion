import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  DAILY_AI_BUDGET_USD,
  REALTIME_SESSION_BUDGET_USD,
  estimateRealtimeCostUsd,
  getDailyAiCostUsd,
  type RealtimeUsage,
} from './_aiBudget.js';

const MAX_TOKEN_COUNT = 100_000_000;

function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_TOKEN_COUNT;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Server is missing required configuration.' });
    return;
  }
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header.' });
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData.user) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }

  const { sessionId, usage } = req.body ?? {};
  if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    res.status(400).json({ error: 'Invalid Realtime session ID.' });
    return;
  }
  const { data: row, error: rowError } = await supabase
    .from('ai_usage_events')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('session_id', sessionId)
    .eq('endpoint', 'realtime-voice')
    .single();
  if (rowError || !row) {
    res.status(404).json({ error: 'Realtime budget reservation not found.' });
    return;
  }

  let actualCostUsd = Number(row.actual_cost_usd) || 0;
  if (usage !== undefined) {
    const candidate = usage as Partial<RealtimeUsage>;
    const counts = [
      candidate.textInputTokens,
      candidate.textOutputTokens,
      candidate.audioInputTokens,
      candidate.audioOutputTokens,
      candidate.imageInputTokens,
    ];
    if (!counts.every(validCount)) {
      res.status(400).json({ error: 'Invalid Realtime usage totals.' });
      return;
    }
    const normalized: RealtimeUsage = {
      textInputTokens: Math.max(Number(row.text_input_tokens) || 0, candidate.textInputTokens!),
      textOutputTokens: Math.max(Number(row.text_output_tokens) || 0, candidate.textOutputTokens!),
      audioInputTokens: Math.max(Number(row.audio_input_tokens) || 0, candidate.audioInputTokens!),
      audioOutputTokens: Math.max(Number(row.audio_output_tokens) || 0, candidate.audioOutputTokens!),
      imageInputTokens: Math.max(Number(row.image_input_tokens) || 0, candidate.imageInputTokens!),
    };
    const costs = estimateRealtimeCostUsd(normalized);
    actualCostUsd = Math.max(actualCostUsd, costs.totalCostUsd);
    const estimatedCostUsd = Math.max(REALTIME_SESSION_BUDGET_USD, actualCostUsd);
    const { error: updateError } = await supabase
      .from('ai_usage_events')
      .update({
        estimated_cost_usd: estimatedCostUsd,
        actual_cost_usd: actualCostUsd,
        text_input_tokens: normalized.textInputTokens,
        text_output_tokens: normalized.textOutputTokens,
        audio_input_tokens: normalized.audioInputTokens,
        audio_output_tokens: normalized.audioOutputTokens,
        image_input_tokens: normalized.imageInputTokens,
        text_input_cost_usd: costs.textInputCostUsd,
        text_output_cost_usd: costs.textOutputCostUsd,
        audio_input_cost_usd: costs.audioInputCostUsd,
        audio_output_cost_usd: costs.audioOutputCostUsd,
        image_input_cost_usd: costs.imageInputCostUsd,
      })
      .eq('id', row.id)
      .eq('user_id', userData.user.id);
    if (updateError) {
      res.status(503).json({ error: 'Realtime usage could not be recorded.' });
      return;
    }
  }

  const dailyReservedCostUsd = await getDailyAiCostUsd(supabase);
  if (dailyReservedCostUsd === null) {
    res.status(503).json({ error: 'AI budget status is unavailable.', allowed: false });
    return;
  }
  const unusedOwnReservation = Math.max(0, REALTIME_SESSION_BUDGET_USD - actualCostUsd);
  const adjustedDailyCostUsd = Math.max(0, dailyReservedCostUsd - unusedOwnReservation);
  const allowed = actualCostUsd < REALTIME_SESSION_BUDGET_USD && adjustedDailyCostUsd < DAILY_AI_BUDGET_USD;
  res.status(200).json({
    allowed,
    sessionCostUsd: actualCostUsd,
    sessionLimitUsd: REALTIME_SESSION_BUDGET_USD,
    dailyCostUsd: adjustedDailyCostUsd,
    dailyLimitUsd: DAILY_AI_BUDGET_USD,
  });
}