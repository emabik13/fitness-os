import type { CatalogExercise } from '@/catalog';
import type { Experience, Goal } from '@/domain/profile';

export type StyleId =
  | 'balanced'
  | 'strength'
  | 'powerbuilding'
  | 'express'
  | 'density'
  | 'machines'
  | 'free_weights'
  | 'joint_friendly'
  | 'specialization';

export type Role = 'main' | 'compound' | 'isolation';

export interface Rx {
  repMin: number;
  repMax: number;
  restSeconds: number;
  targetRir: number;
  sets: number;
}

export interface StyleDef {
  id: StyleId;
  label: string;
  summary: string;
  /** Programming fit per goal (0–1): how well the style serves that goal. */
  goalFit: Record<Goal, number>;
  /** Suitability per experience level (0–1). */
  experienceFit: Record<Experience, number>;
  /** Relative systemic fatigue (0–1), used when recovery data is poor. */
  fatigue: number;
  /** Score delta for picking an exercise (negative = preferred). */
  pickBias?: (e: CatalogExercise) => number;
  /** Tags excluded on top of the user's limitations. */
  excludeTags?: string[];
  /** Adjusts the base prescription. */
  rx?: (role: Role, base: Rx, e: CatalogExercise) => Rx;
  /** Caps session minutes (e.g. express). */
  maxMinutes?: number;
  /** Multiplies weekly volume targets; priority muscles get `priorityMult`. */
  volumeMult?: number;
  priorityMult?: number;
  /** Intensity technique note added to some exercises after planning. */
  technique?: 'antagonist_supersets' | 'circuit' | 'last_set_dropset';
  requiresPriority?: boolean;
  rationale: string;
}

const machineLike = (e: CatalogExercise) => ['machine', 'cable', 'smith_machine', 'leg_press'].includes(e.equipment);
const freeWeight = (e: CatalogExercise) => e.equipment === 'barbell' || e.equipment === 'dumbbell';
const all = (v: number): Record<Goal, number> => ({ recomposition: v, hypertrophy: v, strength: v, fat_loss: v, maintenance: v });

