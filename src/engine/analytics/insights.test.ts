import { analyze, type AnalyticsInput } from './insights';

const base: AnalyticsInput = {
  weeklyCounts: [4, 4, 4, 3, 4],
  plannedDays: 4,
  directSets: { pectorals: 40, lats: 40, quadriceps: 40, hamstrings: 32, glutes: 32, deltoids: 36 },
  windowWeeks: 4,
  exercises: [],
  recovery: null,
};

describe('analytics insights', () => {
  it('reports good adherence and no imbalances for a balanced history', () => {
    const r = analyze(base);
    expect(r.insights.map((x) => x.id)).toEqual(['adherence-good']);
    expect(r.meanSessions).toBeCloseTo(3.8, 6);
    expect(r.adherenceCurve).toHaveLength(6);
    expect(r.adherenceCurve[3]!.probability).toBeCloseTo((1 + 4) / (2 + 5), 6);
  });

  it('flags low adherence and suggests realistic days', () => {
    const r = analyze({ ...base, weeklyCounts: [2, 2, 3, 2, 1, 2] });
    const a = r.insights.find((x) => x.id === 'adherence-low')!;
    expect(a.tone).toBe('warning');
    expect(a.actions[0]!.label).toMatch(/2 días/);
  });

  it('detects push/pull and quad/hamstring imbalances, low and excessive volume', () => {
    const r = analyze({ ...base, directSets: { pectorals: 60, lats: 24, quadriceps: 48, hamstrings: 8, glutes: 40, deltoids: 90 } });
    const ids = r.insights.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining(['push-pull', 'quad-ham', 'low-volume', 'high-volume']));
    expect(r.insights.find((x) => x.id === 'low-volume')!.detail).toMatch(/isquiotibiales/);
  });

  it('turns exercise trends into actions and highlights progress', () => {
    const r = analyze({
      ...base,
      exercises: [
        { exerciseId: 'a', name: 'Press', sessions: 6, trend: 'stagnation', firstE1rm: 80, lastE1rm: 80, substitutes: [{ id: 'b', name: 'Press inclinado' }] },
        { exerciseId: 'c', name: 'Sentadilla', sessions: 6, trend: 'progress', firstE1rm: 100, lastE1rm: 110, substitutes: [] },
      ],
    });
    const stag = r.insights.find((x) => x.id === 'trend-a')!;
    expect(stag.actions.map((x) => x.label)).toContain('Variante: Press inclinado');
    expect(r.insights.find((x) => x.id === 'progress')!.detail).toMatch(/Sentadilla: \+10 %/);
    expect(r.insights[0]!.tone).toBe('warning'); // warnings first
  });

  it('asks for more data and reads recovery', () => {
    const r = analyze({ ...base, weeklyCounts: [3], directSets: {}, recovery: { recoveryScore: 2, sleepHours: 5.5, days: 7 } });
    expect(r.insights.map((x) => x.id)).toEqual(expect.arrayContaining(['need-data', 'sleep', 'recovery-low']));
  });
});
