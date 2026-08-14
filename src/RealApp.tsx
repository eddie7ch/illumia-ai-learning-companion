import { useCallback, useRef, useState } from 'react';
import { LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useCourseData } from './hooks/useCourseData';
import { useTheme } from './hooks/useTheme';
import { requestTutorReply } from './services/aiService';
import { coursePresets } from './data/coursePresets';
import {
  deriveRecommendation,
  deriveStrengthsAndImprovements,
  calculateOverallProgress,
  buildProgressContext,
} from './data/deriveInsights';
import { generateLearningPlan } from './data/learningPlan';
import type { ChatMessage } from './types';
import AuthPanel from './components/AuthPanel';
import ResetPasswordPanel from './components/ResetPasswordPanel';
import CourseSwitcher from './components/CourseSwitcher';
import ProgressOverview from './components/ProgressOverview';
import ProgressTrend from './components/ProgressTrend';
import ActivityCalendar from './components/ActivityCalendar';
import StrengthsAndImprovements from './components/StrengthsAndImprovements';
import RecommendationCard from './components/RecommendationCard';
import LearningPlan from './components/LearningPlan';
import ActivityList from './components/ActivityList';
import AiTutorChat from './components/AiTutorChat';
import ThemeToggle from './components/ThemeToggle';
import LiveClock from './components/LiveClock';
import StudySessionCard from './components/StudySessionCard';
import Drawer from './components/Drawer';
import { DashboardSkeleton, ChatSkeleton } from './components/Skeleton';
import { StudySessionProvider } from './context/StudySessionContext';

