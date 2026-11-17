import { bootstrapDatabase, ensureLocalUser } from '@/database/sqlite/bootstrap';
import { loadDashboard } from '@/features/dashboard/loadDashboard';
import { createTestDb } from '@/test/nodeSqliteExecutor';

import { createStatsRepository } from './statsRepository';

const now = new Date('2026-11-18T12:00:00'); // Wednesday, local time

async function setup() {
  const db = createTestDb();
  const { userId } = await bootstrapDatabase(db);
  const ts = now.toISOString();
  await db.execAsync(`
    INSERT INTO exercises (id, slug, name_es, primary_muscle_group_id, equipment, movement_type, difficulty, movement_pattern, created_at, updated_at)
    VALUES ('e1', 'press-banca', 'Press de banca', 'pectorals', 'barbell', 'compound', 'beginner', 'horizontal_push', '${ts}', '${ts}');
    INSERT INTO exercise_muscles (exercise_id, muscle_group_id, role) VALUES
      ('e1', 'pectorals', 'agonist'), ('e1', 'triceps', 'synergist'), ('e1', 'deltoids', 'synergist');
  `);
  return { db, userId };
}

describe('bootstrap', () => {
  it('creates the local user once and reuses it', async () => {
    const db = createTestDb();
    const first = await bootstrapDatabase(db);
    const again = await ensureLocalUser(db);
    expect(again).toBe(first.userId);
    const n = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM users');
    expect(n?.n).toBe(1);
  });
});

describe('dashboard + stats on an empty database', () => {
  it('returns empty data, never placeholders', async () => {
    const { db, userId } = await setup();
    const d = await loadDashboard(db, userId, now);
    expect(d.profile).toBeNull();
    expect(d.workoutsThisWeek).toBe(0);
    expect(d.latestWeight).toBeNull();
    expect(d.latestRecord).toBeNull();
    expect(d.muscleSets).toEqual([]);
    const totals = await createStatsRepository(db).getTrainingTotals(userId, null);
    expect(totals).toEqual({ workouts: 0, sets: 0, reps: 0, volumeKg: 0, durationSeconds: 0 });
  });
});

describe('dashboard with a logged workout (example from the spec: 40×12, 40×11, 40×10)', () => {
  it('aggregates week, volume and agonist sets; excludes warm-ups', async () => {
    const { db, userId } = await setup();
    const started = new Date('2026-11-17T18:00:00').toISOString(); // Tuesday
    const ended = new Date('2026-11-17T19:00:00').toISOString();
    await db.runAsync(
      `INSERT INTO workouts (id, user_id, name, status, started_at, ended_at, duration_seconds, created_at, updated_at)
       VALUES ('w1', ?, 'Torso A', 'completed', ?, ?, 3600, ?, ?)`,
      [userId, started, ended, started, started],
    );
    await db.runAsync(
      `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, created_at, updated_at)
       VALUES ('we1', 'w1', 'e1', 0, ?, ?)`,
      [started, started],
    );
    const sets: [string, string, number, number][] = [
      ['s0', 'warmup', 20, 10],
      ['s1', 'working', 40, 12],
      ['s2', 'working', 40, 11],
      ['s3', 'working', 40, 10],
    ];
    for (const [i, [id, type, w, r]] of sets.entries()) {
      await db.runAsync(
        `INSERT INTO workout_sets (id, workout_exercise_id, position, set_type, weight_kg, reps, is_completed, created_at, updated_at)
         VALUES (?, 'we1', ?, ?, ?, ?, 1, ?, ?)`,
        [id, i, type, w, r, started, started],
      );
    }
    await db.runAsync(
      `INSERT INTO body_weight_entries (id, user_id, measured_at, weight_kg, created_at, updated_at)
       VALUES ('bw1', ?, ?, 78.4, ?, ?), ('bw2', ?, ?, 78.1, ?, ?)`,
      [userId, '2026-11-10T07:00:00.000Z', started, started, userId, '2026-11-17T07:00:00.000Z', started, started],
    );

    const d = await loadDashboard(db, userId, now);
    expect(d.workoutsThisWeek).toBe(1);
    expect(d.trainedDayKeys.has('2026-11-17')).toBe(true);
    expect(d.latestWeight?.weightKg).toBe(78.1);
    expect(d.weightSeries).toHaveLength(2);
    expect(d.muscleSets).toEqual([{ muscleGroupId: 'pectorals', name: 'Pectorales', sets: 3 }]);

    const totals = await createStatsRepository(db).getTrainingTotals(userId, null);
    expect(totals).toEqual({ workouts: 1, sets: 3, reps: 33, volumeKg: 40 * 33, durationSeconds: 3600 });
  });
});
