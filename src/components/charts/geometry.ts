export interface Point {
  x: number;
  y: number;
}

/**
 * Maps a numeric series to SVG coordinates inside a width×height box with
 * vertical padding. A flat series is drawn at mid-height.
 */
export function scaleSeries(values: readonly number[], width: number, height: number, padY = 4): Point[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerH = Math.max(0, height - padY * 2);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: values.length > 1 ? i * stepX : width / 2,
    y: span === 0 ? height / 2 : padY + innerH - ((v - min) / span) * innerH,
  }));
}

/** Smooth path (monotone-ish cubic using midpoints) through the points. */
export function linePath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  let d = `M${round(first.x)},${round(first.y)}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]!;
    const p1 = points[i]!;
    const mx = (p0.x + p1.x) / 2;
    d += ` C${round(mx)},${round(p0.y)} ${round(mx)},${round(p1.y)} ${round(p1.x)},${round(p1.y)}`;
  }
  return d;
}

/** Closed area path under the line, down to the baseline `height`. */
export function areaPath(points: readonly Point[], height: number): string {
  if (points.length < 2) return '';
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return `${linePath(points)} L${round(last.x)},${height} L${round(first.x)},${height} Z`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
