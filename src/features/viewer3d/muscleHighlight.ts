import type { MuscleRole } from '@/catalog';

/**
 * Maps mesh names of an anatomical GLB to muscle roles. Convention: meshes are
 * named with the muscle_groups id (e.g. "pectorals", "pectorals_L",
 * "lats.001"). Unknown meshes are treated as non-involved.
 */
export function roleForMesh(meshName: string, roles: ReadonlyMap<string, MuscleRole>): MuscleRole | null {
  const n = meshName.toLowerCase();
  for (const [id, role] of roles) {
    if (n === id || n.startsWith(`${id}_`) || n.startsWith(`${id}.`) || n.startsWith(`${id}-`)) return role;
  }
  return null;
}

export type ViewPreset = 'front' | 'back' | 'side';

/** Camera position for a preset around a model of radius r centered at the origin. */
export function presetPosition(preset: ViewPreset, r: number): [number, number, number] {
  const d = r * 2.6;
  switch (preset) {
    case 'front':
      return [0, r * 0.2, d];
    case 'back':
      return [0, r * 0.2, -d];
    case 'side':
      return [d, r * 0.2, 0];
  }
}
