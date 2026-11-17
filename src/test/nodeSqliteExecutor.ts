/**
 * Test-only SqlExecutor backed by Node's built-in SQLite (node:sqlite).
 * Runs the exact production SQL so schema constraints, indexes and queries are
 * verified against a real SQLite engine.
 */
import type { RunResult, SqlExecutor, SqlParam } from '@/database/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');

export function createTestDb(): SqlExecutor & { close: () => void } {
  const db = new DatabaseSync(':memory:');
  let depth = 0;
  return {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, params: SqlParam[] = []): Promise<RunResult> {
      const r = db.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[] = []) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string, params: SqlParam[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async withTransactionAsync(task: () => Promise<void>) {
      const sp = `sp_${depth++}`;
      db.exec(depth === 1 ? 'BEGIN' : `SAVEPOINT ${sp}`);
      try {
        await task();
        db.exec(depth === 1 ? 'COMMIT' : `RELEASE ${sp}`);
      } catch (e) {
        db.exec(depth === 1 ? 'ROLLBACK' : `ROLLBACK TO ${sp}`);
        throw e;
      } finally {
        depth--;
      }
    },
    close: () => db.close(),
  };
}
