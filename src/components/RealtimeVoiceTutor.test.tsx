import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RealtimeVoiceTutor from './RealtimeVoiceTutor';
import { useRealtimeVoiceSession } from '../hooks/useRealtimeVoiceSession';

vi.mock('../hooks/useRealtimeVoiceSession', () => ({ useRealtimeVoiceSession: vi.fn() }));

const controls = {
  start: vi.fn(),
  stop: vi.fn(),
  toggleMute: vi.fn(),
  interrupt: vi.fn(),
};

describe('RealtimeVoiceTutor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts a context-grounded voice session', async () => {
    vi.mocked(useRealtimeVoiceSession).mockReturnValue({ phase: 'idle', transcripts: [], isMuted: false, elapsedSeconds: 0, error: null, ...controls });
    const user = userEvent.setup();
    render(<RealtimeVoiceTutor activities={[{ id: '1', title: 'State lesson', topic: 'State', type: 'lesson', status: 'in-progress' }]} />);
    await user.click(screen.getByRole('button', { name: /start live voice/i }));
    expect(controls.start).toHaveBeenCalledWith(expect.stringContaining('State lesson | topic State | in-progress'));
  });

  it('offers mute, interrupt, end, and visible transcript while speaking', async () => {
    vi.mocked(useRealtimeVoiceSession).mockReturnValue({
      phase: 'speaking',
      transcripts: [{ id: '1', role: 'ai', text: 'What happens when state changes?', final: true }],
      isMuted: false,
      elapsedSeconds: 42,
      error: null,
      ...controls,
    });
    const user = userEvent.setup();
    render(<RealtimeVoiceTutor activities={[]} />);
    expect(screen.getByText(/what happens when state changes/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /mute/i }));
    await user.click(screen.getByRole('button', { name: /interrupt/i }));
    await user.click(screen.getByRole('button', { name: /end voice/i }));
    expect(controls.toggleMute).toHaveBeenCalled();
    expect(controls.interrupt).toHaveBeenCalled();
    expect(controls.stop).toHaveBeenCalled();
  });
});