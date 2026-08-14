import { useCallback, useEffect, useState } from 'react';
import type { Activity, ActivityType, AiFeedback } from '../types';
import type { CoursePreset } from '../data/coursePresets';
import {
  addActivity as addActivityRow,
  createCourseFromPreset,
  createCustomCourse,
  ensureProfile,
  fetchActivities,
  fetchCourses,
  requestGrading,
  saveGradedActivity,
  type Course,
} from '../services/courseService';

function lastCourseKey(userId: string) {
  return `illumia:lastCourseId:${userId}`;
}

export function useCourseData(userId: string, userEmail: string | null) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivities = useCallback(async (courseId: string) => {
    const rows = await fetchActivities(courseId);
    setActivities(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        await ensureProfile(userId, userEmail?.split('@')[0] ?? 'Learner');
        const loadedCourses = await fetchCourses(userId);
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
  }, [userId, userEmail, loadActivities]);

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
  }, []);

  const completeQuiz = useCallback(async (activityId: string, feedback: AiFeedback, minutes: number) => {
    const updated = await saveGradedActivity(activityId, feedback, minutes);
    setActivities((prev) => prev.map((item) => (item.id === activityId ? updated : item)));
  }, []);

  const activeCourse = courses.find((course) => course.id === activeCourseId) ?? null;

  return {
    courses,
    activeCourse,
    activities,
    isLoading,
    error,
    selectCourse,
    addPresetCourse,
    addCustomCourse,
    addActivity,
    submitForGrading,
    completeQuiz,
  };
}
