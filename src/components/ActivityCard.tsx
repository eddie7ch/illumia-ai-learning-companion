import { useRef, useState } from 'react';
import { BookOpen, Code2, HelpCircle, MessageCircle, RotateCcw, Sparkles } from 'lucide-react';
import type { Activity, AiFeedback, QuizQuestion } from '../types';
import { formatDuration } from '../utils/duration';
import Drawer from './Drawer';
import FeedbackPanel from './FeedbackPanel';
import QuizRunner from './QuizRunner';
import type { QuizResult } from './QuizRunner';

interface ActivityCardProps {
  activity: Activity;
  onSubmitForGrading?: (submission: string, minutes: number) => Promise<void>;
  onCompleteQuiz?: (activityId: string, feedback: AiFeedback, timeSpentMinutes: number) => void;
  onTimeSpent?: (activityId: string, additionalMinutes: number) => void;
  /** When provided, quizzes are generated live by a real AI model instead of using a fixed question bank. */
  onRequestQuiz?: (activity: Activity) => Promise<QuizQuestion[]>;
  /** When provided, shows a shortcut to take this quiz inside the AI tutor chat instead of the drawer. */
  onStartQuizInChat?: (activityId: string) => void;
}

const typeLabels: Record<Activity['type'], string> = {
  lesson: 'Lesson',
  exercise: 'Coding exercise',
  quiz: 'Quiz',
};

const typeIcons: Record<Activity['type'], typeof BookOpen> = {
  lesson: BookOpen,
  exercise: Code2,
  quiz: HelpCircle,
};

const statusStyles: Record<Activity['status'], string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-800',
  'in-progress': 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-800',
  'not-started': 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:ring-slate-600',
};

const statusLabels: Record<Activity['status'], string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

