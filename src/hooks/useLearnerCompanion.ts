import { useCallback, useEffect, useRef, useState } from 'react';
import type { Activity, ChatMessage, LearnerProfile, LearningPlanStep } from '../types';
import {
  fetchActivities,
  fetchInitialChatMessages,
  fetchLearnerProfile,
  fetchLearningPlan,
  requestTutorReply,
} from '../services/aiService';

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

  const messagesRef = useRef<ChatMessage[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [loadedProfile, loadedActivities] = await Promise.all([
        fetchLearnerProfile(),
        fetchActivities(),
      ]);
      const plan = await fetchLearningPlan(loadedProfile, loadedActivities);
      if (cancelled) return;

      setProfile(loadedProfile);
      setActivities(loadedActivities);
      setLearningPlan(plan);
      setMessages(fetchInitialChatMessages());
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isThinking) return;

      const history = messagesRef.current;
      const learnerMessage: ChatMessage = { id: `learner-${Date.now()}`, role: 'learner', text: trimmed };
      setMessages((prev) => [...prev, learnerMessage]);
      setIsThinking(true);
      setLiveAiNotice(null);

      const reply = await requestTutorReply(trimmed, history, apiKey);

      setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, role: 'ai', text: reply.text }]);
      if (reply.notice) setLiveAiNotice(reply.notice);
      setIsThinking(false);
    },
    [apiKey, isThinking],
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
  };
}
