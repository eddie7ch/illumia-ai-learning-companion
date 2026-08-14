import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, KeyRound, ListChecks, Maximize2, Minimize2, Send, Sparkles } from 'lucide-react';
import type { Activity, AiFeedback, ChatMessage } from '../types';
import { isSupabaseConfigured } from '../services/supabaseClient';
import QuizRunner from './QuizRunner';
import type { QuizResult } from './QuizRunner';

const QUICK_PROMPTS = [
  'Why is my score low on this activity?',
  'How can I avoid unnecessary re-renders?',
  'What should I practice next?',
];

interface AiTutorChatProps {
  messages: ChatMessage[];
  isThinking: boolean;
  liveAiNotice: string | null;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  onSend: (question: string) => void;
  activities?: Activity[];
  onCompleteQuiz?: (activityId: string, feedback: AiFeedback, timeSpentMinutes: number) => void;
  /** Set (e.g. from an activity card's "Take in AI chat" button) to jump straight into that quiz. */
  autoStartQuizId?: string | null;
  /** Called once the requested auto-start quiz has been opened, so the caller can clear the request. */
  onAutoStartQuizHandled?: () => void;
}

export default function AiTutorChat({
  messages,
  isThinking,
  liveAiNotice,
  apiKey,
  onApiKeyChange,
  onSend,
  activities,
  onCompleteQuiz,
  autoStartQuizId,
  onAutoStartQuizHandled,
}: AiTutorChatProps) {
  const [draft, setDraft] = useState('');
  const [showKeyPanel, setShowKeyPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const apiKeyInputId = useId();
  const questionInputId = useId();

  const availableQuizzes = (activities ?? []).filter(
    (activity) => activity.type === 'quiz' && activity.status !== 'completed' && (activity.questions?.length ?? 0) > 0,
  );
  // Looked up from all activities (not just availableQuizzes) so a completed quiz can still be retaken.
  const activeQuiz = activeQuizId
    ? (activities ?? []).find((activity) => activity.id === activeQuizId && (activity.questions?.length ?? 0) > 0)
    : undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!autoStartQuizId) return;
    setActiveQuizId(autoStartQuizId);
    onAutoStartQuizHandled?.();
  }, [autoStartQuizId]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const isLive = apiKey.trim().length > 0 || isSupabaseConfigured;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || isThinking) return;
    onSend(question);
    setDraft('');
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isThinking) return;
    setDraft(prompt);
  };

  const handleQuizSubmit = (activityId: string, result: QuizResult) => {
    onCompleteQuiz?.(activityId, result.feedback, result.timeSpentMinutes);
  };

  return (
    <section
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex h-dvh w-dvw flex-col rounded-none bg-white p-5 dark:bg-slate-800'
          : 'flex h-full flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
          Ask your AI tutor
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              isLive
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {isLive ? 'Live AI' : 'Simulated'}
          </span>
          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            aria-pressed={isFullscreen}
            className="flex items-center justify-center rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {activeQuiz ? (
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setActiveQuizId(null)}
            className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to chat
          </button>
          <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{activeQuiz.title}</p>
          <QuizRunner
            questions={activeQuiz.questions ?? []}
            onSubmit={(result) => handleQuizSubmit(activeQuiz.id, result)}
          />
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {isSupabaseConfigured
              ? 'Answered by real AI on a shared demo key (rate-limited).'
              : 'Responses are simulated by default for this prototype.'}{' '}
            <button
              type="button"
              onClick={() => setShowKeyPanel((prev) => !prev)}
              className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
              aria-expanded={showKeyPanel}
            >
              {showKeyPanel ? 'Hide' : 'Use your own OpenAI key instead (optional)'}
            </button>
          </p>

          {showKeyPanel && (
            <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:ring-slate-700">
              <label
                htmlFor={apiKeyInputId}
                className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                OpenAI API key
              </label>
              <input
                id={apiKeyInputId}
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => onApiKeyChange(event.target.value)}
                placeholder="sk-..."
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
              <p className="mt-1.5 text-slate-400 dark:text-slate-500">
                Your key stays in this browser tab only (never persisted or sent anywhere but OpenAI) and
                is cleared on reload. Leave blank to keep using the shared demo AI (or simulated
                responses if it isn't configured).
              </p>
            </div>
          )}

          {availableQuizzes.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                Take a quiz:
              </span>
              {availableQuizzes.map((quiz) => (
                <button
                  key={quiz.id}
                  type="button"
                  onClick={() => setActiveQuizId(quiz.id)}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-950"
                >
                  {quiz.title}
                </button>
              ))}
            </div>
          )}

          <div
            className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1"
            style={isFullscreen ? undefined : { maxHeight: '20rem' }}
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] animate-[fade-in_0.25s_ease-out] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  message.role === 'ai'
                    ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100'
                    : 'ml-auto bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                }`}
              >
                {message.text}
              </div>
            ))}
            {isThinking && (
              <div className="max-w-[85%] rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-400 dark:bg-indigo-950/60">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                </span>
              </div>
            )}
            {liveAiNotice && (
              <p role="status" className="text-xs text-amber-600 dark:text-amber-400">
                {liveAiNotice}
              </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={isThinking}
                  className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <label htmlFor={questionInputId} className="sr-only">
                Ask a question
              </label>
              <input
                id={questionInputId}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Why is my React component re-rendering?"
                disabled={isThinking}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
              <button
                type="submit"
                disabled={isThinking}
                aria-label="Send"
                className="flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  );
}
