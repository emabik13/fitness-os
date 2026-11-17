import { createTestDb } from '@/test/nodeSqliteExecutor';

import { LATEST_SCHEMA_VERSION, runMigrations } from './index';

const EXPECTED_TABLES = [
  'users', 'user_profiles', 'user_equipment', 'routines', 'routine_days', 'routine_exercises',
  'exercises', 'muscle_groups', 'exercise_muscles', 'exercise_media', 'workouts',
  'workout_exercises', 'workout_sets', 'personal_records', 'body_measurements',
  'body_weight_entries', 'nutrition_entries', 'recovery_entries',
];

const NOW = '2026-11-17T10:00:00.000Z';

async function migrated() {
  const db = createTestDb();
  await runMigrations(db);
  await db.runAsync('INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)', ['u1', NOW, NOW]);
  return db;
}

describe('migrations', () => {
  it('creates every entity of the relational model', async () => {
    const db = await migrated();
    const rows = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    const names = rows.map((r) => r.name);
    for (const t of EXPECTED_TABLES) expect(names).toContain(t);
  });

  it('sets user_version and is idempotent', async () => {
    const db = createTestDb();
    expect(await runMigrations(db)).toBe(LATEST_SCHEMA_VERSION);
    expect(await runMigrations(db)).toBe(LATEST_SCHEMA_VERSION);
    const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(v?.user_version).toBe(LATEST_SCHEMA_VERSION);
    const mg = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM muscle_groups');
    expect(mg?.n).toBe(12);
  });

  it('refuses to run against a newer database', async () => {
    const db = createTestDb();
    await db.execAsync(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION + 1}`);
    await expect(runMigrations(db)).rejects.toThrow(/más nueva/);
  });

  it('enforces foreign keys', async () => {
    const db = await migrated();
    await expect(
      db.runAsync(
        `INSERT INTO workouts (id, user_id, name, started_at, created_at, updated_at)
         VALUES ('w1', 'missing-user', 'X', ?, ?, ?)`,
        [NOW, NOW, NOW],
      ),
    ).rejects.toThrow(/FOREIGN KEY/);
  });

  it('allows only one in-progress workout per user', async () => {
    const db = await migrated();
    const insert = (id: string) =>
      db.runAsync(
        `INSERT INTO workouts (id, user_id, name, started_at, created_at, updated_at)
         VALUES (?, 'u1', 'Sesión', ?, ?, ?)`,
        [id, NOW, NOW, NOW],
      );
    await insert('w1');
    await expect(insert('w2')).rejects.toThrow(/UNIQUE/);
    await db.runAsync("UPDATE workouts SET status = 'completed', ended_at = ? WHERE id = 'w1'", [NOW]);
    await expect(insert('w2')).resolves.toBeDefined();
  });

  it('validates set values (no negative weight, RIR range)', async () => {
    const db = await migrated();
    await db.execAsync(`
      INSERT INTO exercises (id, slug, name_es, primary_muscle_group_id, equipment, movement_type, difficulty, movement_pattern, created_at, updated_at)
      VALUES ('e1', 'press-banca', 'Press de banca', 'pectorals', 'barbell', 'compound', 'beginner', 'horizontal_push', '${NOW}', '${NOW}');
      INSERT INTO workouts (id, user_id, name, started_at, created_at, updated_at) VALUES ('w1', 'u1', 'A', '${NOW}', '${NOW}', '${NOW}');
      INSERT INTO workout_exercises (id, workout_id, exercise_id, position, created_at, updated_at) VALUES ('we1', 'w1', 'e1', 0, '${NOW}', '${NOW}');
    `);
    const set = (weight: number, rir: number) =>
      db.runAsync(
        `INSERT INTO workout_sets (id, workout_exercise_id, position, weight_kg, reps, rir, created_at, updated_at)
         VALUES (?, 'we1', 0, ?, 10, ?, ?, ?)`,
        [`s${weight}${rir}`, weight, rir, NOW, NOW],
      );
    await expect(set(-5, 2)).rejects.toThrow(/CHECK/);
    await expect(set(40, 11)).rejects.toThrow(/CHECK/);
    await expect(set(40, 2)).resolves.toBeDefined();
  });

  it('rejects available 3D media without source and license', async () => {
    const db = await migrated();
    await db.execAsync(`
      INSERT INTO exercises (id, slug, name_es, primary_muscle_group_id, equipment, movement_type, difficulty, movement_pattern, created_at, updated_at)
      VALUES ('e1', 'sentadilla', 'Sentadilla', 'quadriceps', 'barbell', 'compound', 'intermediate', 'squat', '${NOW}', '${NOW}');
    `);
    await expect(
      db.runAsync(
        `INSERT INTO exercise_media (id, exercise_id, kind, status, uri, created_at, updated_at)
         VALUES ('m1', 'e1', 'animation', 'available', 'x.glb', ?, ?)`,
        [NOW, NOW],
      ),
    ).rejects.toThrow(/CHECK/);
    await expect(
      db.runAsync(
        `INSERT INTO exercise_media (id, exercise_id, kind, status, created_at, updated_at)
         VALUES ('m2', 'e1', 'animation', 'pending', ?, ?)`,
        [NOW, NOW],
      ),
    ).resolves.toBeDefined();
  });

  it('requires a method whenever body fat % is recorded', async () => {
    const db = await migrated();
    await expect(
      db.runAsync(
        `INSERT INTO body_measurements (id, user_id, measured_at, body_fat_pct, created_at, updated_at)
         VALUES ('b1', 'u1', ?, 18, ?, ?)`,
        [NOW, NOW, NOW],
      ),
    ).rejects.toThrow(/CHECK/);
  });
});
