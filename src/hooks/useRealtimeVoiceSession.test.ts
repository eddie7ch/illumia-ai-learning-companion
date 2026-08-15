import { act, renderHook } from '@testing-library/react';
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('v=0 answer', { status: 200, headers: { 'Content-Type': 'application/sdp' } })));
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

    unmount();
    expect(stopTrack).toHaveBeenCalled();
    expect(peer.close).toHaveBeenCalled();
    expect(peer.channel.close).toHaveBeenCalled();
  });
});