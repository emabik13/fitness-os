import { uuid } from '@/utils/id';
import { nowIso } from '@/utils/time';

import { runMigrations } from '../migrations';
import type { SqlExecutor } from '../types';

import { MEDIA_MANIFEST, registerMedia } from '@/services/media/manifest';

import { syncCatalog } from './syncCatalog';

const LOCAL_USER_KEY = 'local_user_id';

/**
 * Returns the id of the local user, creating it on first launch. The app is
 * offline-first: a local user exists before any Supabase sign-in, and is
 * linked to the remote account (users.remote_id) in Phase 10.
 */
export async function ensureLocalUser(db: SqlExecutor): Promise<string> {
  const existing = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM local_meta WHERE key = ?',
    [LOCAL_USER_KEY],
  );
  if (existing) return existing.value;

  const id = uuid();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO users (id, created_at, updated_at) VALUES (?, ?, ?)',
      [id, now, now],
    );
    await db.runAsync('INSERT INTO local_meta (key, value) VALUES (?, ?)', [LOCAL_USER_KEY, id]);
  });
  return id;
}

export interface BootstrapResult {
  schemaVersion: number;
  userId: string;
}

/** Runs migrations and guarantees a local user. Called once at startup. */
export async function bootstrapDatabase(db: SqlExecutor): Promise<BootstrapResult> {
  const schemaVersion = await runMigrations(db);
  const userId = await ensureLocalUser(db);
  await syncCatalog(db);
  if (MEDIA_MANIFEST.length) await registerMedia(db, MEDIA_MANIFEST);
  return { schemaVersion, userId };
}
