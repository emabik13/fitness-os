import { CATALOG_EXERCISES, catalogId } from '@/catalog';
import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { EQUIPMENT } from '@/domain/profile';
import { generateRoutine } from '@/engine/workout-generator/generateRoutine';
import { applyPick } from '@/features/exercises/pick';
import { createTestDb } from '@/test/nodeSqliteExecutor';

import { createRoutineRepository } from './routineRepository';
import { createWorkoutRepository } from './workoutRepository';

async function setup() {
  const db = createTestDb();
  const { userId } = await bootstrapDatabase(db);
  const plan = generateRoutine(
    {
      goal: 'recomposition', experience: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, equipment: [...EQUIPMENT],
      priorityMuscles: [], limitations: [], liftExperience: {}, preferMachines: false, includeCore: true,
    },
    CATALOG_EXERCISES,
  );
  const routines = createRoutineRepository(db);
  const routineId = await routines.saveGenerated(userId, plan);
  return { db, userId, routines, routineId, workouts: createWorkoutRepository(db), plan };
}

async function doAllSets(repo: ReturnType<typeof createWorkoutRepository>, workoutId: string, weight: number, reps: number) {
  const w = (await repo.get(workoutId))!;
  for (const e of w.exercises)
    for (const s of e.sets) {
      await repo.updateSet(s.id, { weightKg: weight, reps, rir: 2 });
      await repo.completeSet(s.id, true);
    }
}

describe('routine + workout flow', () => {
  it('saves the generated routine with days, exercises and rationale', async () => {
    const { routines, routineId, plan } = await setup();
    const r = (await routines.get(routineId))!;
    expect(r.isActive).toBe(true);
    expect(r.days).toHaveLength(4);
    expect(r.days[0]!.exercises).toHaveLength(plan.days[0]!.exercises.length);
    expect(r.rationale).toMatch(/Torso \/ Pierna/);
  });

  it('runs a full session: autosaved sets, finish, summary, prefill, PRs and day rotation', async () => {
    const { db, userId, routines, workouts } = await setup();
    const next1 = (await routines.nextDay(userId))!;
    expect(next1.day.dayIndex).toBe(0);

    const w1 = await workouts.startFromRoutineDay(userId, next1.day.id);
    expect(await workouts.getActiveId(userId)).toBe(w1);
    // Only one in-progress workout is allowed.
    await expect(workouts.startEmpty(userId)).rejects.toThrow();

    const started = (await workouts.get(w1))!;
    expect(started.exercises[0]!.sets.every((s) => s.weightKg === null)).toBe(true); // no history yet
    await doAllSets(workouts, w1, 40, 10);
    await workouts.finish(userId, w1);
    const sum1 = (await workouts.summary(userId, w1))!;
    expect(sum1.workout.status).toBe('completed');
    expect(sum1.totals.sets).toBe(started.exercises.reduce((a, e) => a + e.sets.length, 0));
    expect(sum1.totals.volumeKg).toBe(sum1.totals.sets * 400);
    expect(sum1.records).toEqual([]); // first time = baseline, not records
    expect(sum1.previous).toBeNull();

    // Rotation: next session is day 2.
    const next2 = (await routines.nextDay(userId))!;
    expect(next2.day.dayIndex).toBe(1);

    // Same day again: weights prefilled from last time, heavier → records.
    const w2 = await workouts.startFromRoutineDay(userId, next1.day.id);
    const second = (await workouts.get(w2))!;
    expect(second.exercises[0]!.sets[0]!.weightKg).toBe(40);
    await doAllSets(workouts, w2, 42.5, 10);
    await workouts.finish(userId, w2);
    const sum2 = (await workouts.summary(userId, w2))!;
    expect(sum2.records.length).toBeGreaterThan(0);
    expect(sum2.records.map((r) => r.type)).toContain('max_weight');
    expect(sum2.previous?.workoutId).toBe(w1);
    expect(sum2.totals.volumeKg).toBeGreaterThan(sum2.previous!.volumeKg);

    const history = await workouts.history(userId, second.exercises[0]!.exerciseId);
    expect(history.map((h) => h.sets[0]!.weightKg)).toEqual([40, 42.5]);
    const n = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM workouts WHERE status = 'completed'");
    expect(n?.n).toBe(2);
  });

  it('drops never-completed sets on finish and refuses an empty finish', async () => {
    const { userId, workouts } = await setup();
    const w = await workouts.startEmpty(userId);
    await expect(workouts.finish(userId, w)).rejects.toThrow(/al menos una serie/);
    const weId = await workouts.addExercise(userId, w, catalogId('jalon-pecho'));
    const ex = (await workouts.get(w))!.exercises[0]!;
    expect(ex.id).toBe(weId);
    await workouts.updateSet(ex.sets[0]!.id, { weightKg: 50, reps: 10 });
    await workouts.completeSet(ex.sets[0]!.id, true);
    await workouts.finish(userId, w);
    const done = (await workouts.get(w))!;
    expect(done.exercises[0]!.sets).toHaveLength(1);
  });

  it('edits: add/delete sets, reorder, replace via library pick, discard', async () => {
    const { userId, workouts, db } = await setup();
    const w = await workouts.startEmpty(userId);
    await applyPick(db, userId, { kind: 'workout', id: w }, catalogId('press-banca-barra'));
    await applyPick(db, userId, { kind: 'workout', id: w }, catalogId('remo-barra'));
    let cur = (await workouts.get(w))!;
    await workouts.addSet(cur.exercises[0]!.id);
    await workouts.deleteSet(cur.exercises[1]!.sets[0]!.id);
    await workouts.moveExercise(w, cur.exercises[1]!.id, -1);
    cur = (await workouts.get(w))!;
    expect(cur.exercises.map((e) => e.name)).toEqual(['Remo con barra', 'Press de banca con barra']);
    expect(cur.exercises.map((e) => e.sets.length)).toEqual([2, 4]);
    await applyPick(db, userId, { kind: 'workoutReplace', id: cur.exercises[0]!.id }, catalogId('remo-polea-sentado'));
    cur = (await workouts.get(w))!;
    expect(cur.exercises[0]!.name).toBe('Remo sentado en polea');
    await workouts.discard(w);
    expect(await workouts.getActiveId(userId)).toBeNull();
  });

  it('routine editor operations', async () => {
    const { routines, userId, routineId, db } = await setup();
    const r = (await routines.get(routineId))!;
    const day = r.days[0]!;
    const first = day.exercises[0]!;
    await routines.updateExercise(first.id, { sets: 5, repMin: 5, repMax: 8, restSeconds: 180, targetRir: 1 });
    await applyPick(db, userId, { kind: 'routineDay', id: day.id }, catalogId('curl-martillo'));
    await routines.moveExercise(day.id, first.id, 1);
    await routines.addDay(routineId);
    const after = (await routines.get(routineId))!;
    expect(after.days).toHaveLength(5);
    expect(after.daysPerWeek).toBe(5);
    const d0 = after.days[0]!;
    expect(d0.exercises[1]).toMatchObject({ id: first.id, sets: 5, repMin: 5, repMax: 8, restSeconds: 180, targetRir: 1 });
    expect(d0.exercises[d0.exercises.length - 1]!.name).toBe('Curl martillo');
    await expect(routines.updateExercise(first.id, { repMin: 10, repMax: 8 })).rejects.toThrow(/CHECK/);
  });
});
