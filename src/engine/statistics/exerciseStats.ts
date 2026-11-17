import type { HistorySession } from '@/database/repositories/workoutRepository';

import { bestOneRm } from '../strength/oneRm';

export interface ExerciseSessionStat {
  date: string;
  topWeightKg: number | null;
  bestE1rm: number | null;
  volumeKg: number;
  reps: number;
  sets: number;
}

export function perSessionStats(sessions: readonly HistorySession[]): ExerciseSessionStat[] {
  return sessions.map((s) => {
    const weights = s.sets.map((x) => x.weightKg ?? 0).filter((w) => w > 0);
    return {
      date: s.startedAt,
      topWeightKg: weights.length ? Math.max(...weights) : null,
      bestE1rm: bestOneRm(s.sets),
      volumeKg: Math.round(s.sets.reduce((a, x) => a + (x.weightKg ?? 0) * (x.reps ?? 0), 0) * 10) / 10,
      reps: s.sets.reduce((a, x) => a + (x.reps ?? 0), 0),
      sets: s.sets.length,
    };
  });
}

/** Average sessions per week across the span of the given sessions (min. 1 week). */
export function frequencyPerWeek(sessions: readonly { date: string }[], fromIso: string | null, now = new Date()): number {
  if (sessions.length === 0) return 0;
  const start = fromIso ? Date.parse(fromIso) : Date.parse(sessions[0]!.date);
  const weeks = Math.max(1, (now.getTime() - start) / (7 * 86_400_000));
  return Math.round((sessions.length / weeks) * 10) / 10;
}
