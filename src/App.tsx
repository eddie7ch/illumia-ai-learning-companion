import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ProgressOverview from './components/ProgressOverview';
import StrengthsAndImprovements from './components/StrengthsAndImprovements';
import RecommendationCard from './components/RecommendationCard';
import LearningPlan from './components/LearningPlan';
import ActivityList from './components/ActivityList';
import AiTutorChat from './components/AiTutorChat';
import ProgressTrend from './components/ProgressTrend';
import ThemeToggle from './components/ThemeToggle';
import MasteryBadge from './components/MasteryBadge';
import Drawer from './components/Drawer';
import { DashboardSkeleton, ChatSkeleton } from './components/Skeleton';
import { useTheme } from './hooks/useTheme';
import { useLearnerCompanion } from './hooks/useLearnerCompanion';

function App() {
  const {
    isLoading,
    profile,
    activities,
    learningPlan,
    messages,
    isThinking,
    liveAiNotice,
    apiKey,
    setApiKey,
    sendMessage,
  } = useLearnerCompanion();
  const { theme, toggleTheme } = useTheme();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-indigo-700 focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
        <div className="flex items-center justify-between gap-4 px-4 py-5 sm:px-6 xl:px-10 2xl:px-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              AI Learning Companion
            </p>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
              Welcome back, {profile?.name.split(' ')[0] ?? 'there'}
              {profile && <MasteryBadge track={profile.track} progress={profile.overallProgress} />}
            </h1>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main id="main-content" className="px-4 py-6 sm:px-6 xl:px-10 2xl:px-16">
        <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-6 lg:col-span-2 xl:col-span-3">
            {isLoading || !profile ? (
              <DashboardSkeleton />
            ) : (
              <>
                <ProgressOverview profile={profile} />
                <ProgressTrend activities={activities} />
                <StrengthsAndImprovements
                  strengths={profile.strengths}
                  improvementAreas={profile.improvementAreas}
                />
                <RecommendationCard recommendation={profile.recommendation} />
                <LearningPlan steps={learningPlan} />
                <ActivityList activities={activities} />
              </>
            )}
          </div>

          <div className="hidden lg:col-span-1 lg:block xl:col-span-2">
            <div className="lg:sticky lg:top-6">
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
                />
              )}
            </div>
          </div>
        </div>
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
            />
          )}
        </Drawer>
      </div>
    </div>
  );
}

export default App;


