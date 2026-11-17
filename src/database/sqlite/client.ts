import * as SQLite from 'expo-sqlite';

import type { SqlExecutor } from '../types';

export const DATABASE_NAME = 'fitness-os.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Lazily opens the single app database connection. */
export function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync(DATABASE_NAME);
  return dbPromise;
}

/** Narrows the expo-sqlite database to the executor interface used by repositories. */
export function asExecutor(db: SQLite.SQLiteDatabase): SqlExecutor {
  return db as unknown as SqlExecutor;
}
