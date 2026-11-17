import type { MuscleId } from '@/catalog';

import type { PerformanceTrend } from '../progression/doubleProgression';
import { estimateAdherence, type AdherenceEstimate } from '../recommendations/adherence';

export interface ExerciseTrend {
  exerciseId: string;
  name: string;
  sessions: number;
  trend: PerformanceTrend;
  firstE1rm: number | null;
  lastE1rm: number | null;
  substitutes: { id: string; name: string }[];
}

export interface AnalyticsInput {
  weeklyCounts: number[];
  plannedDays: number;
  /** Direct (agonist) sets per muscle over the analysed window. */
  directSets: Partial<Record<MuscleId, number>>;
  /** Weeks covered by `directSets` (≥ 1). */
  windowWeeks: number;
  exercises: ExerciseTrend[];
  recovery: { recoveryScore: number | null; sleepHours: number | null; days: number } | null;
}

export type InsightAction =
  | { kind: 'exercise'; id: string; label: string }
  | { kind: 'exerciseStats'; id: string; label: string }
  | { kind: 'muscle'; id: MuscleId; label: string }
  | { kind: 'explore'; label: string }
  | { kind: 'recovery'; label: string };

export interface Insight {
  id: string;
  tone: 'positive' | 'info' | 'warning';
  title: string;
  detail: string;
  actions: InsightAction[];
}

export interface AnalyticsReport {
  insights: Insight[];
  adherenceCurve: AdherenceEstimate[]; // P(≥ n sessions/week), n = 1..6
  meanSessions: number | null;
  weeklyDirect: Partial<Record<MuscleId, number>>;
}

const MAIN: MuscleId[] = ['pectorals', 'lats', 'quadriceps', 'hamstrings', 'glutes', 'deltoids'];
const ES: Record<MuscleId, string> = {
  pectorals: 'pecho', lats: 'dorsal', traps: 'trapecios', deltoids: 'hombros', biceps: 'bíceps', triceps: 'tríceps',
  forearms: 'antebrazos', abdominals: 'abdominales', quadriceps: 'cuádriceps', hamstrings: 'isquiotibiales', glutes: 'glúteos', calves: 'gemelos',
};
const f1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

/**
 * Turns the user's own data into explicit, explainable observations.
 * Thresholds (documented in each message):
 *  - ~6–10 direct sets/week is a commonly cited minimum effective dose for
 *    hypertrophy in trained people; > 20 is the app's upper cap.
 *  - Pull volume at least similar to push volume is a common balance guideline.
 *  - Hamstrings below half the quadriceps volume is flagged as imbalance.
 */
