import type { ChatMessage } from '../types';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 15000;

const SYSTEM_PROMPT =
  'You are a friendly, encouraging AI tutor helping a learner on a React development track. ' +
  'Keep answers short (2-4 sentences), practical, and specific to React/frontend engineering.';

export class LiveAiError extends Error {}

/**
 * Calls the OpenAI Chat Completions API directly from the browser using a key the learner
 * supplies themselves for this session only. This is a "bring your own key" demo integration,
 * not a production pattern — a real product would proxy this through a backend so the key is
 * never exposed to the client.
 */
export async function getLiveAiResponse(
  question: string,
  apiKey: string,
  history: ChatMessage[],
): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.map((message) => ({
            role: message.role === 'ai' ? 'assistant' : 'user',
            content: message.text,
          })),
          { role: 'user', content: question },
        ],
        max_tokens: 200,
        temperature: 0.5,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new LiveAiError(body?.error?.message || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new LiveAiError('The AI response was empty.');
    return text;
  } catch (error) {
    if (error instanceof LiveAiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LiveAiError('The request timed out.');
    }
    throw new LiveAiError('Could not reach the AI service.');
  } finally {
    window.clearTimeout(timeout);
  }
}
