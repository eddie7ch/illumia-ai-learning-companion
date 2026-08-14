import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AiFeedback, QuizQuestion } from '../types';
import FeedbackPanel from './FeedbackPanel';

export interface QuizResult {
  feedback: AiFeedback;
  timeSpentMinutes: number;
}

interface QuizRunnerProps {
  questions: QuizQuestion[];
  onSubmit: (result: QuizResult) => void;
}

export default function QuizRunner({ questions, onSubmit }: QuizRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [startedAt] = useState(() => Date.now());

  const allAnswered = questions.every((question) => answers[question.id] !== undefined);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!allAnswered) return;

    const correct = questions.filter((question) => answers[question.id] === question.correctIndex);
    const incorrect = questions.filter((question) => answers[question.id] !== question.correctIndex);
    const score = Math.round((correct.length / questions.length) * 100);
    const timeSpentMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

    const next: QuizResult = {
      feedback: {
        score,
        strengths: correct.map((question) => `Correctly answered: "${question.prompt}"`),
        suggestions: incorrect.map((question) => question.explanation ?? `Review: "${question.prompt}"`),
      },
      timeSpentMinutes,
    };
    setResult(next);
    onSubmit(next);
  }

  if (result) {
    return (
      <div>
        <p className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Quiz complete!</p>
        <FeedbackPanel feedback={result.feedback} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {questions.map((question, index) => (
        <fieldset key={question.id} className="space-y-2">
          <legend className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {index + 1}. {question.prompt}
          </legend>
          <div className="space-y-1.5">
            {question.choices.map((choice, choiceIndex) => (
              <label
                key={choice}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/60 dark:has-[:checked]:bg-indigo-950/60"
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[question.id] === choiceIndex}
                  onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: choiceIndex }))}
                  className="h-4 w-4 accent-indigo-600"
                />
                {choice}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <button
        type="submit"
        disabled={!allAnswered}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        Submit quiz
      </button>
    </form>
  );
}
