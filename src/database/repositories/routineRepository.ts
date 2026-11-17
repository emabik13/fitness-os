import { catalogId } from '@/catalog';
import type { GeneratedRoutine } from '@/engine/workout-generator/generateRoutine';
import type { Goal } from '@/domain/profile';

import type { SqlExecutor } from '../types';
import { insertRow, softDelete, updateRow } from '../write';

export interface RoutineSummary {
  id: string;
  name: string;
  goal: Goal;
  splitType: string;
  daysPerWeek: number;
  isActive: boolean;
  generatedBy: 'engine' | 'user';
  dayCount: number;
}

export interface RoutineExerciseRow {
  id: string;
  exerciseId: string;
  name: string;
  primaryMuscleName: string;
  equipment: string;
  movementType: 'compound' | 'isolation';
  position: number;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  targetRir: number | null;
  notes: string | null;
}

export interface RoutineDayRow {
  id: string;
  dayIndex: number;
  name: string;
  focus: string | null;
  suggestedWeekday: number | null;
  estimatedMinutes: number | null;
  exercises: RoutineExerciseRow[];
}

export interface RoutineDetail extends RoutineSummary {
  rationale: string | null;
  days: RoutineDayRow[];
}

export function createRoutineRepository(db: SqlExecutor) {
  const nextPosition = async (dayId: string) =>
    ((await db.getFirstAsync<{ p: number | null }>(
      'SELECT MAX(position) AS p FROM routine_exercises WHERE routine_day_id = ? AND deleted_at IS NULL',
      [dayId],
    ))?.p ?? -1) + 1;

  const repo = {
    async list(userId: string): Promise<RoutineSummary[]> {
      const rows = await db.getAllAsync<{
        id: string; name: string; goal: Goal; split_type: string; days_per_week: number;
        is_active: number; generated_by: 'engine' | 'user'; day_count: number;
      }>(
        `SELECT r.id, r.name, r.goal, r.split_type, r.days_per_week, r.is_active, r.generated_by,
                (SELECT COUNT(*) FROM routine_days d WHERE d.routine_id = r.id AND d.deleted_at IS NULL) AS day_count
           FROM routines r WHERE r.user_id = ? AND r.deleted_at IS NULL
          ORDER BY r.is_active DESC, r.updated_at DESC`,
        [userId],
      );
      return rows.map((r) => ({
        id: r.id, name: r.name, goal: r.goal, splitType: r.split_type, daysPerWeek: r.days_per_week,
        isActive: r.is_active === 1, generatedBy: r.generated_by, dayCount: r.day_count,
      }));
    },

    async get(routineId: string): Promise<RoutineDetail | null> {
      const r = await db.getFirstAsync<{
        id: string; name: string; goal: Goal; split_type: string; days_per_week: number;
        is_active: number; generated_by: 'engine' | 'user'; rationale: string | null;
      }>('SELECT * FROM routines WHERE id = ? AND deleted_at IS NULL', [routineId]);
      if (!r) return null;
      const days = await db.getAllAsync<{
        id: string; day_index: number; name: string; focus: string | null;
        suggested_weekday: number | null; estimated_minutes: number | null;
      }>('SELECT * FROM routine_days WHERE routine_id = ? AND deleted_at IS NULL ORDER BY day_index', [routineId]);
      const exRows = await db.getAllAsync<RoutineExerciseRow & { routineDayId: string }>(
        `SELECT re.id, re.routine_day_id AS routineDayId, re.exercise_id AS exerciseId, e.name_es AS name,
                mg.name_es AS primaryMuscleName, e.equipment, e.movement_type AS movementType, re.position,
                re.sets, re.rep_min AS repMin, re.rep_max AS repMax, re.rest_seconds AS restSeconds,
                re.target_rir AS targetRir, re.notes
           FROM routine_exercises re
           JOIN routine_days d ON d.id = re.routine_day_id
           JOIN exercises e ON e.id = re.exercise_id
           JOIN muscle_groups mg ON mg.id = e.primary_muscle_group_id
          WHERE d.routine_id = ? AND re.deleted_at IS NULL ORDER BY re.position`,
        [routineId],
      );
      return {
        id: r.id, name: r.name, goal: r.goal, splitType: r.split_type, daysPerWeek: r.days_per_week,
        isActive: r.is_active === 1, generatedBy: r.generated_by, rationale: r.rationale, dayCount: days.length,
        days: days.map((d) => ({
          id: d.id, dayIndex: d.day_index, name: d.name, focus: d.focus, suggestedWeekday: d.suggested_weekday,
          estimatedMinutes: d.estimated_minutes,
          exercises: exRows.filter((e) => e.routineDayId === d.id).map(({ routineDayId: _r, ...e }) => e),
        })),
      };
    },

    /** Persists an engine-generated routine and (optionally) makes it the active one. */
    async saveGenerated(userId: string, g: GeneratedRoutine, activate = true): Promise<string> {
      let routineId = '';
      await db.withTransactionAsync(async () => {
        if (activate) {
          await db.runAsync(
            `UPDATE routines SET is_active = 0, version = version + 1, sync_status = 'pending' WHERE user_id = ? AND is_active = 1`,
            [userId],
          );
        }
        routineId = await insertRow(db, 'routines', {
          user_id: userId, name: g.name, goal: g.goal, split_type: g.splitType, days_per_week: g.daysPerWeek,
          rationale: [...g.rationale, ...g.warnings].join('\n'), is_active: activate ? 1 : 0,
          generated_by: 'engine', engine_version: g.engineVersion,
        });
        for (const [i, d] of g.days.entries()) {
          const dayId = await insertRow(db, 'routine_days', {
            routine_id: routineId, day_index: i, name: d.name, focus: d.focus,
            suggested_weekday: d.suggestedWeekday, estimated_minutes: d.estimatedMinutes,
          });
          for (const [p, e] of d.exercises.entries()) {
            await insertRow(db, 'routine_exercises', {
              routine_day_id: dayId, exercise_id: catalogId(e.slug), position: p, sets: e.sets,
              rep_min: e.repMin, rep_max: e.repMax, rest_seconds: e.restSeconds, target_rir: e.targetRir,
            });
          }
        }
      });
      return routineId;
    },

    async createEmpty(userId: string, name: string, goal: Goal): Promise<string> {
      let id = '';
      await db.withTransactionAsync(async () => {
        id = await insertRow(db, 'routines', {
          user_id: userId, name, goal, split_type: 'custom', days_per_week: 1, is_active: 0, generated_by: 'user',
        });
        await insertRow(db, 'routine_days', { routine_id: id, day_index: 0, name: 'Día 1' });
      });
      return id;
    },

    async setActive(userId: string, routineId: string) {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE routines SET is_active = 0, version = version + 1, sync_status = 'pending' WHERE user_id = ? AND is_active = 1 AND id <> ?`,
          [userId, routineId],
        );
        await updateRow(db, 'routines', routineId, { is_active: 1 });
      });
    },
    rename: (routineId: string, name: string) => updateRow(db, 'routines', routineId, { name }),
    remove: (routineId: string) => softDelete(db, 'routines', routineId),

    async addDay(routineId: string): Promise<string> {
      const n = (await db.getFirstAsync<{ n: number | null }>(
        'SELECT MAX(day_index) AS n FROM routine_days WHERE routine_id = ? AND deleted_at IS NULL',
        [routineId],
      ))?.n ?? -1;
      const id = await insertRow(db, 'routine_days', { routine_id: routineId, day_index: n + 1, name: `Día ${n + 2}` });
      await repo.syncDayCount(routineId);
      return id;
    },
    renameDay: (dayId: string, name: string) => updateRow(db, 'routine_days', dayId, { name }),
    async removeDay(routineId: string, dayId: string) {
      await softDelete(db, 'routine_days', dayId);
      await repo.syncDayCount(routineId);
    },
    async syncDayCount(routineId: string) {
      const n = (await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM routine_days WHERE routine_id = ? AND deleted_at IS NULL',
        [routineId],
      ))?.n ?? 1;
      await updateRow(db, 'routines', routineId, { days_per_week: Math.min(7, Math.max(1, n)) });
    },

    async addExercise(dayId: string, exerciseId: string): Promise<string> {
      const ex = await db.getFirstAsync<{ movement_type: string }>('SELECT movement_type FROM exercises WHERE id = ?', [exerciseId]);
      const compound = ex?.movement_type === 'compound';
      return insertRow(db, 'routine_exercises', {
        routine_day_id: dayId, exercise_id: exerciseId, position: await nextPosition(dayId), sets: 3,
        rep_min: compound ? 6 : 10, rep_max: compound ? 10 : 15, rest_seconds: compound ? 120 : 75, target_rir: 2,
      });
    },
    updateExercise: (
      id: string,
      p: Partial<{ sets: number; repMin: number; repMax: number; restSeconds: number; targetRir: number | null; notes: string | null }>,
    ) =>
      updateRow(db, 'routine_exercises', id, {
        sets: p.sets, rep_min: p.repMin, rep_max: p.repMax, rest_seconds: p.restSeconds, target_rir: p.targetRir, notes: p.notes,
      }),
    replaceExercise: (id: string, exerciseId: string) => updateRow(db, 'routine_exercises', id, { exercise_id: exerciseId }),
    removeExercise: (id: string) => softDelete(db, 'routine_exercises', id),
    async moveExercise(dayId: string, id: string, dir: -1 | 1) {
      const rows = await db.getAllAsync<{ id: string; position: number }>(
        'SELECT id, position FROM routine_exercises WHERE routine_day_id = ? AND deleted_at IS NULL ORDER BY position',
        [dayId],
      );
      const i = rows.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rows.length) return;
      await db.withTransactionAsync(async () => {
        await updateRow(db, 'routine_exercises', rows[i]!.id, { position: rows[j]!.position });
        await updateRow(db, 'routine_exercises', rows[j]!.id, { position: rows[i]!.position });
      });
    },

    /**
     * Next session of the active routine: the day after the one used in the
     * most recent completed workout of this routine (rotation, not weekday).
     */
    async nextDay(userId: string): Promise<{ routineId: string; routineName: string; day: RoutineDayRow } | null> {
      const active = await db.getFirstAsync<{ id: string; name: string }>(
        'SELECT id, name FROM routines WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1',
        [userId],
      );
      if (!active) return null;
      const detail = await repo.get(active.id);
      if (!detail || detail.days.length === 0) return null;
      const last = await db.getFirstAsync<{ day_index: number }>(
        `SELECT d.day_index FROM workouts w JOIN routine_days d ON d.id = w.routine_day_id
          WHERE w.user_id = ? AND w.status = 'completed' AND w.deleted_at IS NULL AND d.routine_id = ?
          ORDER BY w.started_at DESC LIMIT 1`,
        [userId, active.id],
      );
      const idx = last ? detail.days.findIndex((d) => d.dayIndex > last.day_index) : 0;
      const day = detail.days[idx >= 0 ? idx : 0]!;
      return { routineId: active.id, routineName: active.name, day };
    },
  };
  return repo;
}
