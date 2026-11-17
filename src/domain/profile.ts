import { z } from 'zod';

export const GOALS = ['recomposition', 'hypertrophy', 'strength', 'fat_loss', 'maintenance'] as const;
export const EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const;
export const SEXES = ['female', 'male', 'unspecified'] as const;
export const EQUIPMENT = [
  'barbell', 'dumbbell', 'machine', 'cable', 'bench', 'smith_machine',
  'leg_press', 'rack', 'pullup_bar', 'bodyweight',
] as const;
export const LIMITATION_AREAS = ['shoulder', 'elbow', 'wrist', 'lower_back', 'hip', 'knee', 'ankle', 'neck'] as const;
export const LIFT_PATTERNS = ['squat', 'hinge', 'bench', 'overhead_press', 'row', 'pullup'] as const;
export const LIFT_LEVELS = ['none', 'learning', 'confident'] as const;

export type Goal = (typeof GOALS)[number];
export type Experience = (typeof EXPERIENCE)[number];
export type Sex = (typeof SEXES)[number];
export type Equipment = (typeof EQUIPMENT)[number];
export type LimitationArea = (typeof LIMITATION_AREAS)[number];
export type LiftPattern = (typeof LIFT_PATTERNS)[number];
export type LiftLevel = (typeof LIFT_LEVELS)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barras',
  dumbbell: 'Mancuernas',
  machine: 'Máquinas',
  cable: 'Poleas',
  bench: 'Bancos',
  smith_machine: 'Multipower',
  leg_press: 'Prensa',
  rack: 'Jaula / rack',
  pullup_bar: 'Barra de dominadas',
  bodyweight: 'Peso corporal',
};

export const EXPERIENCE_LABELS: Record<Experience, string> = {
  beginner: 'Principiante (< 1 año)',
  intermediate: 'Intermedio (1–3 años)',
  advanced: 'Avanzado (> 3 años)',
};

export const SEX_LABELS: Record<Sex, string> = {
  female: 'Mujer',
  male: 'Hombre',
  unspecified: 'Prefiero no indicarlo',
};

export const LIMITATION_LABELS: Record<LimitationArea, string> = {
  shoulder: 'Hombro',
  elbow: 'Codo',
  wrist: 'Muñeca',
  lower_back: 'Zona lumbar',
  hip: 'Cadera',
  knee: 'Rodilla',
  ankle: 'Tobillo',
  neck: 'Cuello',
};

export const LIFT_LABELS: Record<LiftPattern, string> = {
  squat: 'Sentadilla',
  hinge: 'Peso muerto / bisagra',
  bench: 'Press de banca',
  overhead_press: 'Press militar',
  row: 'Remo',
  pullup: 'Dominadas',
};

export const LIFT_LEVEL_LABELS: Record<LiftLevel, string> = {
  none: 'Nunca',
  learning: 'Aprendiendo',
  confident: 'Lo domino',
};

export const preferencesSchema = z.object({
  effortScale: z.enum(['rir', 'rpe']).default('rir'),
  preferMachines: z.boolean().default(false),
  includeCore: z.boolean().default(true),
});
export type Preferences = z.infer<typeof preferencesSchema>;

/** Validated onboarding/profile input. Ranges mirror the SQL CHECK constraints. */
export const profileInputSchema = z.object({
  ageYears: z.number({ message: 'Indica tu edad' }).int().min(13, 'Mínimo 13 años').max(100, 'Máximo 100 años'),
  sex: z.enum(SEXES).nullable(),
  heightCm: z.number({ message: 'Indica tu altura' }).min(100, 'Entre 100 y 250 cm').max(250, 'Entre 100 y 250 cm'),
  weightKg: z.number({ message: 'Indica tu peso' }).min(25, 'Entre 25 y 350 kg').max(350, 'Entre 25 y 350 kg'),
  targetWeightKg: z.number().min(30, 'Entre 30 y 300 kg').max(300, 'Entre 30 y 300 kg').nullable(),
  goal: z.enum(GOALS),
  experience: z.enum(EXPERIENCE),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().min(15).max(240),
  priorityMuscles: z.array(z.string()).max(3, 'Elige como máximo 3 grupos prioritarios'),
  limitations: z.array(z.object({ area: z.enum(LIMITATION_AREAS), note: z.string().max(200).default('') })),
  liftExperience: z.partialRecord(z.enum(LIFT_PATTERNS), z.enum(LIFT_LEVELS)),
  equipment: z.array(z.enum(EQUIPMENT)).min(1, 'Selecciona al menos un tipo de equipamiento'),
  preferences: preferencesSchema,
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

export interface Profile extends Omit<ProfileInput, 'weightKg'> {
  id: string;
  onboardingCompleted: boolean;
}

/** Parses a decimal typed with comma or dot ("72,5"). Returns null if empty/invalid. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
