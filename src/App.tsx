import ProgressOverview from './components/ProgressOverview';
import StrengthsAndImprovements from './components/StrengthsAndImprovements';
import RecommendationCard from './components/RecommendationCard';
import ActivityList from './components/ActivityList';
import AiTutorChat from './components/AiTutorChat';
import { activities, initialChatMessages, learnerProfile } from './data/mockData';

function App() {
  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            AI Learning Companion
          </p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Welcome back, {learnerProfile.name.split(' ')[0]}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <ProgressOverview profile={learnerProfile} />
            <StrengthsAndImprovements
              strengths={learnerProfile.strengths}
              improvementAreas={learnerProfile.improvementAreas}
            />
            <RecommendationCard recommendation={learnerProfile.recommendation} />
            <ActivityList activities={activities} />
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <AiTutorChat initialMessages={initialChatMessages} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
