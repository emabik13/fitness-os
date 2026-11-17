import type { Equipment } from '@/domain/profile';

export const MUSCLE_IDS = [
  'pectorals', 'lats', 'traps', 'deltoids', 'biceps', 'triceps', 'forearms',
  'abdominals', 'quadriceps', 'hamstrings', 'glutes', 'calves',
] as const;
export type MuscleId = (typeof MUSCLE_IDS)[number];
export type MuscleRole = 'agonist' | 'synergist' | 'stabilizer';

export const PATTERNS = {
  horizontal_push: 'Empuje horizontal',
  vertical_push: 'Empuje vertical',
  horizontal_pull: 'Tracción horizontal',
  vertical_pull: 'Tracción vertical',
  squat: 'Sentadilla',
  hinge: 'Bisagra de cadera',
  lunge: 'Unilateral de pierna',
  hip_extension: 'Extensión de cadera',
  hip_abduction: 'Abducción de cadera',
  knee_extension: 'Extensión de rodilla',
  knee_flexion: 'Flexión de rodilla',
  chest_fly: 'Aperturas',
  shoulder_abduction: 'Elevación lateral',
  rear_delt: 'Deltoides posterior',
  elbow_flexion: 'Flexión de codo',
  elbow_extension: 'Extensión de codo',
  calf_raise: 'Flexión plantar',
  shrug: 'Elevación escapular',
  core_anti_extension: 'Core antiextensión',
  core_flexion: 'Flexión de tronco',
  wrist_flexion: 'Flexión de muñeca',
} as const;
export type Pattern = keyof typeof PATTERNS;

/** Joint-load flags used to respect user limitations (not medical advice). */
export const LOAD_TAGS = {
  shoulder: 'carga_hombro',
  elbow: 'carga_codo',
  wrist: 'carga_muneca',
  lower_back: 'carga_lumbar',
  hip: 'carga_cadera',
  knee: 'carga_rodilla',
  ankle: 'carga_tobillo',
  neck: 'carga_cuello',
} as const;

export interface Biomechanics {
  start: string;
  path: string;
  concentric: string;
  eccentric: string;
  breathing: string;
  stabilization: string;
  rom: string;
}

export interface CatalogExercise {
  slug: string;
  name: string;
  altNames: string[];
  primary: MuscleId;
  muscles: { id: MuscleId; role: MuscleRole }[];
  equipment: Equipment;
  /** Additional equipment needed (e.g. a bench). */
  requires?: Equipment[];
  movementType: 'compound' | 'isolation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  pattern: Pattern;
  description: string;
  instructions: string[];
  biomechanics: Biomechanics;
  errors: string[];
  tips: string[];
  tags: string[];
  substitutes: string[];
  variants?: string[];
}

export interface CatalogMuscle {
  id: MuscleId;
  description: string;
  function: string;
}

export const ROLE_LABELS: Record<MuscleRole, string> = {
  agonist: 'Agonista',
  synergist: 'Sinergista',
  stabilizer: 'Estabilizador',
};

export const DIFFICULTY_LABELS = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
} as const;

export const MOVEMENT_TYPE_LABELS = { compound: 'Multiarticular', isolation: 'Monoarticular' } as const;
