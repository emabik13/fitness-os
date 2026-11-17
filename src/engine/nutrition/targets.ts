import type { Goal, Sex } from '@/domain/profile';

/**
 * Daily intake orientation. These are population-level ESTIMATES with real
 * uncertainty (±10–15 % for energy). They are not medical or dietetic
 * prescriptions; the trend of body weight over weeks is the real feedback.
 *
 * - Basal metabolic rate: Mifflin-St Jeor (1990). Requires sex → if the user
 *   did not provide it, no calorie estimate is produced.
 * - Activity: generic PAL factors by training days; daily non-exercise activity
 *   (steps, job) is unknown and is the largest source of error.
 * - Protein: 1.6–2.2 g/kg/day (Morton et al., 2018 meta-analysis; ISSN 2017
 *   position stand). 1.8–2.2 g/kg in a calorie deficit.
 * - Fat: not below ~0.6 g/kg/day.
 * - Water: EFSA (2010) adequate total water intake — 2.0 L/day women,
 *   2.5 L/day men, including water from food.
 */
export interface NutritionInput {
  sex: Sex | null;
  ageYears: number;
  heightCm: number;
  weightKg: number | null;
  trainingDaysPerWeek: number;
  goal: Goal;
}

export interface Range {
  min: number;
  max: number;
}

export interface NutritionTargets {
  bmrKcal: number | null;
  maintenanceKcal: number | null;
  calories: Range | null;
  proteinG: Range | null;
  fatMinG: number | null;
  carbsG: Range | null;
  waterMl: Range;
  notes: string[];
}

export function mifflinStJeor(sex: 'female' | 'male', weightKg: number, heightCm: number, ageYears: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

export function activityFactor(trainingDays: number): number {
  if (trainingDays <= 0) return 1.2;
  if (trainingDays <= 2) return 1.375;
  if (trainingDays <= 5) return 1.55;
  return 1.725;
}

const GOAL_FACTORS: Record<Goal, [number, number]> = {
  recomposition: [0.9, 1.0],
  fat_loss: [0.75, 0.85],
  hypertrophy: [1.05, 1.1],
  strength: [1.0, 1.05],
  maintenance: [0.97, 1.03],
};

const round = (n: number, step = 10) => Math.round(n / step) * step;

export function nutritionTargets(i: NutritionInput): NutritionTargets {
  const notes: string[] = [];
  const waterMl: Range =
    i.sex === 'female' ? { min: 2000, max: 2000 } : i.sex === 'male' ? { min: 2500, max: 2500 } : { min: 2000, max: 2500 };
  notes.push('Agua: referencia EFSA de ingesta total (incluye el agua de los alimentos, ~20–30 %). Aumenta con calor y sudoración.');

  if (!i.weightKg) {
    notes.unshift('Registra tu peso para calcular proteínas y calorías.');
    return { bmrKcal: null, maintenanceKcal: null, calories: null, proteinG: null, fatMinG: null, carbsG: null, waterMl, notes };
  }
  const deficit = i.goal === 'fat_loss' || i.goal === 'recomposition';
  const proteinG = { min: round(i.weightKg * (deficit ? 1.8 : 1.6), 5), max: round(i.weightKg * 2.2, 5) };
  const fatMinG = round(i.weightKg * 0.6, 5);
  notes.unshift(
    `Proteína: ${deficit ? '1,8' : '1,6'}–2,2 g/kg/día (meta-análisis de Morton et al., 2018). Repartida en 3–5 tomas.`,
  );

  if (i.sex !== 'female' && i.sex !== 'male') {
    notes.unshift('Sin el dato de sexo no se estima el gasto energético (la fórmula de Mifflin-St Jeor lo requiere). Puedes añadirlo en tu perfil.');
    return { bmrKcal: null, maintenanceKcal: null, calories: null, proteinG, fatMinG, carbsG: null, waterMl, notes };
  }

  const bmrKcal = mifflinStJeor(i.sex, i.weightKg, i.heightCm, i.ageYears);
  const maintenanceKcal = round(bmrKcal * activityFactor(i.trainingDaysPerWeek));
  const [lo, hi] = GOAL_FACTORS[i.goal];
  const calories = { min: round(maintenanceKcal * lo, 50), max: round(maintenanceKcal * hi, 50) };
  const carbsG = {
    min: Math.max(0, round((calories.min - proteinG.max * 4 - fatMinG * 9) / 4, 5)),
    max: Math.max(0, round((calories.max - proteinG.min * 4 - fatMinG * 9) / 4, 5)),
  };
  notes.unshift(
    `Calorías: metabolismo basal estimado ${bmrKcal} kcal (Mifflin-St Jeor) × factor de actividad ${activityFactor(i.trainingDaysPerWeek)} ≈ ${maintenanceKcal} kcal de mantenimiento. Es una estimación con un error típico de ±10–15 %: ajusta según la tendencia de tu peso durante 2–3 semanas.`,
  );
  notes.push('Orientación general, no un plan dietético. Si tienes una condición médica, consulta a un profesional sanitario.');
  return { bmrKcal, maintenanceKcal, calories, proteinG, fatMinG, carbsG, waterMl, notes };
}
