import type { Pattern } from '@/catalog';

export interface Slot {
  patterns: Pattern[];
  kind: 'compound' | 'isolation' | 'any';
  /** Lower = more important. Optional slots are dropped first when time is short. */
  weight: number;
  core?: boolean;
}

const s = (patterns: Pattern[], kind: Slot['kind'], weight: number, core = false): Slot => ({ patterns, kind, weight, core });
const CORE = s(['core_flexion', 'core_anti_extension', 'core_anti_rotation'], 'isolation', 6, true);

export interface Template {
  name: string;
  focus: string;
  slots: Slot[];
}

export const TEMPLATES: Record<string, Template> = {
  fbA: {
    name: 'Full Body A',
    focus: 'Cuerpo completo · énfasis sentadilla',
    slots: [s(['squat'], 'compound', 0), s(['horizontal_push'], 'compound', 1), s(['vertical_pull', 'horizontal_pull'], 'compound', 1), s(['knee_flexion', 'hinge'], 'any', 3), s(['shoulder_abduction'], 'isolation', 4), s(['elbow_flexion'], 'isolation', 5), CORE],
  },
  fbB: {
    name: 'Full Body B',
    focus: 'Cuerpo completo · énfasis bisagra',
    slots: [s(['hinge'], 'compound', 0), s(['vertical_push', 'horizontal_push'], 'compound', 1), s(['horizontal_pull'], 'compound', 1), s(['lunge', 'squat'], 'compound', 3), s(['rear_delt'], 'any', 4), s(['elbow_extension'], 'isolation', 5), s(['calf_raise'], 'isolation', 6)],
  },
  fbC: {
    name: 'Full Body C',
    focus: 'Cuerpo completo · énfasis empuje',
    slots: [s(['horizontal_push'], 'compound', 0), s(['squat', 'lunge'], 'compound', 1), s(['vertical_pull'], 'compound', 1), s(['hip_extension', 'hinge'], 'any', 3), s(['shoulder_abduction'], 'isolation', 4), s(['elbow_extension', 'elbow_flexion'], 'isolation', 5), CORE],
  },
  fbD: {
    name: 'Full Body D',
    focus: 'Cuerpo completo · énfasis tracción y unilateral',
    slots: [s(['horizontal_pull'], 'compound', 0), s(['lunge'], 'compound', 1), s(['vertical_push'], 'compound', 1), s(['knee_flexion'], 'isolation', 3), s(['chest_fly'], 'isolation', 4), s(['elbow_flexion', 'elbow_extension'], 'isolation', 5), s(['calf_raise'], 'isolation', 6)],
  },
  upper: {
    name: 'Torso',
    focus: 'Pecho, espalda, hombros y brazos',
    slots: [s(['horizontal_push'], 'compound', 0), s(['horizontal_pull'], 'compound', 0), s(['vertical_push'], 'compound', 2), s(['vertical_pull'], 'compound', 1), s(['chest_fly', 'horizontal_push'], 'any', 5), s(['shoulder_abduction'], 'isolation', 3), s(['elbow_flexion'], 'isolation', 4), s(['elbow_extension'], 'isolation', 4), s(['rear_delt'], 'any', 6)],
  },
  lower: {
    name: 'Pierna',
    focus: 'Cuádriceps, isquiotibiales, glúteos y gemelos',
    slots: [s(['squat'], 'compound', 0), s(['hinge'], 'compound', 0), s(['lunge', 'squat'], 'compound', 3), s(['knee_flexion'], 'isolation', 2), s(['knee_extension', 'hip_extension'], 'any', 4), s(['calf_raise'], 'isolation', 5), CORE],
  },
  push: {
    name: 'Empuje',
    focus: 'Pecho, hombros y tríceps',
    slots: [s(['horizontal_push'], 'compound', 0), s(['vertical_push'], 'compound', 1), s(['horizontal_push'], 'compound', 3), s(['chest_fly'], 'isolation', 4), s(['shoulder_abduction'], 'isolation', 2), s(['elbow_extension'], 'isolation', 3), s(['elbow_extension'], 'isolation', 6)],
  },
  pull: {
    name: 'Tracción',
    focus: 'Espalda, deltoides posterior y bíceps',
    slots: [s(['vertical_pull'], 'compound', 0), s(['horizontal_pull'], 'compound', 0), s(['horizontal_pull'], 'compound', 3), s(['rear_delt'], 'any', 2), s(['elbow_flexion'], 'isolation', 3), s(['elbow_flexion'], 'isolation', 6), s(['shrug'], 'isolation', 7)],
  },
  legs: {
    name: 'Pierna',
    focus: 'Tren inferior completo',
    slots: [s(['squat'], 'compound', 0), s(['hinge'], 'compound', 0), s(['squat', 'lunge'], 'compound', 3), s(['knee_extension'], 'isolation', 4), s(['knee_flexion'], 'isolation', 2), s(['calf_raise'], 'isolation', 5), CORE],
  },
  chestTri: {
    name: 'Pecho y tríceps',
    focus: 'Empuje horizontal y extensión de codo',
    slots: [s(['horizontal_push'], 'compound', 0), s(['horizontal_push'], 'compound', 1), s(['chest_fly'], 'isolation', 2), s(['elbow_extension'], 'isolation', 3), s(['elbow_extension'], 'isolation', 5)],
  },
  backBi: {
    name: 'Espalda y bíceps',
    focus: 'Tracciones y flexión de codo',
    slots: [s(['vertical_pull'], 'compound', 0), s(['horizontal_pull'], 'compound', 0), s(['horizontal_pull', 'shoulder_extension'], 'any', 2), s(['elbow_flexion'], 'isolation', 3), s(['elbow_flexion'], 'isolation', 5)],
  },
  shouldersArms: {
    name: 'Hombros y brazos',
    focus: 'Deltoides, bíceps y tríceps',
    slots: [s(['vertical_push'], 'compound', 0), s(['shoulder_abduction'], 'isolation', 1), s(['rear_delt'], 'any', 2), s(['elbow_flexion'], 'isolation', 3), s(['elbow_extension'], 'isolation', 3), s(['shrug'], 'isolation', 6)],
  },
  chest: {
    name: 'Pecho',
    focus: 'Pectorales',
    slots: [s(['horizontal_push'], 'compound', 0), s(['horizontal_push'], 'compound', 1), s(['horizontal_push'], 'compound', 3), s(['chest_fly'], 'isolation', 2), CORE],
  },
  back: {
    name: 'Espalda',
    focus: 'Dorsales y trapecios',
    slots: [s(['vertical_pull'], 'compound', 0), s(['horizontal_pull'], 'compound', 0), s(['horizontal_pull'], 'compound', 2), s(['shoulder_extension', 'vertical_pull'], 'any', 3), s(['shrug'], 'isolation', 5)],
  },
  shoulders: {
    name: 'Hombros',
    focus: 'Deltoides (tres porciones)',
    slots: [s(['vertical_push'], 'compound', 0), s(['shoulder_abduction'], 'isolation', 1), s(['rear_delt'], 'any', 2), s(['shoulder_abduction'], 'isolation', 4), CORE],
  },
  arms: {
    name: 'Brazos',
    focus: 'Bíceps, tríceps y antebrazos',
    slots: [s(['elbow_flexion'], 'isolation', 0), s(['elbow_extension'], 'isolation', 0), s(['elbow_flexion'], 'isolation', 2), s(['elbow_extension'], 'isolation', 2), s(['wrist_flexion', 'carry'], 'any', 5)],
  },
};

