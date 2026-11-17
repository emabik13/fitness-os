import type { Equipment } from '@/domain/profile';
import { detectRecords, type RecordCandidate } from '@/engine/progression/personalRecords';
import type { SessionPerformance } from '@/engine/progression/doubleProgression';
import { nowIso } from '@/utils/time';

import type { SqlExecutor } from '../types';
import { insertRow, softDelete, updateRow } from '../write';

export type SetType = 'warmup' | 'working' | 'dropset' | 'failure';

export interface WorkoutSet {
  id: string;
  position: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
  rpe: number | null;
  isCompleted: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  name: string;
  primaryMuscleName: string;
  equipment: Equipment;
  movementType: 'compound' | 'isolation';
  position: number;
  restSeconds: number;
  repMin: number | null;
  repMax: number | null;
  targetRir: number | null;
  notes: string | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  name: string;
  status: 'in_progress' | 'completed' | 'discarded';
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  notes: string | null;
  routineDayId: string | null;
  exercises: WorkoutExercise[];
}

export interface WorkoutSummary {
  workout: Workout;
  totals: { exercises: number; sets: number; reps: number; volumeKg: number; durationSeconds: number };
  records: (RecordCandidate & { exerciseName: string })[];
  previous: { workoutId: string; startedAt: string; volumeKg: number; sets: number; reps: number } | null;
}

export interface HistorySession {
  workoutId: string;
  startedAt: string;
  sets: { weightKg: number | null; reps: number | null; rir: number | null }[];
}

const DEFAULT_REST = { compound: 120, isolation: 75 };

export function totalsOf(w: Workout) {
  let sets = 0;
  let reps = 0;
  let volumeKg = 0;
  for (const e of w.exercises)
    for (const s of e.sets) {
      if (!s.isCompleted || s.setType === 'warmup') continue;
      sets++;
      reps += s.reps ?? 0;
      volumeKg += (s.reps ?? 0) * (s.weightKg ?? 0);
    }
  return {
    exercises: w.exercises.filter((e) => e.sets.some((s) => s.isCompleted)).length,
    sets,
    reps,
    volumeKg: Math.round(volumeKg * 10) / 10,
    durationSeconds: w.durationSeconds ?? Math.round((Date.now() - Date.parse(w.startedAt)) / 1000),
  };
}

