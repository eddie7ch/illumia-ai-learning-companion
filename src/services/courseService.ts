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
    sort_order: index,
  }));
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
