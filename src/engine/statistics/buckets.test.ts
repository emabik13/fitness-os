import { bucketize, weeklyStreak } from './buckets';

const now = new Date('2026-11-18T12:00:00'); // Wednesday

describe('statistics buckets', () => {
  it('weekly buckets for short ranges, including empty weeks', () => {
    const b = bucketize(['2026-11-17T10:00:00', '2026-11-03T10:00:00', '2026-11-04T10:00:00'], '30d', now);
    expect(b).toHaveLength(5);
    expect(b.map((x) => x.label)).toEqual(['19/10', '26/10', '2/11', '9/11', '16/11']);
    expect(b.map((x) => x.count)).toEqual([0, 0, 2, 0, 1]);
  });
  it('monthly buckets for long ranges', () => {
    const b = bucketize(['2026-11-01T10:00:00', '2026-06-15T10:00:00'], '6m', now);
    expect(b.map((x) => x.label)).toEqual(['jun', 'jul', 'ago', 'sep', 'oct', 'nov']);
    expect(b.map((x) => x.count)).toEqual([1, 0, 0, 0, 0, 1]);
  });
  it('counts consecutive weeks meeting the weekly target', () => {
    const sessions = ['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11', '2026-11-17'].map((d) => `${d}T10:00:00`);
    expect(weeklyStreak(sessions, 2, now)).toBe(2); // current week (1/2) not yet counted
    expect(weeklyStreak([...sessions, '2026-11-18T08:00:00'], 2, now)).toBe(3);
  });
});
