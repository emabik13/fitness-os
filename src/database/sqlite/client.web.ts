// sql.js build with the WebAssembly binary embedded (no .wasm file to host).
import initSqlJs from 'sql.js/dist/sql-wasm-inline.js';

import type { SqlExecutor } from '../types';
import { loadImage, requestPersistentStorage, saveImage } from '../web/idbStore';
import { createSqlJsExecutor } from '../web/sqljsExecutor';

export const DATABASE_NAME = 'fitness-os.db';

let executor: Promise<SqlExecutor> | null = null;

/**
 * Web/PWA: SQLite (sql.js) loaded from and persisted to IndexedDB on this
 * device. Same schema, migrations and repositories as the native app.
 */
export function openExecutor(): Promise<SqlExecutor> {
  executor ??= (async () => {
    const SQL = await initSqlJs();
    const image = await loadImage(DATABASE_NAME);
    const db = image ? new SQL.Database(image) : new SQL.Database();
    void requestPersistentStorage();
    return createSqlJsExecutor(db, (bytes) => saveImage(DATABASE_NAME, bytes));
  })();
  return executor;
}
