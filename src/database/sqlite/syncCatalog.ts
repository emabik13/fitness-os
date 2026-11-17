import { CATALOG_EXERCISES, CATALOG_MUSCLES, CATALOG_SOURCE, CATALOG_VERSION, catalogId } from '@/catalog';
import { nowIso } from '@/utils/time';

import type { SqlExecutor } from '../types';

const KEY = 'catalog_version';

/**
 * Upserts the bundled exercise catalog into SQLite when CATALOG_VERSION
 * changes. Built-in rows use deterministic ids, so user data that references
 * them (routines, workouts) stays valid across catalog updates.
 */
export async function syncCatalog(db: SqlExecutor): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM local_meta WHERE key = ?', [KEY]);
  if (row && Number(row.value) >= CATALOG_VERSION) return false;

  const now = nowIso();
  await db.withTransactionAsync(async () => {
    for (const m of CATALOG_MUSCLES) {
      await db.runAsync('UPDATE muscle_groups SET description = ?, function_text = ? WHERE id = ?', [
        m.description,
        m.function,
        m.id,
      ]);
    }
    for (const e of CATALOG_EXERCISES) {
      const id = catalogId(e.slug);
      await db.runAsync(
        `INSERT INTO exercises (id, slug, name_es, alt_names, primary_muscle_group_id, equipment, movement_type,
            difficulty, movement_pattern, description, instructions, biomechanics, common_errors, tips, tags,
            is_custom, content_source, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET
           name_es = excluded.name_es, alt_names = excluded.alt_names,
           primary_muscle_group_id = excluded.primary_muscle_group_id, equipment = excluded.equipment,
           movement_type = excluded.movement_type, difficulty = excluded.difficulty,
           movement_pattern = excluded.movement_pattern, description = excluded.description,
           instructions = excluded.instructions, biomechanics = excluded.biomechanics,
           common_errors = excluded.common_errors, tips = excluded.tips, tags = excluded.tags,
           content_source = excluded.content_source, updated_at = excluded.updated_at, deleted_at = NULL`,
        [
          id, e.slug, e.name, JSON.stringify(e.altNames), e.primary, e.equipment, e.movementType, e.difficulty,
          e.pattern, e.description, JSON.stringify(e.instructions), JSON.stringify(e.biomechanics),
          JSON.stringify(e.errors), JSON.stringify(e.tips),
          JSON.stringify([...e.tags, ...(e.requires ?? []).map((r) => `requiere:${r}`)]),
          CATALOG_SOURCE, now, now,
        ],
      );
      await db.runAsync('DELETE FROM exercise_muscles WHERE exercise_id = ?', [id]);
      for (const m of e.muscles) {
        await db.runAsync('INSERT INTO exercise_muscles (exercise_id, muscle_group_id, role) VALUES (?, ?, ?)', [
          id, m.id, m.role,
        ]);
      }
    }
    // Relations after all exercises exist (FKs).
    for (const e of CATALOG_EXERCISES) {
      const id = catalogId(e.slug);
      await db.runAsync('DELETE FROM exercise_relations WHERE exercise_id = ?', [id]);
      for (const [kind, list] of [['substitute', e.substitutes], ['variant', e.variants ?? []]] as const) {
        for (const s of list) {
          await db.runAsync(
            'INSERT OR IGNORE INTO exercise_relations (exercise_id, related_exercise_id, kind) VALUES (?, ?, ?)',
            [id, catalogId(s), kind],
          );
        }
      }
    }
    await db.runAsync('INSERT OR REPLACE INTO local_meta (key, value) VALUES (?, ?)', [KEY, String(CATALOG_VERSION)]);
  });
  return true;
}
