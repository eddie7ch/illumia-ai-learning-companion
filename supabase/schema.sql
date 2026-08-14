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
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

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
