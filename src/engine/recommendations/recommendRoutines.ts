import type { CatalogExercise, MuscleId } from '@/catalog';

import { generateRoutine, isValidCombo, type GeneratedRoutine, type GeneratorInput } from '../workout-generator/generateRoutine';
import { SPLITS, splitsForDays, type SplitId } from '../workout-generator/splits';
import { STYLE_IDS, STYLES, type StyleId } from '../workout-generator/styles';

import { estimateAdherence, type AdherenceEstimate } from './adherence';

export interface RecommendationContext {
  /** Completed sessions per complete week since the first logged workout (oldest first). */
  weeklyCounts: number[];
  /** Averages of the last 14 days, null when nothing was logged. */
  recovery: {
    recoveryScore: number | null;
    sleepHours: number | null;
    days: number;
  } | null;
}

export interface ScoreComponent {
  key: 'goal' | 'volume' | 'frequency' | 'availability' | 'adherence' | 'experience' | 'recovery' | 'safety';
  label: string;
  weight: number; // sums to 1
  value: number; // 0–1
  detail: string;
}

export interface Recommendation {
  id: string;
  routine: GeneratedRoutine;
  style: StyleId;
  split: SplitId;
  days: number;
  score: number; // 0–100
  components: ScoreComponent[];
  adherence: AdherenceEstimate;
  highlights: string[];
  cautions: string[];
}

const WEIGHTS: Record<ScoreComponent['key'], number> = {
  goal: 0.22,
  volume: 0.18,
  frequency: 0.14,
  availability: 0.14,
  adherence: 0.12,
  experience: 0.1,
  recovery: 0.05,
  safety: 0.05,
};

const MUSCLE_ES: Partial<Record<MuscleId, string>> = {
  pectorals: 'pecho',
  lats: 'dorsal',
  quadriceps: 'cuádriceps',
  hamstrings: 'isquios',
  glutes: 'glúteos',
  deltoids: 'hombros',
  biceps: 'bíceps',
  triceps: 'tríceps',
  calves: 'gemelos',
  traps: 'trapecios',
  abdominals: 'abdominales',
  forearms: 'antebrazos',
};

const pct = (v: number) => `${Math.round(v * 100)} %`;

export function recommendationId(style: StyleId, split: SplitId, days: number) {
  return `${style}:${split}:${days}`;
}

export function parseRecommendationId(id: string): { style: StyleId; split: SplitId; days: number } | null {
  const [style, split, d] = id.split(':');
  const days = Number(d);
  if (!style || !split || !(style in STYLES) || !(split in SPLITS) || !Number.isInteger(days)) return null;
  return { style: style as StyleId, split: split as SplitId, days };
}

export function isPoorRecovery(r: RecommendationContext['recovery']): boolean {
  return !!r && r.days >= 3 && ((r.recoveryScore !== null && r.recoveryScore <= 2.5) || (r.sleepHours !== null && r.sleepHours < 6.5));
}

/**
 * Weights adapt to the situation: when recovery is poor or the user has
 * limitations, those criteria matter more (taken from goal and volume) and the
 * weights still sum to 1.
 */
export function weightsFor(poorRecovery: boolean, hasLimitations: boolean): Record<ScoreComponent['key'], number> {
  const w = { ...WEIGHTS };
  for (const [flag, key] of [
    [poorRecovery, 'recovery'],
    [hasLimitations, 'safety'],
  ] as const) {
    if (!flag) continue;
    w[key] += 0.07;
    w.goal -= 0.04;
    w.volume -= 0.03;
  }
  return w;
}

