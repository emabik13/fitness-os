import type { SqlExecutor } from '../types';

import { migration001 } from './001_initial_schema';

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/** Ordered list of migrations. Append only — never edit a shipped migration. */
export const migrations: readonly Migration[] = [migration001];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

/**
 * Applies pending migrations inside a transaction each, tracking progress in
 * `PRAGMA user_version`. Safe to call on every app start.
 * Returns the resulting schema version.
 */
export async function runMigrations(db: SqlExecutor): Promise<number> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;

  if (current > LATEST_SCHEMA_VERSION) {
    throw new Error(
      `La base de datos local (v${current}) es más nueva que la app (v${LATEST_SCHEMA_VERSION}). Actualiza la aplicación.`,
    );
  }

  for (const m of migrations) {
    if (m.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(m.sql);
      // PRAGMA does not accept bound parameters; version is a trusted integer.
      await db.execAsync(`PRAGMA user_version = ${Math.trunc(m.version)}`);
    });
    current = m.version;
  }
  return current;
}
