import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { AI_BUDGET_EXCEEDED_MESSAGE, isWithinDailyAiBudget, recordAiUsage } from './_aiBudget.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const HOURLY_LIMIT = 120;
const DAILY_LIMIT = 500;
const MAX_FRAME_LENGTH = 900_000;

interface ActivityInput {
  id: string;
  title: string;
  topic: string;
  type: string;
  status: string;
}

function isActivity(value: unknown): value is ActivityInput {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['id', 'title', 'topic', 'type', 'status'].every((key) => typeof item[key] === 'string');
}

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

  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
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

  const { frame, activities, previousObservations, questionsEnabled } = req.body ?? {};
  if (
    typeof frame !== 'string' ||
    !frame.startsWith('data:image/jpeg;base64,') ||
    frame.length > MAX_FRAME_LENGTH ||
    !Array.isArray(activities) ||
    activities.length > 50 ||
    !activities.every(isActivity)
  ) {
    res.status(400).json({ error: 'Missing or invalid observation data.' });
    return;
  }

  const now = Date.now();
  const [hourlyResult, dailyResult] = await Promise.all([
    supabase.from('screen_observation_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 60 * 60 * 1000).toISOString()),
    supabase.from('screen_observation_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  if (hourlyResult.error || dailyResult.error) {
    res.status(500).json({ error: 'Live observation storage is not configured.' });
    return;
  }
  const hourlyCount = hourlyResult.count;
  const dailyCount = dailyResult.count;
  if ((hourlyCount ?? 0) >= HOURLY_LIMIT || (dailyCount ?? 0) >= DAILY_LIMIT) {
    res.status(429).json({ error: 'Live observation limit reached. Pause and try again later.' });
    return;
  }
  if (!(await isWithinDailyAiBudget(supabase))) {
    res.status(429).json({ error: AI_BUDGET_EXCEEDED_MESSAGE });
    return;
  }

  const activityList = activities.map((activity: ActivityInput) =>
    `${activity.id}: ${activity.title} | ${activity.topic} | ${activity.type} | ${activity.status}`,
  ).join('\n');
  const recentContext = Array.isArray(previousObservations) ? JSON.stringify(previousObservations).slice(0, 3000) : '[]';
  const systemPrompt =
    'Observe one learner-approved screen frame. Report only visible learning work. Never identify people, infer ' +
    'sensitive traits, or transcribe credentials/private messages. Match an activity only with clear visual evidence. ' +
    'Confusion means visible repeated errors, failed output, or repeated attempts, not mere uncertainty. Ask at most one ' +
    `${questionsEnabled === false ? 'Do not ask a question; return null for question. ' : 'Ask a short educational question only when it is genuinely useful; otherwise return null. '}` +
    'suggestedMinutes must be 1 when matched and 0 otherwise. Return only JSON: {"summary":string,"action":string,' +
    '"activityId":string|null,"activityTitle":string|null,"confidence":number,"evidence":string,"progressEvidence":string,' +
    '"suggestedMinutes":number,"confusionDetected":boolean,"repeatedAttemptDetected":boolean,' +
    '"question":string|null}.';

  try {
    const openAiController = new AbortController();
    req.once('aborted', () => openAiController.abort());
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Known activities:\n${activityList || 'None'}\nRecent observations:\n${recentContext}` },
              { type: 'image_url', image_url: { url: frame, detail: 'low' } },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: openAiController.signal,
    });
    if (!response.ok) {
      res.status(502).json({ error: 'The live AI observer failed.' });
      return;
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };
    const content = data.choices?.[0]?.message?.content;
    const raw = content ? JSON.parse(content) as Record<string, unknown> : null;
    if (!raw || typeof raw.summary !== 'string' || typeof raw.evidence !== 'string') {
      res.status(502).json({ error: 'The live AI observer returned an unexpected response.' });
      return;
    }

    const matchedActivity = activities.find((activity: ActivityInput) => activity.id === raw.activityId);
    const confidence = typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0;
    const observation = {
      id: crypto.randomUUID(),
      observedAt: new Date().toISOString(),
      summary: raw.summary.slice(0, 500),
      action: typeof raw.action === 'string' ? raw.action.slice(0, 300) : raw.summary.slice(0, 300),
      activityId: matchedActivity && confidence >= 0.65 ? matchedActivity.id : null,
      activityTitle: matchedActivity && confidence >= 0.65 ? matchedActivity.title : null,
      confidence,
      evidence: raw.evidence.slice(0, 500),
      progressEvidence: typeof raw.progressEvidence === 'string' ? raw.progressEvidence.slice(0, 500) : raw.evidence.slice(0, 500),
      suggestedMinutes: matchedActivity && confidence >= 0.65 ? 1 : 0,
      confusionDetected: raw.confusionDetected === true,
      repeatedAttemptDetected: raw.repeatedAttemptDetected === true,
      question: typeof raw.question === 'string' ? raw.question.slice(0, 300) : null,
    };

    const { error: eventError } = await supabase.from('screen_observation_events').insert({ user_id: userId });
    if (eventError) {
      res.status(500).json({ error: 'The observation could not be recorded.' });
      return;
    }
    await recordAiUsage(supabase, userId, 'observe', data.usage);
    res.status(200).json({ observation });
  } catch {
    res.status(502).json({ error: 'Could not reach the live AI observer.' });
  }
}