/** Scores one candidate. Exported so a single proposal can show its breakdown. */
export function scoreRoutine(input: GeneratorInput, routine: GeneratedRoutine, ctx: RecommendationContext): Recommendation {
  const style = STYLES[routine.style];
  const days = routine.daysPerWeek;
  const poor = isPoorRecovery(ctx.recovery);
  const weights = weightsFor(poor, input.limitations.length > 0);
  const c: ScoreComponent[] = [];
  const add = (key: ScoreComponent['key'], label: string, value: number, detail: string) =>
    c.push({
      key,
      label,
      weight: weights[key],
      value: Math.max(0, Math.min(1, value)),
      detail,
    });

  // Goal
  const goalFit = style.goalFit[input.goal];
  add('goal', 'Objetivo', goalFit, `Afinidad del estilo «${style.label}» con tu objetivo: ${pct(goalFit)}.`);

  // Volume coverage (priority muscles weigh double)
  let num = 0;
  let den = 0;
  const short: string[] = [];
  for (const [m, target] of Object.entries(routine.weeklyTargets) as [MuscleId, number][]) {
    if (!target) continue;
    const w = input.priorityMuscles.includes(m) ? 2 : 1;
    const cov = Math.min(1, (routine.weeklyVolume[m] ?? 0) / target);
    if (cov < 0.75) short.push(MUSCLE_ES[m] ?? m);
    num += w * cov;
    den += w;
  }
  const volume = den ? num / den : 1;
  add(
    'volume',
    'Volumen',
    volume,
    short.length
      ? `Cubre ${pct(volume)} del volumen objetivo; corto en ${short.join(', ')}.`
      : `Cubre ${pct(volume)} del volumen semanal objetivo.`,
  );

  // Frequency
  add(
    'frequency',
    'Frecuencia',
    routine.frequencyScore,
    routine.frequencyScore >= 1
      ? 'Cada músculo se entrena 2 o más veces por semana.'
      : routine.frequencyScore >= 0.8
        ? 'La mayoría de músculos se entrena unas 2 veces por semana.'
        : 'La mayoría de músculos se entrena 1 vez por semana.',
  );

  // Availability
  const maxMin = Math.max(...routine.days.map((d) => d.estimatedMinutes));
  const dayFit = days === input.daysPerWeek ? 1 : Math.abs(days - input.daysPerWeek) === 1 ? 0.55 : 0.25;
  const timeFit = maxMin <= input.sessionMinutes ? 1 : 0.5;
  add(
    'availability',
    'Disponibilidad',
    dayFit * timeFit,
    `${days} días (${days === input.daysPerWeek ? 'los que indicaste' : `indicaste ${input.daysPerWeek}`}) y sesiones de hasta ${maxMin} min (tienes ${input.sessionMinutes}).`,
  );

  // Adherence (real probability from history when available)
  const adherence = estimateAdherence(ctx.weeklyCounts, days, input.daysPerWeek);
  add(
    'adherence',
    'Probabilidad de cumplirla',
    adherence.probability,
    adherence.basis === 'history'
      ? `En ${adherence.hits} de tus ${adherence.weeksObserved} semanas registradas hiciste ${days} o más sesiones → ${pct(adherence.probability)} (intervalo 90 %: ${pct(adherence.low)}–${pct(adherence.high)}).`
      : `Sin historial suficiente (${adherence.weeksObserved} semanas): suposición inicial de ${pct(adherence.probability)} según los días que declaraste.`,
  );

  // Experience
  const expFit =
    style.experienceFit[input.experience] * (routine.splitId === 'full_body_hf' && input.experience === 'beginner' ? 0.85 : 1);
  add(
    'experience',
    'Experiencia',
    expFit,
    expFit >= 0.95
      ? 'Adecuada para tu experiencia.'
      : 'Exige más experiencia técnica o de gestión de fatiga de la que indicaste.',
  );

  // Recovery
  const r = ctx.recovery;
  const recovery = poor ? 1 - 0.6 * style.fatigue - 0.05 * Math.max(0, days - 3) : 1;
  add(
    'recovery',
    'Recuperación',
    recovery,
    !r || r.days < 3
      ? 'Sin registros de recuperación recientes: no penaliza.'
      : poor
        ? 'Tu recuperación reciente es baja (sueño o sensación de recuperación): se favorecen planes menos fatigantes y este criterio pesa más.'
        : 'Tu recuperación reciente es buena.',
  );

  // Safety (limitations)
  const safety =
    input.limitations.length === 0
      ? 1
      : style.id === 'joint_friendly'
        ? 1
        : style.id === 'machines'
          ? 0.9
          : style.id === 'strength' || style.id === 'powerbuilding'
            ? 0.55
            : 0.75;
  add(
    'safety',
    'Limitaciones',
    safety,
    input.limitations.length ? 'Con limitaciones declaradas este criterio pesa más: valora cuánto reduce la carga articular.' : 'Sin limitaciones declaradas.',
  );

  let score = c.reduce((a, x) => a + x.weight * x.value, 0);
  // Small nudge for the user's declared preference for machines.
  if (input.preferMachines && (style.id === 'machines' || style.id === 'joint_friendly')) score += 0.03;
  score = Math.round(Math.min(1, score) * 100);

  const best = [...c].sort((a, b) => b.value * b.weight - a.value * a.weight).slice(0, 2);
  const worst = [...c]
    .filter((x) => x.value < 0.7)
    .sort((a, b) => a.value - b.value)
    .slice(0, 2);
  return {
    id: recommendationId(routine.style, routine.splitId, days),
    routine,
    style: routine.style,
    split: routine.splitId,
    days,
    score,
    components: c,
    adherence,
    highlights: [style.summary, ...best.map((x) => x.detail)],
    cautions: [...worst.map((x) => x.detail), ...routine.warnings],
  };
}

/**
 * Enumerates every valid (style × split × days) combination around the user's
 * availability (days − 1 … days + 1), generates each routine deterministically,
 * scores it and returns them best first, without duplicates.
 */
export function recommendRoutines(
  input: GeneratorInput,
  catalog: readonly CatalogExercise[],
  ctx: RecommendationContext,
): Recommendation[] {
  const dayOptions = [input.daysPerWeek - 1, input.daysPerWeek, input.daysPerWeek + 1]
    .filter((d) => d >= 1 && d <= 6)
    .filter((d) => !(input.experience === 'beginner' && d > 4));
  const out: Recommendation[] = [];
  const seen = new Map<string, number>();
  for (const days of dayOptions) {
    for (const split of splitsForDays(days)) {
      if (!isValidCombo(split, days)) continue;
      for (const style of STYLE_IDS) {
        if (STYLES[style].requiresPriority && input.priorityMuscles.length === 0) continue;
        const routine = generateRoutine(input, catalog, { style, split, days });
        // Identical plans (same exercises, volume, ranges, rests and techniques) are shown once.
        const signature = routine.days
          .map((d) =>
            d.exercises.map((e) => `${e.slug}${e.sets}x${e.repMin}-${e.repMax}r${e.restSeconds}${e.note ? '*' : ''}`).join(','),
          )
          .join('|');
        const rec = scoreRoutine(input, routine, ctx);
        const prev = seen.get(signature);
        if (prev !== undefined) {
          if (out[prev]!.score < rec.score) out[prev] = rec;
          continue;
        }
        seen.set(signature, out.length);
        out.push(rec);
      }
    }
  }
  return out.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.days === input.daysPerWeek) - Number(a.days === input.daysPerWeek) ||
      a.id.localeCompare(b.id),
  );
}
