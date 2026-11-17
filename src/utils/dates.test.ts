import { parseDayMonthYear, resolveDayChoice } from './dates';

describe('date parsing', () => {
  it('parses DD/MM/AAAA and rejects impossible dates', () => {
    expect(parseDayMonthYear('05/11/2026')?.getDate()).toBe(5);
    expect(parseDayMonthYear('31/02/2026')).toBeNull();
    expect(parseDayMonthYear('hola')).toBeNull();
  });
  it('rejects future dates', () => {
    const now = new Date(2026, 10, 17, 10);
    expect(resolveDayChoice('other', '20/11/2026', now)).toBeNull();
    expect(resolveDayChoice('other', '10/11/2026', now)).not.toBeNull();
  });
});
