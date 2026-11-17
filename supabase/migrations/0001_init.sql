-- FITNESS OS — Supabase (Postgres) schema for backup & multi-device sync (Phase 10).
-- Mirrors the local SQLite schema. Differences:
--   * every user-owned table carries user_id (denormalized on child tables) so
--     Row Level Security is a cheap `user_id = auth.uid()` check;
--   * timestamps are timestamptz; ids are the device-generated UUIDs (no server ids),
--     which makes uploads idempotent (upsert on id) and prevents duplicates.
-- Conflict rule (same as src/sync/conflict.ts, enforced server-side by the
-- `keep_newest` trigger): higher `version` wins; on a tie, later `updated_at`
-- wins; stale updates are silently ignored. Deletions are tombstones (deleted_at).
-- Apply with the Supabase CLI (`supabase db push`) or the SQL editor.


-- ───────────── Catalog (read-only for clients) ─────────────
create table if not exists public.muscle_groups (
  id text primary key, name_es text not null, region text not null, body_view text not null,
  description text, function_text text, sort_order int not null default 0
);
create table if not exists public.exercises (
  id text primary key, slug text not null unique, name_es text not null, alt_names jsonb not null default '[]',
  primary_muscle_group_id text not null references public.muscle_groups(id), equipment text not null,
  movement_type text not null, difficulty text not null, movement_pattern text not null, description text,
  instructions jsonb not null default '[]', biomechanics jsonb not null default '{}', common_errors jsonb not null default '[]',
  tips jsonb not null default '[]', tags jsonb not null default '[]', is_custom boolean not null default false,
  owner_user_id uuid references auth.users(id) on delete cascade, content_source text,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1,
  check ((not is_custom and owner_user_id is null) or (is_custom and owner_user_id is not null))
);
create table if not exists public.exercise_muscles (
  exercise_id text references public.exercises(id) on delete cascade, muscle_group_id text references public.muscle_groups(id),
  role text not null check (role in ('agonist','synergist','stabilizer')), primary key (exercise_id, muscle_group_id)
);
create table if not exists public.exercise_media (
  id text primary key, exercise_id text not null references public.exercises(id) on delete cascade,
  kind text not null check (kind in ('anatomy_model','animation','thumbnail')),
  status text not null default 'pending' check (status in ('available','pending')),
  uri text, format text, size_bytes int, checksum_sha256 text, source text, license text, attribution text,
  created_at timestamptz not null, updated_at timestamptz not null, unique (exercise_id, kind),
  check (status = 'pending' or (uri is not null and source is not null and license is not null))
);

