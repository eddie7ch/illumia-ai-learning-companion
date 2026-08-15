import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceNoteRecorder from './VoiceNoteRecorder';

class MockMediaRecorder extends EventTarget {
  state: RecordingState = 'inactive';
  mimeType = 'audio/webm';
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    const event = new Event('dataavailable') as BlobEvent;
    Object.defineProperty(event, 'data', { value: new Blob(['voice'], { type: this.mimeType }) });
    this.dispatchEvent(event);
    this.dispatchEvent(new Event('stop'));
  }
}

describe('VoiceNoteRecorder', () => {
  const stop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:voice-note'), revokeObjectURL: vi.fn() });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('records, downloads, and deletes a local voice note', async () => {
    const user = userEvent.setup();
    render(<VoiceNoteRecorder />);

    await user.click(screen.getByRole('button', { name: /record voice note/i }));
    await user.click(screen.getByRole('button', { name: /stop note/i }));

    expect(stop).toHaveBeenCalled();
    expect(await screen.findByRole('link', { name: /download/i })).toHaveAttribute('href', 'blob:voice-note');
    await user.click(screen.getByRole('button', { name: /delete voice note 1/i }));
    expect(screen.queryByRole('link', { name: /download/i })).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:voice-note');
  });
});