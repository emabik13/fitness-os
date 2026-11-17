import { estimateOneRm, type PerformedSet } from '../strength/oneRm';

export type RecordType = 'max_weight' | 'max_reps' | 'estimated_1rm' | 'max_set_volume';

export interface RecordCandidate {
  type: RecordType;
  value: number;
  weightKg: number | null;
  reps: number | null;
  setIndex: number;
}

function bests(sets: readonly PerformedSet[]): Partial<Record<RecordType, RecordCandidate>> {
  const out: Partial<Record<RecordType, RecordCandidate>> = {};
  const consider = (type: RecordType, value: number | null, s: PerformedSet, i: number) => {
    if (value === null || value <= 0) return;
    if (!out[type] || value > out[type]!.value) out[type] = { type, value, weightKg: s.weightKg, reps: s.reps, setIndex: i };
  };
  sets.forEach((s, i) => {
    if (!s.reps || s.reps < 1) return;
    const w = s.weightKg ?? 0;
    if (w > 0) {
      consider('max_weight', w, s, i);
      consider('estimated_1rm', estimateOneRm(w, s.reps), s, i);
      consider('max_set_volume', w * s.reps, s, i);
    } else {
      consider('max_reps', s.reps, s, i);
    }
  });
  return out;
}

/**
 * Records beaten in `current` versus all `previous` sets of the same exercise.
 * Requires previous history: a first-ever session sets a baseline, not a record.
 */
export function detectRecords(previous: readonly PerformedSet[], current: readonly PerformedSet[]): RecordCandidate[] {
  if (previous.length === 0) return [];
  const before = bests(previous);
  const now = bests(current);
  return (Object.keys(now) as RecordType[])
    .filter((t) => now[t] && (!before[t] || now[t]!.value > before[t]!.value + 1e-9))
    .map((t) => now[t]!);
}