/** Real, persisted dashboard backed by Supabase: auth, multi-course data, and AI-graded activities. */
export default function RealApp() {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <StudySessionProvider>
      {auth.isLoading ? (
        <div className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6">
          <DashboardSkeleton />
        </div>
      ) : auth.isPasswordRecovery ? (
        <ResetPasswordPanel error={auth.error} isSubmitting={auth.isSubmitting} onSubmit={auth.updatePassword} />
      ) : !auth.user ? (
        <AuthPanel
          error={auth.error}
          isSubmitting={auth.isSubmitting}
          onSignIn={auth.signIn}
          onSignUp={auth.signUp}
          onGuest={auth.signInAsGuest}
          onForgotPassword={auth.sendPasswordReset}
        />
      ) : (
        <SignedInDashboard
          userId={auth.user.id}
          userEmail={auth.user.email ?? null}
          isGuest={auth.user.is_anonymous ?? false}
          onSignOut={auth.signOut}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </StudySessionProvider>
  );
}

interface SignedInDashboardProps {
  userId: string;
  userEmail: string | null;
  isGuest: boolean;
  onSignOut: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function SignedInDashboard({ userId, userEmail, isGuest, onSignOut, theme, onToggleTheme }: SignedInDashboardProps) {
  const {
    courses,
    activeCourse,
    activities,
    isLoading,
    error,
    selectCourse,
    addPresetCourse,
    addCustomCourse,
    submitForGrading,
    completeQuiz,
    logTimeSpent,
    requestQuiz,
  } = useCourseData(userId, userEmail, isGuest);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: "Hi! I'm your AI learning companion. Ask me anything about your activities, or what to try next.",
    },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [liveAiNotice, setLiveAiNotice] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [pendingQuizActivityId, setPendingQuizActivityId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const handleStartQuizInChat = (activityId: string) => {
    setPendingQuizActivityId(activityId);
    setIsChatOpen(true);
    document.getElementById('ai-tutor-chat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isThinking) return;
      const history = messagesRef.current;
      setMessages((prev) => [...prev, { id: `learner-${Date.now()}`, role: 'learner', text: trimmed }]);
      setIsThinking(true);
      setLiveAiNotice(null);
      try {
        const progressContext = buildProgressContext(activities, activeCourse?.title);
        const reply = await requestTutorReply(trimmed, history, apiKey, progressContext);
        setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: 'ai', text: reply.text }]);
        if (reply.notice) setLiveAiNotice(reply.notice);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `ai-${Date.now()}`, role: 'ai', text: 'Sorry, something went wrong answering that. Please try again.' },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [apiKey, isThinking, activities, activeCourse],
  );

  const handleAddPreset = useCallback(
    (presetId: string) => {
      const preset = coursePresets.find((item) => item.id === presetId);
      if (!preset) return Promise.reject(new Error('Unknown course preset.'));
      return addPresetCourse(preset);
    },
    [addPresetCourse],
  );

  const overallProgress = calculateOverallProgress(activities);
  const { strengths, improvementAreas } = deriveStrengthsAndImprovements(activities);
  const recommendation = deriveRecommendation(activities);
  const learningPlan = generateLearningPlan(
    { name: userEmail ?? 'Learner', track: activeCourse?.title ?? '', overallProgress, strengths, improvementAreas, recommendation },
    activities,
  );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
        <div className="flex items-center justify-between gap-4 px-4 py-5 sm:px-6 xl:px-10 2xl:px-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              AI Learning Companion
            </p>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
              {isGuest ? 'Welcome' : `Welcome back${userEmail ? `, ${userEmail.split('@')[0]}` : ''}`}
            </h1>
            <LiveClock />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 xl:px-10 2xl:px-16">
        <div className="mb-6">
          <CourseSwitcher
            courses={courses}
            activeCourseId={activeCourse?.id ?? null}
            onSelect={selectCourse}
            onAddPreset={handleAddPreset}
            onAddCustom={addCustomCourse}
          />
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}

        {!activeCourse && !isLoading ? (
          <p className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
            Add your first course above (pick a preset or build your own) to start tracking real progress.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-5">
            <div className="space-y-6 lg:col-span-2 xl:col-span-3">
              {isLoading ? (
                <DashboardSkeleton />
              ) : (
                <>
                  <StudySessionCard />
                  <ProgressOverview
                    profile={{ name: userEmail ?? 'Learner', track: activeCourse!.title, overallProgress, strengths, improvementAreas, recommendation }}
                  />
                  <ProgressTrend activities={activities} />
                  <ActivityCalendar activities={activities} />
                  <StrengthsAndImprovements strengths={strengths} improvementAreas={improvementAreas} />
                  <RecommendationCard recommendation={recommendation} />
                  <LearningPlan steps={learningPlan} />
                  <ActivityList
                    activities={activities}
                    onSubmitForGrading={(activity, submission, minutes) =>
                      submitForGrading(activity.id, activity, submission, minutes)
                    }
                    onCompleteQuiz={completeQuiz}
                    onTimeSpent={logTimeSpent}
                    onRequestQuiz={requestQuiz}
                    onStartQuizInChat={handleStartQuizInChat}
                  />
                </>
              )}
            </div>

            <div className="hidden lg:col-span-1 lg:block xl:col-span-2">
              <div id="ai-tutor-chat-panel" className="lg:sticky lg:top-6">
                {isLoading ? (
                  <ChatSkeleton />
                ) : (
                  <AiTutorChat
                    messages={messages}
                    isThinking={isThinking}
                    liveAiNotice={liveAiNotice}
                    apiKey={apiKey}
                    onApiKeyChange={setApiKey}
                    onSend={sendMessage}
                    activities={activities}
                    onCompleteQuiz={completeQuiz}
                    onRequestQuiz={requestQuiz}
                    autoStartQuizId={pendingQuizActivityId}
                    onAutoStartQuizHandled={() => setPendingQuizActivityId(null)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {!isLoading && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          aria-label="Open AI tutor chat"
          className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 lg:hidden"
        >
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      <div className="lg:hidden">
        <Drawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} title="Ask your AI tutor">
          {isChatOpen && (
            <AiTutorChat
              messages={messages}
              isThinking={isThinking}
              liveAiNotice={liveAiNotice}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              onSend={sendMessage}
              activities={activities}
              onCompleteQuiz={completeQuiz}
              onRequestQuiz={requestQuiz}
              autoStartQuizId={pendingQuizActivityId}
              onAutoStartQuizHandled={() => setPendingQuizActivityId(null)}
            />
          )}
        </Drawer>
      </div>
    </div>
  );
}
