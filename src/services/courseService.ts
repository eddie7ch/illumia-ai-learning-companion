import { supabase } from './supabaseClient';
import type { Activity, ActivityType, DiagnosticQuestion, QuizQuestion, TopicMastery } from '../types';
import type { ActivityRow, CourseRow, TopicMasteryRow } from '../types/database';
import type { CoursePreset } from '../data/coursePresets';
import { createTopicMastery, updateTopicMastery } from '../data/topicMastery';

export interface Course {
  id: string;
  title: string;
  isCustom: boolean;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function rowToActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    topic: row.topic,
    status: row.status,
    completedOn: row.completed_on ?? undefined,
    timeSpentMinutes: row.time_spent_minutes ?? undefined,
    feedback: row.feedback ?? undefined,
    questions: row.questions ?? undefined,
    content: row.content ?? undefined,
  };
}

function rowToCourse(row: CourseRow): Course {
  return { id: row.id, title: row.title, isCustom: row.is_custom };
}

function rowToTopicMastery(row: TopicMasteryRow): TopicMastery {
  return {
    topic: row.topic,
    masteryScore: row.mastery_score,
    diagnosticScore: row.diagnostic_score ?? undefined,
    evidenceCount: row.evidence_count,
    lastPracticedAt: row.last_practiced_at,
    nextReviewAt: row.next_review_at,
    reviewIntervalDays: row.review_interval_days,
    easeFactor: Number(row.ease_factor),
    repetitions: row.repetitions,
  };
}

