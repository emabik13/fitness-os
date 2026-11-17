import type { MuscleId, MuscleRole } from '@/catalog';

/**
 * Effective weekly sets per muscle: a set counts 1 for agonists and 0.5 for
 * synergists (fractional counting commonly used in volume research);
 * stabilizers are not counted.
 */
export const ROLE_WEIGHT: Record<MuscleRole, number> = { agonist: 1, synergist: 0.5, stabilizer: 0 };

export function addVolume(
  acc: Partial<Record<MuscleId, number>>,
  muscles: readonly { id: MuscleId; role: MuscleRole }[],
  sets: number,
): void {
  for (const m of muscles) {
    const w = ROLE_WEIGHT[m.role];
    if (w > 0) acc[m.id] = (acc[m.id] ?? 0) + w * sets;
  }
}

/** Upper bound used to avoid excessive volume (effective sets / week / muscle). */
export const MAX_WEEKLY_SETS = 20;
