/**
 * Adherence model: probability of completing at least `d` sessions in a week.
 *
 * Each observed (complete) week is a Bernoulli trial "reached d sessions".
 * With a uniform Beta(1, 1) prior, the posterior mean is (1 + hits) / (2 + n)
 * (Laplace's rule of succession) and the 90 % credible interval comes from
 * the Beta(1 + hits, 1 + misses) distribution. Only weeks since the user's
 * first logged workout count, so time before using the app is not a "miss".
 */
export interface AdherenceEstimate {
  sessionsPerWeek: number;
  probability: number; // 0–1
  low: number; // 90 % credible interval
  high: number;
  weeksObserved: number;
  hits: number;
  basis: 'history' | 'prior';
}

export const MIN_WEEKS_FOR_HISTORY = 3;

/** Regularized incomplete beta via continued fraction (Numerical Recipes), for the Beta CDF. */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function lnGamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let x = c[0]!;
  for (let i = 1; i < g + 2; i++) x += c[i]! / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function betaCdf(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

function betaQuantile(p: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Without enough history there is no data-driven estimate; this prior only
 * reflects that plans above what the user says they can do are riskier.
 * It is labelled as an assumption in the UI.
 */
function priorProbability(sessions: number, declaredDays: number): number {
  const diff = sessions - declaredDays;
  if (diff <= -1) return 0.8;
  if (diff === 0) return 0.65;
  return Math.max(0.2, 0.65 - 0.2 * diff);
}

/**
 * @param weeklyCounts completed sessions per complete week, oldest first,
 *        starting at the week of the first logged workout.
 */
export function estimateAdherence(weeklyCounts: readonly number[], sessions: number, declaredDays: number): AdherenceEstimate {
  const n = weeklyCounts.length;
  if (n < MIN_WEEKS_FOR_HISTORY) {
    const p = priorProbability(sessions, declaredDays);
    return { sessionsPerWeek: sessions, probability: p, low: p, high: p, weeksObserved: n, hits: 0, basis: 'prior' };
  }
  const hits = weeklyCounts.filter((c) => c >= sessions).length;
  const a = 1 + hits;
  const b = 1 + (n - hits);
  return {
    sessionsPerWeek: sessions,
    probability: a / (a + b),
    low: betaQuantile(0.05, a, b),
    high: betaQuantile(0.95, a, b),
    weeksObserved: n,
    hits,
    basis: 'history',
  };
}
