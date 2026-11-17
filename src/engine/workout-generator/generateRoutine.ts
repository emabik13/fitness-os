import type { CatalogExercise, MuscleId, Pattern } from '@/catalog';
import { LOAD_TAGS, MUSCLE_IDS } from '@/catalog';
import type { Equipment, Experience, Goal, LiftLevel, LiftPattern, LimitationArea } from '@/domain/profile';

import { addVolume, MAX_WEEKLY_SETS } from '../volume-calculator/volume';

export const ENGINE_VERSION = 'gen-1.0';

export interface GeneratorInput {
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment[];
  priorityMuscles: string[];
  limitations: LimitationArea[];
  liftExperience: Partial<Record<LiftPattern, LiftLevel>>;
  preferMachines: boolean;
  includeCore: boolean;
}

export type SplitType = 'full_body' | 'upper_lower' | 'push_pull_legs' | 'specialized';

export interface PlannedExercise {
  slug: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  targetRir: number;
  role: 'main' | 'compound' | 'isolation';
}

export interface PlannedDay {
  name: string;
  focus: string;
  suggestedWeekday: number; // 0 = Monday
  estimatedMinutes: number;
  exercises: PlannedExercise[];
}

export interface GeneratedRoutine {
  name: string;
  goal: Goal;
  splitType: SplitType;
  splitLabel: string;
  daysPerWeek: number;
  days: PlannedDay[];
  weeklyVolume: Partial<Record<MuscleId, number>>;
  rationale: string[];
  warnings: string[];
  engineVersion: string;
}

interface Slot {
  patterns: Pattern[];
  kind: 'compound' | 'isolation' | 'any';
  /** Lower = more important. Optional slots are dropped first when time is short. */
  weight: number;
  core?: boolean;
}

const s = (patterns: Pattern[], kind: Slot['kind'], weight: number, core = false): Slot => ({ patterns, kind, weight, core });

const TEMPLATES: Record<string, { name: string; focus: string; slots: Slot[] }> = {
  fbA: {
    name: 'Full Body A',
    focus: 'Cuerpo completo · énfasis sentadilla',
    slots: [s(['squat'], 'compound', 0), s(['horizontal_push'], 'compound', 1), s(['vertical_pull', 'horizontal_pull'], 'compound', 1), s(['knee_flexion', 'hinge'], 'any', 3), s(['shoulder_abduction'], 'isolation', 4), s(['elbow_flexion'], 'isolation', 5), s(['core_flexion', 'core_anti_extension'], 'isolation', 6, true)],
  },
  fbB: {
    name: 'Full Body B',
    focus: 'Cuerpo completo · énfasis bisagra',
    slots: [s(['hinge'], 'compound', 0), s(['vertical_push', 'horizontal_push'], 'compound', 1), s(['horizontal_pull'], 'compound', 1), s(['lunge', 'squat'], 'compound', 3), s(['rear_delt'], 'any', 4), s(['elbow_extension'], 'isolation', 5), s(['calf_raise'], 'isolation', 6)],
  },
  fbC: {
    name: 'Full Body C',
    focus: 'Cuerpo completo · énfasis empuje',
    slots: [s(['horizontal_push'], 'compound', 0), s(['squat', 'lunge'], 'compound', 1), s(['vertical_pull'], 'compound', 1), s(['hip_extension', 'hinge'], 'any', 3), s(['shoulder_abduction'], 'isolation', 4), s(['elbow_extension', 'elbow_flexion'], 'isolation', 5), s(['core_flexion', 'core_anti_extension'], 'isolation', 6, true)],
  },
  upper: {
    name: 'Torso',
    focus: 'Pecho, espalda, hombros y brazos',
    slots: [s(['horizontal_push'], 'compound', 0), s(['horizontal_pull'], 'compound', 0), s(['vertical_push'], 'compound', 2), s(['vertical_pull'], 'compound', 1), s(['chest_fly', 'horizontal_push'], 'any', 5), s(['shoulder_abduction'], 'isolation', 3), s(['elbow_flexion'], 'isolation', 4), s(['elbow_extension'], 'isolation', 4), s(['rear_delt'], 'any', 6)],
  },
  lower: {
    name: 'Pierna',
    focus: 'Cuádriceps, isquiotibiales, glúteos y gemelos',
    slots: [s(['squat'], 'compound', 0), s(['hinge'], 'compound', 0), s(['lunge', 'squat'], 'compound', 3), s(['knee_flexion'], 'isolation', 2), s(['knee_extension', 'hip_extension'], 'any', 4), s(['calf_raise'], 'isolation', 5), s(['core_flexion', 'core_anti_extension'], 'isolation', 6, true)],
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
    slots: [s(['squat'], 'compound', 0), s(['hinge'], 'compound', 0), s(['squat', 'lunge'], 'compound', 3), s(['knee_extension'], 'isolation', 4), s(['knee_flexion'], 'isolation', 2), s(['calf_raise'], 'isolation', 5), s(['core_flexion', 'core_anti_extension'], 'isolation', 6, true)],
  },
};

