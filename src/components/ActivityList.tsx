import type { Activity, AiFeedback, QuizQuestion } from '../types';
import ActivityCard from './ActivityCard';

interface ActivityListProps {
  activities: Activity[];
  onSubmitForGrading?: (activity: Activity, submission: string, minutes: number) => Promise<void>;
  onCompleteQuiz?: (activityId: string, feedback: AiFeedback, timeSpentMinutes: number) => void;
  onTimeSpent?: (activityId: string, additionalMinutes: number) => void;
  onRequestQuiz?: (activity: Activity) => Promise<QuizQuestion[]>;
  onStartQuizInChat?: (activityId: string) => void;
}

export default function ActivityList({
  activities,
  onSubmitForGrading,
  onCompleteQuiz,
  onTimeSpent,
  onRequestQuiz,
  onStartQuizInChat,
}: ActivityListProps) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Your activities</h2>
      <ul className="space-y-3">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onSubmitForGrading={
              onSubmitForGrading ? (submission, minutes) => onSubmitForGrading(activity, submission, minutes) : undefined
            }
            onCompleteQuiz={onCompleteQuiz}
            onTimeSpent={onTimeSpent}
            onRequestQuiz={onRequestQuiz}
            onStartQuizInChat={onStartQuizInChat}
          />
        ))}
      </ul>
    </section>
  );
}

