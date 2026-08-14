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

-- Any signed-in user can count all rows (needed to check the shared global daily total),
-- but can only ever insert a row tagged with their own user id.
drop policy if exists "chat_events: read all" on chat_events;
create policy "chat_events: read all" on chat_events for select using (auth.role() = 'authenticated');
drop policy if exists "chat_events: insert own" on chat_events;
create policy "chat_events: insert own" on chat_events for insert with check (auth.uid() = user_id);
