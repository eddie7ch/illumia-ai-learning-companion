import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ScreenShareMonitor from './ScreenShareMonitor';
import { hasMeaningfulVisualChange } from '../utils/visualChange';
import { deleteScreenRecording, listDiaryEntries, observeScreen, saveSessionSummary, uploadRecordingVideo } from '../services/screenRecordingService';
import type { Activity } from '../types';

vi.mock('../services/screenRecordingService', () => ({
  saveSessionSummary: vi.fn(),
  listDiaryEntries: vi.fn(),
  deleteScreenRecording: vi.fn(),
  observeScreen: vi.fn(),
  uploadRecordingVideo: vi.fn(),
}));

const activity: Activity = {
  id: 'activity-1',
  title: 'State and Props Deep Dive',
  topic: 'React state',
  type: 'lesson',
  status: 'in-progress',
};

class MockMediaRecorder extends EventTarget {
  static isTypeSupported = vi.fn(() => true);
  state: RecordingState = 'inactive';
  mimeType = 'video/webm';
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    const dataEvent = new Event('dataavailable') as BlobEvent;
    Object.defineProperty(dataEvent, 'data', { value: new Blob(['recording'], { type: this.mimeType }) });
    this.dispatchEvent(dataEvent);
    this.dispatchEvent(new Event('stop'));
  }
}

function mockDisplayMedia() {
  const stop = vi.fn();
  const videoTrack = new EventTarget() as MediaStreamTrack;
  Object.assign(videoTrack, { stop });
  const stream = { getTracks: () => [videoTrack], getVideoTracks: () => [videoTrack] } as unknown as MediaStream;
  const getDisplayMedia = vi.fn().mockResolvedValue(stream);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getDisplayMedia } });
  return { getDisplayMedia, stop, videoTrack };
}