export const STYLES: Record<StyleId, StyleDef> = {
  balanced: {
    id: 'balanced',
    label: 'Equilibrado',
    summary: 'Básicos + accesorios, rangos de 6–15 repeticiones. El estándar para ganar músculo y fuerza a la vez.',
    goalFit: { recomposition: 1, hypertrophy: 0.9, strength: 0.6, fat_loss: 0.8, maintenance: 0.85 },
    experienceFit: { beginner: 1, intermediate: 1, advanced: 0.9 },
    fatigue: 0.6,
    rationale: 'Estilo equilibrado: un ejercicio principal por sesión y accesorios para completar el volumen semanal.',
  },
  strength: {
    id: 'strength',
    label: 'Fuerza',
    summary: 'Básicos pesados a 3–6 repeticiones con descansos largos y menos accesorios.',
    goalFit: { recomposition: 0.55, hypertrophy: 0.5, strength: 1, fat_loss: 0.45, maintenance: 0.6 },
    experienceFit: { beginner: 0.5, intermediate: 1, advanced: 1 },
    fatigue: 0.65,
    pickBias: (e) => (e.equipment === 'barbell' && e.movementType === 'compound' ? -6 : machineLike(e) && e.movementType === 'compound' ? 3 : 0),
    rx: (role, b) =>
      role === 'main'
        ? { ...b, repMin: 3, repMax: 5, restSeconds: 210, sets: 4 }
        : role === 'compound'
          ? { ...b, repMin: 5, repMax: 8, restSeconds: 150 }
          : { ...b, repMin: 8, repMax: 12, sets: 2 },
    volumeMult: 0.85,
    rationale: 'Estilo fuerza: prioriza los ejercicios básicos con barra a 3–6 repeticiones y descansos de 2,5–3,5 min; los accesorios son mínimos.',
  },
  powerbuilding: {
    id: 'powerbuilding',
    label: 'Powerbuilding',
    summary: 'Un básico pesado al inicio y accesorios de hipertrofia; drop set en la última serie de aislamiento.',
    goalFit: { recomposition: 0.85, hypertrophy: 0.85, strength: 0.9, fat_loss: 0.6, maintenance: 0.6 },
    experienceFit: { beginner: 0.5, intermediate: 1, advanced: 1 },
    fatigue: 0.8,
    pickBias: (e) => (e.equipment === 'barbell' && e.movementType === 'compound' ? -3 : 0),
    rx: (role, b) => (role === 'main' ? { ...b, repMin: 4, repMax: 6, restSeconds: 180, sets: 4 } : b),
    technique: 'last_set_dropset',
    rationale: 'Powerbuilding: el primer ejercicio se trabaja pesado (4–6 repeticiones) para la fuerza y el resto en rangos de hipertrofia.',
  },
  express: {
    id: 'express',
    label: 'Exprés',
    summary: 'Sesiones de 35–45 min con superseries de músculos antagonistas y descansos cortos.',
    goalFit: { recomposition: 0.75, hypertrophy: 0.65, strength: 0.55, fat_loss: 0.85, maintenance: 1 },
    experienceFit: { beginner: 0.9, intermediate: 1, advanced: 0.9 },
    fatigue: 0.35,
    rx: (role, b) => ({ ...b, restSeconds: role === 'isolation' ? 45 : 75 }),
    maxMinutes: 45,
    technique: 'antagonist_supersets',
    rationale: 'Estilo exprés: superseries de músculos opuestos (p. ej. empuje + tracción) para ahorrar tiempo sin perder rendimiento; descansos de 45–75 s.',
  },
  density: {
    id: 'density',
    label: 'Circuitos',
    summary: 'Circuitos con descansos cortos y repeticiones moderadas-altas; alto gasto por sesión.',
    goalFit: { recomposition: 0.75, hypertrophy: 0.55, strength: 0.3, fat_loss: 1, maintenance: 0.8 },
    experienceFit: { beginner: 0.8, intermediate: 1, advanced: 0.9 },
    fatigue: 0.6,
    pickBias: (e) => (e.difficulty === 'beginner' ? -2 : 0) + (e.equipment === 'barbell' ? 2 : 0),
    excludeTags: ['basico'],
    rx: (_role, b) => ({ ...b, repMin: 10, repMax: 15, restSeconds: 45 }),
    technique: 'circuit',
    rationale: 'Estilo circuito: ejercicios seguidos con 30–45 s de transición; se evitan los básicos técnicos con barra porque la fatiga deteriora la técnica.',
  },
  machines: {
    id: 'machines',
    label: 'Máquinas y poleas',
    summary: 'Ejercicios guiados: menos técnica, más estabilidad y fácil progresión.',
    goalFit: { recomposition: 0.85, hypertrophy: 0.85, strength: 0.4, fat_loss: 0.8, maintenance: 0.85 },
    experienceFit: { beginner: 1, intermediate: 0.9, advanced: 0.85 },
    fatigue: 0.5,
    pickBias: (e) => (machineLike(e) ? -8 : freeWeight(e) ? 4 : 0),
    rationale: 'Prioriza máquinas y poleas: trayectorias guiadas que reducen la demanda técnica y permiten acercarse al fallo con seguridad.',
  },
  free_weights: {
    id: 'free_weights',
    label: 'Peso libre',
    summary: 'Barras y mancuernas: más estabilización y transferencia a la fuerza general.',
    goalFit: { recomposition: 0.85, hypertrophy: 0.85, strength: 0.9, fat_loss: 0.75, maintenance: 0.75 },
    experienceFit: { beginner: 0.7, intermediate: 1, advanced: 1 },
    fatigue: 0.65,
    pickBias: (e) => (freeWeight(e) ? -6 : machineLike(e) ? 4 : 0),
    rationale: 'Prioriza barras y mancuernas, que exigen más estabilización y transfieren mejor a la fuerza general.',
  },
  joint_friendly: {
    id: 'joint_friendly',
    label: 'Cuidado articular',
    summary: 'Evita cargas axiales pesadas y ejercicios exigentes para las articulaciones; más máquinas y unilaterales.',
    goalFit: all(0.7),
    experienceFit: { beginner: 1, intermediate: 1, advanced: 0.9 },
    fatigue: 0.4,
    excludeTags: ['basico'],
    pickBias: (e) =>
      (machineLike(e) ? -4 : 0) +
      ['carga_lumbar', 'carga_hombro', 'carga_rodilla', 'carga_codo'].filter((t) => e.tags.includes(t)).length * 3,
    rx: (role, b) => (role === 'isolation' ? b : { ...b, repMin: Math.max(b.repMin, 8), repMax: Math.max(b.repMax, 12) }),
    rationale: 'Cuidado articular: sin básicos pesados con barra, más máquinas y repeticiones algo más altas para reducir la carga en articulaciones. No sustituye la valoración de un profesional.',
  },
  specialization: {
    id: 'specialization',
    label: 'Especialización',
    summary: 'Mucho más volumen para tus grupos prioritarios y volumen de mantenimiento para el resto.',
    goalFit: { recomposition: 0.8, hypertrophy: 0.95, strength: 0.6, fat_loss: 0.6, maintenance: 0.5 },
    experienceFit: { beginner: 0.6, intermediate: 1, advanced: 1 },
    fatigue: 0.75,
    volumeMult: 0.75,
    priorityMult: 1.6,
    requiresPriority: true,
    rationale: 'Especialización: los grupos prioritarios reciben ~60 % más volumen y el resto se mantiene con menos series (no se puede priorizar todo a la vez).',
  },
};

export const STYLE_IDS = Object.keys(STYLES) as StyleId[];
