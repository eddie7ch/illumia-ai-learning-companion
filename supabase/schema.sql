-- Illumia real-data schema. Run this once in the Supabase project's SQL editor
-- (Project > SQL Editor > New query), then paste the project's URL + anon key
-- into your .env (see .env.example).

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Learner',
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null check (type in ('lesson', 'exercise', 'quiz')),
  topic text not null default 'General',
  status text not null default 'not-started' check (status in ('completed', 'in-progress', 'not-started')),
  completed_on date,
  time_spent_minutes integer,
  feedback jsonb,
  questions jsonb,
  content text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Safe to re-run: adds these columns if the table already existed before they were introduced.
alter table activities add column if not exists questions jsonb;
alter table activities add column if not exists content text;

create index if not exists activities_course_id_idx on activities (course_id);
create index if not exists courses_user_id_idx on courses (user_id);

alter table profiles enable row level security;
alter table courses enable row level security;
alter table activities enable row level security;

-- Each user can only ever see/modify their own rows (id/user_id must match the JWT's auth.uid()).
drop policy if exists "profiles: owner read" on profiles;
create policy "profiles: owner read" on profiles for select using (auth.uid() = id);
drop policy if exists "profiles: owner insert" on profiles;
create policy "profiles: owner insert" on profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles: owner update" on profiles;
create policy "profiles: owner update" on profiles for update using (auth.uid() = id);

drop policy if exists "courses: owner all" on courses;
create policy "courses: owner all" on courses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "activities: owner all" on activities;
create policy "activities: owner all" on activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Logs one row per successful AI-grading call, used to rate-limit /api/grade per user.
create table if not exists grading_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists grading_events_user_id_created_at_idx on grading_events (user_id, created_at);

alter table grading_events enable row level security;

drop policy if exists "grading_events: owner all" on grading_events;
create policy "grading_events: owner all" on grading_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Logs one row per server-backed AI tutor chat reply, used to enforce a shared global
-- daily cap on /api/chat (demo cost control, not per-user like grading_events above).
create table if not exists chat_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists chat_events_created_at_idx on chat_events (created_at);

alter table chat_events enable row level security;

-- Each user can only ever see/insert their own rows directly (no cross-user reads via the
-- normal PostgREST API/anon key). The shared global daily total needed by /api/chat is instead
-- obtained through the SECURITY DEFINER function below, which is the only way to get that
-- cross-user count — this avoids exposing every user's id/timestamp to any other signed-in user.
drop policy if exists "chat_events: read all" on chat_events;
drop policy if exists "chat_events: owner read" on chat_events;
create policy "chat_events: owner read" on chat_events for select using (auth.uid() = user_id);
drop policy if exists "chat_events: insert own" on chat_events;
create policy "chat_events: insert own" on chat_events for insert with check (auth.uid() = user_id);

-- Lets any signed-in user learn the shared global daily chat count (needed to enforce
-- GLOBAL_DAILY_LIMIT in api/chat.ts) without granting cross-user SELECT access to the table
-- itself. SECURITY DEFINER runs with the function owner's privileges, bypassing RLS internally,
-- while callers still only ever get a single number back, never other users' rows.
create or replace function chat_events_daily_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from chat_events where created_at >= now() - interval '24 hours';
$$;

revoke all on function chat_events_daily_count() from public;
grant execute on function chat_events_daily_count() to authenticated;

-- Logs one row per OpenAI call made by ANY /api/* endpoint (chat, grade, quiz, diagnostic,
-- screen observation, session summary), with a rough estimated USD cost. Used to enforce a single
-- shared global daily spend cap across every AI feature combined (see api/_lib/aiBudget.ts).
create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  estimated_cost_usd numeric(10, 6) not null default 0,
  session_id uuid,
  reservation_usd numeric(10, 6) not null default 0,
  actual_cost_usd numeric(10, 6) not null default 0,
  text_input_tokens bigint not null default 0,
  text_output_tokens bigint not null default 0,
  audio_input_tokens bigint not null default 0,
  audio_output_tokens bigint not null default 0,
  image_input_tokens bigint not null default 0,
  text_input_cost_usd numeric(10, 6) not null default 0,
  text_output_cost_usd numeric(10, 6) not null default 0,
  audio_input_cost_usd numeric(10, 6) not null default 0,
  audio_output_cost_usd numeric(10, 6) not null default 0,
  image_input_cost_usd numeric(10, 6) not null default 0,
  created_at timestamptz not null default now()
);

alter table ai_usage_events add column if not exists session_id uuid;
alter table ai_usage_events add column if not exists reservation_usd numeric(10, 6) not null default 0;
alter table ai_usage_events add column if not exists actual_cost_usd numeric(10, 6) not null default 0;
alter table ai_usage_events add column if not exists text_input_tokens bigint not null default 0;
alter table ai_usage_events add column if not exists text_output_tokens bigint not null default 0;
alter table ai_usage_events add column if not exists audio_input_tokens bigint not null default 0;
alter table ai_usage_events add column if not exists audio_output_tokens bigint not null default 0;
alter table ai_usage_events add column if not exists image_input_tokens bigint not null default 0;
alter table ai_usage_events add column if not exists text_input_cost_usd numeric(10, 6) not null default 0;
alter table ai_usage_events add column if not exists text_output_cost_usd numeric(10, 6) not null default 0;
alter table ai_usage_events add column if not exists audio_input_cost_usd numeric(10, 6) not null default 0;
alter table ai_usage_events add column if not exists audio_output_cost_usd numeric(10, 6) not null default 0;
alter table ai_usage_events add column if not exists image_input_cost_usd numeric(10, 6) not null default 0;

create unique index if not exists ai_usage_events_user_session_idx
  on ai_usage_events (user_id, session_id) where session_id is not null;

create index if not exists ai_usage_events_created_at_idx on ai_usage_events (created_at);

alter table ai_usage_events enable row level security;

-- Same pattern as chat_events above: owners can only read/insert their own rows directly; the
-- cross-user daily total is only obtainable via the SECURITY DEFINER function below.
drop policy if exists "ai_usage_events: owner read" on ai_usage_events;
create policy "ai_usage_events: owner read" on ai_usage_events for select using (auth.uid() = user_id);
drop policy if exists "ai_usage_events: insert own" on ai_usage_events;
create policy "ai_usage_events: insert own" on ai_usage_events for insert with check (auth.uid() = user_id);
drop policy if exists "ai_usage_events: update own" on ai_usage_events;
create policy "ai_usage_events: update own" on ai_usage_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Lets any signed-in user learn the shared global estimated daily AI spend (needed to enforce
-- DAILY_AI_BUDGET_USD in api/_lib/aiBudget.ts) without granting cross-user SELECT access.
create or replace function ai_usage_daily_cost_usd()
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(estimated_cost_usd), 0) from ai_usage_events where created_at >= now() - interval '24 hours';
$$;

revoke all on function ai_usage_daily_cost_usd() from public;
grant execute on function ai_usage_daily_cost_usd() to authenticated;

create or replace function reserve_realtime_ai_budget(p_session_id uuid, p_reservation_usd numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_cost numeric;
begin
  if auth.uid() is null or p_session_id is null or p_reservation_usd <> 0.75 then
    return false;
  end if;
  perform pg_advisory_xact_lock(724615);
  select coalesce(sum(estimated_cost_usd), 0) into current_cost
  from ai_usage_events where created_at >= now() - interval '24 hours';
  if current_cost + p_reservation_usd > 5 then return false; end if;
  insert into ai_usage_events (
    user_id, endpoint, session_id, reservation_usd, estimated_cost_usd
  ) values (
    auth.uid(), 'realtime-voice', p_session_id, p_reservation_usd, p_reservation_usd
  );
  return true;
end;
$$;

revoke all on function reserve_realtime_ai_budget(uuid, numeric) from public;
grant execute on function reserve_realtime_ai_budget(uuid, numeric) to authenticated;

-- Private screen recordings created only after explicit learner consent. storage_path is null
-- for "learning diary" entries, which save only a short AI summary and never the video itself.
create table if not exists screen_recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text unique,
  duration_seconds integer not null default 0,
  size_bytes bigint not null default 0,
  mime_type text not null default 'video/webm',
  status text not null default 'uploaded' check (status in ('uploaded', 'analyzed', 'summary_only')),
  consent_given boolean not null default false,
  analysis jsonb,
  analyzed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Safe to re-run: relaxes storage_path/status so existing databases accept diary-only rows
-- (a saved AI summary with no uploaded video) alongside the original video-upload rows.
alter table screen_recordings alter column storage_path drop not null;
alter table screen_recordings drop constraint if exists screen_recordings_status_check;
alter table screen_recordings add constraint screen_recordings_status_check
  check (status in ('uploaded', 'analyzed', 'summary_only'));

create index if not exists screen_recordings_user_id_created_at_idx
  on screen_recordings (user_id, created_at desc);

alter table screen_recordings enable row level security;

drop policy if exists "screen_recordings: owner all" on screen_recordings;
create policy "screen_recordings: owner all" on screen_recordings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and consent_given = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screen-recordings', 'screen-recordings', false, 104857600, array['video/webm'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "screen recordings: owner read" on storage.objects;
create policy "screen recordings: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'screen-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "screen recordings: owner insert" on storage.objects;
create policy "screen recordings: owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'screen-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "screen recordings: owner delete" on storage.objects;
create policy "screen recordings: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'screen-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

-- Rate-limit events for sampled real-time screen observations.
create table if not exists screen_observation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists screen_observation_events_user_id_created_at_idx
  on screen_observation_events (user_id, created_at);

alter table screen_observation_events enable row level security;

drop policy if exists "screen_observation_events: owner all" on screen_observation_events;
create policy "screen_observation_events: owner all" on screen_observation_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One explainable mastery and spaced-repetition record per course topic.
create table if not exists topic_mastery_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references courses (id) on delete cascade,
  topic text not null,
  mastery_score integer not null default 0 check (mastery_score between 0 and 100),
  diagnostic_score integer check (diagnostic_score between 0 and 100),
  evidence_count integer not null default 0,
  last_practiced_at timestamptz not null default now(),
  next_review_at timestamptz not null default now(),
  review_interval_days integer not null default 1,
  ease_factor numeric not null default 2.5,
  repetitions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id, topic)
);

create index if not exists topic_mastery_records_course_due_idx
  on topic_mastery_records (course_id, next_review_at);

alter table topic_mastery_records enable row level security;

drop policy if exists "topic_mastery_records: owner all" on topic_mastery_records;
create policy "topic_mastery_records: owner all" on topic_mastery_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