-- ───────────── User data ─────────────
-- Common sync columns: created_at, updated_at, deleted_at, version.
create table if not exists public.user_profiles (
  id uuid primary key, user_id uuid not null unique references auth.users(id) on delete cascade,
  age_years int check (age_years between 13 and 100), sex text check (sex in ('female','male','unspecified')),
  height_cm real check (height_cm between 100 and 250), target_weight_kg real check (target_weight_kg between 30 and 300),
  goal text not null default 'recomposition', experience text, days_per_week int check (days_per_week between 1 and 7),
  session_minutes int check (session_minutes between 15 and 240), priority_muscles jsonb not null default '[]',
  limitations jsonb not null default '[]', lift_experience jsonb not null default '{}', preferences jsonb not null default '{}',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.user_equipment (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, equipment text not null,
  available boolean not null default true, unique (user_id, equipment),
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.routines (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, name text not null,
  goal text not null, split_type text not null, days_per_week int not null check (days_per_week between 1 and 7),
  rationale text, is_active boolean not null default false, generated_by text not null default 'user', engine_version text,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.routine_days (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade, day_index int not null, name text not null,
  focus text, estimated_minutes int, suggested_weekday int check (suggested_weekday between 0 and 6),
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.routine_exercises (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  exercise_id text not null references public.exercises(id), position int not null, sets int not null check (sets between 1 and 10),
  rep_min int not null check (rep_min >= 1), rep_max int not null, rest_seconds int not null check (rest_seconds between 0 and 900),
  target_rir int check (target_rir between 0 and 5), intensity_note text, notes text, check (rep_max >= rep_min),
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.workouts (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  routine_day_id uuid references public.routine_days(id) on delete set null, name text not null,
  status text not null check (status in ('in_progress','completed','discarded')), started_at timestamptz not null,
  ended_at timestamptz, duration_seconds int, notes text,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.workout_exercises (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid not null references public.workouts(id) on delete cascade, exercise_id text not null references public.exercises(id),
  routine_exercise_id uuid references public.routine_exercises(id) on delete set null, replaced_exercise_id text references public.exercises(id),
  position int not null, rest_seconds int, rep_min int, rep_max int, target_rir int, notes text,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.workout_sets (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade, position int not null,
  set_type text not null default 'working', weight_kg real check (weight_kg between 0 and 1000), reps int check (reps between 0 and 200),
  rir real check (rir between 0 and 10), rpe real check (rpe between 1 and 10), is_completed boolean not null default false,
  completed_at timestamptz, notes text,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.personal_records (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, exercise_id text not null references public.exercises(id),
  record_type text not null, value real not null, weight_kg real, reps int, workout_set_id uuid references public.workout_sets(id) on delete set null,
  achieved_at timestamptz not null,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.body_weight_entries (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, measured_at timestamptz not null,
  weight_kg real not null check (weight_kg between 25 and 350), source text not null default 'manual', notes text,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.body_measurements (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, measured_at timestamptz not null,
  waist_cm real, hip_cm real, chest_cm real, arm_cm real, thigh_cm real, calf_cm real,
  body_fat_pct real check (body_fat_pct between 2 and 70), body_fat_method text, body_fat_error_pct real,
  notes text, check (body_fat_pct is null or body_fat_method is not null),
  -- Progress photos are NOT synced by default (local only; opt-in storage bucket later).
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.nutrition_entries (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, entry_date date not null, label text,
  calories_kcal real, protein_g real, carbs_g real, fat_g real, water_ml real, notes text,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);
create table if not exists public.recovery_entries (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, entry_date date not null,
  sleep_hours real, recovery_score int, fatigue int, soreness int, energy int, notes text,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz, version int not null default 1
);

create or replace function public.keep_newest() returns trigger language plpgsql as $$
begin
  if new.version < old.version or (new.version = old.version and new.updated_at <= old.updated_at) then
    return null; -- stale write from another device: keep the stored row
  end if;
  return new;
end $$;

-- Pull queries: rows changed since the last sync.
do $$ declare t text; begin
  foreach t in array array['user_profiles','user_equipment','routines','routine_days','routine_exercises','workouts',
    'workout_exercises','workout_sets','personal_records','body_weight_entries','body_measurements','nutrition_entries','recovery_entries']
  loop
    execute format('create index if not exists %I on public.%I (user_id, updated_at)', 'idx_' || t || '_sync', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
    execute format('create policy owner_all on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop trigger if exists keep_newest on public.%I', t);
    execute format('create trigger keep_newest before update on public.%I for each row execute function public.keep_newest()', t);
  end loop;
end $$;

-- Catalog: everyone signed in can read; nobody but the owner can write custom exercises.
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_media enable row level security;
drop policy if exists read_all on public.muscle_groups;
create policy read_all on public.muscle_groups for select to authenticated using (true);
drop policy if exists read_catalog on public.exercises;
create policy read_catalog on public.exercises for select to authenticated using (not is_custom or owner_user_id = auth.uid());
drop policy if exists write_custom on public.exercises;
create policy write_custom on public.exercises for all to authenticated
  using (is_custom and owner_user_id = auth.uid()) with check (is_custom and owner_user_id = auth.uid());
drop policy if exists read_all on public.exercise_muscles;
create policy read_all on public.exercise_muscles for select to authenticated using (true);
drop policy if exists read_all on public.exercise_media;
create policy read_all on public.exercise_media for select to authenticated using (true);