export type SplitId = 'full_body' | 'full_body_hf' | 'upper_lower' | 'ppl' | 'ul_ppl' | 'ul_full' | 'body_part';
export type DbSplitType = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'specialized';

export interface SplitDef {
  id: SplitId;
  label: string;
  dbType: DbSplitType;
  /** Template keys and suggested weekdays (0 = Monday) per supported day count. */
  byDays: Partial<Record<number, { days: string[]; weekdays: number[]; frequency: number; why: string }>>;
}

/**
 * Weekly training frequency per main muscle drives `frequency` (0–1):
 * ≈2×/week is the evidence-based default for a given volume (Schoenfeld et al., 2016);
 * 1×/week is viable but usually less efficient.
 */
export const SPLITS: Record<SplitId, SplitDef> = {
  full_body: {
    id: 'full_body',
    label: 'Full Body',
    dbType: 'full_body',
    byDays: {
      1: { days: ['fbA'], weekdays: [0], frequency: 0.4, why: 'Con 1 día, un Full Body es la única forma de estimular todos los grupos; la frecuencia 1×/semana limita el progreso.' },
      2: { days: ['fbA', 'fbB'], weekdays: [0, 3], frequency: 1, why: 'Dos Full Body entrenan cada grupo 2 veces por semana, la frecuencia que la evidencia asocia con mejores resultados para un mismo volumen.' },
      3: { days: ['fbA', 'fbB', 'fbC'], weekdays: [0, 2, 4], frequency: 1, why: 'Tres Full Body alternos (A/B/C) dan frecuencia 2–3×/semana por músculo con días de descanso intercalados.' },
    },
  },
  full_body_hf: {
    id: 'full_body_hf',
    label: 'Full Body alta frecuencia',
    dbType: 'full_body',
    byDays: {
      4: { days: ['fbA', 'fbB', 'fbC', 'fbD'], weekdays: [0, 2, 4, 6], frequency: 1, why: 'Cuatro sesiones de cuerpo completo con menos series por sesión: cada músculo se entrena 3–4×/semana, repartiendo el volumen y la fatiga.' },
    },
  },
  upper_lower: {
    id: 'upper_lower',
    label: 'Torso / Pierna',
    dbType: 'upper_lower',
    byDays: {
      2: { days: ['upper', 'lower'], weekdays: [0, 3], frequency: 0.55, why: 'Torso / Pierna en 2 días da sesiones focalizadas, pero cada grupo se entrena solo 1×/semana.' },
      4: { days: ['upper', 'lower', 'upper', 'lower'], weekdays: [0, 1, 3, 4], frequency: 1, why: 'Torso / Pierna permite entrenar cada grupo 2×/semana con sesiones más cortas y 72 h entre estímulos del mismo grupo.' },
      6: { days: ['upper', 'lower', 'upper', 'lower', 'upper', 'lower'], weekdays: [0, 1, 2, 3, 4, 5], frequency: 1, why: 'Torso / Pierna alternos 6 días: frecuencia 3×/semana con 48 h entre sesiones del mismo grupo.' },
    },
  },
  ppl: {
    id: 'ppl',
    label: 'Push / Pull / Legs',
    dbType: 'push_pull_legs',
    byDays: {
      3: { days: ['push', 'pull', 'legs'], weekdays: [0, 2, 4], frequency: 0.55, why: 'Push / Pull / Legs en 3 días: sesiones muy focalizadas, pero cada grupo se entrena 1×/semana.' },
      6: { days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], weekdays: [0, 1, 2, 3, 4, 5], frequency: 1, why: 'Push / Pull / Legs dos veces por semana reparte el volumen sin entrenar el mismo grupo en días seguidos.' },
    },
  },
  ul_ppl: {
    id: 'ul_ppl',
    label: 'Torso / Pierna + Push / Pull / Legs',
    dbType: 'specialized',
    byDays: {
      5: { days: ['upper', 'lower', 'push', 'pull', 'legs'], weekdays: [0, 1, 3, 4, 5], frequency: 1, why: 'Combina Torso / Pierna con Empuje / Tracción / Pierna: frecuencia 2×/semana por músculo y variedad de ejercicios.' },
    },
  },
  ul_full: {
    id: 'ul_full',
    label: 'Torso / Pierna + Full Body',
    dbType: 'specialized',
    byDays: {
      3: { days: ['upper', 'lower', 'fbC'], weekdays: [0, 2, 4], frequency: 0.85, why: 'Una sesión de torso, una de pierna y una de cuerpo completo: frecuencia ~2×/semana con sesiones focalizadas.' },
    },
  },
  body_part: {
    id: 'body_part',
    label: 'Por grupos musculares',
    dbType: 'specialized',
    byDays: {
      4: { days: ['chestTri', 'backBi', 'legs', 'shouldersArms'], weekdays: [0, 1, 3, 4], frequency: 0.5, why: 'Rutina dividida por grupos: mucho volumen por sesión y 1×/semana por músculo (los brazos ~2×). Es menos eficiente que repartir el volumen, pero es una opción válida si la prefieres.' },
      5: { days: ['chest', 'back', 'legs', 'shoulders', 'arms'], weekdays: [0, 1, 2, 3, 4], frequency: 0.45, why: 'Clásica división por grupos (un grupo por día). Frecuencia 1×/semana por músculo: menos eficiente que 2×, pero permite mucho volumen por sesión.' },
    },
  },
};

/** The split used when none is requested (keeps the original behaviour). */
export const DEFAULT_SPLIT_BY_DAYS: Record<number, SplitId> = {
  1: 'full_body', 2: 'full_body', 3: 'full_body', 4: 'upper_lower', 5: 'ul_ppl', 6: 'ppl',
};

export function splitsForDays(days: number): SplitId[] {
  return (Object.keys(SPLITS) as SplitId[]).filter((id) => SPLITS[id].byDays[days]);
}
