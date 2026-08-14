import { supabase } from './supabaseClient';
import type { Activity, ActivityType } from '../types';
import type { ActivityRow, CourseRow } from '../types/database';
import type { CoursePreset } from '../data/coursePresets';

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
      questions: [
        {
          id: 'q1',
          prompt: 'Which Testing Library query should you prefer for an interactive button?',
          choices: ['getByTestId', 'getByRole', 'getByClassName', 'querySelector'],
          correctIndex: 1,
          explanation: 'getByRole reflects how assistive tech and users find elements, so prefer it over test IDs or class names.',
        },
        {
          id: 'q2',
          prompt: 'What does `userEvent.click()` simulate more accurately than `fireEvent.click()`?',
          choices: [
            'Nothing, they are identical',
            'The full sequence of real user interactions (hover, focus, click)',
            'Server-side rendering',
            'CSS animations',
          ],
          correctIndex: 1,
          explanation: '`userEvent` fires the full realistic event sequence a browser would dispatch, catching more bugs than a single synthetic event.',
        },
        {
          id: 'q3',
          prompt: 'In a React component test, why mock the network/service layer instead of letting real requests fire?',
          choices: [
            'It makes tests slower',
            'It keeps tests fast, deterministic, and independent of a live backend',
            'It is required by TypeScript',
            'It improves code coverage automatically',
          ],
          correctIndex: 1,
          explanation: 'Mocking the service layer removes network flakiness and lets you control exactly what data a test exercises.',
        },
      ],
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
