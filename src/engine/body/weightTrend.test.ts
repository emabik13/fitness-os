import { movingAverage, summarizeTrend } from './weightTrend';

const day = (n: number) => new Date(Date.UTC(2026, 9, 1 + n, 7)).toISOString();

describe('weight trend', () => {
  it('averages readings within the trailing window', () => {
    const pts = movingAverage([
      { measuredAt: day(0), weightKg: 80 },
      { measuredAt: day(1), weightKg: 82 },
      { measuredAt: day(10), weightKg: 79 },
    ]);
    expect(pts.map((p) => p.average)).toEqual([80, 81, 79]);
  });

  it('refuses to infer a trend from too few readings', () => {
    const s = summarizeTrend([
      { measuredAt: day(0), weightKg: 80 },
      { measuredAt: day(1), weightKg: 78.5 },
    ]);
    expect(s.direction).toBe('insufficient');
    expect(s.weeklyChangeKg).toBeNull();
  });

  it('detects a steady loss of ~0.5 kg/week despite daily noise', () => {
    const noise = [0.6, -0.4, 0.3, -0.7, 0.5, -0.2, 0.1];
    const entries = Array.from({ length: 28 }, (_, i) => ({
      measuredAt: day(i),
      weightKg: 85 - (0.5 / 7) * i + noise[i % 7]!,
    }));
    const s = summarizeTrend(entries);
    expect(s.direction).toBe('down');
    expect(s.weeklyChangeKg!).toBeGreaterThan(-0.7);
    expect(s.weeklyChangeKg!).toBeLessThan(-0.3);
  });

  it('reports stable when only noise is present', () => {
    const noise = [0.6, -0.4, 0.3, -0.7, 0.5, -0.2, 0.1];
    const entries = Array.from({ length: 28 }, (_, i) => ({ measuredAt: day(i), weightKg: 80 + noise[i % 7]! }));
    expect(summarizeTrend(entries).direction).toBe('stable');
  });
});
