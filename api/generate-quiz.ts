import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { AI_BUDGET_EXCEEDED_MESSAGE, isWithinDailyAiBudget, recordAiUsage } from './_aiBudget.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const HOURLY_LIMIT = 15;
const DAILY_LIMIT = 50;
const QUESTION_COUNT = 3;
const CHOICE_COUNT = 4;

/**
 * Generates a real, live quiz (via OpenAI) for an activity instead of relying on a fixed
 * question bank — requires a valid Supabase session, server-only OpenAI key, and shares the
 * same per-user rate limit pool as /api/grade (grading_events) since this is the same kind of
 * "AI does real work" call, just to generate questions instead of grade an answer.
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
    res.status(429).json({ error: 'AI rate limit reached. Please try again later.' });
    return;
  }
  if (!(await isWithinDailyAiBudget(supabase))) {
    res.status(429).json({ error: AI_BUDGET_EXCEEDED_MESSAGE });
    return;
  }

  const { title, topic, courseTitle } = req.body ?? {};
  if (typeof title !== 'string' || typeof topic !== 'string' || !title.trim() || !topic.trim()) {
    res.status(400).json({ error: 'Missing or invalid fields.' });
    return;
  }
  if (title.length > 200 || topic.length > 200 || (typeof courseTitle === 'string' && courseTitle.length > 200)) {
    res.status(400).json({ error: 'One or more fields are too long.' });
    return;
  }

  const courseContext =
    typeof courseTitle === 'string' && courseTitle.trim()
      ? `Every question MUST stay specific to "${courseTitle}" — do not ask generic questions about ` +
        `"${topic}" that could apply to any course; frame each question through the lens of "${courseTitle}". `
      : '';

  const systemPrompt =
    `Write ${QUESTION_COUNT} multiple-choice quiz questions to test a learner's understanding of ` +
    `"${topic}" for an activity titled "${title}". ${courseContext}Each question needs exactly ` +
    `${CHOICE_COUNT} plausible choices with only one correct answer, plus a one-sentence explanation ` +
    'of the correct answer. This is a retake, so pick a different angle, sub-concept, wording, and ' +
    'choice ordering than a typical/obvious question set — avoid the single most predictable question ' +
    `for this topic. Variation seed: ${Math.floor(Math.random() * 1_000_000)} (use it only to pick a ` +
    'different combination of sub-concepts, not to mention it in the output). Respond with ONLY ' +
    'minified JSON matching exactly this shape: ' +
    '{"questions": [{"prompt": string, "choices": string[], "correctIndex": number, "explanation": string}]}.';

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }],
        max_tokens: 700,
        temperature: 1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      console.error('OpenAI quiz request failed:', body?.error?.message || response.status);
      res.status(502).json({ error: 'The AI quiz service failed.' });
      return;
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const raw = data.choices?.[0]?.message?.content;
    const parsed = raw ? JSON.parse(raw) : null;
    const questions: unknown[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
    if (questions.length === 0) {
      res.status(502).json({ error: 'The AI quiz service returned an unexpected response.' });
      return;
    }

    interface RawQuestion {
      prompt: string;
      choices: string[];
      correctIndex: number;
      explanation?: string;
    }

    const sanitized = questions
      .filter(
        (question): question is RawQuestion =>
          Boolean(question) &&
          typeof (question as { prompt?: unknown }).prompt === 'string' &&
          Array.isArray((question as { choices?: unknown }).choices) &&
          (question as { choices: unknown[] }).choices.length >= 2 &&
          typeof (question as { correctIndex?: unknown }).correctIndex === 'number',
      )
      .slice(0, QUESTION_COUNT)
      .map((question: RawQuestion, index: number) => ({
        id: `live-${Date.now()}-${index}`,
        prompt: String(question.prompt).slice(0, 500),
        choices: question.choices.slice(0, CHOICE_COUNT).map((choice: string) => String(choice).slice(0, 200)),
        correctIndex: Math.max(0, Math.min(question.choices.length - 1, Math.round(question.correctIndex))),
        explanation: question.explanation ? String(question.explanation).slice(0, 500) : undefined,
      }));

    if (sanitized.length === 0) {
      res.status(502).json({ error: 'The AI quiz service returned no usable questions.' });
      return;
    }

    await supabase.from('grading_events').insert({ user_id: userId });
    await recordAiUsage(supabase, userId, 'quiz', data.usage);

    res.status(200).json({ questions: sanitized });
  } catch {
    res.status(502).json({ error: 'Could not reach the AI quiz service.' });
  }
}
