import { z } from 'zod';

import { catalogId } from '@/catalog';
import type { SqlExecutor } from '@/database/types';
import { nowIso } from '@/utils/time';

/**
 * Registry of verified 3D/visual assets. FITNESS OS ships NO invented
 * anatomical models: every entry must declare where it comes from and under
 * which license. Add entries here (or load a remote manifest with the same
 * shape) once real assets are available — see assets/models-3d/README.md.
 */
export const mediaEntrySchema = z.object({
  exerciseSlug: z.string().min(1),
  kind: z.enum(['anatomy_model', 'animation', 'thumbnail']),
  /** Remote https URL or bundled asset path. */
  uri: z.string().min(1),
  format: z.enum(['glb', 'png', 'webp', 'jpg']),
  sizeBytes: z.number().int().positive().max(15 * 1024 * 1024, 'Recurso demasiado grande para móviles (máx. 15 MB).'),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/, 'SHA-256 en hexadecimal'),
  source: z.string().min(3, 'Indica el autor o proveedor'),
  license: z.string().min(2, 'Indica la licencia (p. ej. CC-BY-4.0)'),
  attribution: z.string().optional(),
});
export type MediaEntry = z.infer<typeof mediaEntrySchema>;

/** Verified assets currently available. Empty on purpose until licensed content is added. */
export const MEDIA_MANIFEST: MediaEntry[] = [];

/** Global body model for the anatomy tab (same rules). */
export const ANATOMY_BODY_MODEL: MediaEntry | null = null;

/** Validates and upserts manifest entries into `exercise_media` as available. */
export async function registerMedia(db: SqlExecutor, entries: readonly unknown[]): Promise<number> {
  const parsed = entries.map((e, i) => {
    const r = mediaEntrySchema.safeParse(e);
    if (!r.success) throw new Error(`Recurso ${i + 1} no válido: ${r.error.issues[0]?.message}`);
    return r.data;
  });
  const now = nowIso();
  for (const m of parsed) {
    await db.runAsync(
      `INSERT INTO exercise_media (id, exercise_id, kind, status, uri, format, size_bytes, checksum_sha256, source, license, attribution, created_at, updated_at)
       VALUES (?, ?, ?, 'available', ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(exercise_id, kind) DO UPDATE SET status = 'available', uri = excluded.uri, format = excluded.format,
         size_bytes = excluded.size_bytes, checksum_sha256 = excluded.checksum_sha256, source = excluded.source,
         license = excluded.license, attribution = excluded.attribution, updated_at = excluded.updated_at`,
      [
        `media-${m.exerciseSlug}-${m.kind}`, catalogId(m.exerciseSlug), m.kind, m.uri, m.format, m.sizeBytes,
        m.checksumSha256, m.source, m.license, m.attribution ?? null, now, now,
      ],
    );
  }
  return parsed.length;
}
