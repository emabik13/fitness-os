import type { SqlExecutor } from '../types';
import { insertRow, softDelete } from '../write';

export interface NutritionEntry {
  id: string;
  entryDate: string;
  label: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  waterMl: number | null;
}

export interface DayTotals {
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export function createNutritionRepository(db: SqlExecutor) {
  return {
    add(userId: string, e: Omit<NutritionEntry, 'id'>) {
      return insertRow(db, 'nutrition_entries', {
        user_id: userId, entry_date: e.entryDate, label: e.label, calories_kcal: e.caloriesKcal,
        protein_g: e.proteinG, carbs_g: e.carbsG, fat_g: e.fatG, water_ml: e.waterMl,
      });
    },
    remove: (id: string) => softDelete(db, 'nutrition_entries', id),
    listDay(userId: string, date: string): Promise<NutritionEntry[]> {
      return db.getAllAsync<NutritionEntry>(
        `SELECT id, entry_date AS entryDate, label, calories_kcal AS caloriesKcal, protein_g AS proteinG,
                carbs_g AS carbsG, fat_g AS fatG, water_ml AS waterMl
           FROM nutrition_entries WHERE user_id = ? AND entry_date = ? AND deleted_at IS NULL ORDER BY created_at`,
        [userId, date],
      );
    },
    /** Per-day totals for days that have entries, in [fromDate, toDate]. */
    async dailyTotals(userId: string, fromDate: string, toDate: string): Promise<(DayTotals & { date: string })[]> {
      return db.getAllAsync(
        `SELECT entry_date AS date, COALESCE(SUM(calories_kcal),0) AS caloriesKcal, COALESCE(SUM(protein_g),0) AS proteinG,
                COALESCE(SUM(carbs_g),0) AS carbsG, COALESCE(SUM(fat_g),0) AS fatG, COALESCE(SUM(water_ml),0) AS waterMl
           FROM nutrition_entries WHERE user_id = ? AND deleted_at IS NULL AND entry_date BETWEEN ? AND ?
          GROUP BY entry_date ORDER BY entry_date`,
        [userId, fromDate, toDate],
      );
    },
  };
}

export function sumDay(entries: readonly NutritionEntry[]): DayTotals {
  return entries.reduce<DayTotals>(
    (a, e) => ({
      caloriesKcal: a.caloriesKcal + (e.caloriesKcal ?? 0),
      proteinG: a.proteinG + (e.proteinG ?? 0),
      carbsG: a.carbsG + (e.carbsG ?? 0),
      fatG: a.fatG + (e.fatG ?? 0),
      waterMl: a.waterMl + (e.waterMl ?? 0),
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, waterMl: 0 },
  );
}
