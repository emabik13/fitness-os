import { CATALOG_EXERCISES, catalogId } from '@/catalog';
import { createAnalyticsRepository } from '@/database/repositories/analyticsRepository';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import { createRoutineRepository } from '@/database/repositories/routineRepository';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { EQUIPMENT } from '@/domain/profile';
import { analyze } from '@/engine/analytics/insights';
import { generateRoutine } from '@/engine/workout-generator/generateRoutine';
import { createTestDb } from '@/test/nodeSqliteExecutor';

import { loadAnalyticsInput, profileToGeneratorInput } from './loadContext';

async function setup() {
  const db = createTestDb();
  const { userId } = await bootstrapDatabase(db);
  await createProfileRepository(db).saveProfile(userId, {
    ageYears: 30, sex: 'male', heightCm: 180, weightKg: 80, targetWeightKg: null, goal: 'recomposition', experience: 'intermediate',
    daysPerWeek: 4, sessionMinutes: 60, priorityMuscles: [], limitations: [], liftExperience: {}, equipment: [...EQUIPMENT],
    preferences: { effortScale: 'rir', preferMachines: false, includeCore: true },
  });
  return { db, userId };
}

/** Inserts a completed workout at a given date with bench press sets. */
async function logWorkout(db: Awaited<ReturnType<typeof setup>>['db'], userId: string, when: Date, weight: number) {
  const iso = when.toISOString();
  const w = `w-${iso}`;
  await db.runAsync(
    `INSERT INTO workouts (id, user_id, name, status, started_at, ended_at, duration_seconds, created_at, updated_at) VALUES (?, ?, 'S', 'completed', ?, ?, 3600, ?, ?)`,
    [w, userId, iso, iso, iso, iso],
  );
  await db.runAsync(`INSERT INTO workout_exercises (id, workout_id, exercise_id, position, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)`, [
    `we-${iso}`, w, catalogId('press-banca-barra'), iso, iso,
  ]);
  for (let i = 0; i < 3; i++)
    await db.runAsync(
      `INSERT INTO workout_sets (id, workout_exercise_id, position, weight_kg, reps, is_completed, created_at, updated_at) VALUES (?, ?, ?, ?, 8, 1, ?, ?)`,
      [`s-${iso}-${i}`, `we-${iso}`, i, weight, iso, iso],
    );
}

describe('analytics from real history', () => {
  it('counts complete weeks since the first workout and builds a report', async () => {
    const { db, userId } = await setup();
    const now = new Date('2026-11-18T12:00:00'); // Wednesday
    // 4 complete weeks with 2 sessions each, pressing more each week (progress), only pushing (imbalance).
    let session = 0;
    for (let wk = 4; wk >= 1; wk--) {
      for (const day of [0, 2]) {
        const d = new Date(2026, 10, 16 - 7 * wk + day, 18);
        await logWorkout(db, userId, d, 60 + session++ * 2.5);
      }
    }
    expect(await createAnalyticsRepository(db).weeklyCounts(userId, 12, now)).toEqual([2, 2, 2, 2]);
    const input = (await loadAnalyticsInput(db, userId, now))!;
    expect(input.analytics.exercises[0]).toMatchObject({ name: 'Press de banca con barra', trend: 'progress' });
    const report = analyze(input.analytics);
    const ids = report.insights.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['adherence-low', 'push-pull', 'progress']));
    // 4 planned days but 2 done every week → P(≥4) = 1/6, P(≥2) = 5/6
    expect(report.adherenceCurve[3]!.probability).toBeCloseTo(1 / 6, 6);
    expect(report.adherenceCurve[1]!.probability).toBeCloseTo(5 / 6, 6);
  });

  it('stores routine techniques and shows them in the workout', async () => {
    const { db, userId } = await setup();
    const profile = (await createProfileRepository(db).getProfile(userId))!;
    const plan = generateRoutine(profileToGeneratorInput(profile), CATALOG_EXERCISES, { style: 'express' });
    const rid = await createRoutineRepository(db).saveGenerated(userId, plan);
    const day = (await createRoutineRepository(db).get(rid))!.days[0]!;
    expect(day.exercises.some((e) => e.intensityNote?.startsWith('Superserie'))).toBe(true);
    const wid = await createWorkoutRepository(db).startFromRoutineDay(userId, day.id);
    const w = (await createWorkoutRepository(db).get(wid))!;
    expect(w.exercises.some((e) => e.intensityNote?.startsWith('Superserie'))).toBe(true);
  });
});
