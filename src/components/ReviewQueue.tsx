import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { QuizQuestion, TopicMastery } from '../types';
import QuizRunner from './QuizRunner';

interface ReviewQueueProps {
  due: TopicMastery[];
  onRequestReview: (topic: string) => Promise<QuizQuestion[]>;
  onCompleteReview: (topic: string, score: number) => void | Promise<void>;
}

export default function ReviewQueue({ due, onRequestReview, onCompleteReview }: ReviewQueueProps) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (due.length === 0 && !activeTopic) return null;

  const startReview = async (topic: string) => {
    setActiveTopic(topic);
    setIsLoading(true);
    setError(null);
    try {
      setQuestions(await onRequestReview(topic));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Review could not start.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
        <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" /> Review queue
      </h2>
      {!activeTopic && (
        <ul className="mt-3 space-y-2">
          {due.map((item) => (
            <li key={item.topic} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-500/10">
              <span><strong>{item.topic}</strong> · {item.masteryScore}% mastery</span>
              <button type="button" onClick={() => startReview(item.topic)} className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700">Review now</button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
      {activeTopic && (
        <div className="mt-4">
          <p className="mb-3 text-sm font-semibold">Reviewing {activeTopic}</p>
          {isLoading ? <p className="text-sm text-slate-500">Generating a fresh review...</p> : questions.length > 0 && (
            <QuizRunner questions={questions} onSubmit={async (result) => {
              await onCompleteReview(activeTopic, result.feedback.score);
              setActiveTopic(null);
              setQuestions([]);
            }} />
          )}
        </div>
      )}
    </section>
  );
}