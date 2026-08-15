import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

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
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData.user) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }
  const { courseTitle, topics } = req.body ?? {};
  if (typeof courseTitle !== 'string' || !Array.isArray(topics) || topics.length < 1 || topics.length > 6) {
    res.status(400).json({ error: 'Missing or invalid diagnostic topics.' });
    return;
  }
  const cleanTopics = topics
    .filter((topic): topic is string => typeof topic === 'string' && topic.trim().length > 0)
    .map((topic) => topic.slice(0, 100));
  if (cleanTopics.length !== topics.length) {
    res.status(400).json({ error: 'One or more diagnostic topics are invalid.' });
    return;
  }
  const prompt =
    `Create exactly one diagnostic multiple-choice question for each topic in the course "${courseTitle.slice(0, 200)}": ` +
    `${cleanTopics.join(', ')}. Test prerequisite understanding, not obscure trivia. Each question must have exactly ` +
    'four plausible choices and one correct answer. Respond only as JSON: ' +
    '{"questions":[{"topic":string,"prompt":string,"choices":string[],"correctIndex":number,"explanation":string}]}.';
  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: prompt }],
        max_tokens: 1000,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      res.status(502).json({ error: 'The AI diagnostic service failed.' });
      return;
    }
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content;
    const raw = content ? JSON.parse(content) : null;
    const questions = Array.isArray(raw?.questions) ? raw.questions : [];
    const sanitized = cleanTopics.flatMap((topic, index) => {
      const question = questions.find((item: Record<string, unknown>) => item?.topic === topic) ?? questions[index];
      if (!question || typeof question.prompt !== 'string' || !Array.isArray(question.choices) || question.choices.length < 4 || typeof question.correctIndex !== 'number') return [];
      return [{
        id: `diagnostic-${Date.now()}-${index}`,
        topic,
        prompt: question.prompt.slice(0, 500),
        choices: question.choices.slice(0, 4).map((choice: unknown) => String(choice).slice(0, 200)),
        correctIndex: Math.max(0, Math.min(3, Math.round(question.correctIndex))),
        explanation: typeof question.explanation === 'string' ? question.explanation.slice(0, 500) : undefined,
      }];
    });
    if (sanitized.length !== cleanTopics.length) {
      res.status(502).json({ error: 'The AI diagnostic returned incomplete questions.' });
      return;
    }
    res.status(200).json({ questions: sanitized });
  } catch {
    res.status(502).json({ error: 'Could not generate the diagnostic.' });
  }
}