export function createWorkoutRepository(db: SqlExecutor) {
  /** Completed working sets of an exercise in the user's most recent completed sessions (oldest first). */
  async function history(userId: string, exerciseId: string, opts: { limit?: number; excludeWorkoutId?: string } = {}) {
    const rows = await db.getAllAsync<{
      workout_id: string; started_at: string; weight_kg: number | null; reps: number | null; rir: number | null;
    }>(
      `SELECT w.id AS workout_id, w.started_at, ws.weight_kg, ws.reps, ws.rir
         FROM workout_sets ws
         JOIN workout_exercises we ON we.id = ws.workout_exercise_id AND we.deleted_at IS NULL
         JOIN workouts w ON w.id = we.workout_id
        WHERE w.user_id = ? AND we.exercise_id = ? AND w.status = 'completed' AND w.deleted_at IS NULL
          AND w.id <> ? AND ws.deleted_at IS NULL AND ws.is_completed = 1 AND ws.set_type <> 'warmup'
        ORDER BY w.started_at, ws.position`,
      [userId, exerciseId, opts.excludeWorkoutId ?? ''],
    );
    const sessions: HistorySession[] = [];
    for (const r of rows) {
      let s = sessions[sessions.length - 1];
      if (!s || s.workoutId !== r.workout_id) {
        s = { workoutId: r.workout_id, startedAt: r.started_at, sets: [] };
        sessions.push(s);
      }
      s.sets.push({ weightKg: r.weight_kg, reps: r.reps, rir: r.rir });
    }
    return opts.limit ? sessions.slice(-opts.limit) : sessions;
  }

  async function nextExercisePosition(workoutId: string) {
    return ((await db.getFirstAsync<{ p: number | null }>(
      'SELECT MAX(position) AS p FROM workout_exercises WHERE workout_id = ? AND deleted_at IS NULL',
      [workoutId],
    ))?.p ?? -1) + 1;
  }

  /** Creates `count` sets prefilled with the weights of the last session (reps left for the user). */
  async function createSets(userId: string, workoutExerciseId: string, exerciseId: string, count: number) {
    const last = (await history(userId, exerciseId, { limit: 1 }))[0];
    for (let i = 0; i < count; i++) {
      const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
      await insertRow(db, 'workout_sets', {
        workout_exercise_id: workoutExerciseId, position: i, set_type: 'working', weight_kg: prev?.weightKg ?? null,
      });
    }
  }

  const repo = {
    history,

    async getActiveId(userId: string): Promise<string | null> {
      const r = await db.getFirstAsync<{ id: string }>(
        `SELECT id FROM workouts WHERE user_id = ? AND status = 'in_progress' AND deleted_at IS NULL LIMIT 1`,
        [userId],
      );
      return r?.id ?? null;
    },

    async startEmpty(userId: string, name = 'Entrenamiento libre'): Promise<string> {
      return insertRow(db, 'workouts', { user_id: userId, name, status: 'in_progress', started_at: nowIso() });
    },

    async startFromRoutineDay(userId: string, routineDayId: string): Promise<string> {
      const day = await db.getFirstAsync<{ name: string; routine_name: string }>(
        `SELECT d.name, r.name AS routine_name FROM routine_days d JOIN routines r ON r.id = d.routine_id WHERE d.id = ?`,
        [routineDayId],
      );
      if (!day) throw new Error('El día de rutina no existe.');
      const items = await db.getAllAsync<{
        id: string; exercise_id: string; sets: number; rep_min: number; rep_max: number; rest_seconds: number; target_rir: number | null; notes: string | null;
      }>(
        'SELECT * FROM routine_exercises WHERE routine_day_id = ? AND deleted_at IS NULL ORDER BY position',
        [routineDayId],
      );
      let workoutId = '';
      await db.withTransactionAsync(async () => {
        workoutId = await insertRow(db, 'workouts', {
          user_id: userId, routine_day_id: routineDayId, name: day.name, status: 'in_progress', started_at: nowIso(),
        });
        for (const [i, it] of items.entries()) {
          const weId = await insertRow(db, 'workout_exercises', {
            workout_id: workoutId, exercise_id: it.exercise_id, routine_exercise_id: it.id, position: i,
            rest_seconds: it.rest_seconds, rep_min: it.rep_min, rep_max: it.rep_max, target_rir: it.target_rir, notes: it.notes,
          });
          await createSets(userId, weId, it.exercise_id, it.sets);
        }
      });
      return workoutId;
    },

    async get(workoutId: string): Promise<Workout | null> {
      const w = await db.getFirstAsync<{
        id: string; name: string; status: Workout['status']; started_at: string; ended_at: string | null;
        duration_seconds: number | null; notes: string | null; routine_day_id: string | null;
      }>('SELECT * FROM workouts WHERE id = ? AND deleted_at IS NULL', [workoutId]);
      if (!w) return null;
      const exs = await db.getAllAsync<Omit<WorkoutExercise, 'sets'>>(
        `SELECT we.id, we.exercise_id AS exerciseId, e.name_es AS name, mg.name_es AS primaryMuscleName, e.equipment,
                e.movement_type AS movementType, we.position,
                COALESCE(we.rest_seconds, CASE e.movement_type WHEN 'compound' THEN ${DEFAULT_REST.compound} ELSE ${DEFAULT_REST.isolation} END) AS restSeconds,
                we.rep_min AS repMin, we.rep_max AS repMax, we.target_rir AS targetRir, we.notes
           FROM workout_exercises we
           JOIN exercises e ON e.id = we.exercise_id
           JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
          WHERE we.workout_id = ? AND we.deleted_at IS NULL ORDER BY we.position`,
        [workoutId],
      );
      const sets = await db.getAllAsync<WorkoutSet & { workoutExerciseId: string; is_completed: number }>(
        `SELECT ws.id, ws.workout_exercise_id AS workoutExerciseId, ws.position, ws.set_type AS setType,
                ws.weight_kg AS weightKg, ws.reps, ws.rir, ws.rpe, ws.is_completed
           FROM workout_sets ws JOIN workout_exercises we ON we.id = ws.workout_exercise_id
          WHERE we.workout_id = ? AND ws.deleted_at IS NULL ORDER BY ws.position`,
        [workoutId],
      );
      return {
        id: w.id, name: w.name, status: w.status, startedAt: w.started_at, endedAt: w.ended_at,
        durationSeconds: w.duration_seconds, notes: w.notes, routineDayId: w.routine_day_id,
        exercises: exs.map((e) => ({
          ...e,
          sets: sets
            .filter((s) => s.workoutExerciseId === e.id)
            .map(({ workoutExerciseId: _x, is_completed, ...s }) => ({ ...s, isCompleted: is_completed === 1 })),
        })),
      };
    },

    async addExercise(userId: string, workoutId: string, exerciseId: string): Promise<string> {
      const ex = await db.getFirstAsync<{ movement_type: 'compound' | 'isolation' }>(
        'SELECT movement_type FROM exercises WHERE id = ?',
        [exerciseId],
      );
      if (!ex) throw new Error('Ejercicio no encontrado.');
      let id = '';
      await db.withTransactionAsync(async () => {
        id = await insertRow(db, 'workout_exercises', {
          workout_id: workoutId, exercise_id: exerciseId, position: await nextExercisePosition(workoutId),
          rest_seconds: DEFAULT_REST[ex.movement_type],
          rep_min: ex.movement_type === 'compound' ? 6 : 10, rep_max: ex.movement_type === 'compound' ? 10 : 15,
        });
        await createSets(userId, id, exerciseId, 3);
      });
      return id;
    },

    /** Swaps the exercise keeping the number of sets; weights reset to the new exercise's history. */
    async replaceExercise(userId: string, workoutExerciseId: string, exerciseId: string) {
      const we = await db.getFirstAsync<{ exercise_id: string }>('SELECT exercise_id FROM workout_exercises WHERE id = ?', [
        workoutExerciseId,
      ]);
      if (!we) throw new Error('Ejercicio del entrenamiento no encontrado.');
      await db.withTransactionAsync(async () => {
        await updateRow(db, 'workout_exercises', workoutExerciseId, { exercise_id: exerciseId, replaced_exercise_id: we.exercise_id });
        const sets = await db.getAllAsync<{ id: string }>(
          'SELECT id FROM workout_sets WHERE workout_exercise_id = ? AND deleted_at IS NULL ORDER BY position',
          [workoutExerciseId],
        );
        const last = (await history(userId, exerciseId, { limit: 1 }))[0];
        for (const [i, s] of sets.entries()) {
          const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
          await updateRow(db, 'workout_sets', s.id, { weight_kg: prev?.weightKg ?? null, reps: null, rir: null, rpe: null, is_completed: 0, completed_at: null });
        }
      });
    },

    removeExercise: (id: string) => softDelete(db, 'workout_exercises', id),
    updateExercise: (id: string, p: { restSeconds?: number; notes?: string | null }) =>
      updateRow(db, 'workout_exercises', id, { rest_seconds: p.restSeconds, notes: p.notes }),

    async moveExercise(workoutId: string, id: string, dir: -1 | 1) {
      const rows = await db.getAllAsync<{ id: string; position: number }>(
        'SELECT id, position FROM workout_exercises WHERE workout_id = ? AND deleted_at IS NULL ORDER BY position',
        [workoutId],
      );
      const i = rows.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rows.length) return;
      await db.withTransactionAsync(async () => {
        await updateRow(db, 'workout_exercises', rows[i]!.id, { position: rows[j]!.position });
        await updateRow(db, 'workout_exercises', rows[j]!.id, { position: rows[i]!.position });
      });
    },

    async addSet(workoutExerciseId: string): Promise<string> {
      const last = await db.getFirstAsync<{ position: number; weight_kg: number | null; reps: number | null; set_type: SetType }>(
        `SELECT position, weight_kg, reps, set_type FROM workout_sets WHERE workout_exercise_id = ? AND deleted_at IS NULL
          ORDER BY position DESC LIMIT 1`,
        [workoutExerciseId],
      );
      return insertRow(db, 'workout_sets', {
        workout_exercise_id: workoutExerciseId, position: (last?.position ?? -1) + 1,
        set_type: last?.set_type === 'warmup' ? 'working' : (last?.set_type ?? 'working'), weight_kg: last?.weight_kg ?? null,
      });
    },

    updateSet: (id: string, p: Partial<{ weightKg: number | null; reps: number | null; rir: number | null; rpe: number | null; setType: SetType }>) =>
      updateRow(db, 'workout_sets', id, { weight_kg: p.weightKg, reps: p.reps, rir: p.rir, rpe: p.rpe, set_type: p.setType }),

    completeSet: (id: string, done: boolean) =>
      updateRow(db, 'workout_sets', id, { is_completed: done ? 1 : 0, completed_at: done ? nowIso() : null }),

    deleteSet: (id: string) => softDelete(db, 'workout_sets', id),
    updateWorkout: (id: string, p: { name?: string; notes?: string | null }) => updateRow(db, 'workouts', id, p),

    /**
     * Finishes the workout: drops sets never completed, stores duration and
     * detects personal records against all previous history.
     */
    async finish(userId: string, workoutId: string): Promise<void> {
      const w = await repo.get(workoutId);
      if (!w) throw new Error('Entrenamiento no encontrado.');
      if (!w.exercises.some((e) => e.sets.some((s) => s.isCompleted))) {
        throw new Error('Completa al menos una serie antes de finalizar, o descarta el entrenamiento.');
      }
      const end = nowIso();
      await db.withTransactionAsync(async () => {
        for (const e of w.exercises) {
          const done = e.sets.filter((s) => s.isCompleted);
          for (const s of e.sets) if (!s.isCompleted) await softDelete(db, 'workout_sets', s.id);
          if (done.length === 0) {
            await softDelete(db, 'workout_exercises', e.id);
            continue;
          }
          const prev = (await history(userId, e.exerciseId, { excludeWorkoutId: workoutId })).flatMap((h) => h.sets);
          const working = done.filter((s) => s.setType !== 'warmup');
          for (const rec of detectRecords(prev, working)) {
            await insertRow(db, 'personal_records', {
              user_id: userId, exercise_id: e.exerciseId, record_type: rec.type, value: rec.value,
              weight_kg: rec.weightKg, reps: rec.reps, workout_set_id: working[rec.setIndex]?.id ?? null, achieved_at: end,
            });
          }
        }
        await updateRow(db, 'workouts', workoutId, {
          status: 'completed', ended_at: end,
          duration_seconds: Math.max(0, Math.round((Date.parse(end) - Date.parse(w.startedAt)) / 1000)),
        });
      });
    },

    async discard(workoutId: string) {
      await updateRow(db, 'workouts', workoutId, { status: 'discarded', ended_at: nowIso() });
      await softDelete(db, 'workouts', workoutId);
    },

    async summary(userId: string, workoutId: string): Promise<WorkoutSummary | null> {
      const workout = await repo.get(workoutId);
      if (!workout) return null;
      const records = await db.getAllAsync<RecordCandidate & { exerciseName: string }>(
        `SELECT pr.record_type AS type, pr.value, pr.weight_kg AS weightKg, pr.reps, 0 AS setIndex, e.name_es AS exerciseName
           FROM personal_records pr
           JOIN workout_sets ws ON ws.id = pr.workout_set_id
           JOIN workout_exercises we ON we.id = ws.workout_exercise_id
           JOIN exercises e ON e.id = pr.exercise_id
          WHERE we.workout_id = ? AND pr.deleted_at IS NULL ORDER BY e.name_es, pr.record_type`,
        [workoutId],
      );
      // Previous comparable session: same routine day, otherwise same name.
      const prevRow = await db.getFirstAsync<{ id: string; started_at: string }>(
        `SELECT id, started_at FROM workouts
          WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL AND id <> ? AND started_at < ?
            AND ((? IS NOT NULL AND routine_day_id = ?) OR (? IS NULL AND name = ?))
          ORDER BY started_at DESC LIMIT 1`,
        [userId, workoutId, workout.startedAt, workout.routineDayId, workout.routineDayId, workout.routineDayId, workout.name],
      );
      let previous: WorkoutSummary['previous'] = null;
      if (prevRow) {
        const pw = await repo.get(prevRow.id);
        if (pw) {
          const t = totalsOf(pw);
          previous = { workoutId: pw.id, startedAt: pw.startedAt, volumeKg: t.volumeKg, sets: t.sets, reps: t.reps };
        }
      }
      return { workout, totals: totalsOf(workout), records, previous };
    },

    async listCompleted(userId: string, fromIso: string | null, limit = 100) {
      return db.getAllAsync<{ id: string; name: string; startedAt: string; durationSeconds: number | null; sets: number; volumeKg: number | null }>(
        `SELECT w.id, w.name, w.started_at AS startedAt, w.duration_seconds AS durationSeconds,
                COUNT(ws.id) AS sets, SUM(ws.reps * ws.weight_kg) AS volumeKg
           FROM workouts w
           LEFT JOIN workout_exercises we ON we.workout_id = w.id AND we.deleted_at IS NULL
           LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id AND ws.deleted_at IS NULL
                AND ws.is_completed = 1 AND ws.set_type <> 'warmup'
          WHERE w.user_id = ? AND w.status = 'completed' AND w.deleted_at IS NULL AND w.started_at >= ?
          GROUP BY w.id ORDER BY w.started_at DESC LIMIT ?`,
        [userId, fromIso ?? '0000', limit],
      );
    },
  };
  return repo;
}

export function toSessions(h: HistorySession[]): SessionPerformance[] {
  return h.map((s) => ({ date: s.startedAt, sets: s.sets }));
}
