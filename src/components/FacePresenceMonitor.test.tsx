import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FacePresenceMonitor from './FacePresenceMonitor';

const detectForVideo = vi.fn();
const close = vi.fn();

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: vi.fn().mockResolvedValue({}) },
  FaceDetector: {
    createFromOptions: vi.fn().mockResolvedValue({ detectForVideo, close }),
  },
}));

describe('FacePresenceMonitor', () => {
  const stop = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) },
    });
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('detects presence locally, reports away, and stops the camera', async () => {
    const onPresenceChange = vi.fn();
    detectForVideo.mockReturnValue({ detections: [{}] });
    render(<FacePresenceMonitor onPresenceChange={onPresenceChange} />);

    fireEvent.click(screen.getByRole('button', { name: /start presence detection/i }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByText(/looking for a face/i)).toBeInTheDocument();
    const video = screen.getByLabelText('Local camera preview');
    Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });
    await act(async () => vi.advanceTimersByTime(1500));
    expect(screen.getByText(/present: face detected locally/i)).toBeInTheDocument();
    expect(onPresenceChange).toHaveBeenCalledWith('present');

    detectForVideo.mockReturnValue({ detections: [] });
    await act(async () => vi.advanceTimersByTime(10_500));
    expect(screen.getByText(/away: no face detected/i)).toBeInTheDocument();
    expect(onPresenceChange).toHaveBeenCalledWith('away');

    fireEvent.click(screen.getByRole('button', { name: /stop camera/i }));
    expect(stop).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect(onPresenceChange).toHaveBeenCalledWith('off');
  });
});