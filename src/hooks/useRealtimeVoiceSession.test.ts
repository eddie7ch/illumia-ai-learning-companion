import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRealtimeVoiceSession } from './useRealtimeVoiceSession';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('../services/supabaseClient', () => ({
  supabase: { auth: { getSession } },
}));

class FakeDataChannel extends EventTarget {
  readyState: RTCDataChannelState = 'open';
  send = vi.fn();
  close = vi.fn(() => { this.readyState = 'closed'; });
}

class FakePeerConnection {
  static latest: FakePeerConnection | null = null;
  channel = new FakeDataChannel();
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  addTrack = vi.fn();
  close = vi.fn();
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'v=0 test-offer' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  createDataChannel = vi.fn(() => this.channel);
  constructor() { FakePeerConnection.latest = this; }
}

describe('useRealtimeVoiceSession', () => {
  const stopTrack = vi.fn();
  const audioTrack = { enabled: true, stop: stopTrack } as unknown as MediaStreamTrack;
  const stream = {
    getTracks: () => [audioTrack],
    getAudioTracks: () => [audioTrack],
  } as unknown as MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();
    audioTrack.enabled = true;
    getSession.mockResolvedValue({ data: { session: { access_token: 'session-token' } } });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection);
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('realtime-session')) {
        return new Response('v=0 answer', {
          status: 200,
          headers: {
            'Content-Type': 'application/sdp',
            'X-Realtime-Session-Id': '11111111-1111-4111-8111-111111111111',
          },
        });
      }
      return Response.json({
        allowed: true,
        sessionCostUsd: 0.01,
        sessionLimitUsd: 0.75,
        dailyCostUsd: 1.25,
        dailyLimitUsd: 5,
      });
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  });

  it('negotiates an authenticated WebRTC session and handles transcripts', async () => {
    const { result } = renderHook(() => useRealtimeVoiceSession());
    await act(async () => result.current.start('React state score 70'));
    const peer = FakePeerConnection.latest!;
    expect(fetch).toHaveBeenCalledWith('/api/realtime-session', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ sdp: 'v=0 test-offer' }),
      headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
    }));
    expect(peer.setRemoteDescription).toHaveBeenCalledWith({ type: 'answer', sdp: 'v=0 answer' });

    act(() => peer.channel.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'user-1', transcript: 'Explain state' }) })));
    act(() => peer.channel.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'response.output_audio_transcript.delta', item_id: 'ai-1', delta: 'State ' }) })));
    act(() => peer.channel.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'response.output_audio_transcript.done', item_id: 'ai-1', transcript: 'State stores changing data.' }) })));
    expect(result.current.transcripts).toEqual([
      { id: 'user-1', role: 'learner', text: 'Explain state', final: true },
      { id: 'ai-1', role: 'ai', text: 'State stores changing data.', final: true },
    ]);

    act(() => peer.channel.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({
      type: 'response.done',
      response: {
        usage: {
          input_tokens: 180,
          output_tokens: 90,
          input_token_details: { text_tokens: 20, audio_tokens: 100, image_tokens: 60 },
          output_token_details: { text_tokens: 10, audio_tokens: 80 },
        },
      },
    }) })));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/realtime-usage', expect.objectContaining({
      body: JSON.stringify({
        sessionId: '11111111-1111-4111-8111-111111111111',
        usage: {
          textInputTokens: 20,
          textOutputTokens: 10,
          audioInputTokens: 100,
          audioOutputTokens: 80,
          imageInputTokens: 60,
        },
      }),
    })));
  });

  it('mutes, interrupts, and releases every media resource', async () => {
    const { result, unmount } = renderHook(() => useRealtimeVoiceSession());
    await act(async () => result.current.start('Testing context'));
    const peer = FakePeerConnection.latest!;
    act(() => result.current.toggleMute());
    expect(audioTrack.enabled).toBe(false);
    expect(result.current.isMuted).toBe(true);

    act(() => result.current.interrupt());
    expect(peer.channel.send).toHaveBeenCalledWith(JSON.stringify({ type: 'response.cancel' }));
    expect(peer.channel.send).toHaveBeenCalledWith(JSON.stringify({ type: 'output_audio_buffer.clear' }));

    act(() => {
      expect(result.current.shareScreenObservation(
        'Editing useState on screen',
        'data:image/jpeg;base64,frame',
      )).toBe(true);
      result.current.clearScreenObservationContext();
    });
    expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('input_image'));
    expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('data:image/jpeg;base64,frame'));
    expect(peer.channel.send).toHaveBeenCalledWith(expect.stringContaining('screen observation sharing is now inactive'));

    unmount();
    expect(stopTrack).toHaveBeenCalled();
    expect(peer.close).toHaveBeenCalled();
    expect(peer.channel.close).toHaveBeenCalled();
  });

  it('stops immediately when the combined budget is exhausted', async () => {
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes('realtime-session')) {
        return new Response('v=0 answer', {
          status: 200,
          headers: { 'X-Realtime-Session-Id': '22222222-2222-4222-8222-222222222222' },
        });
      }
      return Response.json({
        allowed: false,
        sessionCostUsd: 0.75,
        sessionLimitUsd: 0.75,
        dailyCostUsd: 5,
        dailyLimitUsd: 5,
      });
    });
    const { result } = renderHook(() => useRealtimeVoiceSession());
    await act(async () => result.current.start('Budget test'));
    expect(result.current.phase).toBe('idle');
    expect(result.current.error).toMatch(/spending limit was reached/i);
    expect(stopTrack).toHaveBeenCalled();
  });
});