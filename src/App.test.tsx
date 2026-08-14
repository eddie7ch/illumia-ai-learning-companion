import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import type { Activity, ChatMessage, LearnerProfile, LearningPlanStep } from './types';

vi.mock('./services/aiService', () => ({
  fetchLearnerProfile: vi.fn(),
  fetchActivities: vi.fn(),
  fetchLearningPlan: vi.fn(),
  fetchInitialChatMessages: vi.fn(),
  requestTutorReply: vi.fn(),
}));

import {
  fetchActivities,
  fetchInitialChatMessages,
  fetchLearnerProfile,
  fetchLearningPlan,
  requestTutorReply,
} from './services/aiService';

// jsdom doesn't implement matchMedia; useTheme() reads it to detect the system color scheme.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const profile: LearnerProfile = {
  name: 'Jordan Lee',
  track: 'React Development',
  overallProgress: 62,
  strengths: ['Clear component structure'],
  improvementAreas: ['Performance optimization'],
  recommendation: { activityTitle: 'React Performance Optimization', reason: 'Improve rendering.' },
};
const activities: Activity[] = [];
const plan: LearningPlanStep[] = [{ id: 'p1', title: 'Step', description: 'Do it' }];
const welcome: ChatMessage[] = [{ id: 'welcome', role: 'ai', text: 'Hi Jordan!' }];

describe('App', () => {
  beforeEach(() => {
    vi.mocked(fetchLearnerProfile).mockResolvedValue(profile);
    vi.mocked(fetchActivities).mockResolvedValue(activities);
    vi.mocked(fetchLearningPlan).mockResolvedValue(plan);
    vi.mocked(fetchInitialChatMessages).mockReturnValue(welcome);
    vi.mocked(requestTutorReply).mockResolvedValue({ text: 'answer' });
  });

  it('renders a mobile floating action button that opens the AI tutor chat in a drawer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(screen.getByText(/Welcome back, Jordan/)).toBeInTheDocument());

    const fab = screen.getByRole('button', { name: 'Open AI tutor chat' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(fab);

    const dialog = screen.getByRole('dialog', { name: 'Ask your AI tutor' });
    expect(within(dialog).getByLabelText('Ask a question')).toBeInTheDocument();
  });

  it('closes the mobile chat drawer via its close button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => expect(screen.getByText(/Welcome back, Jordan/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Open AI tutor chat' }));
    const dialog = screen.getByRole('dialog', { name: 'Ask your AI tutor' });

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

