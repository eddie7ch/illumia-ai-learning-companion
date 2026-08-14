import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityCard from './ActivityCard';
import type { Activity } from '../types';

const activityWithFeedback: Activity = {
  id: 'exercise-1',
  title: 'Build a Todo Application',
  type: 'exercise',
  topic: 'State Management',
  status: 'completed',
  completedOn: '2026-07-28',
  feedback: {
    score: 85,
    strengths: ['Good component structure'],
    suggestions: ['Add unit tests'],
  },
};

const activityWithoutFeedback: Activity = {
  id: 'quiz-2',
  title: 'Testing Fundamentals Quiz',
  type: 'quiz',
  topic: 'Testing',
  status: 'not-started',
};

describe('ActivityCard', () => {
  it('renders activity details and status', () => {
    render(<ActivityCard activity={activityWithoutFeedback} />);
    expect(screen.getByText('Testing Fundamentals Quiz')).toBeInTheDocument();
    expect(screen.getByText('Not started')).toBeInTheDocument();
  });

  it('does not show a feedback toggle when there is no feedback', () => {
    render(<ActivityCard activity={activityWithoutFeedback} />);
    expect(screen.queryByRole('button', { name: /view ai feedback/i })).not.toBeInTheDocument();
  });

  it('reveals AI feedback when the toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<ActivityCard activity={activityWithFeedback} />);

    expect(screen.queryByText('85/100')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view ai feedback/i }));

    expect(screen.getByText('85/100')).toBeInTheDocument();
    expect(screen.getByText(/Good component structure/)).toBeInTheDocument();
    expect(screen.getByText(/Add unit tests/)).toBeInTheDocument();
  });
});
