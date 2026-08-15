import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export type RealtimeVoicePhase = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface RealtimeTranscript {
  id: string;
  role: 'learner' | 'ai';
  text: string;
  final: boolean;
}

interface RealtimeEvent {
  type?: string;
  item_id?: string;
  response_id?: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
}

export function useRealtimeVoiceSession() {
  const [phase, setPhase] = useState<RealtimeVoicePhase>('idle');
  const [transcripts, setTranscripts] = useState<RealtimeTranscript[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const elapsedTimerRef = useRef<number | null>(null);
  const sessionTimeoutRef = useRef<number | null>(null);

  const updateTranscript = useCallback((id: string, role: 'learner' | 'ai', text: string, final: boolean) => {
    if (!text) return;
    setTranscripts((current) => {
      const existing = current.find((item) => item.id === id);
      if (existing) {
        return current.map((item) => item.id === id ? { ...item, text: final ? text : `${item.text}${text}`, final } : item);
      }
      return [...current, { id, role, text, final }].slice(-12);
    });
  }, []);

  const handleEvent = useCallback((message: MessageEvent<string>) => {
    let event: RealtimeEvent;
    try {
      event = JSON.parse(message.data) as RealtimeEvent;
    } catch {
      return;
    }
    const id = event.item_id ?? event.response_id ?? `voice-${Date.now()}`;
    switch (event.type) {
      case 'session.created':
      case 'session.updated':
      case 'response.done':
        setPhase('listening');
        break;
      case 'input_audio_buffer.speech_started':
        setPhase('listening');
        break;
      case 'input_audio_buffer.speech_stopped':
      case 'response.created':
        setPhase('thinking');
        break;
      case 'conversation.item.input_audio_transcription.delta':
        updateTranscript(id, 'learner', event.delta ?? '', false);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        updateTranscript(id, 'learner', event.transcript ?? '', true);
        break;
      case 'response.output_audio_transcript.delta':
        setPhase('speaking');
        updateTranscript(id, 'ai', event.delta ?? '', false);
        break;
      case 'response.output_audio_transcript.done':
        updateTranscript(id, 'ai', event.transcript ?? '', true);
        break;
      case 'error':
        setError(event.error?.message ?? 'The live voice service reported an error.');
        setPhase('error');
        break;
    }
  }, [updateTranscript]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (elapsedTimerRef.current !== null) window.clearInterval(elapsedTimerRef.current);
    if (sessionTimeoutRef.current !== null) window.clearTimeout(sessionTimeoutRef.current);
    elapsedTimerRef.current = null;
    sessionTimeoutRef.current = null;
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
    setIsMuted(false);
    setElapsedSeconds(0);
    setPhase('idle');
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async (learningContext: string) => {
    if (!supabase) {
      setError('Live voice requires a signed-in Supabase session.');
      setPhase('error');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      setError('Live voice is not supported in this browser. Use Chrome or Edge.');
      setPhase('error');
      return;
    }
    setError(null);
    setTranscripts([]);
    setPhase('connecting');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Sign in before starting the live voice tutor.');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const peer = new RTCPeerConnection();
      const channel = peer.createDataChannel('oai-events');
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audioRef.current = audio;
      streamRef.current = stream;
      peerRef.current = peer;
      channelRef.current = channel;
      activeRef.current = true;

      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        void audio.play().catch(() => undefined);
      };
      channel.addEventListener('message', handleEvent);
      channel.addEventListener('open', () => activeRef.current && setPhase('listening'));
      channel.addEventListener('close', () => activeRef.current && stop());
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const safeContext = learningContext.replace(/[^\x20-\x7E]/g, ' ').slice(0, 2000);
      const response = await fetch('/api/realtime-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Learning-Context': safeContext,
        },
        body: JSON.stringify({ sdp: offer.sdp }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error || 'The live voice session could not start.');
      }
      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() });
      const startedAt = Date.now();
      elapsedTimerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
      sessionTimeoutRef.current = window.setTimeout(() => {
        stop();
        setError('Voice session ended automatically after 15 minutes.');
      }, 15 * 60 * 1000);
    } catch (caughtError) {
      stop();
      setError(
        caughtError instanceof DOMException && caughtError.name === 'NotAllowedError'
          ? 'Microphone permission was cancelled or blocked.'
          : caughtError instanceof Error
            ? caughtError.message
            : 'The live voice tutor could not start.',
      );
      setPhase('error');
    }
  }, [handleEvent, stop]);

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  const interrupt = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return;
    channel.send(JSON.stringify({ type: 'response.cancel' }));
    channel.send(JSON.stringify({ type: 'output_audio_buffer.clear' }));
    setPhase('listening');
  }, []);

  const shareScreenObservation = useCallback((observation: string): boolean => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return false;
    const sanitized = observation.replace(/[\r\n]+/g, ' ').trim().slice(0, 1200);
    if (!sanitized) return false;
    channel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [{
          type: 'input_text',
          text: `Learner-approved screen observation (sampled and may be delayed): ${sanitized}`,
        }],
      },
    }));
    return true;
  }, []);

  const clearScreenObservationContext = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') return;
    channel.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [{
          type: 'input_text',
          text: 'Screen observation sharing is now inactive. Treat earlier screen observations as historical and do not claim current screen visibility.',
        }],
      },
    }));
  }, []);

  return {
    phase,
    transcripts,
    isMuted,
    elapsedSeconds,
    error,
    start,
    stop,
    toggleMute,
    interrupt,
    shareScreenObservation,
    clearScreenObservationContext,
  };
}