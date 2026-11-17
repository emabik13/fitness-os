import { startOfWeek, toLocalDateKey } from '@/utils/time';

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

export interface WeeklyMuscleSets {
  weekStart: string; // local YYYY-MM-DD (Monday)
  direct: number;
  effective: number;
}

export interface MuscleVolume {
  muscleGroupId: string;
  name: string;
  direct: number;
  effective: number;
}

export function createStatsRepository(db: SqlExecutor) {
  return {
    /** Direct (agonist) and effective (synergist = 0.5) completed sets per muscle since `fromIso`. */
    async muscleVolume(userId: string, fromIso: string | null): Promise<MuscleVolume[]> {
      const rows = await db.getAllAsync<MuscleVolume>(
        `SELECT mg.id AS muscleGroupId, mg.name_es AS name,
                SUM(CASE em.role WHEN 'agonist' THEN 1 ELSE 0 END) AS direct,
                SUM(CASE em.role WHEN 'agonist' THEN 1.0 WHEN 'synergist' THEN 0.5 ELSE 0 END) AS effective
           FROM workout_sets ws
           JOIN workout_exercises we ON we.id = ws.workout_exercise_id AND we.deleted_at IS NULL
           JOIN workouts w ON w.id = we.workout_id AND w.deleted_at IS NULL AND w.status = 'completed'
           JOIN exercise_muscles em ON em.exercise_id = we.exercise_id
           JOIN muscle_groups mg ON mg.id = em.muscle_group_id
          WHERE w.user_id = ? AND w.started_at >= ? AND ws.deleted_at IS NULL AND ws.is_completed = 1
            AND ws.set_type <> 'warmup'
          GROUP BY mg.id HAVING effective > 0 ORDER BY effective DESC`,
        [userId, fromIso ?? '0000'],
      );
      return rows;
    },

    /** Exercises ordered by number of sessions since `fromIso`. */
    async topExercises(userId: string, fromIso: string | null, limit = 8) {
      return db.getAllAsync<{ exerciseId: string; name: string; sessions: number; sets: number }>(
        `SELECT e.id AS exerciseId, e.name_es AS name, COUNT(DISTINCT w.id) AS sessions, COUNT(ws.id) AS sets
           FROM workout_sets ws
           JOIN workout_exercises we ON we.id = ws.workout_exercise_id AND we.deleted_at IS NULL
           JOIN workouts w ON w.id = we.workout_id AND w.deleted_at IS NULL AND w.status = 'completed'
           JOIN exercises e ON e.id = we.exercise_id
          WHERE w.user_id = ? AND w.started_at >= ? AND ws.deleted_at IS NULL AND ws.is_completed = 1
            AND ws.set_type <> 'warmup'
          GROUP BY e.id ORDER BY sessions DESC, sets DESC LIMIT ?`,
        [userId, fromIso ?? '0000', limit],
      );
    },

    /** Completed working sets for a muscle bucketed by week (oldest first, `weeks` buckets ending this week). */
    async muscleWeeklySets(userId: string, muscleId: string, weeks = 8, now = new Date()): Promise<WeeklyMuscleSets[]> {
      const thisWeek = startOfWeek(now);
      const first = new Date(thisWeek);
      first.setDate(first.getDate() - 7 * (weeks - 1));
      const rows = await db.getAllAsync<{ started_at: string; role: string }>(
        `SELECT w.started_at, em.role FROM workout_sets ws
           JOIN workout_exercises we ON we.id = ws.workout_exercise_id AND we.deleted_at IS NULL
           JOIN workouts w ON w.id = we.workout_id AND w.deleted_at IS NULL AND w.status = 'completed'
           JOIN exercise_muscles em ON em.exercise_id = we.exercise_id AND em.muscle_group_id = ?
          WHERE w.user_id = ? AND w.started_at >= ? AND ws.deleted_at IS NULL AND ws.is_completed = 1
            AND ws.set_type <> 'warmup'`,
        [muscleId, userId, first.toISOString()],
      );
      const buckets: WeeklyMuscleSets[] = Array.from({ length: weeks }, (_, i) => {
        const d = new Date(first);
        d.setDate(first.getDate() + 7 * i);
        return { weekStart: toLocalDateKey(d), direct: 0, effective: 0 };
      });
      for (const r of rows) {
        const key = toLocalDateKey(startOfWeek(new Date(r.started_at)));
        const b = buckets.find((x) => x.weekStart === key);
        if (!b) continue;
        if (r.role === 'agonist') {
          b.direct += 1;
          b.effective += 1;
        } else if (r.role === 'synergist') b.effective += 0.5;
      }
      return buckets;
    },

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
