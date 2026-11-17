import type { SqlExecutor } from '../types';
import { insertRow, updateRow } from '../write';

export interface RecoveryEntry {
  id: string;
  entryDate: string;
  sleepHours: number | null;
  recoveryScore: number | null;
  fatigue: number | null;
  soreness: number | null;
  energy: number | null;
  notes: string | null;
}

export type RecoveryInput = Omit<RecoveryEntry, 'id'>;

const SELECT = `SELECT id, entry_date AS entryDate, sleep_hours AS sleepHours, recovery_score AS recoveryScore,
                       fatigue, soreness, energy, notes FROM recovery_entries`;

export function createRecoveryRepository(db: SqlExecutor) {
  return {
    getDay(userId: string, date: string): Promise<RecoveryEntry | null> {
      return db.getFirstAsync<RecoveryEntry>(`${SELECT} WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL`, [userId, date]);
    },
    /** One entry per day: updates the existing one or creates it. */
    async upsert(userId: string, e: RecoveryInput): Promise<string> {
      const values = {
        sleep_hours: e.sleepHours, recovery_score: e.recoveryScore, fatigue: e.fatigue,
        soreness: e.soreness, energy: e.energy, notes: e.notes,
      };
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM recovery_entries WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL',
        [userId, e.entryDate],
      );
      if (existing) {
        await updateRow(db, 'recovery_entries', existing.id, values);
        return existing.id;
      }
      return insertRow(db, 'recovery_entries', { user_id: userId, entry_date: e.entryDate, ...values });
    },
    list(userId: string, fromDate: string): Promise<RecoveryEntry[]> {
      return db.getAllAsync<RecoveryEntry>(`${SELECT} WHERE user_id = ? AND entry_date >= ? AND deleted_at IS NULL ORDER BY entry_date`, [
        userId,
        fromDate,
      ]);
    },
  };
}

/** Averages of the numeric fields that were recorded (nulls ignored). */
export function averageRecovery(entries: readonly RecoveryEntry[]) {
  const avg = (k: keyof Pick<RecoveryEntry, 'sleepHours' | 'recoveryScore' | 'fatigue' | 'soreness' | 'energy'>) => {
    const v = entries.map((e) => e[k]).filter((x): x is number => x !== null);
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  return {
    sleepHours: avg('sleepHours'),
    recoveryScore: avg('recoveryScore'),
    fatigue: avg('fatigue'),
    soreness: avg('soreness'),
    energy: avg('energy'),
    days: entries.length,
  };
}
