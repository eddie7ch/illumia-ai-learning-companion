import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { ChatMessage } from '../types';
import { getMockAiResponse } from '../data/aiTutor';

interface AiTutorChatProps {
  initialMessages: ChatMessage[];
}

const THINKING_DELAY_MS = 600;

export default function AiTutorChat({ initialMessages }: AiTutorChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, isThinking]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || isThinking) return;

    const learnerMessage: ChatMessage = {
      id: `learner-${Date.now()}`,
      role: 'learner',
      text: question,
    };

    setMessages((prev) => [...prev, learnerMessage]);
    setDraft('');
    setIsThinking(true);

    window.setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: getMockAiResponse(question),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsThinking(false);
    }, THINKING_DELAY_MS);
  };

  return (
    <section className="flex h-full flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-sm font-semibold text-slate-900">Ask your AI tutor</h2>
      <p className="mt-1 text-xs text-slate-400">
        Responses are simulated for this prototype.
      </p>

      <div
        className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1"
        style={{ maxHeight: '20rem' }}
        aria-live="polite"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              message.role === 'ai'
                ? 'bg-indigo-50 text-indigo-900'
                : 'ml-auto bg-slate-900 text-white'
            }`}
          >
            {message.text}
          </div>
        ))}
        {isThinking && (
          <div className="max-w-[85%] rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-400">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <label htmlFor="tutor-question" className="sr-only">
          Ask a question
        </label>
        <input
          id="tutor-question"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Why is my React component re-rendering?"
          disabled={isThinking}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={isThinking}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          Send
        </button>
      </form>
    </section>
  );
}
