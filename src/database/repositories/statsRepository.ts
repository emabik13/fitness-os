import type { SqlExecutor } from '../types';

export interface TrainingTotals {
  workouts: number;
  sets: number;
  reps: number;
  volumeKg: number;
  durationSeconds: number;
}

export interface WeightPoint {
  measuredAt: string;
  weightKg: number;
}

export function createStatsRepository(db: SqlExecutor) {
  return {
    /** Totals of completed workouts since `fromIso` (null = whole history). Warm-ups excluded. */
    async getTrainingTotals(userId: string, fromIso: string | null): Promise<TrainingTotals> {
      const from = fromIso ?? '0000';
      const w = await db.getFirstAsync<{ workouts: number; duration: number | null }>(
        `SELECT COUNT(*) AS workouts, SUM(duration_seconds) AS duration FROM workouts
          WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL AND started_at >= ?`,
        [userId, from],
      );
      const s = await db.getFirstAsync<{ sets: number; reps: number | null; volume: number | null }>(
        `SELECT COUNT(ws.id) AS sets, SUM(ws.reps) AS reps, SUM(ws.reps * ws.weight_kg) AS volume
           FROM workout_sets ws
           JOIN workout_exercises we ON we.id = ws.workout_exercise_id AND we.deleted_at IS NULL
           JOIN workouts w ON w.id = we.workout_id
          WHERE w.user_id = ? AND w.status = 'completed' AND w.deleted_at IS NULL AND w.started_at >= ?
            AND ws.deleted_at IS NULL AND ws.is_completed = 1 AND ws.set_type <> 'warmup'`,
        [userId, from],
      );
      return {
        workouts: w?.workouts ?? 0,
        durationSeconds: w?.duration ?? 0,
        sets: s?.sets ?? 0,
        reps: s?.reps ?? 0,
        volumeKg: s?.volume ?? 0,
      };
    },

    async getWeightSeries(userId: string, fromIso: string | null): Promise<WeightPoint[]> {
      return db.getAllAsync<WeightPoint>(
        `SELECT measured_at AS measuredAt, weight_kg AS weightKg FROM body_weight_entries
          WHERE user_id = ? AND deleted_at IS NULL AND measured_at >= ?
          ORDER BY measured_at`,
        [userId, fromIso ?? '0000'],
      );
    },
  };
}

export type StatsRepository = ReturnType<typeof createStatsRepository>;
