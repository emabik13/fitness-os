import type { Equipment } from '@/domain/profile';

import { sessionScore, type PerformedSet } from '../strength/oneRm';

/**
 * Double progression: keep the load until every working set reaches the top
 * of the rep range at the planned effort (RIR), then suggest a small load
 * increase and start again from the bottom of the range.
 * The engine only SUGGESTS; it never changes the user's weights.
 */
export interface Prescription {
  sets: number;
  repMin: number;
  repMax: number;
  targetRir: number | null;
}

export interface SessionPerformance {
  date: string;
  sets: PerformedSet[]; // completed working sets only
}

export type ProgressionAction = 'no_data' | 'increase_load' | 'add_reps' | 'hold';
export type PerformanceTrend = 'insufficient' | 'progress' | 'normal_variation' | 'stagnation' | 'regression';

export interface ProgressionAdvice {
  action: ProgressionAction;
  trend: PerformanceTrend;
  currentWeightKg: number | null;
  suggestedWeightKg: number | null;
  targetReps: string;
  headline: string;
  detail: string;
}

/** Smallest sensible load jump per equipment (dumbbells: per dumbbell). */
export function loadIncrement(equipment: Equipment): number {
  switch (equipment) {
    case 'barbell':
    case 'smith_machine':
      return 2.5;
    case 'dumbbell':
      return 2;
    case 'leg_press':
      return 5;
    case 'machine':
    case 'cable':
      return 2.5;
    default:
      return 0; // bodyweight: progress with reps
  }
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

export function classifyTrend(sessions: readonly SessionPerformance[]): PerformanceTrend {
  const scores = sessions.map((s) => sessionScore(s.sets)?.value).filter((v): v is number => v !== undefined);
  if (scores.length < 2) return 'insufficient';
  const last = scores[scores.length - 1]!;
  const prev = scores.slice(-4, -1);
  const prevBest = Math.max(...prev);
  const change = (last - prevBest) / prevBest;

  if (scores.length >= 3) {
    const beforeLast = scores[scores.length - 2]!;
    const priorBest = Math.max(...scores.slice(-5, -2));
    // Two consecutive sessions clearly below the previous best → regression.
    if (change <= -0.05 && (beforeLast - priorBest) / priorBest <= -0.05) return 'regression';
  }
  if (change >= 0.01) return 'progress';
  if (scores.length >= 4) {
    const recent = scores.slice(-3);
    const earlier = scores.slice(0, -3);
    if (Math.max(...recent) <= Math.max(...earlier)) return 'stagnation';
  }
  return 'normal_variation';
}

export function adviseNextSession(
  rx: Prescription,
  sessions: readonly SessionPerformance[],
  equipment: Equipment,
): ProgressionAdvice {
  const trend = classifyTrend(sessions);
  const last = sessions[sessions.length - 1];
  const range = `${rx.repMin}–${rx.repMax}`;
  if (!last || last.sets.length === 0) {
    return {
      action: 'no_data',
      trend,
      currentWeightKg: null,
      suggestedWeightKg: null,
      targetReps: range,
      headline: 'Primera sesión',
      detail: `Elige un peso que te permita ${range} repeticiones${rx.targetRir !== null ? ` dejando unas ${rx.targetRir} en reserva` : ''} con buena técnica.`,
    };
  }

  const topWeight = Math.max(...last.sets.map((s) => s.weightKg ?? 0));
  const atTop = last.sets.filter((s) => (s.weightKg ?? 0) === topWeight);
  const allAtMax = atTop.length >= rx.sets && atTop.every((s) => (s.reps ?? 0) >= rx.repMax);
  const rirs = atTop.map((s) => s.rir).filter((r): r is number => r !== null && r !== undefined);
  const effortOk = rx.targetRir === null || rirs.length === 0 || Math.min(...rirs) >= rx.targetRir - 1;
  const inc = loadIncrement(equipment);

  let advice: ProgressionAdvice;
  if (allAtMax && effortOk && inc > 0) {
    const next = Math.round((topWeight + inc) * 100) / 100;
    advice = {
      action: 'increase_load',
      trend,
      currentWeightKg: topWeight,
      suggestedWeightKg: next,
      targetReps: `${rx.repMin}+`,
      headline: `Listo para subir a ${fmt(next)} kg`,
      detail: `Completaste ${atTop.length} series en el máximo del rango (${rx.repMax}) con ${fmt(topWeight)} kg${rirs.length ? ' y el esfuerzo previsto' : ''}. Prueba ${fmt(next)} kg y vuelve a empezar desde ${rx.repMin} repeticiones. La sugerencia no se aplica sola.`,
    };
  } else if (allAtMax && effortOk) {
    advice = {
      action: 'add_reps',
      trend,
      currentWeightKg: topWeight || null,
      suggestedWeightKg: topWeight || null,
      targetReps: `${rx.repMax}+`,
      headline: 'Progresa con repeticiones o dificultad',
      detail: 'Ejercicio con peso corporal: añade repeticiones, una serie, o pasa a una variante más exigente.',
    };
  } else if (allAtMax && !effortOk) {
    advice = {
      action: 'hold',
      trend,
      currentWeightKg: topWeight,
      suggestedWeightKg: topWeight,
      targetReps: `${rx.repMax}`,
      headline: `Mantén ${fmt(topWeight)} kg`,
      detail: `Llegaste al máximo del rango pero con menos reserva de la prevista (RIR ${rx.targetRir}). Repite el peso hasta completarlo con el esfuerzo planificado y técnica sólida.`,
    };
  } else {
    const below = atTop.filter((s) => (s.reps ?? 0) < rx.repMax).length + Math.max(0, rx.sets - atTop.length);
    advice = {
      action: 'add_reps',
      trend,
      currentWeightKg: topWeight || null,
      suggestedWeightKg: topWeight || null,
      targetReps: range,
      headline: topWeight ? `Mantén ${fmt(topWeight)} kg y suma repeticiones` : 'Suma repeticiones',
      detail: `Intenta añadir 1 repetición en ${below === 1 ? 'la serie' : `las ${below} series`} por debajo de ${rx.repMax}. Cuando todas lleguen a ${rx.repMax}, subirás el peso.`,
    };
  }

  if (trend === 'stagnation') {
    advice.detail +=
      ' Llevas varias sesiones sin superar tu mejor marca: revisa sueño, recuperación y alimentación, y valora reducir ligeramente el volumen una semana o cambiar a una variante.';
  } else if (trend === 'regression') {
    advice.detail +=
      ' Tu rendimiento ha bajado dos sesiones seguidas: puede indicar fatiga acumulada. Considera una semana de descarga (menos series y peso) antes de volver a progresar.';
  } else if (trend === 'normal_variation' && sessions.length >= 2) {
    advice.detail += ' Las variaciones pequeñas entre sesiones son normales.';
  }
  return advice;
}
