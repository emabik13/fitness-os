import type { SqlExecutor } from '../types';
import { insertRow, softDelete } from '../write';

export interface WeightEntry {
  id: string;
  measuredAt: string;
  weightKg: number;
  source: 'manual' | 'smart_scale' | 'external';
  notes: string | null;
}

export const BODY_FAT_METHODS = ['bia_scale', 'dexa', 'skinfold', 'bod_pod', 'formula_estimate', 'other'] as const;
export type BodyFatMethod = (typeof BODY_FAT_METHODS)[number];

export const BODY_FAT_METHOD_LABELS: Record<BodyFatMethod, string> = {
  bia_scale: 'Báscula de bioimpedancia',
  dexa: 'DEXA',
  skinfold: 'Pliegues cutáneos',
  bod_pod: 'Pletismografía (Bod Pod)',
  formula_estimate: 'Estimación por fórmula',
  other: 'Otro',
};

export const MEASUREMENT_FIELDS = [
  { key: 'waist_cm', label: 'Cintura' },
  { key: 'hip_cm', label: 'Cadera' },
  { key: 'chest_cm', label: 'Pecho' },
  { key: 'arm_cm', label: 'Brazo' },
  { key: 'thigh_cm', label: 'Muslo' },
  { key: 'calf_cm', label: 'Pantorrilla' },
] as const;
export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]['key'];

export interface MeasurementEntry {
  id: string;
  measuredAt: string;
  values: Partial<Record<MeasurementKey, number | null>>;
  bodyFatPct: number | null;
  bodyFatMethod: BodyFatMethod | null;
  bodyFatErrorPct: number | null;
  notes: string | null;
}

export function createBodyRepository(db: SqlExecutor) {
  return {
    async addWeight(
      userId: string,
      e: { measuredAt: string; weightKg: number; source?: WeightEntry['source']; notes?: string | null },
    ) {
      return insertRow(db, 'body_weight_entries', {
        user_id: userId,
        measured_at: e.measuredAt,
        weight_kg: e.weightKg,
        source: e.source ?? 'manual',
        notes: e.notes ?? null,
      });
    },
    async listWeights(userId: string, fromIso: string | null = null): Promise<WeightEntry[]> {
      return db.getAllAsync<WeightEntry>(
        `SELECT id, measured_at AS measuredAt, weight_kg AS weightKg, source, notes
           FROM body_weight_entries WHERE user_id = ? AND deleted_at IS NULL AND measured_at >= ?
          ORDER BY measured_at`,
        [userId, fromIso ?? '0000'],
      );
    },
    deleteWeight: (id: string) => softDelete(db, 'body_weight_entries', id),

    async addMeasurement(userId: string, m: Omit<MeasurementEntry, 'id'>) {
      return insertRow(db, 'body_measurements', {
        user_id: userId,
        measured_at: m.measuredAt,
        ...m.values,
        body_fat_pct: m.bodyFatPct,
        body_fat_method: m.bodyFatMethod,
        body_fat_error_pct: m.bodyFatErrorPct,
        notes: m.notes,
      });
    },
    async listMeasurements(userId: string, fromIso: string | null = null): Promise<MeasurementEntry[]> {
      const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM body_measurements WHERE user_id = ? AND deleted_at IS NULL AND measured_at >= ?
          ORDER BY measured_at`,
        [userId, fromIso ?? '0000'],
      );
      return rows.map((r) => ({
        id: r.id as string,
        measuredAt: r.measured_at as string,
        values: {
          waist_cm: r.waist_cm as number | null,
          hip_cm: r.hip_cm as number | null,
          chest_cm: r.chest_cm as number | null,
          arm_cm: r.arm_cm as number | null,
          thigh_cm: r.thigh_cm as number | null,
          calf_cm: r.calf_cm as number | null,
        },
        bodyFatPct: r.body_fat_pct as number | null,
        bodyFatMethod: r.body_fat_method as BodyFatMethod | null,
        bodyFatErrorPct: r.body_fat_error_pct as number | null,
        notes: r.notes as string | null,
      }));
    },
    deleteMeasurement: (id: string) => softDelete(db, 'body_measurements', id),
  };
}
