import { startOfWeek, toLocalDateKey, type TimeRange } from '@/utils/time';

export interface Bucket {
  key: string;
  label: string;
  count: number;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Groups instants into weekly buckets (ranges up to 3 months) or monthly
 * buckets (longer ranges), always including empty buckets so gaps are visible.
 */
export function bucketize(instants: readonly string[], range: TimeRange, now = new Date()): Bucket[] {
  const weekly = range === '7d' || range === '30d' || range === '3m';
  const out: Bucket[] = [];
  if (weekly) {
    const n = range === '7d' ? 2 : range === '30d' ? 5 : 13;
    const cur = startOfWeek(now);
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(cur);
      d.setDate(cur.getDate() - 7 * i);
      out.push({ key: toLocalDateKey(d), label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0 });
    }
    for (const iso of instants) {
      const b = out.find((x) => x.key === toLocalDateKey(startOfWeek(new Date(iso))));
      if (b) b.count++;
    }
    return out;
  }
  const n = range === '6m' ? 6 : 12;
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()]!, count: 0 });
  }
  for (const iso of instants) {
    const d = new Date(iso);
    const b = out.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (b) b.count++;
  }
  return out;
}

/** Consecutive weeks (ending last complete or current week) meeting `target` sessions. */
export function weeklyStreak(instants: readonly string[], target: number, now = new Date()): number {
  if (target <= 0) return 0;
  const counts = new Map<string, number>();
  for (const iso of instants) {
    const k = toLocalDateKey(startOfWeek(new Date(iso)));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let streak = 0;
  const cur = startOfWeek(now);
  // The current week counts only once it meets the target; otherwise start from last week.
  if ((counts.get(toLocalDateKey(cur)) ?? 0) >= target) streak++;
  for (let i = 1; i < 520; i++) {
    const d = new Date(cur);
    d.setDate(cur.getDate() - 7 * i);
    if ((counts.get(toLocalDateKey(d)) ?? 0) >= target) streak++;
    else break;
  }
  return streak;
}
