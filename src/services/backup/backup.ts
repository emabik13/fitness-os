import { z } from 'zod';

import { LATEST_SCHEMA_VERSION } from '@/database/migrations';
import type { SqlExecutor, SqlParam } from '@/database/types';
import { incomingWins } from '@/sync/conflict';
import { nowIso } from '@/utils/time';

/** User tables in foreign-key order (parents first). Catalog content is not exported. */
export const USER_TABLES = [
  'user_profiles', 'user_equipment', 'routines', 'routine_days', 'routine_exercises', 'workouts',
  'workout_exercises', 'workout_sets', 'personal_records', 'body_weight_entries', 'body_measurements',
  'nutrition_entries', 'recovery_entries',
] as const;
type Table = (typeof USER_TABLES)[number];

/** How each table reaches the owning user (for export filtering and deletion). */
const OWNER_FILTER: Record<Table, string> = {
  user_profiles: 'user_id = ?',
  user_equipment: 'user_id = ?',
  routines: 'user_id = ?',
  routine_days: 'routine_id IN (SELECT id FROM routines WHERE user_id = ?)',
  routine_exercises: 'routine_day_id IN (SELECT d.id FROM routine_days d JOIN routines r ON r.id = d.routine_id WHERE r.user_id = ?)',
  workouts: 'user_id = ?',
  workout_exercises: 'workout_id IN (SELECT id FROM workouts WHERE user_id = ?)',
  workout_sets: 'workout_exercise_id IN (SELECT we.id FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id WHERE w.user_id = ?)',
  personal_records: 'user_id = ?',
  body_weight_entries: 'user_id = ?',
  body_measurements: 'user_id = ?',
  nutrition_entries: 'user_id = ?',
  recovery_entries: 'user_id = ?',
};

const rowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));
export const backupSchema = z.object({
  app: z.literal('fitness-os'),
  format: z.literal(1),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  userId: z.string().min(1),
  tables: z.object(Object.fromEntries(USER_TABLES.map((t) => [t, z.array(rowSchema).default([])])) as Record<Table, z.ZodDefault<z.ZodArray<typeof rowSchema>>>),
});
export type Backup = z.infer<typeof backupSchema>;

export async function exportBackup(db: SqlExecutor, userId: string): Promise<Backup> {
  const tables = {} as Record<Table, Record<string, SqlParam>[]>;
  for (const t of USER_TABLES) {
    const rows = await db.getAllAsync<Record<string, SqlParam>>(`SELECT * FROM ${t} WHERE ${OWNER_FILTER[t]}`, [userId]);
    // Progress photos never leave the device inside a backup.
    tables[t] = t === 'body_measurements' ? rows.map((r) => ({ ...r, photo_local_uri: null })) : rows;
  }
  return { app: 'fitness-os', format: 1, schemaVersion: LATEST_SCHEMA_VERSION, exportedAt: nowIso(), userId, tables };
}

export interface ImportReport {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Merges a backup into the local database for `userId`. Rows are matched by
 * UUID (so re-importing never duplicates) and resolved with `incomingWins`.
 * Only columns that exist locally are written; user ownership is rewritten to
 * the local user.
 */
export async function importBackup(db: SqlExecutor, userId: string, raw: unknown): Promise<ImportReport> {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new Error('El archivo no es una copia de seguridad válida de FITNESS OS.');
  const b = parsed.data;
  if (b.schemaVersion > LATEST_SCHEMA_VERSION) throw new Error('La copia es de una versión más nueva de la app. Actualiza antes de importar.');

  const report: ImportReport = { inserted: 0, updated: 0, skipped: 0, errors: [] };
  await db.withTransactionAsync(async () => {
    for (const t of USER_TABLES) {
      const cols = new Set((await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${t})`)).map((c) => c.name));
      for (const row of b.tables[t]) {
        const r: Record<string, SqlParam> = {};
        for (const [k, v] of Object.entries(row)) if (cols.has(k)) r[k] = v;
        if (typeof r.id !== 'string') {
          report.skipped++;
          continue;
        }
        if (cols.has('user_id')) r.user_id = userId;
        if (cols.has('sync_status')) r.sync_status = 'pending';
        const local = await db.getFirstAsync<{ version: number; updated_at: string }>(`SELECT version, updated_at FROM ${t} WHERE id = ?`, [r.id]);
        if (!incomingWins(local, { version: Number(r.version ?? 1), updated_at: String(r.updated_at ?? '') })) {
          report.skipped++;
          continue;
        }
        const keys = Object.keys(r);
        try {
          if (local) {
            await db.runAsync(`UPDATE ${t} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => r[k]!), r.id]);
            report.updated++;
          } else {
            await db.runAsync(`INSERT INTO ${t} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`, keys.map((k) => r[k]!));
            report.inserted++;
          }
        } catch (e) {
          report.skipped++;
          if (report.errors.length < 5) report.errors.push(`${t}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  });
  return report;
}

/** Permanently deletes all of the user's data on this device (catalog stays). */
export async function deleteAllUserData(db: SqlExecutor, userId: string): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const t of [...USER_TABLES].reverse()) {
      await db.runAsync(`DELETE FROM ${t} WHERE ${OWNER_FILTER[t]}`, [userId]);
    }
  });
}
