import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { AI_BUDGET_EXCEEDED_MESSAGE, isWithinDailyAiBudget, recordAiUsage } from './_aiBudget.js';

const MAX_SUBMISSION_LENGTH = 8000;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const VALID_TYPES = new Set(['lesson', 'exercise', 'quiz']);
const HOURLY_LIMIT = 15;
const DAILY_LIMIT = 50;

/**
 * AI-grades a learner's submission. Requires a valid Supabase session (checked server-side)
 * and calls OpenAI using a server-only key — the key never reaches the browser.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !openAiKey) {
    res.status(500).json({ error: 'Server is missing required configuration.' });
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header.' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }
  const userId = userData.user.id;

  const now = Date.now();
  const [{ count: hourlyCount }, { count: dailyCount }] = await Promise.all([
    supabase
      .from('grading_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(now - 60 * 60 * 1000).toISOString()),
    supabase
      .from('grading_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  if ((hourlyCount ?? 0) >= HOURLY_LIMIT || (dailyCount ?? 0) >= DAILY_LIMIT) {
    res.status(429).json({ error: 'AI grading rate limit reached. Please try again later.' });
    return;
  }
  if (!(await isWithinDailyAiBudget(supabase))) {
    res.status(429).json({ error: AI_BUDGET_EXCEEDED_MESSAGE });
    return;
  }

  const { title, topic, type, submission } = req.body ?? {};
  if (
    typeof title !== 'string' ||
    typeof topic !== 'string' ||
    typeof type !== 'string' ||
    !VALID_TYPES.has(type) ||
    typeof submission !== 'string' ||
    !submission.trim()
  ) {
    res.status(400).json({ error: 'Missing or invalid fields.' });
    return;
  }
  if (title.length > 200 || topic.length > 200 || submission.length > MAX_SUBMISSION_LENGTH) {
    res.status(400).json({ error: 'One or more fields are too long.' });
    return;
  }

  const systemPrompt =
    `You are grading a learner's submission for a "${type}" activity titled "${title}" ` +
    `(topic: "${topic}"). Score it from 0-100 and give concise, specific, encouraging feedback. ` +
    'Respond with ONLY minified JSON matching exactly this shape: ' +
    '{"score": number, "strengths": string[], "suggestions": string[]}. ' +
    'Use 1-3 short strengths and 1-3 short suggestions.';

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: submission.slice(0, MAX_SUBMISSION_LENGTH) },
        ],
        max_tokens: 400,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      res.status(502).json({ error: body?.error?.message || 'The AI grading service failed.' });
      return;
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const raw = data.choices?.[0]?.message?.content;
    const parsed = raw ? JSON.parse(raw) : null;
    if (
      !parsed ||
      typeof parsed.score !== 'number' ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.suggestions)
    ) {
      res.status(502).json({ error: 'The AI grading service returned an unexpected response.' });
      return;
    }

    await supabase.from('grading_events').insert({ user_id: userId });
    await recordAiUsage(supabase, userId, 'grade', data.usage);

    res.status(200).json({
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      strengths: parsed.strengths.slice(0, 5).map(String),
      suggestions: parsed.suggestions.slice(0, 5).map(String),
    });
  } catch {
    res.status(502).json({ error: 'Could not reach the AI grading service.' });
  }
}
