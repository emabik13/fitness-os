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

const kg = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

/** Human text for a personal record. */
export function formatRecord(type: string, value: number, weightKg: number | null, reps: number | null): string {
  switch (type) {
    case 'max_reps':
      return `${value} repeticiones`;
    case 'estimated_1rm':
      return `${kg(value)} kg (estimado${weightKg && reps ? ` desde ${kg(weightKg)} kg × ${reps}` : ''})`;
    case 'max_set_volume':
      return weightKg && reps ? `${kg(weightKg)} kg × ${reps} = ${Math.round(value)} kg` : `${Math.round(value)} kg`;
    default:
      return weightKg && reps ? `${kg(weightKg)} kg × ${reps}` : `${kg(value)} kg`;
  }
}
