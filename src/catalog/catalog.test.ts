import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { syncCatalog } from '@/database/sqlite/syncCatalog';
import { createTestDb } from '@/test/nodeSqliteExecutor';

import { CATALOG_EXERCISES, CATALOG_MUSCLES, MUSCLE_IDS, PATTERNS } from './index';

describe('exercise catalog integrity', () => {
  const slugs = new Set(CATALOG_EXERCISES.map((e) => e.slug));

  it('has unique slugs and valid references', () => {
    expect(slugs.size).toBe(CATALOG_EXERCISES.length);
    for (const e of CATALOG_EXERCISES) {
      for (const s of [...e.substitutes, ...(e.variants ?? [])]) {
        expect({ ex: e.slug, ref: s, ok: slugs.has(s) }).toEqual({ ex: e.slug, ref: s, ok: true });
      }
      expect(e.substitutes).not.toContain(e.slug);
    }
  });

  it('lists the primary muscle as an agonist and never duplicates a muscle', () => {
    for (const e of CATALOG_EXERCISES) {
      expect(e.muscles.find((m) => m.id === e.primary)?.role).toBe('agonist');
      expect(new Set(e.muscles.map((m) => m.id)).size).toBe(e.muscles.length);
    }
  });

  it('has complete technical content for every exercise', () => {
    for (const e of CATALOG_EXERCISES) {
      expect(e.instructions.length).toBeGreaterThanOrEqual(3);
      expect(e.errors.length).toBeGreaterThanOrEqual(1);
      for (const v of Object.values(e.biomechanics)) expect(v.length).toBeGreaterThan(3);
    }
  });

  it('does not claim complete isolation of a muscle', () => {
    for (const e of CATALOG_EXERCISES) {
      expect(`${e.description} ${e.tips.join(' ')}`).not.toMatch(/aísla (completamente|totalmente)|aislamiento (total|completo)/i);
    }
  });

  it('covers every muscle group as agonist and the main gym patterns', () => {
    for (const id of MUSCLE_IDS) {
      expect(CATALOG_EXERCISES.some((e) => e.muscles.some((m) => m.id === id && m.role === 'agonist'))).toBe(true);
    }
    expect(CATALOG_MUSCLES).toHaveLength(MUSCLE_IDS.length);
    for (const p of ['horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'hinge'] as const) {
      expect(CATALOG_EXERCISES.filter((e) => e.pattern === p).length).toBeGreaterThanOrEqual(2);
    }
    expect(Object.keys(PATTERNS).length).toBeGreaterThan(10);
  });

  it('loads into SQLite with muscles and relations, and re-sync is a no-op', async () => {
    const db = createTestDb();
    await bootstrapDatabase(db);
    const n = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM exercises');
    expect(n?.n).toBe(CATALOG_EXERCISES.length);
    const rel = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM exercise_relations');
    expect(rel!.n).toBeGreaterThan(30);
    const mg = await db.getFirstAsync<{ d: string }>("SELECT description AS d FROM muscle_groups WHERE id = 'lats'");
    expect(mg?.d).toMatch(/Dorsal/);
    expect(await syncCatalog(db)).toBe(false);
  });
});