export function analyze(i: AnalyticsInput): AnalyticsReport {
  const insights: Insight[] = [];
  const weeks = i.weeklyCounts.length;
  const meanSessions = weeks ? i.weeklyCounts.reduce((a, b) => a + b, 0) / weeks : null;
  const adherenceCurve = [1, 2, 3, 4, 5, 6].map((n) => estimateAdherence(i.weeklyCounts, n, i.plannedDays));

  if (weeks < 3) {
    insights.push({
      id: 'need-data',
      tone: 'info',
      title: 'Aún hay pocos datos',
      detail: `Llevas ${weeks} ${weeks === 1 ? 'semana completa' : 'semanas completas'} registradas. Con 3 o más el análisis de constancia y progreso será fiable.`,
      actions: [],
    });
  } else if (meanSessions !== null) {
    const planned = adherenceCurve[i.plannedDays - 1]!;
    if (meanSessions >= i.plannedDays * 0.9) {
      insights.push({
        id: 'adherence-good',
        tone: 'positive',
        title: 'Constancia sólida',
        detail: `Haces de media ${f1(meanSessions)} sesiones/semana para ${i.plannedDays} planificadas. Probabilidad estimada de cumplir tu plan una semana cualquiera: ${Math.round(planned.probability * 100)} %.`,
        actions: [],
      });
    } else if (meanSessions < i.plannedDays * 0.75) {
      const realistic = Math.max(1, Math.round(meanSessions));
      insights.push({
        id: 'adherence-low',
        tone: 'warning',
        title: 'Planificas más días de los que entrenas',
        detail: `Media de ${f1(meanSessions)} sesiones/semana frente a ${i.plannedDays} planificadas (probabilidad de cumplir el plan: ${Math.round(planned.probability * 100)} %). Una rutina de ${realistic} ${realistic === 1 ? 'día' : 'días'} bien diseñada repartirá mejor el volumen que un plan que se queda a medias.`,
        actions: [{ kind: 'explore', label: `Ver rutinas de ${realistic} días` }],
      });
    }
  }

  const perWeek = (m: MuscleId) => (i.directSets[m] ?? 0) / Math.max(1, i.windowWeeks);
  const weeklyDirect: Partial<Record<MuscleId, number>> = {};
  for (const m of Object.keys(i.directSets) as MuscleId[]) weeklyDirect[m] = perWeek(m);
  const anyTraining = Object.values(i.directSets).some((v) => (v ?? 0) > 0);

  if (anyTraining) {
    const push = perWeek('pectorals');
    const pull = perWeek('lats');
    if (push >= 4 && pull < push * 0.75) {
      insights.push({
        id: 'push-pull',
        tone: 'warning',
        title: 'Más empuje que tracción',
        detail: `${f1(push)} series directas/semana de pecho frente a ${f1(pull)} de dorsal. Suele recomendarse un volumen de tracción al menos similar al de empuje para el equilibrio de los hombros.`,
        actions: [{ kind: 'muscle', id: 'lats', label: 'Ejercicios de dorsal' }],
      });
    }
    const q = perWeek('quadriceps');
    const h = perWeek('hamstrings');
    if (q >= 4 && h < q * 0.5) {
      insights.push({
        id: 'quad-ham',
        tone: 'warning',
        title: 'Isquiotibiales poco trabajados',
        detail: `${f1(h)} series directas/semana de isquiotibiales frente a ${f1(q)} de cuádriceps. Añadir curl femoral o peso muerto rumano equilibra el muslo.`,
        actions: [{ kind: 'muscle', id: 'hamstrings', label: 'Ejercicios de isquiotibiales' }],
      });
    }
    const low = MAIN.filter((m) => perWeek(m) < 6);
    if (low.length) {
      insights.push({
        id: 'low-volume',
        tone: 'info',
        title: 'Volumen bajo en algunos músculos',
        detail: `Menos de 6 series directas/semana en: ${low.map((m) => `${ES[m]} (${f1(perWeek(m))})`).join(', ')}. Se suele citar 6–10 como mínimo eficaz para ganar músculo; para mantener basta con menos.`,
        actions: low.slice(0, 2).map((m) => ({ kind: 'muscle' as const, id: m, label: `Ejercicios de ${ES[m]}` })),
      });
    }
    const high = (Object.keys(i.directSets) as MuscleId[]).filter((m) => perWeek(m) > 20);
    if (high.length) {
      insights.push({
        id: 'high-volume',
        tone: 'warning',
        title: 'Volumen muy alto',
        detail: `Más de 20 series directas/semana en: ${high.map((m) => ES[m]).join(', ')}. Por encima de ese nivel el beneficio adicional es incierto y la fatiga aumenta.`,
        actions: [],
      });
    }
  }

  for (const e of i.exercises) {
    if (e.trend === 'stagnation' || e.trend === 'regression') {
      insights.push({
        id: `trend-${e.exerciseId}`,
        tone: 'warning',
        title: `${e.name}: ${e.trend === 'stagnation' ? 'estancado' : 'en retroceso'}`,
        detail:
          e.trend === 'stagnation'
            ? `Varias sesiones sin superar tu mejor marca (${e.sessions} sesiones analizadas). Opciones: revisar sueño y recuperación, una semana de descarga o rotar a una variante durante 4–6 semanas.`
            : 'Rendimiento por debajo de tu mejor marca dos sesiones seguidas: puede indicar fatiga acumulada. Valora una semana de descarga.',
        actions: [
          { kind: 'exerciseStats', id: e.exerciseId, label: 'Ver estadísticas' },
          ...e.substitutes.slice(0, 2).map((s) => ({ kind: 'exercise' as const, id: s.id, label: `Variante: ${s.name}` })),
        ],
      });
    }
  }
  const improving = i.exercises
    .filter((e) => e.trend === 'progress' && e.firstE1rm && e.lastE1rm && e.lastE1rm > e.firstE1rm)
    .map((e) => ({ e, gain: (e.lastE1rm! - e.firstE1rm!) / e.firstE1rm! }))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
  if (improving.length) {
    insights.push({
      id: 'progress',
      tone: 'positive',
      title: 'Progresando',
      detail: improving.map(({ e, gain }) => `${e.name}: +${Math.round(gain * 100)} % de 1RM estimado`).join(' · '),
      actions: improving.map(({ e }) => ({ kind: 'exerciseStats' as const, id: e.exerciseId, label: e.name })),
    });
  }

  const r = i.recovery;
  if (r && r.days >= 3) {
    if (r.sleepHours !== null && r.sleepHours < 7) {
      insights.push({
        id: 'sleep',
        tone: r.sleepHours < 6 ? 'warning' : 'info',
        title: 'Sueño por debajo de 7 h',
        detail: `Media de ${f1(r.sleepHours)} h en tus registros recientes. Dormir poco de forma habitual se asocia a peor recuperación y rendimiento.`,
        actions: [{ kind: 'recovery', label: 'Ver recuperación' }],
      });
    }
    if (r.recoveryScore !== null && r.recoveryScore <= 2.5) {
      insights.push({
        id: 'recovery-low',
        tone: 'warning',
        title: 'Recuperación percibida baja',
        detail: `Media de ${f1(r.recoveryScore)}/5. El recomendador está favoreciendo rutinas menos fatigantes.`,
        actions: [{ kind: 'explore', label: 'Ver rutinas menos fatigantes' }],
      });
    }
  }

  const order = { warning: 0, info: 1, positive: 2 } as const;
  insights.sort((a, b) => order[a.tone] - order[b.tone]);
  return { insights, adherenceCurve, meanSessions, weeklyDirect };
}
