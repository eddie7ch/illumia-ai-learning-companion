import { useCallback, useEffect, useRef, useState } from 'react';
import type { Activity, ActivityType, AiFeedback, DiagnosticTopicResult, QuizQuestion, TopicMastery } from '../types';
import type { CoursePreset } from '../data/coursePresets';
import {
  addActivity as addActivityRow,
  addTimeSpent,
  createCourseFromPreset,
  createCustomCourse,
  ensureProfile,
  fetchActivities,
  fetchCourses,
  fetchTopicMasteries,
  requestDiagnostic,
  requestGrading,
  requestLiveQuiz,
  saveGradedActivity,
  saveTopicEvidence,
  seedDemoCourse,
  type Course,
} from '../services/courseService';
import { createTopicMastery, deriveTopicMasteries, updateTopicMastery } from '../data/topicMastery';

function lastCourseKey(userId: string) {
  return `illumia:lastCourseId:${userId}`;
}

function masteryCacheKey(userId: string, courseId: string) {
  return `illumia:topicMastery:${userId}:${courseId}`;
}

export function useCourseData(userId: string, userEmail: string | null, isGuest = false) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [topicMasteries, setTopicMasteries] = useState<TopicMastery[]>([]);
  const topicMasteriesRef = useRef<TopicMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async (courseId: string) => {
    const rows = await fetchActivities(courseId);
    setActivities(rows);
    try {
      const persisted = await fetchTopicMasteries(courseId);
      topicMasteriesRef.current = persisted;
      setTopicMasteries(persisted);
    } catch {
      const cached = window.localStorage.getItem(masteryCacheKey(userId, courseId));
      const fallback = cached ? JSON.parse(cached) as TopicMastery[] : deriveTopicMasteries(rows);
      topicMasteriesRef.current = fallback;
      setTopicMasteries(fallback);
    }
  }, [userId]);

  const updateMasteryState = useCallback((updated: TopicMastery) => {
    const next = [...topicMasteriesRef.current.filter((item) => item.topic !== updated.topic), updated]
      .sort((a, b) => a.masteryScore - b.masteryScore);
    topicMasteriesRef.current = next;
    setTopicMasteries(next);
  }, []);

  const saveEvidence = useCallback(async (topic: string, score: number, isDiagnostic = false) => {
    if (!activeCourseId) throw new Error('No active course.');
    try {
      return await saveTopicEvidence(userId, activeCourseId, topic, score, isDiagnostic);
    } catch {
      const current = topicMasteriesRef.current.find((item) => item.topic === topic);
      const calculated = current
        ? updateTopicMastery(current, topic, score)
        : { ...createTopicMastery(topic, score), diagnosticScore: isDiagnostic ? Math.round(score) : undefined };
      if (isDiagnostic) calculated.diagnosticScore = Math.max(0, Math.min(100, Math.round(score)));
      const next = [...topicMasteriesRef.current.filter((item) => item.topic !== topic), calculated]
        .sort((a, b) => a.masteryScore - b.masteryScore);
      window.localStorage.setItem(masteryCacheKey(userId, activeCourseId), JSON.stringify(next));
      return calculated;
    }
  }, [activeCourseId, userId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        await ensureProfile(userId, userEmail?.split('@')[0] ?? 'Learner');
        let loadedCourses = await fetchCourses(userId);
        if (loadedCourses.length === 0 && isGuest) {
          await seedDemoCourse(userId);
          loadedCourses = await fetchCourses(userId);
        }
        if (cancelled) return;
        setCourses(loadedCourses);

        const savedId = window.localStorage.getItem(lastCourseKey(userId));
        const nextActiveId = loadedCourses.find((course) => course.id === savedId)?.id ?? loadedCourses[0]?.id ?? null;
        setActiveCourseId(nextActiveId);
        if (nextActiveId) await loadActivities(nextActiveId);
        else setActivities([]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your data.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, userEmail, isGuest, loadActivities]);

  const selectCourse = useCallback(
    async (courseId: string) => {
      setActiveCourseId(courseId);
      window.localStorage.setItem(lastCourseKey(userId), courseId);
      setIsLoading(true);
      try {
        await loadActivities(courseId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load that course.');
      } finally {
        setIsLoading(false);
      }
    },
    [userId, loadActivities],
  );

  const addPresetCourse = useCallback(
    async (preset: CoursePreset) => {
      const course = await createCourseFromPreset(userId, preset);
      setCourses((prev) => [...prev, course]);
      await selectCourse(course.id);
    },
    [userId, selectCourse],
  );

  const addCustomCourse = useCallback(
    async (title: string, topics: string[]) => {
      const course = await createCustomCourse(userId, title, topics);
      setCourses((prev) => [...prev, course]);
      await selectCourse(course.id);
    },
    [userId, selectCourse],
  );

  const addActivity = useCallback(
    async (title: string, type: ActivityType, topic: string) => {
      if (!activeCourseId) return;
      const activity = await addActivityRow(activeCourseId, userId, { title, type, topic });
      setActivities((prev) => [...prev, activity]);
    },
    [activeCourseId, userId],
  );

  const submitForGrading = useCallback(async (activityId: string, activity: Activity, submission: string, minutes: number) => {
    const feedback = await requestGrading({
      title: activity.title,
      topic: activity.topic,
      type: activity.type,
      submission,
    });
    const updated = await saveGradedActivity(activityId, feedback, minutes);
    setActivities((prev) => prev.map((item) => (item.id === activityId ? updated : item)));
    if (activeCourseId) updateMasteryState(await saveEvidence(activity.topic, feedback.score));
  }, [activeCourseId, saveEvidence, updateMasteryState]);

  const completeQuiz = useCallback(async (activityId: string, feedback: AiFeedback, minutes: number) => {
    const activity = activities.find((item) => item.id === activityId);
    const updated = await saveGradedActivity(activityId, feedback, minutes);
    setActivities((prev) => prev.map((item) => (item.id === activityId ? updated : item)));
    if (activeCourseId && activity) {
      updateMasteryState(await saveEvidence(activity.topic, feedback.score));
    }
  }, [activeCourseId, activities, saveEvidence, updateMasteryState]);

  const logTimeSpent = useCallback(async (activityId: string, additionalMinutes: number) => {
    const updated = await addTimeSpent(activityId, additionalMinutes);
    setActivities((prev) => prev.map((item) => (item.id === activityId ? updated : item)));
  }, []);

  const activeCourse = courses.find((course) => course.id === activeCourseId) ?? null;

  const requestQuiz = useCallback(
    (activity: Activity): Promise<QuizQuestion[]> => {
      return requestLiveQuiz(activity.title, activity.topic, activeCourse?.title);
    },
    [activeCourse],
  );

  const requestCourseDiagnostic = useCallback(() => {
    const topics = Array.from(new Set(activities.map((activity) => activity.topic)));
    return requestDiagnostic(activeCourse?.title ?? 'Course', topics);
  }, [activeCourse, activities]);

  const completeDiagnostic = useCallback(async (results: DiagnosticTopicResult[]) => {
    if (!activeCourseId) return;
    const updated = await Promise.all(
      results.map((result) => saveEvidence(result.topic, result.score, true)),
    );
    updated.forEach(updateMasteryState);
  }, [activeCourseId, saveEvidence, updateMasteryState]);

  const requestReview = useCallback((topic: string) => {
    return requestLiveQuiz(`Spaced review: ${topic}`, topic, activeCourse?.title);
  }, [activeCourse]);

  const completeReview = useCallback(async (topic: string, score: number) => {
    if (!activeCourseId) return;
    updateMasteryState(await saveEvidence(topic, score));
  }, [activeCourseId, saveEvidence, updateMasteryState]);

  return {
    courses,
    activeCourse,
    activities,
    topicMasteries,
    isLoading,
    error,
    selectCourse,
    addPresetCourse,
    addCustomCourse,
    addActivity,
    submitForGrading,
    completeQuiz,
    logTimeSpent,
    requestQuiz,
    requestCourseDiagnostic,
    completeDiagnostic,
    requestReview,
    completeReview,
  };
}
