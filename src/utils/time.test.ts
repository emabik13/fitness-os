import { rangeStart, startOfWeek, toLocalDateKey, weekDays } from './time';

describe('time utils', () => {
  it('weeks start on Monday', () => {
    expect(toLocalDateKey(startOfWeek(new Date('2026-11-18T12:00:00')))).toBe('2026-11-16');
    expect(toLocalDateKey(startOfWeek(new Date('2026-11-22T23:00:00')))).toBe('2026-11-16'); // Sunday
    expect(weekDays(new Date('2026-11-18T12:00:00')).map(toLocalDateKey)).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
  });
  it('computes statistics ranges', () => {
    const now = new Date('2026-11-17T12:00:00');
    expect(rangeStart('all', now)).toBeNull();
    expect(toLocalDateKey(rangeStart('7d', now)!)).toBe('2026-11-10');
    expect(toLocalDateKey(rangeStart('3m', now)!)).toBe('2026-08-17');
    expect(toLocalDateKey(rangeStart('12m', now)!)).toBe('2025-11-17');
  });
});
