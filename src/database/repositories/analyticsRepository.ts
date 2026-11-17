import { startOfWeek, toLocalDateKey } from '@/utils/time';

import type { SqlExecutor } from '../types';

export function createAnalyticsRepository(db: SqlExecutor) {
  return {
    /**
     * Completed sessions per COMPLETE week (current week excluded), oldest first,
     * starting at the week of the first logged workout, at most `maxWeeks`.
     */
    async weeklyCounts(userId: string, maxWeeks = 12, now = new Date()): Promise<number[]> {
      const rows = await db.getAllAsync<{ started_at: string }>(
        `SELECT started_at FROM workouts WHERE user_id = ? AND status = 'completed' AND deleted_at IS NULL ORDER BY started_at`,
        [userId],
      );
      if (rows.length === 0) return [];
      const current = startOfWeek(now);
      const first = startOfWeek(new Date(rows[0]!.started_at));
      const counts = new Map<string, number>();
      for (const r of rows) {
        const k = toLocalDateKey(startOfWeek(new Date(r.started_at)));
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      const out: number[] = [];
      for (let d = new Date(first); d < current; d.setDate(d.getDate() + 7)) out.push(counts.get(toLocalDateKey(d)) ?? 0);
      return out.slice(-maxWeeks);
    },

    /** Recovery averages of the last `days` days. */
    async recoveryAverages(userId: string, days = 14, now = new Date()) {
      const from = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1)));
      const r = await db.getFirstAsync<{ n: number; rec: number | null; sleep: number | null }>(
        `SELECT COUNT(*) AS n, AVG(recovery_score) AS rec, AVG(sleep_hours) AS sleep
           FROM recovery_entries WHERE user_id = ? AND deleted_at IS NULL AND entry_date >= ?`,
        [userId, from],
      );
      return r && r.n > 0 ? { days: r.n, recoveryScore: r.rec, sleepHours: r.sleep } : null;
    },
  };
}
