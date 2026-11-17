import { CATALOG_EXERCISES, catalogId } from '@/catalog';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import { createRoutineRepository } from '@/database/repositories/routineRepository';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { EQUIPMENT } from '@/domain/profile';
import { generateRoutine } from '@/engine/workout-generator/generateRoutine';
import { createTestDb } from '@/test/nodeSqliteExecutor';

import { deleteAllUserData, exportBackup, importBackup } from './backup';

async function populated() {
  const db = createTestDb();
  const { userId } = await bootstrapDatabase(db);
  await createProfileRepository(db).saveProfile(userId, {
    ageYears: 30, sex: 'male', heightCm: 180, weightKg: 80, targetWeightKg: null, goal: 'recomposition', experience: 'intermediate',
    daysPerWeek: 3, sessionMinutes: 60, priorityMuscles: [], limitations: [], liftExperience: {}, equipment: [...EQUIPMENT],
    preferences: { effortScale: 'rir', preferMachines: false, includeCore: true },
  });
  const plan = generateRoutine(
    { goal: 'recomposition', experience: 'intermediate', daysPerWeek: 3, sessionMinutes: 60, equipment: [...EQUIPMENT], priorityMuscles: [], limitations: [], liftExperience: {}, preferMachines: false, includeCore: true },
    CATALOG_EXERCISES,
  );
  await createRoutineRepository(db).saveGenerated(userId, plan);
  const w = createWorkoutRepository(db);
  const wid = await w.startEmpty(userId);
  await w.addExercise(userId, wid, catalogId('sentadilla-barra'));
  const ex = (await w.get(wid))!.exercises[0]!;
  await w.updateSet(ex.sets[0]!.id, { weightKg: 100, reps: 5 });
  await w.completeSet(ex.sets[0]!.id, true);
  await w.finish(userId, wid);
  return { db, userId };
}

const count = async (db: Awaited<ReturnType<typeof populated>>['db'], t: string) =>
  (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`))!.n;

describe('backup', () => {
  it('round-trips all user data into a fresh device without duplicates', async () => {
    const src = await populated();
    const backup = JSON.parse(JSON.stringify(await exportBackup(src.db, src.userId)));
    const dst = createTestDb();
    const { userId } = await bootstrapDatabase(dst);
    const r1 = await importBackup(dst, userId, backup);
    expect(r1.errors).toEqual([]);
    expect(r1.inserted).toBeGreaterThan(20);
    for (const t of ['routines', 'routine_exercises', 'workouts', 'workout_sets', 'body_weight_entries', 'user_profiles']) {
      expect({ t, n: await count(dst, t) }).toEqual({ t, n: await count(src.db, t) });
    }
    // Re-importing is idempotent.
    const r2 = await importBackup(dst, userId, backup);
    expect(r2.inserted).toBe(0);
    expect(await count(dst, 'workout_sets')).toBe(await count(src.db, 'workout_sets'));
    const h = await createWorkoutRepository(dst).history(userId, catalogId('sentadilla-barra'));
    expect(h[0]!.sets[0]).toMatchObject({ weightKg: 100, reps: 5 });
  });

  it('keeps newer local edits and rejects invalid files', async () => {
    const { db, userId } = await populated();
    const backup = JSON.parse(JSON.stringify(await exportBackup(db, userId)));
    const routineId = backup.tables.routines[0].id;
    await createRoutineRepository(db).rename(routineId, 'Editada después');
    await importBackup(db, userId, backup);
    expect((await createRoutineRepository(db).get(routineId))!.name).toBe('Editada después');
    await expect(importBackup(db, userId, { hello: 'world' })).rejects.toThrow(/no es una copia/);
  });

  it('deletes all user data but keeps the exercise catalog', async () => {
    const { db, userId } = await populated();
    await deleteAllUserData(db, userId);
    for (const t of ['user_profiles', 'routines', 'routine_days', 'workouts', 'workout_sets', 'body_weight_entries']) {
      expect({ t, n: await count(db, t) }).toEqual({ t, n: 0 });
    }
    expect(await count(db, 'exercises')).toBe(CATALOG_EXERCISES.length);
  });
});
