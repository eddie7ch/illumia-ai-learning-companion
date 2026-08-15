import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime/calls';
const MAX_SDP_LENGTH = 100_000;
const MAX_CONTEXT_LENGTH = 2000;
const HOURLY_SESSION_LIMIT = 3;
const DAILY_SESSION_LIMIT = 10;

const BASE_INSTRUCTIONS =
  'You are a live voice learning companion. Speak naturally, warmly, and concisely. ' +
  'Teach with short explanations, then ask one useful question to check understanding. ' +
  'Do not simply give answers when a hint would help the learner reason. Adapt difficulty to their responses. ' +
  'If interrupted, stop immediately and listen. Never claim to see the learner or their screen unless the supplied ' +
  'learning context explicitly contains a confirmed observation.';

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

  const body = req.body as unknown;
  const sdp =
    typeof body === 'string'
      ? body
      : Buffer.isBuffer(body)
        ? body.toString('utf8')
        : body && typeof body === 'object' && 'sdp' in body && typeof (body as { sdp?: unknown }).sdp === 'string'
          ? (body as { sdp: string }).sdp
          : '';
  if (!sdp || sdp.length > MAX_SDP_LENGTH || !sdp.startsWith('v=0')) {
    res.status(400).json({ error: 'Missing or invalid WebRTC session description.' });
    return;
  }
  const contextHeader = req.headers['x-learning-context'];
  const learningContext = typeof contextHeader === 'string' ? contextHeader.slice(0, MAX_CONTEXT_LENGTH) : '';

  const now = Date.now();
  const [hourlyResult, dailyResult] = await Promise.all([
    supabase.from('chat_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 60 * 60 * 1000).toISOString()),
    supabase.from('chat_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  if (hourlyResult.error || dailyResult.error) {
    res.status(500).json({ error: 'Voice-session rate limiting is unavailable.' });
    return;
  }
  if ((hourlyResult.count ?? 0) >= HOURLY_SESSION_LIMIT || (dailyResult.count ?? 0) >= DAILY_SESSION_LIMIT) {
    res.status(429).json({ error: 'Voice tutor session limit reached. Please try again later.' });
    return;
  }

  const session = {
    type: 'realtime',
    model: 'gpt-realtime-2.1',
    output_modalities: ['audio'],
    instructions: learningContext ? `${BASE_INSTRUCTIONS}\n\nLearner context:\n${learningContext}` : BASE_INSTRUCTIONS,
    audio: {
      input: {
        transcription: { model: 'gpt-live-transcribe', delay: 'low' },
        turn_detection: { type: 'semantic_vad', create_response: true, interrupt_response: true },
      },
      output: { voice: 'marin' },
    },
  };

  try {
    const form = new FormData();
    form.set('sdp', sdp);
    form.set('session', JSON.stringify(session));
    const response = await fetch(OPENAI_REALTIME_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'OpenAI-Safety-Identifier': createHash('sha256').update(userId).digest('hex'),
      },
      body: form,
    });
    const answer = await response.text();
    if (!response.ok) {
      res.status(502).json({ error: 'The live voice service could not create a session.' });
      return;
    }

    const { error: eventError } = await supabase.from('chat_events').insert({ user_id: userId });
    if (eventError) {
      res.status(500).json({ error: 'The voice session could not be recorded.' });
      return;
    }
    res.setHeader('Content-Type', 'application/sdp');
    res.status(200).send(answer);
  } catch {
    res.status(502).json({ error: 'Could not reach the live voice service.' });
  }
}