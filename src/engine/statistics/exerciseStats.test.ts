import { frequencyPerWeek, perSessionStats } from './exerciseStats';

describe('exercise statistics', () => {
  it('summarizes each session (spec example 40×12, 40×11, 40×10)', () => {
    const [s] = perSessionStats([
      { workoutId: 'w', startedAt: '2026-11-17T18:00:00Z', sets: [{ weightKg: 40, reps: 12, rir: 2 }, { weightKg: 40, reps: 11, rir: 1 }, { weightKg: 40, reps: 10, rir: 1 }] },
    ]);
    expect(s).toEqual({ date: '2026-11-17T18:00:00Z', topWeightKg: 40, bestE1rm: 56, volumeKg: 1320, reps: 33, sets: 3 });
  });
  it('computes weekly frequency over the selected period', () => {
    const now = new Date('2026-11-29T00:00:00Z');
    const sessions = [{ date: '2026-11-03' }, { date: '2026-11-10' }, { date: '2026-11-17' }, { date: '2026-11-24' }];
    expect(frequencyPerWeek(sessions, '2026-11-01T00:00:00Z', now)).toBe(1.0);
    expect(frequencyPerWeek([], null, now)).toBe(0);
  });
});
