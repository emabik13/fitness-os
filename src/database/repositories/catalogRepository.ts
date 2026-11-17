import type { SqlExecutor } from '../types';

export interface MuscleGroup {
  id: string;
  nameEs: string;
  region: 'upper' | 'lower' | 'core';
  bodyView: 'front' | 'back' | 'both';
}

export function createCatalogRepository(db: SqlExecutor) {
  return {
    async listMuscleGroups(): Promise<MuscleGroup[]> {
      return db.getAllAsync<MuscleGroup>(
        `SELECT id, name_es AS nameEs, region, body_view AS bodyView
           FROM muscle_groups ORDER BY sort_order`,
      );
    },
    async getMuscle(id: string): Promise<(MuscleGroup & { description: string | null; functionText: string | null }) | null> {
      return db.getFirstAsync(
        `SELECT id, name_es AS nameEs, region, body_view AS bodyView, description, function_text AS functionText
           FROM muscle_groups WHERE id = ?`,
        [id],
      );
    },
    async countExercises(): Promise<number> {
      const r = await db.getFirstAsync<{ n: number }>(
        'SELECT COUNT(*) AS n FROM exercises WHERE deleted_at IS NULL',
      );
      return r?.n ?? 0;
    },
  };
}
