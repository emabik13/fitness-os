import { catalogId } from '@/catalog';
import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { createTestDb } from '@/test/nodeSqliteExecutor';

import { createExerciseRepository } from './exerciseRepository';

describe('exercise repository', () => {
  it('filters by muscle, equipment, difficulty and pattern, and searches without accents', async () => {
    const db = createTestDb();
    await bootstrapDatabase(db);
    const repo = createExerciseRepository(db);
    const chest = await repo.list({ muscleId: 'pectorals' });
    expect(chest.length).toBeGreaterThanOrEqual(5);
    expect(chest.every((e) => e.primaryMuscleId === 'pectorals' || e.slug === 'fondos-paralelas')).toBe(true);
    const cables = await repo.list({ equipment: 'cable', difficulty: 'beginner' });
    expect(cables.every((e) => e.equipment === 'cable' && e.difficulty === 'beginner')).toBe(true);
    expect((await repo.list({ pattern: 'hinge' })).map((e) => e.slug)).toContain('peso-muerto-rumano');
    expect((await repo.list({ search: 'jalon' })).map((e) => e.slug)).toEqual(['jalon-pecho']);
    expect((await repo.list({ search: 'bench' })).length).toBeGreaterThanOrEqual(2); // alt names
  });

  it('returns full detail with roles, substitutes and an explicit lack of media', async () => {
    const db = createTestDb();
    await bootstrapDatabase(db);
    const d = await createExerciseRepository(db).get(catalogId('press-banca-barra'));
    expect(d?.muscles[0]).toMatchObject({ id: 'pectorals', role: 'agonist' });
    expect(d?.muscles.map((m) => m.role)).toContain('synergist');
    expect(d?.substitutes.map((s) => s.name)).toContain('Press de banca con mancuernas');
    expect(d?.biomechanics.breathing).toBeTruthy();
    expect(d?.media).toEqual([]);
  });
});
