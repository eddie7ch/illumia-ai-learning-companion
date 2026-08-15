import { useState } from 'react';
import { BrainCircuit, Loader2 } from 'lucide-react';
import type { DiagnosticQuestion, DiagnosticTopicResult } from '../types';

interface DiagnosticAssessmentProps {
  topics: string[];
  completed: boolean;
  onRequest: () => Promise<DiagnosticQuestion[]>;
  onComplete: (results: DiagnosticTopicResult[]) => void | Promise<void>;
}

export default function DiagnosticAssessment({ topics, completed, onRequest, onComplete }: DiagnosticAssessmentProps) {
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setQuestions(await onRequest());
      setAnswers({});
      setIsFinished(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The diagnostic could not start.');
    } finally {
      setIsLoading(false);
    }
  };

  const submit = async () => {
    if (!questions.every((question) => answers[question.id] !== undefined)) return;
    setIsSaving(true);
    setError(null);
    try {
      await onComplete(questions.map((question) => ({
        topic: question.topic,
        score: answers[question.id] === question.correctIndex ? 100 : 0,
      })));
      setIsFinished(true);
      setQuestions([]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Diagnostic results could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <BrainCircuit className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Course diagnostic
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            One prerequisite question per topic establishes your starting mastery and adapts the plan.
          </p>
        </div>
        {questions.length === 0 && (
          <button type="button" onClick={start} disabled={isLoading || topics.length === 0} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {completed || isFinished ? 'Retake diagnostic' : 'Start diagnostic'}
          </button>
        )}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {isFinished && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">Diagnostic saved. Your mastery map and learning plan have been updated.</p>}

      {questions.length > 0 && (
        <div className="mt-4 space-y-4">
          {questions.map((question, index) => (
            <fieldset key={question.id} className="space-y-2">
              <legend className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {index + 1}. {question.prompt} <span className="text-xs text-slate-400">({question.topic})</span>
              </legend>
              {question.choices.map((choice, choiceIndex) => (
                <label key={choice} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:text-slate-200">
                  <input type="radio" name={question.id} checked={answers[question.id] === choiceIndex} onChange={() => setAnswers((current) => ({ ...current, [question.id]: choiceIndex }))} className="accent-indigo-600" />
                  {choice}
                </label>
              ))}
            </fieldset>
          ))}
          <button type="button" onClick={submit} disabled={isSaving || !questions.every((question) => answers[question.id] !== undefined)} className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {isSaving ? 'Saving diagnostic...' : 'Submit diagnostic'}
          </button>
        </div>
      )}
    </section>
  );
}