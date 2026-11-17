import * as SQLite from 'expo-sqlite';

import type { SqlExecutor } from '../types';

export const DATABASE_NAME = 'fitness-os.db';

let executor: Promise<SqlExecutor> | null = null;

/** Native (Android/iOS): opens the single expo-sqlite connection. */
export function openExecutor(): Promise<SqlExecutor> {
  executor ??= SQLite.openDatabaseAsync(DATABASE_NAME).then((db) => db as unknown as SqlExecutor);
  return executor;
}