export default function ActivityCard({
  activity,
  onSubmitForGrading,
  onCompleteQuiz,
  onTimeSpent,
  onRequestQuiz,
  onStartQuizInChat,
}: ActivityCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isQuizDrawerOpen, setIsQuizDrawerOpen] = useState(false);
  const [isReadDrawerOpen, setIsReadDrawerOpen] = useState(false);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submission, setSubmission] = useState('');
  const [minutes, setMinutes] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [liveQuestions, setLiveQuestions] = useState<QuizQuestion[] | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const readOpenedAtRef = useRef<number | null>(null);
  const hasFeedback = Boolean(activity.feedback);
  const canStartQuiz =
    activity.type === 'quiz' &&
    activity.status !== 'completed' &&
    (Boolean(onRequestQuiz) || (activity.questions?.length ?? 0) > 0);
  const canStartQuizInChat =
    canStartQuiz && Boolean(onStartQuizInChat) && (Boolean(onRequestQuiz) || (activity.questions?.length ?? 0) > 0);
  const canRetakeQuizInChat =
    activity.type === 'quiz' &&
    activity.status === 'completed' &&
    (Boolean(onRequestQuiz) || (activity.questions?.length ?? 0) > 0) &&
    Boolean(onStartQuizInChat);
  const hasReadingMaterial = activity.type === 'lesson' && Boolean(activity.content);
  const TypeIcon = typeIcons[activity.type];
  const quizQuestions = liveQuestions ?? activity.questions;

  const handleStartQuiz = async () => {
    setIsQuizDrawerOpen(true);
    if (!onRequestQuiz) return;
    setIsLoadingQuiz(true);
    setQuizError(null);
    setLiveQuestions(null);
    try {
      setLiveQuestions(await onRequestQuiz(activity));
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : 'Could not generate quiz questions. Please try again.');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleOpenReadDrawer = () => {
    readOpenedAtRef.current = Date.now();
    setIsReadDrawerOpen(true);
  };

  const handleCloseReadDrawer = () => {
    setIsReadDrawerOpen(false);
    const openedAt = readOpenedAtRef.current;
    readOpenedAtRef.current = null;
    if (!openedAt) return;
    const additionalMinutes = Math.max(1, Math.round((Date.now() - openedAt) / 60000));
    onTimeSpent?.(activity.id, additionalMinutes);
  };

  const handleSubmitForGrading = async () => {
    if (!onSubmitForGrading || !submission.trim() || isGrading) return;
    setIsGrading(true);
    setGradingError(null);
    try {
      await onSubmitForGrading(submission.trim(), Math.max(0, Number(minutes) || 0));
      setSubmission('');
      setMinutes('');
      setIsSubmitOpen(false);
    } catch (err) {
      setGradingError(err instanceof Error ? err.message : 'Grading failed. Please try again.');
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <li className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md dark:bg-slate-800 dark:ring-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <TypeIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {typeLabels[activity.type]} · {activity.topic}
          </p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{activity.title}</p>
          {(activity.completedOn || activity.timeSpentMinutes) && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {activity.completedOn && `Completed ${activity.completedOn}`}
              {activity.completedOn && activity.timeSpentMinutes ? ' · ' : ''}
              {activity.timeSpentMinutes ? `${formatDuration(activity.timeSpentMinutes)} spent` : ''}
            </p>
          )}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusStyles[activity.status]}`}
        >
          {statusLabels[activity.status]}
        </span>
      </div>

      {hasReadingMaterial && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleOpenReadDrawer}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Read material
          </button>

          <Drawer isOpen={isReadDrawerOpen} onClose={handleCloseReadDrawer} title={activity.title}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              {activity.content}
            </p>
          </Drawer>
        </div>
      )}

      {canStartQuiz && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleStartQuiz}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            Start quiz
          </button>

          {canStartQuizInChat && (
            <button
              type="button"
              onClick={() => onStartQuizInChat?.(activity.id)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Take in AI chat
            </button>
          )}

          <Drawer isOpen={isQuizDrawerOpen} onClose={() => setIsQuizDrawerOpen(false)} title={activity.title}>
            {isLoadingQuiz && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Asking a real AI model to write fresh quiz questions…</p>
            )}
            {quizError && !isLoadingQuiz && (
              <div className="space-y-2">
                <p className="text-sm text-red-600 dark:text-red-400">{quizError}</p>
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Try again
                </button>
              </div>
            )}
            {!isLoadingQuiz && !quizError && quizQuestions && (
              <QuizRunner
                questions={quizQuestions}
                onSubmit={(result: QuizResult) =>
                  onCompleteQuiz?.(activity.id, result.feedback, result.timeSpentMinutes)
                }
              />
            )}
          </Drawer>
        </div>
      )}

      {hasFeedback && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            View AI feedback
          </button>

          {canRetakeQuizInChat && (
            <button
              type="button"
              onClick={() => onStartQuizInChat?.(activity.id)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retake in AI chat
            </button>
          )}

          <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} title={activity.title}>
            {activity.feedback && <FeedbackPanel feedback={activity.feedback} />}
          </Drawer>
        </div>
      )}

      {onSubmitForGrading && activity.status !== 'completed' && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          {!isSubmitOpen ? (
            <button
              type="button"
              onClick={() => setIsSubmitOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus-visible:underline dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Submit for AI grading
            </button>
          ) : (
            <div className="space-y-2">
              <label htmlFor={`submission-${activity.id}`} className="sr-only">
                Your answer or code for {activity.title}
              </label>
              <textarea
                id={`submission-${activity.id}`}
                value={submission}
                onChange={(event) => setSubmission(event.target.value)}
                rows={4}
                placeholder="Paste your answer, code, or notes for this activity…"
                className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`minutes-${activity.id}`} className="text-xs text-slate-500 dark:text-slate-400">
                  Minutes spent
                </label>
                <input
                  id={`minutes-${activity.id}`}
                  type="number"
                  min={0}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  disabled={isGrading || !submission.trim()}
                  onClick={handleSubmitForGrading}
                  className="ml-auto rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isGrading ? 'Grading…' : 'Submit'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
              {gradingError && <p className="text-sm text-red-600 dark:text-red-400">{gradingError}</p>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
