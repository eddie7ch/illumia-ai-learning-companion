import { useCallback, useEffect, useRef, useState } from 'react';
import type { Activity, AiFeedback, ChatMessage, LearnerProfile, LearningPlanStep } from '../types';
import {
  fetchActivities,
  fetchInitialChatMessages,
  fetchLearnerProfile,
  fetchLearningPlan,
  requestTutorReply,
} from '../services/aiService';
import { buildProgressContext } from '../data/deriveInsights';

/** Centralizes learner profile/activity/chat state so components stay presentational. */
export function useLearnerCompanion() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [learningPlan, setLearningPlan] = useState<LearningPlanStep[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [liveAiNotice, setLiveAiNotice] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  // Kept in lockstep with every setMessages call below (not via a useEffect) so
  // sendMessage always reads the latest history, even across rapid calls in the same tick.
  const messagesRef = useRef<ChatMessage[]>([]);

  // Kept in lockstep with activities via setActivities below, so sendMessage always builds the
  // progress context from the latest data even across rapid calls in the same tick.
  const activitiesRef = useRef<Activity[]>([]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, message];
      messagesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [loadedProfile, loadedActivities] = await Promise.all([
        fetchLearnerProfile(),
        fetchActivities(),
      ]);
      const plan = await fetchLearningPlan(loadedProfile, loadedActivities);
      if (cancelled) return;

      const welcome = fetchInitialChatMessages();
      messagesRef.current = welcome;
      setProfile(loadedProfile);
      setActivities(loadedActivities);
      activitiesRef.current = loadedActivities;
      setLearningPlan(plan);
      setMessages(welcome);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const completeActivity = useCallback((activityId: string, feedback: AiFeedback, timeSpentMinutes: number) => {
    const completedOn = new Date().toISOString().slice(0, 10);
    setActivities((prev) => {
      const next = prev.map((activity) =>
        activity.id === activityId
          ? { ...activity, status: 'completed' as const, feedback, completedOn, timeSpentMinutes }
          : activity,
      );
      activitiesRef.current = next;
      return next;
    });
  }, []);

  const logTimeSpent = useCallback((activityId: string, additionalMinutes: number) => {
    setActivities((prev) => {
      const next = prev.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              status: activity.status === 'not-started' ? ('in-progress' as const) : activity.status,
              timeSpentMinutes: (activity.timeSpentMinutes ?? 0) + additionalMinutes,
            }
          : activity,
      );
      activitiesRef.current = next;
      return next;
    });
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isThinking) return;

      const history = messagesRef.current;
      const learnerMessage: ChatMessage = { id: `learner-${Date.now()}`, role: 'learner', text: trimmed };
      appendMessage(learnerMessage);
      setIsThinking(true);
      setLiveAiNotice(null);

      try {
        const progressContext = buildProgressContext(activitiesRef.current, profile?.track);
        const reply = await requestTutorReply(trimmed, history, apiKey, progressContext);
        if (!isMountedRef.current) return;

        appendMessage({ id: `ai-${Date.now()}`, role: 'ai', text: reply.text });
        if (reply.notice) setLiveAiNotice(reply.notice);
      } catch {
        if (!isMountedRef.current) return;
        appendMessage({
          id: `ai-${Date.now()}`,
          role: 'ai',
          text: 'Sorry, something went wrong answering that. Please try asking again.',
        });
      } finally {
        if (isMountedRef.current) setIsThinking(false);
      }
    },
    [apiKey, isThinking, appendMessage, profile],
  );


  return {
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
    completeActivity,
    logTimeSpent,
  };
}
