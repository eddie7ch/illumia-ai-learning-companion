import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiTutorChat from './AiTutorChat';
import type { ChatMessage } from '../types';

const initialMessages: ChatMessage[] = [
  { id: 'welcome', role: 'ai', text: 'Hi! Ask me anything.' },
];

function renderChat(overrides: Partial<Parameters<typeof AiTutorChat>[0]> = {}) {
  const onSend = vi.fn();
  const onApiKeyChange = vi.fn();
  const props = {
    messages: initialMessages,
    isThinking: false,
    liveAiNotice: null,
    apiKey: '',
    onApiKeyChange,
    onSend,
    ...overrides,
  };
  render(<AiTutorChat {...props} />);
  return { onSend, onApiKeyChange };
}

describe('AiTutorChat', () => {
  it('renders the initial welcome message', () => {
    renderChat();
    expect(screen.getByText('Hi! Ask me anything.')).toBeInTheDocument();
  });

  it('calls onSend with the typed question and clears the input', async () => {
    const user = userEvent.setup();
    const { onSend } = renderChat();

    const input = screen.getByLabelText('Ask a question');
    await user.type(input, 'Why is my React component re-rendering?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith('Why is my React component re-rendering?');
    expect(input).toHaveValue('');
  });

  it('ignores empty submissions', async () => {
    const user = userEvent.setup();
    const { onSend } = renderChat();

    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it('disables the input while thinking', () => {
    renderChat({ isThinking: true });
    expect(screen.getByLabelText('Ask a question')).toBeDisabled();
  });

  it('shows "Simulated" by default and "Live AI" once a key is present', () => {
    const { rerender } = render(
      <AiTutorChat
        messages={initialMessages}
        isThinking={false}
        liveAiNotice={null}
        apiKey=""
        onApiKeyChange={() => {}}
        onSend={() => {}}
      />,
    );
    expect(screen.getByText('Simulated')).toBeInTheDocument();

    rerender(
      <AiTutorChat
        messages={initialMessages}
        isThinking={false}
        liveAiNotice={null}
        apiKey="sk-test"
        onApiKeyChange={() => {}}
        onSend={() => {}}
      />,
    );
    expect(screen.getByText('Live AI')).toBeInTheDocument();
  });

  it('calls onApiKeyChange when typing into the key panel', async () => {
    const user = userEvent.setup();
    const { onApiKeyChange } = renderChat();

    await user.click(screen.getByRole('button', { name: /connect a real ai/i }));
    await user.type(screen.getByLabelText('OpenAI API key'), 'k');

    expect(onApiKeyChange).toHaveBeenCalledWith('k');
  });

  it('shows the live AI notice when provided', () => {
    renderChat({ liveAiNotice: 'Live AI unavailable (network down). Showing a simulated response instead.' });
    expect(screen.getByText(/Live AI unavailable/i)).toBeInTheDocument();
  });

  it('fills the input when a quick-prompt pill is clicked, without sending it', async () => {
    const user = userEvent.setup();
    const { onSend } = renderChat();

    await user.click(screen.getByRole('button', { name: 'Why is my score low on this activity?' }));

    expect(screen.getByLabelText('Ask a question')).toHaveValue('Why is my score low on this activity?');
    expect(onSend).not.toHaveBeenCalled();
  });
});
