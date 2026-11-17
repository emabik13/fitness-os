import { estimateOneRm } from '../strength/oneRm';

import { adviseNextSession, classifyTrend, type SessionPerformance } from './doubleProgression';
import { detectRecords } from './personalRecords';

const rx = { sets: 3, repMin: 8, repMax: 12, targetRir: 2 };
const sess = (date: string, ...sets: [number, number, number?][]): SessionPerformance => ({
  date,
  sets: sets.map(([w, r, rir]) => ({ weightKg: w, reps: r, rir: rir ?? null })),
});

describe('1RM estimate', () => {
  it('uses Epley and refuses high-rep sets', () => {
    expect(estimateOneRm(100, 1)).toBe(100);
    expect(estimateOneRm(100, 5)).toBe(116.7);
    expect(estimateOneRm(40, 15)).toBeNull();
    expect(estimateOneRm(0, 5)).toBeNull();
  });
});

describe('double progression (spec example: bench 3×8–12)', () => {
  it('40×12, 40×11, 40×10 → keep 40 kg and add reps', () => {
    const a = adviseNextSession(rx, [sess('d1', [40, 12], [40, 11], [40, 10])], 'barbell');
    expect(a.action).toBe('add_reps');
    expect(a.suggestedWeightKg).toBe(40);
    expect(a.detail).toMatch(/2 series/);
  });

  it('all sets at 12 with planned RIR → suggest +2.5 kg, never applied automatically', () => {
    const a = adviseNextSession(rx, [sess('d1', [40, 12, 2], [40, 12, 2], [40, 12, 1])], 'barbell');
    expect(a.action).toBe('increase_load');
    expect(a.suggestedWeightKg).toBe(42.5);
    expect(a.detail).toMatch(/no se aplica sola/);
  });

  it('top of range but at failure (RIR 0 vs planned 2) → hold the weight', () => {
    const a = adviseNextSession(rx, [sess('d1', [40, 12, 0], [40, 12, 0], [40, 12, 0])], 'barbell');
    expect(a.action).toBe('hold');
  });

  it('uses dumbbell increments and handles no history', () => {
    expect(adviseNextSession(rx, [sess('d', [20, 12], [20, 12], [20, 12])], 'dumbbell').suggestedWeightKg).toBe(22);
    expect(adviseNextSession(rx, [], 'barbell').action).toBe('no_data');
  });
});

describe('performance trend', () => {
  it('distinguishes progress, normal variation, stagnation and regression', () => {
    expect(classifyTrend([sess('1', [40, 10]), sess('2', [42.5, 10])])).toBe('progress');
    expect(classifyTrend([sess('1', [40, 10]), sess('2', [40, 9])])).toBe('normal_variation');
    const flat = [sess('1', [40, 10]), sess('2', [40, 10]), sess('3', [40, 10]), sess('4', [40, 9]), sess('5', [40, 10])];
    expect(classifyTrend(flat)).toBe('stagnation');
    const drop = [sess('1', [50, 8]), sess('2', [50, 8]), sess('3', [45, 7]), sess('4', [45, 6])];
    expect(classifyTrend(drop)).toBe('regression');
    expect(classifyTrend([sess('1', [50, 8]), sess('2', [50, 8]), sess('3', [45, 7])])).toBe('normal_variation');
  });
});

describe('personal records', () => {
  it('needs history and reports only beaten categories', () => {
    expect(detectRecords([], [{ weightKg: 60, reps: 5 }])).toEqual([]);
    const prs = detectRecords([{ weightKg: 60, reps: 5 }], [{ weightKg: 60, reps: 6 }]);
    expect(prs.map((p) => p.type).sort()).toEqual(['estimated_1rm', 'max_set_volume']);
    expect(detectRecords([{ weightKg: 0, reps: 8 }], [{ weightKg: 0, reps: 10 }]).map((p) => p.type)).toEqual(['max_reps']);
  });
});
