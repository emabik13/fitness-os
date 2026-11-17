/** Spanish labels for enum values stored in the database. */
export const GOAL_LABELS = {
  recomposition: 'Recomposición corporal',
  hypertrophy: 'Hipertrofia',
  strength: 'Fuerza',
  fat_loss: 'Pérdida de grasa',
  maintenance: 'Mantenimiento',
} as const;

export type Goal = keyof typeof GOAL_LABELS;

export function goalLabel(goal: string | null | undefined): string {
  return goal && goal in GOAL_LABELS ? GOAL_LABELS[goal as Goal] : GOAL_LABELS.recomposition;
}

export const RECORD_TYPE_LABELS: Record<string, string> = {
  max_weight: 'Peso máximo',
  max_reps: 'Máx. repeticiones',
  estimated_1rm: '1RM estimado',
  max_set_volume: 'Volumen por serie',
};
