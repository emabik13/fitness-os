/**
 * Migration 001 — initial relational schema.
 *
 * Conventions (see ARCHITECTURE.md §Base de datos):
 * - Primary keys: UUID v4 TEXT (generated on device) so rows can be created
 *   offline and merged into Supabase without collisions or duplicates.
 * - Timestamps: ISO-8601 UTC TEXT (lexicographically sortable, maps 1:1 to
 *   Postgres timestamptz).
 * - Synced tables carry `version` (incremented on every local write),
 *   `updated_at`, `deleted_at` (soft-delete tombstone) and `sync_status`.
 *   Conflict resolution: higher `version`, then later `updated_at` wins
 *   (implemented in Phase 10).
 * - Units are fixed: kg, cm, minutes/seconds (column suffixes make this explicit).
 * - Catalog tables (muscle_groups, exercises, exercise_muscles, exercise_media)
 *   ship with the app; user-created exercises are flagged `is_custom = 1`.
 */

const SYNC_COLUMNS = `
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced'))
`;

export const migration001 = {
  version: 1,
  name: 'initial_schema',
  sql: `
CREATE TABLE IF NOT EXISTS local_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_state (
  table_name TEXT PRIMARY KEY NOT NULL,
  last_pulled_at TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  remote_id TEXT UNIQUE,
  email TEXT,
  display_name TEXT,
  ${SYNC_COLUMNS}
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  age_years INTEGER CHECK (age_years IS NULL OR age_years BETWEEN 13 AND 100),
  sex TEXT CHECK (sex IS NULL OR sex IN ('female', 'male', 'unspecified')),
  height_cm REAL CHECK (height_cm IS NULL OR height_cm BETWEEN 100 AND 250),
  target_weight_kg REAL CHECK (target_weight_kg IS NULL OR target_weight_kg BETWEEN 30 AND 300),
  goal TEXT NOT NULL DEFAULT 'recomposition'
    CHECK (goal IN ('recomposition', 'hypertrophy', 'strength', 'fat_loss', 'maintenance')),
  experience TEXT CHECK (experience IS NULL OR experience IN ('beginner', 'intermediate', 'advanced')),
  days_per_week INTEGER CHECK (days_per_week IS NULL OR days_per_week BETWEEN 1 AND 7),
  session_minutes INTEGER CHECK (session_minutes IS NULL OR session_minutes BETWEEN 15 AND 240),
  priority_muscles TEXT NOT NULL DEFAULT '[]',      -- JSON array of muscle_groups.id
  limitations TEXT NOT NULL DEFAULT '[]',           -- JSON array of {area, note}
  lift_experience TEXT NOT NULL DEFAULT '{}',       -- JSON map exercise_pattern -> level
  preferences TEXT NOT NULL DEFAULT '{}',           -- JSON object
  onboarding_completed_at TEXT,
  ${SYNC_COLUMNS}
);

CREATE TABLE IF NOT EXISTS user_equipment (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  equipment TEXT NOT NULL CHECK (equipment IN (
    'barbell', 'dumbbell', 'machine', 'cable', 'bench', 'smith_machine',
    'leg_press', 'rack', 'pullup_bar', 'bodyweight')),
  available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1)),
  ${SYNC_COLUMNS},
  UNIQUE (user_id, equipment)
);

CREATE TABLE IF NOT EXISTS muscle_groups (
  id TEXT PRIMARY KEY NOT NULL,                     -- stable slug, e.g. 'pectorals'
  name_es TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('upper', 'lower', 'core')),
  body_view TEXT NOT NULL CHECK (body_view IN ('front', 'back', 'both')),
  description TEXT,
  function_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  alt_names TEXT NOT NULL DEFAULT '[]',             -- JSON array
  primary_muscle_group_id TEXT NOT NULL REFERENCES muscle_groups(id),
  equipment TEXT NOT NULL CHECK (equipment IN (
    'barbell', 'dumbbell', 'machine', 'cable', 'bench', 'smith_machine',
    'leg_press', 'rack', 'pullup_bar', 'bodyweight')),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('compound', 'isolation')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  movement_pattern TEXT NOT NULL,
  description TEXT,
  instructions TEXT NOT NULL DEFAULT '[]',          -- JSON array of steps
  biomechanics TEXT NOT NULL DEFAULT '{}',          -- JSON: start, path, concentric, eccentric, breathing...
  common_errors TEXT NOT NULL DEFAULT '[]',         -- JSON array
  tips TEXT NOT NULL DEFAULT '[]',                  -- JSON array
  tags TEXT NOT NULL DEFAULT '[]',                  -- JSON array
  is_custom INTEGER NOT NULL DEFAULT 0 CHECK (is_custom IN (0, 1)),
  owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  content_source TEXT,                              -- provenance of the text content
  ${SYNC_COLUMNS},
  CHECK ((is_custom = 0 AND owner_user_id IS NULL) OR (is_custom = 1 AND owner_user_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON exercises(primary_muscle_group_id);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_pattern ON exercises(movement_pattern);

CREATE TABLE IF NOT EXISTS exercise_muscles (
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_group_id TEXT NOT NULL REFERENCES muscle_groups(id),
  role TEXT NOT NULL CHECK (role IN ('agonist', 'synergist', 'stabilizer')),
  PRIMARY KEY (exercise_id, muscle_group_id)
);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle ON exercise_muscles(muscle_group_id, role);

CREATE TABLE IF NOT EXISTS exercise_relations (
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  related_exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('variant', 'substitute')),
  PRIMARY KEY (exercise_id, related_exercise_id, kind),
  CHECK (exercise_id <> related_exercise_id)
);

CREATE TABLE IF NOT EXISTS exercise_media (
  id TEXT PRIMARY KEY NOT NULL,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('anatomy_model', 'animation', 'thumbnail')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('available', 'pending')),
  uri TEXT,                                         -- bundled asset key or remote URL
  format TEXT CHECK (format IS NULL OR format IN ('glb', 'png', 'webp', 'jpg')),
  size_bytes INTEGER,
  checksum_sha256 TEXT,
  source TEXT,                                      -- author / provider
  license TEXT,                                     -- SPDX id or license name
  attribution TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (exercise_id, kind),
  CHECK (status = 'pending' OR (uri IS NOT NULL AND source IS NOT NULL AND license IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  goal TEXT NOT NULL CHECK (goal IN ('recomposition', 'hypertrophy', 'strength', 'fat_loss', 'maintenance')),
  split_type TEXT NOT NULL CHECK (split_type IN (
    'full_body', 'upper_lower', 'push_pull_legs', 'torso_legs', 'specialized', 'custom')),
  days_per_week INTEGER NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  rationale TEXT,                                   -- engine explanation of the chosen split
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  generated_by TEXT NOT NULL DEFAULT 'user' CHECK (generated_by IN ('engine', 'user')),
  engine_version TEXT,
  ${SYNC_COLUMNS}
);
CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id, is_active);

CREATE TABLE IF NOT EXISTS routine_days (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL CHECK (day_index >= 0),
  name TEXT NOT NULL,
  focus TEXT,
  estimated_minutes INTEGER CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  ${SYNC_COLUMNS}
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_routine_days_index
  ON routine_days(routine_id, day_index) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS routine_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  routine_day_id TEXT NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL CHECK (position >= 0),
  sets INTEGER NOT NULL CHECK (sets BETWEEN 1 AND 10),
  rep_min INTEGER NOT NULL CHECK (rep_min >= 1),
  rep_max INTEGER NOT NULL,
  rest_seconds INTEGER NOT NULL CHECK (rest_seconds BETWEEN 0 AND 900),
  target_rir INTEGER CHECK (target_rir IS NULL OR target_rir BETWEEN 0 AND 5),
  intensity_note TEXT,
  notes TEXT,
  ${SYNC_COLUMNS},
  CHECK (rep_max >= rep_min)
);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_day ON routine_exercises(routine_day_id, position);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_day_id TEXT REFERENCES routine_days(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'discarded')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  notes TEXT,
  ${SYNC_COLUMNS},
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON workouts(user_id, started_at);
-- At most one in-progress workout per user (crash recovery relies on this).
CREATE UNIQUE INDEX IF NOT EXISTS uq_workouts_in_progress
  ON workouts(user_id) WHERE status = 'in_progress' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  routine_exercise_id TEXT REFERENCES routine_exercises(id) ON DELETE SET NULL,
  replaced_exercise_id TEXT REFERENCES exercises(id),
  position INTEGER NOT NULL CHECK (position >= 0),
  rest_seconds INTEGER CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 900),
  rep_min INTEGER,
  rep_max INTEGER,
  target_rir INTEGER,
  notes TEXT,
  ${SYNC_COLUMNS}
);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id, position);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON workout_exercises(exercise_id);

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY NOT NULL,
  workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  set_type TEXT NOT NULL DEFAULT 'working' CHECK (set_type IN ('warmup', 'working', 'dropset', 'failure')),
  weight_kg REAL CHECK (weight_kg IS NULL OR weight_kg BETWEEN 0 AND 1000),
  reps INTEGER CHECK (reps IS NULL OR reps BETWEEN 0 AND 200),
  rir REAL CHECK (rir IS NULL OR rir BETWEEN 0 AND 10),
  rpe REAL CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  completed_at TEXT,
  notes TEXT,
  ${SYNC_COLUMNS}
);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(workout_exercise_id, position);

CREATE TABLE IF NOT EXISTS personal_records (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  record_type TEXT NOT NULL CHECK (record_type IN (
    'max_weight', 'max_reps', 'estimated_1rm', 'max_set_volume')),
  value REAL NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  workout_set_id TEXT REFERENCES workout_sets(id) ON DELETE SET NULL,
  achieved_at TEXT NOT NULL,
  ${SYNC_COLUMNS}
);
CREATE INDEX IF NOT EXISTS idx_pr_user_exercise ON personal_records(user_id, exercise_id, record_type);
CREATE INDEX IF NOT EXISTS idx_pr_user_achieved ON personal_records(user_id, achieved_at);

CREATE TABLE IF NOT EXISTS body_weight_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at TEXT NOT NULL,
  weight_kg REAL NOT NULL CHECK (weight_kg BETWEEN 25 AND 350),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'smart_scale', 'external')),
  notes TEXT,
  ${SYNC_COLUMNS}
);
CREATE INDEX IF NOT EXISTS idx_body_weight_user_date ON body_weight_entries(user_id, measured_at);

CREATE TABLE IF NOT EXISTS body_measurements (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at TEXT NOT NULL,
  waist_cm REAL CHECK (waist_cm IS NULL OR waist_cm BETWEEN 30 AND 250),
  hip_cm REAL CHECK (hip_cm IS NULL OR hip_cm BETWEEN 30 AND 250),
  chest_cm REAL CHECK (chest_cm IS NULL OR chest_cm BETWEEN 30 AND 250),
  arm_cm REAL CHECK (arm_cm IS NULL OR arm_cm BETWEEN 10 AND 80),
  thigh_cm REAL CHECK (thigh_cm IS NULL OR thigh_cm BETWEEN 20 AND 120),
  calf_cm REAL CHECK (calf_cm IS NULL OR calf_cm BETWEEN 15 AND 80),
  body_fat_pct REAL CHECK (body_fat_pct IS NULL OR body_fat_pct BETWEEN 2 AND 70),
  body_fat_method TEXT CHECK (body_fat_method IS NULL OR body_fat_method IN (
    'bia_scale', 'dexa', 'skinfold', 'bod_pod', 'formula_estimate', 'other')),
  body_fat_error_pct REAL CHECK (body_fat_error_pct IS NULL OR body_fat_error_pct BETWEEN 0 AND 20),
  photo_local_uri TEXT,                             -- never synced unless the user opts in
  notes TEXT,
  ${SYNC_COLUMNS},
  CHECK (body_fat_pct IS NULL OR body_fat_method IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, measured_at);

CREATE TABLE IF NOT EXISTS nutrition_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,                         -- local YYYY-MM-DD
  label TEXT,
  calories_kcal REAL CHECK (calories_kcal IS NULL OR calories_kcal BETWEEN 0 AND 20000),
  protein_g REAL CHECK (protein_g IS NULL OR protein_g >= 0),
  carbs_g REAL CHECK (carbs_g IS NULL OR carbs_g >= 0),
  fat_g REAL CHECK (fat_g IS NULL OR fat_g >= 0),
  water_ml REAL CHECK (water_ml IS NULL OR water_ml >= 0),
  notes TEXT,
  ${SYNC_COLUMNS}
);
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON nutrition_entries(user_id, entry_date);

CREATE TABLE IF NOT EXISTS recovery_entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,                         -- local YYYY-MM-DD
  sleep_hours REAL CHECK (sleep_hours IS NULL OR sleep_hours BETWEEN 0 AND 24),
  recovery_score INTEGER CHECK (recovery_score IS NULL OR recovery_score BETWEEN 1 AND 5),
  fatigue INTEGER CHECK (fatigue IS NULL OR fatigue BETWEEN 1 AND 5),
  soreness INTEGER CHECK (soreness IS NULL OR soreness BETWEEN 1 AND 5),
  energy INTEGER CHECK (energy IS NULL OR energy BETWEEN 1 AND 5),
  notes TEXT,
  ${SYNC_COLUMNS}
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_recovery_user_date
  ON recovery_entries(user_id, entry_date) WHERE deleted_at IS NULL;

-- Catalog: the 12 muscle groups of the anatomy map. Descriptions are filled in
-- with verified content in Phase 3/4 (left NULL rather than invented).
INSERT OR IGNORE INTO muscle_groups (id, name_es, region, body_view, sort_order) VALUES
  ('pectorals',  'Pectorales',     'upper', 'front', 1),
  ('lats',       'Dorsales',       'upper', 'back',  2),
  ('traps',      'Trapecios',      'upper', 'back',  3),
  ('deltoids',   'Deltoides',      'upper', 'both',  4),
  ('biceps',     'Bíceps',         'upper', 'front', 5),
  ('triceps',    'Tríceps',        'upper', 'back',  6),
  ('forearms',   'Antebrazos',     'upper', 'both',  7),
  ('abdominals', 'Abdominales',    'core',  'front', 8),
  ('quadriceps', 'Cuádriceps',     'lower', 'front', 9),
  ('hamstrings', 'Isquiotibiales', 'lower', 'back',  10),
  ('glutes',     'Glúteos',        'lower', 'back',  11),
  ('calves',     'Gemelos',        'lower', 'back',  12);
`,
} as const;
