import type { SqlExecutor } from '../types';

export interface ProfileSummary {
  goal: string;
  targetWeightKg: number | null;
  onboardingCompleted: boolean;
}

export interface LatestWeight {
  weightKg: number;
  measuredAt: string;
}

export interface LatestRecord {
  exerciseName: string;
  recordType: string;
  value: number;
  weightKg: number | null;
  reps: number | null;
  achievedAt: string;
}

export interface MuscleWeeklySets {
  muscleGroupId: string;
  name: string;
  sets: number;
}

export function createDashboardRepository(db: SqlExecutor) {
  return {
    async getProfileSummary(userId: string): Promise<ProfileSummary | null> {
      const row = await db.getFirstAsync<{
        goal: string;
        target_weight_kg: number | null;
        onboarding_completed_at: string | null;
      }>(
        `SELECT goal, target_weight_kg, onboarding_completed_at
           FROM user_profiles WHERE user_id = ? AND deleted_at IS NULL`,
        [userId],
      );
      if (!row) return null;
      return {
        goal: row.goal,
        targetWeightKg: row.target_weight_kg,
        onboardingCompleted: row.onboarding_completed_at !== null,
      };
    },

    /** Start instants of completed workouts in [fromIso, toIso). */
    async getCompletedWorkoutDates(userId: string, fromIso: string, toIso: string): Promise<string[]> {
      const rows = await db.getAllAsync<{ started_at: string }>(
        `SELECT started_at FROM workouts
          WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL
            AND started_at >= ? AND started_at < ?
          ORDER BY started_at`,
        [userId, fromIso, toIso],
      );
      return rows.map((r) => r.started_at);
    },

    async getLatestWeight(userId: string): Promise<LatestWeight | null> {
      const row = await db.getFirstAsync<{ weight_kg: number; measured_at: string }>(
        `SELECT weight_kg, measured_at FROM body_weight_entries
          WHERE user_id = ? AND deleted_at IS NULL
          ORDER BY measured_at DESC LIMIT 1`,
        [userId],
      );
      return row ? { weightKg: row.weight_kg, measuredAt: row.measured_at } : null;
    },

    async getLatestRecord(userId: string): Promise<LatestRecord | null> {
      const row = await db.getFirstAsync<{
        name_es: string;
        record_type: string;
        value: number;
        weight_kg: number | null;
        reps: number | null;
        achieved_at: string;
      }>(
        `SELECT e.name_es, pr.record_type, pr.value, pr.weight_kg, pr.reps, pr.achieved_at
           FROM personal_records pr JOIN exercises e ON e.id = pr.exercise_id
          WHERE pr.user_id = ? AND pr.deleted_at IS NULL
          ORDER BY pr.achieved_at DESC LIMIT 1`,
        [userId],
      );
      if (!row) return null;
      return {
        exerciseName: row.name_es,
        recordType: row.record_type,
        value: row.value,
        weightKg: row.weight_kg,
        reps: row.reps,
        achievedAt: row.achieved_at,
      };
    },

    async getActiveRoutineName(userId: string): Promise<string | null> {
      const row = await db.getFirstAsync<{ name: string }>(
        `SELECT name FROM routines WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1`,
        [userId],
      );
      return row?.name ?? null;
    },

    /**
     * Completed working sets per muscle group in a time window, counting a set
     * for every muscle with the agonist role in that exercise.
     */
    async getWeeklySetsByMuscle(userId: string, fromIso: string, toIso: string): Promise<MuscleWeeklySets[]> {
      return db.getAllAsync<MuscleWeeklySets>(
        `SELECT mg.id AS muscleGroupId, mg.name_es AS name, COUNT(ws.id) AS sets
           FROM workout_sets ws
           JOIN workout_exercises we ON we.id = ws.workout_exercise_id AND we.deleted_at IS NULL
           JOIN workouts w ON w.id = we.workout_id AND w.deleted_at IS NULL
           JOIN exercise_muscles em ON em.exercise_id = we.exercise_id AND em.role = 'agonist'
           JOIN muscle_groups mg ON mg.id = em.muscle_group_id
          WHERE w.user_id = ? AND w.status = 'completed'
            AND w.started_at >= ? AND w.started_at < ?
            AND ws.deleted_at IS NULL AND ws.is_completed = 1 AND ws.set_type <> 'warmup'
          GROUP BY mg.id ORDER BY sets DESC`,
        [userId, fromIso, toIso],
      );
    },
  };
}

export type DashboardRepository = ReturnType<typeof createDashboardRepository>;
