import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiTutorChat from './AiTutorChat';
import type { Activity, ChatMessage, QuizQuestion } from '../types';

vi.mock('../services/supabaseClient', () => ({ isSupabaseConfigured: false, supabase: null }));

const initialMessages: ChatMessage[] = [
  { id: 'welcome', role: 'ai', text: 'Hi! Ask me anything.' },
];

const quizQuestions: QuizQuestion[] = [
  { id: 'q1', prompt: 'What is JSX?', choices: ['A syntax extension', 'A database'], correctIndex: 0 },
];

function quizActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'quiz-1',
    title: 'Testing Fundamentals Quiz',
    type: 'quiz',
    topic: 'Testing',
    status: 'not-started',
    questions: quizQuestions,
    ...overrides,
  };
}

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
  const view = render(<AiTutorChat {...props} />);
  return { onSend, onApiKeyChange, ...view };
}

describe('AiTutorChat', () => {
  afterEach(() => vi.unstubAllGlobals());

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

  it('transcribes a spoken tutor instruction into the editable question field', async () => {
    const user = userEvent.setup();
    class MockSpeechRecognition {
      static latest: MockSpeechRecognition | null = null;
      continuous = false;
      interimResults = false;
      lang = '';
      onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null = null;
      onerror = null;
      onend: (() => void) | null = null;
      constructor() { MockSpeechRecognition.latest = this; }
      start() {}
      stop() { this.onend?.(); }
      abort() {}
    }
    vi.stubGlobal('SpeechRecognition', MockSpeechRecognition);
    renderChat();

    await user.click(screen.getByRole('button', { name: /start voice input/i }));
    act(() => {
      MockSpeechRecognition.latest?.onresult?.({ results: [{ 0: { transcript: 'Explain this React error' } }] });
      MockSpeechRecognition.latest?.onend?.();
    });

    expect(screen.getByLabelText('Ask a question')).toHaveValue('Explain this React error');
    expect(screen.getByRole('button', { name: /start voice input/i })).toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /use your own openai key/i }));
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

  it('resets to a fresh quiz when retaking the same quiz immediately after finishing it', async () => {
    const user = userEvent.setup();
    const activity = quizActivity();
    const { rerender } = renderChat({ activities: [activity], autoStartQuizId: null });

    rerender(
      <AiTutorChat
        messages={initialMessages}
        isThinking={false}
        liveAiNotice={null}
        apiKey=""
        onApiKeyChange={() => {}}
        onSend={() => {}}
        activities={[activity]}
        autoStartQuizId="quiz-1"
        onAutoStartQuizHandled={() => {}}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'A syntax extension' }));
    await user.click(screen.getByRole('button', { name: 'Submit quiz' }));
    expect(screen.getByText('Quiz complete!')).toBeInTheDocument();

    // Simulate the parent clearing then re-setting autoStartQuizId, as happens on a real "Retake" click.
    rerender(
      <AiTutorChat
        messages={initialMessages}
        isThinking={false}
        liveAiNotice={null}
        apiKey=""
        onApiKeyChange={() => {}}
        onSend={() => {}}
        activities={[{ ...activity, status: 'completed' }]}
        autoStartQuizId={null}
        onAutoStartQuizHandled={() => {}}
      />,
    );
    rerender(
      <AiTutorChat
        messages={initialMessages}
        isThinking={false}
        liveAiNotice={null}
        apiKey=""
        onApiKeyChange={() => {}}
        onSend={() => {}}
        activities={[{ ...activity, status: 'completed' }]}
        autoStartQuizId="quiz-1"
        onAutoStartQuizHandled={() => {}}
      />,
    );

    expect(screen.queryByText('Quiz complete!')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit quiz' })).toBeInTheDocument();
  });

  it('requests fresh live quiz questions from onRequestQuiz when starting a quiz', async () => {
    const activity = quizActivity();
    const liveQuestions: QuizQuestion[] = [
      { id: 'live-1', prompt: 'Live question?', choices: ['Yes', 'No'], correctIndex: 0 },
    ];
    const onRequestQuiz = vi.fn().mockResolvedValue(liveQuestions);

    renderChat({ activities: [activity], onRequestQuiz, autoStartQuizId: 'quiz-1', onAutoStartQuizHandled: () => {} });

    expect(await screen.findByText(/live question\?/i)).toBeInTheDocument();
    expect(onRequestQuiz).toHaveBeenCalledWith(activity);
  });
});
