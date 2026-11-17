/**
 * Estimated one-repetition maximum (Epley: w × (1 + r/30)).
 * Always an ESTIMATE: accuracy drops quickly above ~10 reps, so sets with
 * more than 12 reps are not used. 1 rep returns the lifted weight.
 */
export const MAX_REPS_FOR_1RM = 12;

export function estimateOneRm(weightKg: number | null, reps: number | null): number | null {
  if (!weightKg || weightKg <= 0 || !reps || reps < 1 || reps > MAX_REPS_FOR_1RM) return null;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export interface PerformedSet {
  weightKg: number | null;
  reps: number | null;
  rir?: number | null;
}

/** Best estimated 1RM among sets, or null if none is eligible. */
export function bestOneRm(sets: readonly PerformedSet[]): number | null {
  let best: number | null = null;
  for (const s of sets) {
    const e = estimateOneRm(s.weightKg, s.reps);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
}

/** Session performance score: best e1RM, or total reps for bodyweight work. */
export function sessionScore(sets: readonly PerformedSet[]): { value: number; kind: 'e1rm' | 'reps' } | null {
  const e = bestOneRm(sets);
  if (e !== null) return { value: e, kind: 'e1rm' };
  const reps = sets.reduce((a, s) => a + (s.reps ?? 0), 0);
  return reps > 0 ? { value: reps, kind: 'reps' } : null;
}
