/**
 * Body-weight trend. A single weigh-in is dominated by water, glycogen and
 * gut content (±1–2 kg day to day), so the app never interprets one reading as
 * fat gain/loss. It uses a trailing moving average over a time window and the
 * slope between averages.
 */
export interface WeighIn {
  measuredAt: string; // ISO
  weightKg: number;
}

export interface TrendPoint {
  measuredAt: string;
  weightKg: number;
  /** Mean of readings in the preceding `windowDays` (inclusive). */
  average: number;
}

const DAY = 86_400_000;

export function movingAverage(entries: readonly WeighIn[], windowDays = 7): TrendPoint[] {
  const sorted = [...entries].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  return sorted.map((e, i) => {
    const t = Date.parse(e.measuredAt);
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      const tj = Date.parse(sorted[j]!.measuredAt);
      if (t - tj > windowDays * DAY) break;
      sum += sorted[j]!.weightKg;
      n++;
    }
    return { measuredAt: e.measuredAt, weightKg: e.weightKg, average: Math.round((sum / n) * 100) / 100 };
  });
}

export type TrendDirection = 'down' | 'stable' | 'up' | 'insufficient';

export interface TrendSummary {
  direction: TrendDirection;
  /** kg per week, from the moving average. null when insufficient data. */
  weeklyChangeKg: number | null;
  currentAverage: number | null;
  readings: number;
  spanDays: number;
  message: string;
}

/**
 * Needs ≥ 4 readings spanning ≥ 10 days. Changes below ±0.1 kg/week are
 * reported as stable (within normal fluctuation).
 */
export function summarizeTrend(entries: readonly WeighIn[], windowDays = 7): TrendSummary {
  const pts = movingAverage(entries, windowDays);
  const first = pts[0];
  const last = pts[pts.length - 1];
  const spanDays = first && last ? (Date.parse(last.measuredAt) - Date.parse(first.measuredAt)) / DAY : 0;
  if (!first || !last || pts.length < 4 || spanDays < 10) {
    return {
      direction: 'insufficient',
      weeklyChangeKg: null,
      currentAverage: last?.average ?? null,
      readings: pts.length,
      spanDays: Math.round(spanDays),
      message:
        'Aún no hay datos suficientes para una tendencia (mínimo 4 pesajes en 10 días). Una variación aislada no indica cambio de grasa.',
    };
  }
  // Compare the average at the end with the average ~windowDays after the start
  // (the first point's average is based on a single reading).
  const anchor = pts.find((p) => Date.parse(p.measuredAt) - Date.parse(first.measuredAt) >= windowDays * DAY) ?? first;
  const days = (Date.parse(last.measuredAt) - Date.parse(anchor.measuredAt)) / DAY;
  const weekly = days > 0 ? ((last.average - anchor.average) / days) * 7 : 0;
  const rounded = Math.round(weekly * 100) / 100;
  const direction: TrendDirection = Math.abs(rounded) < 0.1 ? 'stable' : rounded < 0 ? 'down' : 'up';
  const message =
    direction === 'stable'
      ? 'Peso estable (variación < 0,1 kg/semana). En recomposición esto puede ser compatible con cambios de composición: revisa medidas y rendimiento.'
      : `Tendencia ${direction === 'down' ? 'descendente' : 'ascendente'} de ${Math.abs(rounded).toFixed(2).replace('.', ',')} kg/semana según la media móvil de ${windowDays} días. El peso no distingue grasa de músculo o agua.`;
  return {
    direction,
    weeklyChangeKg: rounded,
    currentAverage: last.average,
    readings: pts.length,
    spanDays: Math.round(spanDays),
    message,
  };
}
