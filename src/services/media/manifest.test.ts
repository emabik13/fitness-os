import { createExerciseRepository } from '@/database/repositories/exerciseRepository';
import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { createTestDb } from '@/test/nodeSqliteExecutor';
import { catalogId } from '@/catalog';

import { MEDIA_MANIFEST, registerMedia } from './manifest';

const valid = {
  exerciseSlug: 'press-banca-barra',
  kind: 'animation',
  uri: 'https://example.org/press.glb',
  format: 'glb',
  sizeBytes: 2_000_000,
  checksumSha256: 'a'.repeat(64),
  source: 'Proveedor de prueba',
  license: 'CC-BY-4.0',
};

describe('3D media manifest', () => {
  it('ships no invented assets', () => {
    expect(MEDIA_MANIFEST).toEqual([]);
  });

  it('rejects entries without source/license or too large for mobile', async () => {
    const db = createTestDb();
    await bootstrapDatabase(db);
    await expect(registerMedia(db, [{ ...valid, license: '' }])).rejects.toThrow(/licencia/);
    await expect(registerMedia(db, [{ ...valid, source: '' }])).rejects.toThrow(/autor/);
    await expect(registerMedia(db, [{ ...valid, sizeBytes: 50_000_000 }])).rejects.toThrow(/demasiado grande/);
  });

  it('registers a verified asset and exposes it on the exercise detail', async () => {
    const db = createTestDb();
    await bootstrapDatabase(db);
    expect(await registerMedia(db, [valid])).toBe(1);
    const d = await createExerciseRepository(db).get(catalogId('press-banca-barra'));
    expect(d?.media).toEqual([
      { kind: 'animation', status: 'available', uri: valid.uri, source: valid.source, license: valid.license, attribution: null },
    ]);
  });
});