const PLANS: Record<number, { split: SplitType; label: string; days: string[]; weekdays: number[] }> = {
  1: { split: 'full_body', label: 'Full Body', days: ['fbA'], weekdays: [0] },
  2: { split: 'full_body', label: 'Full Body', days: ['fbA', 'fbB'], weekdays: [0, 3] },
  3: { split: 'full_body', label: 'Full Body', days: ['fbA', 'fbB', 'fbC'], weekdays: [0, 2, 4] },
  4: { split: 'upper_lower', label: 'Torso / Pierna', days: ['upper', 'lower', 'upper', 'lower'], weekdays: [0, 1, 3, 4] },
  5: { split: 'specialized', label: 'Torso / Pierna + Empuje / Tracción / Pierna', days: ['upper', 'lower', 'push', 'pull', 'legs'], weekdays: [0, 1, 3, 4, 5] },
  6: { split: 'push_pull_legs', label: 'Push / Pull / Legs', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'], weekdays: [0, 1, 2, 3, 4, 5] },
};

const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const BASIC_LIFT: Record<string, LiftPattern> = {
  'sentadilla-barra': 'squat',
  'peso-muerto': 'hinge',
  'press-banca-barra': 'bench',
  'press-militar-barra': 'overhead_press',
  'remo-barra': 'row',
  dominadas: 'pullup',
};

const DIFFICULTY_RANK = { beginner: 0, intermediate: 1, advanced: 2 } as const;

/** Weekly effective-set targets for the main muscles. */
function weeklyTargets(input: GeneratorInput): Partial<Record<MuscleId, number>> {
  const base = { beginner: 10, intermediate: 12, advanced: 14 }[input.experience];
  const small = { beginner: 6, intermediate: 8, advanced: 10 }[input.experience];
  const mult = { maintenance: 0.6, fat_loss: 0.85, strength: 0.85, hypertrophy: 1, recomposition: 1 }[input.goal];
  const t: Partial<Record<MuscleId, number>> = {
    pectorals: base, lats: base, quadriceps: base, hamstrings: base * 0.8, glutes: base * 0.8, deltoids: base * 0.8,
    biceps: small, triceps: small, calves: small * 0.8,
  };
  for (const k of Object.keys(t) as MuscleId[]) {
    let v = t[k]! * mult;
    if (input.priorityMuscles.includes(k)) v *= 1.3;
    t[k] = Math.min(MAX_WEEKLY_SETS, Math.round(v));
  }
  for (const p of input.priorityMuscles) {
    if ((MUSCLE_IDS as readonly string[]).includes(p) && t[p as MuscleId] === undefined) t[p as MuscleId] = Math.round(small * mult * 1.3);
  }
  return t;
}

function prescription(input: GeneratorInput, role: PlannedExercise['role'], ex: CatalogExercise) {
  const rirComp = { beginner: 3, intermediate: 2, advanced: 2 }[input.experience];
  const rirIso = { beginner: 2, intermediate: 1, advanced: 1 }[input.experience];
  if (ex.pattern === 'core_anti_extension') return { repMin: 20, repMax: 45, restSeconds: 60, targetRir: rirIso, sets: 2 };
  if (input.goal === 'strength') {
    if (role === 'main') return { repMin: 4, repMax: 6, restSeconds: 180, targetRir: rirComp, sets: 4 };
    if (role === 'compound') return { repMin: 6, repMax: 8, restSeconds: 150, targetRir: rirComp, sets: 3 };
    return { repMin: 8, repMax: 12, restSeconds: 90, targetRir: rirIso, sets: 2 };
  }
  const shortRest = input.goal === 'fat_loss';
  if (role === 'main') return { repMin: 6, repMax: 10, restSeconds: shortRest ? 120 : 150, targetRir: rirComp, sets: 3 };
  if (role === 'compound') return { repMin: 8, repMax: 12, restSeconds: shortRest ? 90 : 120, targetRir: rirComp, sets: 3 };
  return { repMin: 10, repMax: 15, restSeconds: shortRest ? 60 : 75, targetRir: rirIso, sets: 2 };
}

export function estimateMinutes(exercises: readonly Pick<PlannedExercise, 'sets' | 'restSeconds'>[]): number {
  const work = exercises.reduce((a, e) => a + (e.sets * (40 + e.restSeconds)) / 60 + 1, 0);
  return Math.round(5 + work); // 5 min of specific warm-up
}

export function generateRoutine(input: GeneratorInput, catalog: readonly CatalogExercise[]): GeneratedRoutine {
  const warnings: string[] = [];
  const rationale: string[] = [];
  let days = Math.min(Math.max(input.daysPerWeek, 1), 6);
  if (input.daysPerWeek === 7) warnings.push('Se planifican 6 días como máximo para garantizar al menos un día completo de descanso.');
  if (input.experience === 'beginner' && days > 4) {
    warnings.push(`Con menos de un año de experiencia, 4 sesiones semanales bien recuperadas suelen ser más productivas que ${days}. Se planifican 4.`);
    days = 4;
  }
  const plan = PLANS[days]!;
  const available = new Set<Equipment>([...input.equipment, 'bodyweight']);
  const excludedTags = new Set<string>(input.limitations.map((l) => LOAD_TAGS[l]));
  const maxDiff = DIFFICULTY_RANK[input.experience];

  const eligible = catalog.filter(
    (e) =>
      available.has(e.equipment) &&
      (e.requires ?? []).every((r) => available.has(r)) &&
      DIFFICULTY_RANK[e.difficulty] <= maxDiff &&
      !e.tags.some((t) => excludedTags.has(t)),
  );

  const usedInWeek = new Map<string, number>();
  const templateCount = new Map<string, number>();

  const pick = (slot: Slot, usedToday: Set<string>, occurrence: number): CatalogExercise | null => {
    const scored: { e: CatalogExercise; score: number }[] = [];
    slot.patterns.forEach((p, pi) => {
      for (const e of eligible) {
        if (e.pattern !== p || usedToday.has(e.slug)) continue;
        if (slot.kind !== 'any' && e.movementType !== slot.kind && !(slot.kind === 'compound' && p === 'rear_delt')) continue;
        let score = pi * 10;
        const machineLike = ['machine', 'cable', 'smith_machine', 'leg_press'].includes(e.equipment);
        if (input.preferMachines && machineLike) score -= 3;
        if (!input.preferMachines && input.goal === 'strength' && e.movementType === 'compound' && e.equipment === 'barbell') score -= 3;
        if (input.experience === 'beginner' && e.difficulty !== 'beginner') score += 2;
        const lift = BASIC_LIFT[e.slug];
        if (lift && (input.liftExperience[lift] ?? 'none') === 'none') score += 4;
        if (lift && input.liftExperience[lift] === 'confident') score -= 2;
        scored.push({ e, score });
      }
    });
    scored.sort((a, b) => a.score - b.score || a.e.slug.localeCompare(b.e.slug));
    if (scored.length === 0) return null;
    // Repeated templates (e.g. Torso A / Torso B) rotate through the best options.
    const top = scored.filter((x) => x.score <= scored[0]!.score + 3);
    return top[occurrence % top.length]!.e;
  };

  const plannedDays: PlannedDay[] = plan.days.map((key, i) => {
    const tpl = TEMPLATES[key]!;
    const occ = templateCount.get(key) ?? 0;
    templateCount.set(key, occ + 1);
    const usedToday = new Set<string>();
    const exercises: (PlannedExercise & { weight: number })[] = [];
    let mainAssigned = false;
    for (const slot of tpl.slots) {
      if (slot.core && !input.includeCore) continue;
      const ex = pick(slot, usedToday, occ);
      if (!ex) continue;
      usedToday.add(ex.slug);
      usedInWeek.set(ex.slug, (usedInWeek.get(ex.slug) ?? 0) + 1);
      const role: PlannedExercise['role'] = ex.movementType === 'compound' ? (mainAssigned ? 'compound' : 'main') : 'isolation';
      if (role === 'main') mainAssigned = true;
      const rx = prescription(input, role, ex);
      exercises.push({ slug: ex.slug, name: ex.name, role, weight: slot.weight, ...rx });
    }
    const repeated = plan.days.filter((d) => d === key).length > 1;
    return {
      name: repeated ? `${tpl.name} ${String.fromCharCode(65 + occ)}` : tpl.name,
      focus: tpl.focus,
      suggestedWeekday: plan.weekdays[i]!,
      estimatedMinutes: 0,
      exercises,
    };
  });

  const bySlug = new Map(catalog.map((e) => [e.slug, e]));
  const volume = () => {
    const v: Partial<Record<MuscleId, number>> = {};
    for (const d of plannedDays) for (const e of d.exercises) addVolume(v, bySlug.get(e.slug)!.muscles, e.sets);
    return v;
  };
  /** Direct (agonist) sets per muscle — the quantity the weekly cap applies to. */
  const directVolume = () => {
    const v: Partial<Record<MuscleId, number>> = {};
    for (const d of plannedDays)
      for (const e of d.exercises)
        for (const m of bySlug.get(e.slug)!.muscles) if (m.role === 'agonist') v[m.id] = (v[m.id] ?? 0) + e.sets;
    return v;
  };
  const dayMinutes = (d: PlannedDay) => estimateMinutes(d.exercises);

  // 1) Fit each session into the available time.
  for (const d of plannedDays) {
    const ex = d.exercises as (PlannedExercise & { weight: number })[];
    while (dayMinutes(d) > input.sessionMinutes) {
      const iso = ex.filter((e) => e.sets > 2).sort((a, b) => b.weight - a.weight)[0];
      if (iso && iso.role !== 'main') {
        iso.sets -= 1;
        continue;
      }
      if (ex.length > 3) {
        const drop = [...ex].sort((a, b) => b.weight - a.weight)[0]!;
        ex.splice(ex.indexOf(drop), 1);
        continue;
      }
      const any = ex.find((e) => e.sets > 2);
      if (any) any.sets -= 1;
      else break;
    }
  }

  const hits = (slug: string, m: MuscleId, roles: string[] = ['agonist']) =>
    bySlug.get(slug)!.muscles.some((x) => x.id === m && roles.includes(x.role));
  /** Adds one set if it keeps the session within time and every muscle within the weekly cap. */
  const tryAddSet = (d: PlannedDay, e: PlannedExercise): boolean => {
    if (e.sets >= 4) return false;
    e.sets += 1;
    const v = directVolume();
    const overCap = bySlug.get(e.slug)!.muscles.some((x) => x.role === 'agonist' && (v[x.id] ?? 0) > MAX_WEEKLY_SETS);
    if (dayMinutes(d) > input.sessionMinutes || overCap) {
      e.sets -= 1;
      return false;
    }
    return true;
  };

  /** Hard cap on direct sets: trims isolation first, never another muscle's main lifts. */
  const enforceCap = () => {
    for (const m of MUSCLE_IDS) {
      for (let guard = 0; guard < 40 && (directVolume()[m] ?? 0) > MAX_WEEKLY_SETS; guard++) {
        const all = plannedDays.flatMap((d) => d.exercises);
        const cand = all
          .filter((e) => e.sets > 2 && hits(e.slug, m))
          .sort((a, b) => Number(a.role !== 'isolation') - Number(b.role !== 'isolation') || b.sets - a.sets)[0];
        if (cand) {
          cand.sets -= 1;
          continue;
        }
        const day = plannedDays.find((d) => d.exercises.length > 3 && d.exercises.some((e) => e.role === 'isolation' && hits(e.slug, m)));
        if (!day) break;
        const idx = day.exercises.findIndex((e) => e.role === 'isolation' && hits(e.slug, m));
        day.exercises.splice(idx, 1);
      }
    }
  };

  enforceCap();

  // 2) Priority muscles: one extra direct set on each exercise where they are agonists.
  for (const m of input.priorityMuscles as MuscleId[]) {
    for (const d of plannedDays) for (const e of d.exercises) if (hits(e.slug, m)) tryAddSet(d, e);
  }

  const targets = weeklyTargets(input);
  type Working = PlannedExercise & { weight: number };
  /**
   * Frees time in a day for an under-target muscle by trimming the least
   * important accessory whose own agonists already meet their target.
   */
  const freeTime = (d: PlannedDay, forMuscle: MuscleId): boolean => {
    const v = volume();
    const ex = d.exercises as Working[];
    const cand = ex
      .filter(
        (e) =>
          e.role !== 'main' &&
          !hits(e.slug, forMuscle) &&
          bySlug.get(e.slug)!.muscles.filter((m) => m.role === 'agonist').every((m) => (v[m.id] ?? 0) >= (targets[m.id] ?? 0)),
      )
      .sort((a, b) => b.weight - a.weight)[0];
    if (!cand) return false;
    if (cand.sets > 2) cand.sets -= 1;
    else if (ex.length > 4) ex.splice(ex.indexOf(cand), 1);
    else return false;
    return true;
  };

  // 3) Raise volume for muscles below target while time and caps allow.
  const order = (Object.keys(targets) as MuscleId[]).sort(
    (a, b) => Number(input.priorityMuscles.includes(b)) - Number(input.priorityMuscles.includes(a)),
  );
  for (let guard = 0; guard < 60; guard++) {
    let changed = false;
    for (const m of order) {
      if ((volume()[m] ?? 0) >= targets[m]!) continue;
      for (const d of plannedDays) {
        const cand = d.exercises.find((e) => e.sets < 4 && hits(e.slug, m));
        if (!cand) continue;
        if (tryAddSet(d, cand) || (freeTime(d, m) && tryAddSet(d, cand))) {
          changed = true;
          break;
        }
      }
    }
    if (!changed) break;
  }

  enforceCap();

  for (const d of plannedDays) {
    d.exercises = (d.exercises as Working[]).map(({ weight: _w, ...e }) => e);
    d.estimatedMinutes = dayMinutes(d);
  }
  const weeklyVolume = volume();
  const MUSCLE_ES: Partial<Record<MuscleId, string>> = {
    pectorals: 'pecho', lats: 'dorsal', quadriceps: 'cuádriceps', hamstrings: 'isquiotibiales', glutes: 'glúteos',
    deltoids: 'hombros', biceps: 'bíceps', triceps: 'tríceps', calves: 'gemelos', traps: 'trapecios', abdominals: 'abdominales', forearms: 'antebrazos',
  };
  const short = (Object.keys(targets) as MuscleId[]).filter((m) => (weeklyVolume[m] ?? 0) < targets[m]! - 1.5);
  if (short.length) {
    warnings.push(
      `Con ${input.sessionMinutes} min por sesión no se alcanza el volumen objetivo de: ${short
        .map((m) => `${MUSCLE_ES[m]} (${Math.round(weeklyVolume[m] ?? 0)}/${targets[m]} series)`)
        .join(', ')}. Es un volumen válido para progresar; si quieres más, aumenta la duración de la sesión o añade un día.`,
    );
  }

  // Rationale
  const goalText = {
    recomposition: 'recomposición corporal (ganar músculo mientras se reduce grasa), que prioriza un estímulo de hipertrofia suficiente con volumen moderado',
    hypertrophy: 'hipertrofia, con volumen moderado-alto y rangos de 6–15 repeticiones',
    strength: 'fuerza, con un ejercicio principal pesado (4–6 repeticiones) y descansos largos',
    fat_loss: 'pérdida de grasa conservando músculo: se mantiene la intensidad y se acortan algo los descansos',
    maintenance: 'mantenimiento, con aproximadamente el 60 % del volumen habitual',
  }[input.goal];
  const splitWhy: Record<number, string> = {
    1: 'Con 1 día por semana, un Full Body es la única forma de estimular todos los grupos; la frecuencia (1×/semana) limita el progreso, así que conviene añadir un segundo día cuando sea posible.',
    2: 'Con 2 días, dos Full Body permiten entrenar cada grupo muscular 2 veces por semana, la frecuencia que la evidencia asocia con mejores resultados para un mismo volumen.',
    3: 'Con 3 días, tres Full Body alternos (A/B/C) dan frecuencia 2–3×/semana por músculo con días de descanso intercalados.',
    4: 'Con 4 días, Torso / Pierna permite entrenar cada grupo 2×/semana con sesiones más cortas y 72 h entre estímulos del mismo grupo.',
    5: 'Con 5 días, se combina Torso / Pierna con Empuje / Tracción / Pierna: frecuencia 2×/semana por músculo y variedad de ejercicios.',
    6: 'Con 6 días, Push / Pull / Legs dos veces por semana reparte el volumen en sesiones focalizadas sin entrenar el mismo grupo en días seguidos.',
  };
  rationale.push(`División elegida: ${plan.label}. ${splitWhy[days]}`);
  rationale.push(`Objetivo: ${goalText}.`);
  rationale.push(
    `Calendario sugerido: ${plan.weekdays.map((w) => WEEKDAY_NAMES[w]).join(', ')}. Se deja al menos un día entre sesiones que cargan los mismos músculos principales.`,
  );
  const vol = (Object.keys(targets) as MuscleId[])
    .map((m) => `${m === 'pectorals' ? 'pecho' : m === 'lats' ? 'dorsal' : m === 'quadriceps' ? 'cuádriceps' : m === 'hamstrings' ? 'isquios' : m === 'glutes' ? 'glúteos' : m === 'deltoids' ? 'hombros' : m === 'biceps' ? 'bíceps' : m === 'triceps' ? 'tríceps' : m === 'calves' ? 'gemelos' : m} ${Math.round(weeklyVolume[m] ?? 0)}`)
    .join(', ');
  rationale.push(
    `Volumen semanal efectivo (series; los sinergistas cuentan 0,5): ${vol}. Ningún grupo supera ${MAX_WEEKLY_SETS} series directas semanales para evitar volúmenes excesivos.`,
  );
  rationale.push(
    `Esfuerzo: ejercicios multiarticulares a RIR ${{ beginner: 3, intermediate: 2, advanced: 2 }[input.experience]} y monoarticulares a RIR ${{ beginner: 2, intermediate: 1, advanced: 1 }[input.experience]}. Progresión doble: sube el peso solo cuando completes todas las series en el máximo del rango.`,
  );
  rationale.push(`Duración estimada por sesión: ${Math.min(...plannedDays.map((d) => d.estimatedMinutes))}–${Math.max(...plannedDays.map((d) => d.estimatedMinutes))} min (incluye 5 min de calentamiento específico).`);
  if (input.priorityMuscles.length) rationale.push('Los grupos prioritarios reciben ~30 % más volumen.');
  if (input.limitations.length)
    rationale.push('Se han excluido ejercicios que cargan mucho las zonas indicadas en tus limitaciones. Esto no sustituye la valoración de un profesional sanitario.');

  return {
    name: `${plan.label} · ${days} días`,
    goal: input.goal,
    splitType: plan.split,
    splitLabel: plan.label,
    daysPerWeek: days,
    days: plannedDays,
    weeklyVolume,
    rationale,
    warnings,
    engineVersion: ENGINE_VERSION,
  };
}
