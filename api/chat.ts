import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const MAX_QUESTION_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_TEXT_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 2000;
// Shared across ALL users (not per-user) — this is a demo-wide cost cap, not abuse prevention
// for a single account (see grading_events/HOURLY_LIMIT/DAILY_LIMIT in grade.ts for that).
const GLOBAL_DAILY_LIMIT = 100;

const SYSTEM_PROMPT =
  'You are a friendly, encouraging AI tutor helping a learner track their progress. ' +
  'Keep answers short (2-4 sentences), practical, and specific to what they ask. ' +
  'You are a live, real AI model (not a scripted/simulated bot) answering in real time; ' +
  'if asked whether you are live/real AI, confirm that you are. ' +
  'When listing multiple items (e.g. multiple-choice options A/B/C/D, steps, or a short list), ' +
  'put each item on its own line using a newline character, instead of running them together in one line.';

interface HistoryMessage {
  role: 'learner' | 'ai';
  text: string;
}

function isValidHistory(value: unknown): value is HistoryMessage[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      (item.role === 'learner' || item.role === 'ai') &&
      typeof item.text === 'string' &&
      item.text.length <= MAX_HISTORY_TEXT_LENGTH,
  );
}

/**
 * Replies to a tutor chat question using a server-only OpenAI key, so learners don't need to
 * supply their own. Capped by a shared global daily limit (this is a demo, not a paid product).
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

  const { count: dailyCount } = await supabase
    .from('chat_events')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if ((dailyCount ?? 0) >= GLOBAL_DAILY_LIMIT) {
    res.status(429).json({ error: 'This demo has reached its shared AI chat limit for today. Please try again tomorrow.' });
    return;
  }

  const { question, history, context } = req.body ?? {};
  if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION_LENGTH) {
    res.status(400).json({ error: 'Missing or invalid question.' });
    return;
  }
  if (history !== undefined && !isValidHistory(history)) {
    res.status(400).json({ error: 'Invalid history.' });
    return;
  }
  if (context !== undefined && (typeof context !== 'string' || context.length > MAX_CONTEXT_LENGTH)) {
    res.status(400).json({ error: 'Invalid context.' });
    return;
  }
  const trimmedHistory: HistoryMessage[] = (history ?? []).slice(-MAX_HISTORY_MESSAGES);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...(context ? [{ role: 'system', content: `Learner's real progress data:\n${context}` }] : []),
          ...trimmedHistory.map((message) => ({
            role: message.role === 'ai' ? 'assistant' : 'user',
            content: message.text,
          })),
          { role: 'user', content: question },
        ],
        max_tokens: 200,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      res.status(502).json({ error: body?.error?.message || 'The AI chat service failed.' });
      return;
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      res.status(502).json({ error: 'The AI chat service returned an empty response.' });
      return;
    }

    await supabase.from('chat_events').insert({ user_id: userId });

    res.status(200).json({ text });
  } catch {
    res.status(502).json({ error: 'Could not reach the AI chat service.' });
  }
}
