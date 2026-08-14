import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiTutorChat from './AiTutorChat';
import type { ChatMessage } from '../types';

const initialMessages: ChatMessage[] = [
  { id: 'welcome', role: 'ai', text: 'Hi! Ask me anything.' },
];

describe('AiTutorChat', () => {
  it('renders the initial welcome message', () => {
    render(<AiTutorChat initialMessages={initialMessages} />);
    expect(screen.getByText('Hi! Ask me anything.')).toBeInTheDocument();
  });

  it('sends a question and shows a simulated AI response', async () => {
    const user = userEvent.setup();
    render(<AiTutorChat initialMessages={initialMessages} />);

    const input = screen.getByLabelText('Ask a question');
    await user.type(input, 'Why is my React component re-rendering?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Why is my React component re-rendering?')).toBeInTheDocument();
    expect(input).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText(/re-render/i, { selector: '.bg-indigo-50' })).toBeInTheDocument();
    });
    expect(input).not.toBeDisabled();
  });

  it('ignores empty submissions', async () => {
    const user = userEvent.setup();
    render(<AiTutorChat initialMessages={initialMessages} />);

    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getAllByText('Hi! Ask me anything.')).toHaveLength(1);
  });
});
