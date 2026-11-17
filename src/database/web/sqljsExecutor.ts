import type { Database } from 'sql.js';

import type { RunResult, SqlExecutor, SqlParam } from '../types';

/**
 * SqlExecutor over sql.js (SQLite compiled to WebAssembly) for the web/PWA
 * build. sql.js keeps the database in memory; `persist` receives the full
 * database image after every committed write and must store it durably
 * (IndexedDB in the app). A write's promise resolves only after `persist`
 * has resolved, so data the UI reports as saved is really on disk.
 */
export function createSqlJsExecutor(
  db: Database,
  persist: (image: Uint8Array) => Promise<void>,
): SqlExecutor {
  let txDepth = 0;
  let dirty = false;
  // Serializes persistence so images are written in order.
  let persistChain: Promise<void> = Promise.resolve();

  const flush = async () => {
    if (txDepth > 0 || !dirty) return;
    dirty = false;
    const image = db.export();
    persistChain = persistChain.then(() => persist(image));
    await persistChain;
  };

  const all = <T>(sql: string, params: SqlParam[] = []): T[] => {
    const stmt = db.prepare(sql);
    try {
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as T);
      return rows;
    } finally {
      stmt.free();
    }
  };

  // db.export() resets some connection PRAGMAs in sql.js; re-assert FKs.
  const ensurePragmas = () => db.exec('PRAGMA foreign_keys = ON;');

  return {
    async execAsync(sql) {
      ensurePragmas();
      db.exec(sql);
      dirty = true;
      await flush();
    },
    async runAsync(sql, params = []): Promise<RunResult> {
      ensurePragmas();
      db.run(sql, params);
      const changes = db.getRowsModified();
      const last = all<{ id: number }>('SELECT last_insert_rowid() AS id')[0]?.id ?? 0;
      if (changes > 0) dirty = true;
      await flush();
      return { changes, lastInsertRowId: Number(last) };
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[] = []) {
      return all<T>(sql, params)[0] ?? null;
    },
    async getAllAsync<T>(sql: string, params: SqlParam[] = []) {
      return all<T>(sql, params);
    },
    async withTransactionAsync(task) {
      const sp = `sp_${txDepth}`;
      ensurePragmas();
      db.exec(txDepth === 0 ? 'BEGIN' : `SAVEPOINT ${sp}`);
      txDepth++;
      try {
        await task();
        txDepth--;
        db.exec(txDepth === 0 ? 'COMMIT' : `RELEASE ${sp}`);
      } catch (e) {
        txDepth--;
        db.exec(txDepth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}`);
        if (txDepth === 0) dirty = false;
        throw e;
      }
      dirty = true;
      await flush();
    },
  };
}
