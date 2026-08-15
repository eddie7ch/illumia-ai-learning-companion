import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RealtimeVoiceTutor from './RealtimeVoiceTutor';
import { useRealtimeVoiceSession } from '../hooks/useRealtimeVoiceSession';
import { useScreenObservation } from '../context/useScreenObservation';

vi.mock('../hooks/useRealtimeVoiceSession', () => ({ useRealtimeVoiceSession: vi.fn() }));
vi.mock('../context/useScreenObservation', () => ({ useScreenObservation: vi.fn() }));

const controls = {
  start: vi.fn(),
  stop: vi.fn(),
  toggleMute: vi.fn(),
  interrupt: vi.fn(),
  shareScreenObservation: vi.fn(() => true),
  clearScreenObservationContext: vi.fn(),
};

describe('RealtimeVoiceTutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useScreenObservation).mockReturnValue({
      latestObservation: null,
      isScreenAnalysisActive: false,
      publishObservation: vi.fn(),
      setScreenAnalysisActive: vi.fn(),
      clearObservation: vi.fn(),
    });
  });

  it('starts a context-grounded voice session', async () => {
    vi.mocked(useRealtimeVoiceSession).mockReturnValue({ phase: 'idle', transcripts: [], isMuted: false, elapsedSeconds: 0, budgetStatus: null, error: null, ...controls });
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
      budgetStatus: null,
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

  it('shares each approved observation once and clears visibility when analysis stops', async () => {
    const observation = {
      id: 'observation-1',
      observedAt: '2026-08-15T12:00:00Z',
      summary: 'The learner is editing a React component.',
      action: 'Adding a useState hook',
      evidence: 'useState is visible in the editor',
      confidence: 0.91,
      activityTitle: 'State lesson',
      imageDataUrl: 'data:image/jpeg;base64,frame',
    };
    vi.mocked(useRealtimeVoiceSession).mockReturnValue({
      phase: 'listening', transcripts: [], isMuted: false, elapsedSeconds: 12, budgetStatus: null, error: null, ...controls,
    });
    vi.mocked(useScreenObservation).mockReturnValue({
      latestObservation: observation,
      isScreenAnalysisActive: true,
      publishObservation: vi.fn(),
      setScreenAnalysisActive: vi.fn(),
      clearObservation: vi.fn(),
    });
    const user = userEvent.setup();
    const view = render(<RealtimeVoiceTutor activities={[]} />);
    await user.click(screen.getByRole('checkbox', { name: /share changed, reduced screen samples/i }));
    expect(controls.shareScreenObservation).toHaveBeenCalledWith(
      expect.stringContaining('Adding a useState hook'),
      'data:image/jpeg;base64,frame',
    );
    expect(controls.shareScreenObservation).toHaveBeenCalledTimes(1);

    vi.mocked(useScreenObservation).mockReturnValue({
      latestObservation: observation,
      isScreenAnalysisActive: false,
      publishObservation: vi.fn(),
      setScreenAnalysisActive: vi.fn(),
      clearObservation: vi.fn(),
    });
    view.rerender(<RealtimeVoiceTutor activities={[]} />);
    expect(controls.clearScreenObservationContext).toHaveBeenCalledTimes(1);
  });
});