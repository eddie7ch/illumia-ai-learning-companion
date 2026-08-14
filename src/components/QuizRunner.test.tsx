import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizRunner from './QuizRunner';
import type { QuizQuestion } from '../types';

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'Which is a primary color?',
    choices: ['Green', 'Red'],
    correctIndex: 1,
    explanation: 'Red is a primary color; green is a secondary color.',
  },
];

describe('QuizRunner', () => {
  it('disables submit until every question is answered', async () => {
    const user = userEvent.setup();
    render(<QuizRunner questions={questions} onSubmit={vi.fn()} />);

    expect(screen.getByRole('button', { name: /submit quiz/i })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Red' }));
    expect(screen.getByRole('button', { name: /submit quiz/i })).toBeEnabled();
  });

  it('shows the explanation as a suggestion when an answer is wrong', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<QuizRunner questions={questions} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('radio', { name: 'Green' }));
    await user.click(screen.getByRole('button', { name: /submit quiz/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].feedback.score).toBe(0);
    expect(screen.getByText(/Red is a primary color/)).toBeInTheDocument();
  });
});
