import { describe, expect, it, vi } from 'vitest';
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

  it('opens a feedback drawer when the toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<ActivityCard activity={activityWithFeedback} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view ai feedback/i }));

    const drawer = screen.getByRole('dialog', { name: activityWithFeedback.title });
    expect(drawer).toBeInTheDocument();
    expect(screen.getByText('85/100')).toBeInTheDocument();
    expect(screen.getByText(/Good component structure/)).toBeInTheDocument();
    expect(screen.getByText(/Add unit tests/)).toBeInTheDocument();
  });

  it('closes the drawer when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActivityCard activity={activityWithFeedback} />);

    await user.click(screen.getByRole('button', { name: /view ai feedback/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  const quizActivity: Activity = {
    id: 'quiz-2',
    title: 'Testing Fundamentals Quiz',
    type: 'quiz',
    topic: 'Testing',
    status: 'not-started',
    questions: [
      {
        id: 'q1',
        prompt: 'What is 2 + 2?',
        choices: ['3', '4'],
        correctIndex: 1,
      },
      {
        id: 'q2',
        prompt: 'What is the capital of France?',
        choices: ['Paris', 'London'],
        correctIndex: 0,
      },
    ],
  };

  it('shows a Start quiz button for a not-started quiz with questions', () => {
    render(<ActivityCard activity={quizActivity} />);
    expect(screen.getByRole('button', { name: /start quiz/i })).toBeInTheDocument();
  });

  it('does not show a Start quiz button once the quiz is completed', () => {
    render(<ActivityCard activity={{ ...quizActivity, status: 'completed' }} />);
    expect(screen.queryByRole('button', { name: /start quiz/i })).not.toBeInTheDocument();
  });

  it('reports a completed quiz score back through onCompleteQuiz', async () => {
    const user = userEvent.setup();
    const onCompleteQuiz = vi.fn();
    render(<ActivityCard activity={quizActivity} onCompleteQuiz={onCompleteQuiz} />);

    await user.click(screen.getByRole('button', { name: /start quiz/i }));
    await user.click(screen.getByRole('radio', { name: '4' }));
    await user.click(screen.getByRole('radio', { name: 'Paris' }));
    await user.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(onCompleteQuiz).toHaveBeenCalledTimes(1);
    const [activityId, feedback, timeSpentMinutes] = onCompleteQuiz.mock.calls[0];
    expect(activityId).toBe('quiz-2');
    expect(feedback.score).toBe(100);
    expect(feedback.suggestions).toHaveLength(0);
    expect(timeSpentMinutes).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/quiz complete/i)).toBeInTheDocument();
  });

  const quizActivityWithoutBank: Activity = {
    id: 'quiz-3',
    title: 'Live AI Quiz',
    type: 'quiz',
    topic: 'Testing',
    status: 'not-started',
  };

  it('shows a Start quiz button even without a static question bank when onRequestQuiz is provided', () => {
    render(<ActivityCard activity={quizActivityWithoutBank} onRequestQuiz={vi.fn()} />);
    expect(screen.getByRole('button', { name: /start quiz/i })).toBeInTheDocument();
  });

  it('fetches live quiz questions from a real AI call when starting a quiz', async () => {
    const user = userEvent.setup();
    const onRequestQuiz = vi.fn().mockResolvedValue([
      { id: 'live-1', prompt: 'What is a closure?', choices: ['A loop', 'A function with retained scope'], correctIndex: 1 },
    ]);
    render(<ActivityCard activity={quizActivityWithoutBank} onRequestQuiz={onRequestQuiz} />);

    await user.click(screen.getByRole('button', { name: /start quiz/i }));

    expect(onRequestQuiz).toHaveBeenCalledWith(quizActivityWithoutBank);
    expect(await screen.findByText(/what is a closure/i)).toBeInTheDocument();
  });

  it('shows a retry option when live quiz generation fails', async () => {
    const user = userEvent.setup();
    const onRequestQuiz = vi.fn().mockRejectedValue(new Error('AI rate limit reached.'));
    render(<ActivityCard activity={quizActivityWithoutBank} onRequestQuiz={onRequestQuiz} />);

    await user.click(screen.getByRole('button', { name: /start quiz/i }));

    expect(await screen.findByText('AI rate limit reached.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows "Take in AI chat" and "Retake in AI chat" without a static bank when onRequestQuiz is available', () => {
    const { rerender } = render(
      <ActivityCard activity={quizActivityWithoutBank} onRequestQuiz={vi.fn()} onStartQuizInChat={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /take in ai chat/i })).toBeInTheDocument();

    rerender(
      <ActivityCard
        activity={{ ...quizActivityWithoutBank, status: 'completed', feedback: { score: 90, strengths: [], suggestions: [] } }}
        onRequestQuiz={vi.fn()}
        onStartQuizInChat={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /retake in ai chat/i })).toBeInTheDocument();
  });
});
