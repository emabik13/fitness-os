import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { createDashboardRepository } from '@/database/repositories/dashboardRepository';

import { createSqlJsExecutor } from './sqljsExecutor';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJs = require('sql.js/dist/sql-wasm-inline.js') as typeof import('sql.js').default;

/** Simulates IndexedDB: keeps the last persisted image. */
function memoryStore() {
  const s = { image: null as Uint8Array | null, writes: 0 };
  return { s, persist: async (img: Uint8Array) => void ((s.image = img.slice()), s.writes++) };
}

describe('sql.js executor (web/PWA)', () => {
  it('runs migrations and survives a reload from the persisted image', async () => {
    const SQL = await initSqlJs();
    const { s, persist } = memoryStore();
    const first = createSqlJsExecutor(new SQL.Database(), persist);
    const { userId } = await bootstrapDatabase(first);
    await first.runAsync(
      `INSERT INTO body_weight_entries (id, user_id, measured_at, weight_kg, created_at, updated_at)
       VALUES ('bw1', ?, '2026-11-17T07:00:00.000Z', 80.5, '2026-11-17T07:00:00.000Z', '2026-11-17T07:00:00.000Z')`,
      [userId],
    );
    expect(s.image).not.toBeNull();

    // "Reopen the app": new DB from the stored bytes.
    const second = createSqlJsExecutor(new SQL.Database(s.image!), persist);
    const again = await bootstrapDatabase(second);
    expect(again.userId).toBe(userId);
    const w = await createDashboardRepository(second).getLatestWeight(userId);
    expect(w?.weightKg).toBe(80.5);
  });

  it('enforces foreign keys and rolls back failed transactions without persisting', async () => {
    const SQL = await initSqlJs();
    const { s, persist } = memoryStore();
    const db = createSqlJsExecutor(new SQL.Database(), persist);
    await bootstrapDatabase(db);
    const writes = s.writes;
    await expect(
      db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO workouts (id, user_id, name, started_at, created_at, updated_at)
           VALUES ('w1', 'nobody', 'X', 'a', 'a', 'a')`,
        );
      }),
    ).rejects.toThrow(/FOREIGN KEY/);
    expect(s.writes).toBe(writes);
    const n = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM workouts');
    expect(n?.n).toBe(0);
  });

  it('does not persist inside a transaction until commit', async () => {
    const SQL = await initSqlJs();
    const { s, persist } = memoryStore();
    const db = createSqlJsExecutor(new SQL.Database(), persist);
    await db.execAsync('CREATE TABLE t (x INTEGER)');
    const before = s.writes;
    await db.withTransactionAsync(async () => {
      await db.runAsync('INSERT INTO t VALUES (1)');
      await db.runAsync('INSERT INTO t VALUES (2)');
      expect(s.writes).toBe(before);
    });
    expect(s.writes).toBe(before + 1);
  });
});
