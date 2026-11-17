/** Migration 002 — suggested weekday per routine day (engine schedule). */
export const migration002 = {
  version: 2,
  name: 'routine_schedule',
  sql: `
ALTER TABLE routine_days ADD COLUMN suggested_weekday INTEGER
  CHECK (suggested_weekday IS NULL OR suggested_weekday BETWEEN 0 AND 6);
CREATE INDEX IF NOT EXISTS idx_workouts_routine_day ON workouts(routine_day_id, started_at);
`,
} as const;
