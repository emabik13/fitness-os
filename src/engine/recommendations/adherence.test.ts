import { betaCdf, estimateAdherence } from './adherence';

describe('adherence model (Beta-Binomial)', () => {
  it('Beta CDF matches known values', () => {
    expect(betaCdf(0.5, 1, 1)).toBeCloseTo(0.5, 6); // uniform
    expect(betaCdf(0.3, 2, 1)).toBeCloseTo(0.09, 6); // x^2
    expect(betaCdf(0.5, 5, 5)).toBeCloseTo(0.5, 6); // symmetric
  });

  it('uses the rule of succession on observed weeks', () => {
    // 8 weeks: reached ≥3 sessions in 6 of them → (1+6)/(2+8) = 0.7
    const e = estimateAdherence([3, 3, 4, 2, 3, 3, 1, 3], 3, 3);
    expect(e.basis).toBe('history');
    expect(e.hits).toBe(6);
    expect(e.probability).toBeCloseTo(0.7, 6);
    expect(e.low).toBeLessThan(0.7);
    expect(e.high).toBeGreaterThan(0.7);
    // Asking for more sessions than ever achieved is unlikely.
    expect(estimateAdherence([3, 3, 4, 2, 3, 3, 1, 3], 5, 3).probability).toBeCloseTo(0.1, 6);
  });

  it('falls back to a labelled prior without enough weeks', () => {
    const e = estimateAdherence([2], 4, 3);
    expect(e.basis).toBe('prior');
    expect(e.probability).toBeLessThan(estimateAdherence([2], 3, 3).probability);
  });
});
