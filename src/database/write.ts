import { uuid } from '@/utils/id';
import { nowIso } from '@/utils/time';

import type { SqlExecutor, SqlParam } from './types';

/**
 * Write helpers for synced tables. They maintain the sync columns
 * (created_at, updated_at, version, sync_status) consistently so every local
 * change is detectable by the sync engine (Phase 10).
 * Table and column names always come from code, never from user input.
 */
const IDENT = /^[a-z_][a-z0-9_]*$/;

function assertIdent(name: string): string {
  if (!IDENT.test(name)) throw new Error(`Identificador SQL no válido: ${name}`);
  return name;
}

export type Row = Record<string, SqlParam | undefined>;

export async function insertRow(db: SqlExecutor, table: string, values: Row): Promise<string> {
  const now = nowIso();
  const row: Row = { id: uuid(), created_at: now, updated_at: now, ...values };
  const entries = Object.entries(row).filter(([, v]) => v !== undefined) as [string, SqlParam][];
  const cols = entries.map(([k]) => assertIdent(k)).join(', ');
  const marks = entries.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT INTO ${assertIdent(table)} (${cols}) VALUES (${marks})`,
    entries.map(([, v]) => v),
  );
  return row.id as string;
}

export async function updateRow(db: SqlExecutor, table: string, id: string, patch: Row): Promise<void> {
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined) as [string, SqlParam][];
  if (entries.length === 0) return;
  const sets = entries.map(([k]) => `${assertIdent(k)} = ?`).join(', ');
  await db.runAsync(
    `UPDATE ${assertIdent(table)} SET ${sets}, updated_at = ?, version = version + 1, sync_status = 'pending' WHERE id = ?`,
    [...entries.map(([, v]) => v), nowIso(), id],
  );
}

/** Soft delete (tombstone) so the deletion can be synced. */
export async function softDelete(db: SqlExecutor, table: string, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE ${assertIdent(table)} SET deleted_at = ?, updated_at = ?, version = version + 1, sync_status = 'pending' WHERE id = ?`,
    [nowIso(), nowIso(), id],
  );
}