export async function ensureProfile(userId: string, name: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('profiles').upsert({ id: userId, name }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function fetchCourses(userId: string): Promise<Course[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('courses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToCourse);
}

export async function fetchActivities(courseId: string): Promise<Activity[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('activities')
    .select('*')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToActivity);
}

export async function fetchTopicMasteries(courseId: string): Promise<TopicMastery[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('topic_mastery_records')
    .select('*')
    .eq('course_id', courseId)
    .order('mastery_score', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToTopicMastery(row as TopicMasteryRow));
}

export async function saveTopicEvidence(
  userId: string,
  courseId: string,
  topic: string,
  score: number,
  isDiagnostic = false,
): Promise<TopicMastery> {
  const client = requireClient();
  const { data: existing } = await client
    .from('topic_mastery_records')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('topic', topic)
    .maybeSingle();
  const current = existing ? rowToTopicMastery(existing as TopicMasteryRow) : undefined;
  const calculated = current
    ? updateTopicMastery(current, topic, score)
    : { ...createTopicMastery(topic, score), diagnosticScore: isDiagnostic ? Math.round(score) : undefined };
  if (isDiagnostic) calculated.diagnosticScore = Math.max(0, Math.min(100, Math.round(score)));

  const { data, error } = await client
    .from('topic_mastery_records')
    .upsert({
      user_id: userId,
      course_id: courseId,
      topic,
      mastery_score: calculated.masteryScore,
      diagnostic_score: calculated.diagnosticScore ?? null,
      evidence_count: calculated.evidenceCount,
      last_practiced_at: calculated.lastPracticedAt,
      next_review_at: calculated.nextReviewAt,
      review_interval_days: calculated.reviewIntervalDays,
      ease_factor: calculated.easeFactor,
      repetitions: calculated.repetitions,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_id,topic' })
    .select()
    .single();
  if (error) throw error;
  return rowToTopicMastery(data as TopicMasteryRow);
}

export async function createCourseFromPreset(userId: string, preset: CoursePreset): Promise<Course> {
  const client = requireClient();
  const { data: courseRow, error: courseError } = await client
    .from('courses')
    .insert({ user_id: userId, title: preset.title, is_custom: false })
    .select()
    .single();
  if (courseError) throw courseError;

  const activityRows = preset.activities.map((activity, index) => ({
    course_id: courseRow.id,
    user_id: userId,
    title: activity.title,
    type: activity.type,
    topic: activity.topic,
    status: 'not-started' as const,
    questions: activity.questions ?? null,
    content: activity.content ?? null,
    sort_order: index,
  }));
  const { error: activitiesError } = await client.from('activities').insert(activityRows);
  if (activitiesError) throw activitiesError;

  return rowToCourse(courseRow);
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Seeds a populated "React Development" course so a fresh guest sees a working demo, not an empty dashboard. */
export async function seedDemoCourse(userId: string): Promise<Course> {
  const client = requireClient();
  const { data: courseRow, error: courseError } = await client
    .from('courses')
    .insert({ user_id: userId, title: 'React Development', is_custom: false })
    .select()
    .single();
  if (courseError) throw courseError;

  const activityRows = [
    {
      title: 'Introduction to React Components',
      type: 'lesson' as const,
      topic: 'Fundamentals',
      status: 'completed' as const,
      completed_on: daysAgo(25),
      time_spent_minutes: 25,
      feedback: null,
    },
    {
      title: 'State and Props Deep Dive',
      type: 'lesson' as const,
      topic: 'Fundamentals',
      status: 'completed' as const,
      completed_on: daysAgo(23),
      time_spent_minutes: 35,
      feedback: null,
    },
    {
      title: 'Build a Todo Application',
      type: 'exercise' as const,
      topic: 'State Management',
      status: 'completed' as const,
      completed_on: daysAgo(17),
      time_spent_minutes: 60,
      feedback: {
        score: 85,
        strengths: ['Good component structure', 'Clear state management'],
        suggestions: ['Add unit tests', 'Optimize unnecessary renders'],
      },
    },
    {
      title: 'React Fundamentals Quiz',
      type: 'quiz' as const,
      topic: 'Fundamentals',
      status: 'completed' as const,
      completed_on: daysAgo(16),
      time_spent_minutes: 20,
      feedback: {
        score: 92,
        strengths: ['Strong grasp of component lifecycle', 'Correctly identified prop drilling issues'],
        suggestions: ['Review Context API use cases'],
      },
    },
    {
      title: 'Fetching and Displaying API Data',
      type: 'exercise' as const,
      topic: 'Async & Effects',
      status: 'completed' as const,
      completed_on: daysAgo(9),
      time_spent_minutes: 75,
      feedback: {
        score: 74,
        strengths: ['Correct use of useEffect for data fetching', 'Clean loading and empty states'],
        suggestions: ['Handle fetch errors and edge cases', 'Avoid duplicate requests on re-render'],
      },
    },
    {
      title: 'React Performance Optimization',
      type: 'lesson' as const,
      topic: 'Performance',
      status: 'in-progress' as const,
      completed_on: null,
      time_spent_minutes: 15,
      feedback: null,
    },
    {
      title: 'Memoization Challenge',
      type: 'exercise' as const,
      topic: 'Performance',
      status: 'not-started' as const,
      completed_on: null,
      time_spent_minutes: null,
      feedback: null,
    },
    {
      title: 'Testing Fundamentals Quiz',
      type: 'quiz' as const,
      topic: 'Testing',
      status: 'not-started' as const,
      completed_on: null,
      time_spent_minutes: null,
      feedback: null,
    },
  ].map((activity, index) => ({ course_id: courseRow.id, user_id: userId, sort_order: index, ...activity }));

  const { error: activitiesError } = await client.from('activities').insert(activityRows);
  if (activitiesError) throw activitiesError;

  return rowToCourse(courseRow);
}

export async function createCustomCourse(userId: string, title: string, topics: string[]): Promise<Course> {
  const client = requireClient();
  const { data: courseRow, error: courseError } = await client
    .from('courses')
    .insert({ user_id: userId, title, is_custom: true })
    .select()
    .single();
  if (courseError) throw courseError;

  if (topics.length > 0) {
    const activityRows = topics.map((topic, index) => ({
      course_id: courseRow.id,
      user_id: userId,
      title: topic,
      type: 'lesson' as const,
      topic: 'General',
      status: 'not-started' as const,
      sort_order: index,
    }));
    const { error: activitiesError } = await client.from('activities').insert(activityRows);
    if (activitiesError) throw activitiesError;
  }

  return rowToCourse(courseRow);
}

export async function addActivity(
  courseId: string,
  userId: string,
  activity: { title: string; type: ActivityType; topic: string },
): Promise<Activity> {
  const client = requireClient();
  const { data, error } = await client
    .from('activities')
    .insert({ course_id: courseId, user_id: userId, ...activity, status: 'not-started' })
    .select()
    .single();
  if (error) throw error;
  return rowToActivity(data);
}

/** Persists AI grading feedback, marks the activity completed, and accumulates time spent. */
export async function saveGradedActivity(
  activityId: string,
  feedback: NonNullable<Activity['feedback']>,
  additionalMinutes: number,
): Promise<Activity> {
  const client = requireClient();
  const { data: existing, error: fetchError } = await client
    .from('activities')
    .select('time_spent_minutes')
    .eq('id', activityId)
    .single();
  if (fetchError) throw fetchError;

  const totalMinutes = (existing?.time_spent_minutes ?? 0) + additionalMinutes;
  const { data, error } = await client
    .from('activities')
    .update({
      status: 'completed',
      completed_on: new Date().toISOString().slice(0, 10),
      time_spent_minutes: totalMinutes,
      feedback,
    })
    .eq('id', activityId)
    .select()
    .single();
  if (error) throw error;
  return rowToActivity(data);
}

/** Accumulates time spent on an activity (e.g. reading material left open) without grading it. */
export async function addTimeSpent(activityId: string, additionalMinutes: number): Promise<Activity> {
  const client = requireClient();
  const { data: existing, error: fetchError } = await client
    .from('activities')
    .select('time_spent_minutes, status')
    .eq('id', activityId)
    .single();
  if (fetchError) throw fetchError;

  const totalMinutes = (existing?.time_spent_minutes ?? 0) + additionalMinutes;
  const nextStatus = existing?.status === 'not-started' ? 'in-progress' : existing?.status;
  const { data, error } = await client
    .from('activities')
    .update({ time_spent_minutes: totalMinutes, status: nextStatus })
    .eq('id', activityId)
    .select()
    .single();
  if (error) throw error;
  return rowToActivity(data);
}

export interface GradeRequest {
  title: string;
  topic: string;
  type: ActivityType;
  submission: string;
}

/** Calls the /api/grade serverless function, authenticated with the current Supabase session. */
export async function requestGrading(payload: GradeRequest): Promise<NonNullable<Activity['feedback']>> {
  const client = requireClient();
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in to submit work for grading.');

  const response = await fetch('/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Grading failed with status ${response.status}`);
  }
  return response.json();
}

/** Calls /api/generate-quiz to have a real AI model write fresh quiz questions on demand. */
export async function requestLiveQuiz(title: string, topic: string, courseTitle?: string): Promise<QuizQuestion[]> {
  const client = requireClient();
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in to generate a quiz.');

  const response = await fetch('/api/generate-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, topic, courseTitle }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Quiz generation failed with status ${response.status}`);
  }
  const result = await response.json();
  return result.questions as QuizQuestion[];
}

export async function requestDiagnostic(courseTitle: string, topics: string[]): Promise<DiagnosticQuestion[]> {
  const client = requireClient();
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in to start a diagnostic.');
  const response = await fetch('/api/generate-diagnostic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ courseTitle, topics: topics.slice(0, 6) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Diagnostic generation failed.');
  return result.questions as DiagnosticQuestion[];
}