describe('ScreenShareMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:recording'), revokeObjectURL: vi.fn() });
    vi.mocked(listDiaryEntries).mockResolvedValue([]);
    vi.mocked(deleteScreenRecording).mockResolvedValue();
    vi.mocked(uploadRecordingVideo).mockResolvedValue({ storagePath: 'user-1/recording.webm', sizeBytes: 12345 });
    vi.mocked(saveSessionSummary).mockResolvedValue({
      id: 'diary-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      durationSeconds: 0,
      analysis: { summary: 'Auto-saved summary', observedWork: [], suggestedActivity: null, privacyNotes: [] },
      hasStoredVideo: false,
    });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('requires explicit consent before recording', () => {
    mockDisplayMedia();
    render(<ScreenShareMonitor activities={[activity]} />);
    expect(screen.getByRole('button', { name: /choose screen and record/i })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /i consent/i })).not.toBeChecked();
  });

  it('detects meaningful visual changes and rejects duplicate frames', () => {
    expect(hasMeaningfulVisualChange(null, [20, 20, 20])).toBe(true);
    expect(hasMeaningfulVisualChange([20, 20, 20], [20, 20, 20])).toBe(false);
    expect(hasMeaningfulVisualChange([20, 20, 20], [40, 40, 40])).toBe(true);
  });

  it('records the selected source and offers a local download', async () => {
    const user = userEvent.setup();
    const { getDisplayMedia, stop } = mockDisplayMedia();
    render(<ScreenShareMonitor activities={[activity]} />);
    await user.click(screen.getByRole('checkbox', { name: /i consent/i }));
    await user.click(screen.getByRole('button', { name: /choose screen and record/i }));
    expect(getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false });
    expect(await screen.findByText('Recording now')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    expect(stop).toHaveBeenCalledOnce();
    expect(await screen.findByRole('link', { name: /download locally/i })).toHaveAttribute('href', 'blob:recording');
  });

  it('opens a floating recording indicator and closes it when recording stops', async () => {
    const user = userEvent.setup();
    mockDisplayMedia();
    let pictureInPictureElement: Element | null = null;
    const exitPictureInPicture = vi.fn(async () => { pictureInPictureElement = null; });
    Object.defineProperties(document, {
      pictureInPictureEnabled: { configurable: true, value: true },
      pictureInPictureElement: { configurable: true, get: () => pictureInPictureElement },
      exitPictureInPicture: { configurable: true, value: exitPictureInPicture },
    });
    render(<ScreenShareMonitor activities={[activity]} />);
    await user.click(screen.getByRole('checkbox', { name: /i consent/i }));
    await user.click(screen.getByRole('button', { name: /choose screen and record/i }));
    const preview = screen.getByLabelText('Shared screen preview') as HTMLVideoElement;
    const requestPictureInPicture = vi.fn(async () => {
      pictureInPictureElement = preview;
      return {} as PictureInPictureWindow;
    });
    Object.defineProperty(preview, 'requestPictureInPicture', { configurable: true, value: requestPictureInPicture });

    await user.click(screen.getByRole('button', { name: /float recording indicator/i }));
    expect(requestPictureInPicture).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /close floating indicator/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    expect(exitPictureInPicture).toHaveBeenCalledOnce();
  });

  it('saves a local-only learning-diary summary from sampled frames when analyzing without uploading the video', async () => {
    const user = userEvent.setup();
    mockDisplayMedia();
    vi.mocked(saveSessionSummary).mockResolvedValue({
      id: 'diary-2',
      createdAt: '2026-01-01T00:00:00.000Z',
      durationSeconds: 0,
      analysis: { summary: 'The learner is practicing React state.', observedWork: ['Editing a React component'], suggestedActivity: 'State and Props Deep Dive', privacyNotes: [] },
      hasStoredVideo: false,
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,frame');
    render(<ScreenShareMonitor activities={[activity]} />);
    await user.click(screen.getByRole('checkbox', { name: /i consent/i }));
    await user.click(screen.getByRole('button', { name: /choose screen and record/i }));
    const preview = screen.getByLabelText('Shared screen preview');
    Object.defineProperties(preview, { readyState: { configurable: true, value: 2 }, videoWidth: { configurable: true, value: 1280 }, videoHeight: { configurable: true, value: 720 } });
    fireEvent.loadedData(preview);
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    await screen.findByText(/recording ready/i);
    await user.click(screen.getByRole('button', { name: /analyze \(video stays local\)/i }));
    await waitFor(() => expect(saveSessionSummary).toHaveBeenCalled());
    expect(saveSessionSummary).toHaveBeenCalledWith(expect.any(Number), ['data:image/jpeg;base64,frame', 'data:image/jpeg;base64,frame'], [], undefined);
    expect(uploadRecordingVideo).not.toHaveBeenCalled();
    expect(await screen.findByText('The learner is practicing React state.')).toBeInTheDocument();
  });

  it('uploads the full video before saving a diary summary when the learner chooses the upload option', async () => {
    const user = userEvent.setup();
    mockDisplayMedia();
    vi.mocked(saveSessionSummary).mockResolvedValue({
      id: 'diary-4',
      createdAt: '2026-01-01T00:00:00.000Z',
      durationSeconds: 0,
      analysis: { summary: 'Uploaded and analyzed session.', observedWork: [], suggestedActivity: null, privacyNotes: [] },
      hasStoredVideo: true,
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,frame');
    render(<ScreenShareMonitor activities={[activity]} />);
    await user.click(screen.getByRole('checkbox', { name: /i consent/i }));
    await user.click(screen.getByRole('button', { name: /choose screen and record/i }));
    const preview = screen.getByLabelText('Shared screen preview');
    Object.defineProperties(preview, { readyState: { configurable: true, value: 2 }, videoWidth: { configurable: true, value: 1280 }, videoHeight: { configurable: true, value: 720 } });
    fireEvent.loadedData(preview);
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    await screen.findByText(/recording ready/i);
    await user.click(screen.getByRole('button', { name: /analyze \+ upload full video/i }));
    await waitFor(() => expect(uploadRecordingVideo).toHaveBeenCalledOnce());
    await waitFor(() => expect(saveSessionSummary).toHaveBeenCalledWith(
      expect.any(Number),
      ['data:image/jpeg;base64,frame', 'data:image/jpeg;base64,frame'],
      [],
      { storagePath: 'user-1/recording.webm', sizeBytes: 12345 },
    ));
    expect(await screen.findByText('Uploaded and analyzed session.')).toBeInTheDocument();
  });

  it('shows live questions and updates progress only after confirmation', async () => {
    const user = userEvent.setup();
    const onConfirmProgress = vi.fn();
    mockDisplayMedia();
    vi.mocked(observeScreen).mockResolvedValue({
      id: 'observation-1',
      observedAt: '2026-08-15T12:00:00.000Z',
      summary: 'Editing a React state example.',
      action: 'Adding a useState hook.',
      activityId: activity.id,
      activityTitle: activity.title,
      confidence: 0.9,
      evidence: 'A component and useState call are visible.',
      progressEvidence: 'The state setter is being added to the activity code.',
      suggestedMinutes: 1,
      confusionDetected: true,
      repeatedAttemptDetected: false,
      question: 'Why should state be updated with its setter?',
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,frame');
    render(<ScreenShareMonitor activities={[activity]} onConfirmProgress={onConfirmProgress} />);

    await user.click(screen.getByRole('checkbox', { name: /i consent/i }));
    await user.click(screen.getByRole('button', { name: /choose screen and record/i }));
    const preview = screen.getByLabelText('Shared screen preview');
    Object.defineProperties(preview, { readyState: { configurable: true, value: 2 }, videoWidth: { configurable: true, value: 1280 }, videoHeight: { configurable: true, value: 720 } });
    await user.click(screen.getByRole('button', { name: /disable questions/i }));
    expect(screen.getByRole('button', { name: /enable questions/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /pause ai analysis/i }));
    expect(screen.getByRole('button', { name: /resume ai analysis/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /analyze now/i }));

    expect(await screen.findByText('Why should state be updated with its setter?')).toBeInTheDocument();
    expect(screen.getByText(/possible confusion detected/i)).toBeInTheDocument();
    expect(onConfirmProgress).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /confirm progress/i }));
    expect(onConfirmProgress).toHaveBeenCalledWith(activity.id, 1);
    expect(observeScreen).toHaveBeenCalledWith(
      'data:image/jpeg;base64,frame',
      [activity],
      [],
      false,
      expect.any(AbortSignal),
    );
  });

  it('aborts an in-flight observation as soon as recording stops', async () => {
    const user = userEvent.setup();
    mockDisplayMedia();
    vi.mocked(observeScreen).mockImplementation(() => new Promise(() => {}));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,frame');
    render(<ScreenShareMonitor activities={[activity]} />);
    await user.click(screen.getByRole('checkbox', { name: /i consent/i }));
    await user.click(screen.getByRole('button', { name: /choose screen and record/i }));
    const preview = screen.getByLabelText('Shared screen preview');
    Object.defineProperties(preview, { readyState: { configurable: true, value: 2 }, videoWidth: { configurable: true, value: 1280 }, videoHeight: { configurable: true, value: 720 } });
    await user.click(screen.getByRole('button', { name: /analyze now/i }));
    const signal = vi.mocked(observeScreen).mock.calls[0][4];
    expect(signal?.aborted).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /stop recording/i }));
    await waitFor(() => expect(signal?.aborted).toBe(true));
  });

  it('discards the local recording preview without calling any save API', async () => {
    const user = userEvent.setup();
    mockDisplayMedia();
    render(<ScreenShareMonitor activities={[activity]} />);
    await user.click(screen.getByRole('checkbox', { name: /i consent/i }));
    await user.click(screen.getByRole('button', { name: /choose screen and record/i }));
    await user.click(screen.getByRole('button', { name: /stop recording/i }));
    await screen.findByText(/recording ready/i);
    await user.click(screen.getByRole('button', { name: /discard recording/i }));
    expect(screen.queryByText(/recording ready/i)).not.toBeInTheDocument();
    expect(deleteScreenRecording).not.toHaveBeenCalled();
  });

  it('loads and deletes a learning diary entry', async () => {
    const user = userEvent.setup();
    mockDisplayMedia();
    vi.mocked(listDiaryEntries).mockResolvedValue([
      {
        id: 'diary-3',
        createdAt: '2026-01-01T00:00:00.000Z',
        durationSeconds: 90,
        analysis: { summary: 'Previously saved summary', observedWork: [], suggestedActivity: null, privacyNotes: [] },
        hasStoredVideo: false,
      },
    ]);
    render(<ScreenShareMonitor activities={[activity]} />);
    expect(await screen.findByText('Previously saved summary')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /delete diary entry/i }));
    expect(deleteScreenRecording).toHaveBeenCalledWith('diary-3');
    await waitFor(() => expect(screen.queryByText('Previously saved summary')).not.toBeInTheDocument());
  });

  it('stops when the browser sharing control ends capture', async () => {
    const user = userEvent.setup();
    const { stop, videoTrack } = mockDisplayMedia();
    render(<ScreenShareMonitor activities={[activity]} />);
    await user.click(screen.getByRole('checkbox', { name: /i consent/i }));
    await user.click(screen.getByRole('button', { name: /choose screen and record/i }));
    videoTrack.dispatchEvent(new Event('ended'));
    await waitFor(() => expect(stop).toHaveBeenCalledOnce());
    expect(await screen.findByRole('link', { name: /download locally/i })).toBeInTheDocument();
  });
});