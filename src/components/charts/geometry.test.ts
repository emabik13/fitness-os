import { areaPath, linePath, scaleSeries } from './geometry';

describe('chart geometry', () => {
  it('maps min to bottom and max to top within padding', () => {
    const pts = scaleSeries([10, 20], 100, 50, 5);
    expect(pts[0]).toEqual({ x: 0, y: 45 });
    expect(pts[1]).toEqual({ x: 100, y: 5 });
  });
  it('draws a flat series at mid-height', () => {
    expect(scaleSeries([7, 7, 7], 90, 40).every((p) => p.y === 20)).toBe(true);
  });
  it('handles empty and single values', () => {
    expect(scaleSeries([], 100, 40)).toEqual([]);
    expect(scaleSeries([5], 100, 40)).toEqual([{ x: 50, y: 20 }]);
    expect(areaPath(scaleSeries([5], 100, 40), 40)).toBe('');
  });
  it('produces a path starting at the first point', () => {
    expect(linePath(scaleSeries([1, 2, 3], 100, 40))).toMatch(/^M0,/);
  });
});
