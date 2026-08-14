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

  // Kept in lockstep with every setMessages call below (not via a useEffect) so
  // sendMessage always reads the latest history, even across rapid calls in the same tick.
  const messagesRef = useRef<ChatMessage[]>([]);

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
      setLearningPlan(plan);
      setMessages(welcome);
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
      appendMessage(learnerMessage);
      setIsThinking(true);
      setLiveAiNotice(null);

      const reply = await requestTutorReply(trimmed, history, apiKey);

      appendMessage({ id: `ai-${Date.now()}`, role: 'ai', text: reply.text });
      if (reply.notice) setLiveAiNotice(reply.notice);
      setIsThinking(false);
    },
    [apiKey, isThinking, appendMessage],
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
