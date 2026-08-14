import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLiveAiResponse, LiveAiError } from './liveAi';
import type { ChatMessage } from '../types';

const history: ChatMessage[] = [{ id: 'welcome', role: 'ai', text: 'Hi!' }];

describe('getLiveAiResponse', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the assistant message text on a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '  Use useMemo.  ' } }] }),
      }),
    );

    const text = await getLiveAiResponse('Why re-render?', 'sk-test', history);
    expect(text).toBe('Use useMemo.');
  });

  it('sends the API key as a bearer token and never in the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await getLiveAiResponse('question', 'sk-secret', history);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain('sk-secret');
    expect(init.headers.Authorization).toBe('Bearer sk-secret');
  });

  it('throws a LiveAiError with the server message when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } }),
      }),
    );

    await expect(getLiveAiResponse('question', 'bad-key', history)).rejects.toThrow(LiveAiError);
    await expect(getLiveAiResponse('question', 'bad-key', history)).rejects.toThrow(
      'Invalid API key',
    );
  });

  it('throws a LiveAiError when the network request itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(getLiveAiResponse('question', 'sk-test', history)).rejects.toThrow(LiveAiError);
  });
});
