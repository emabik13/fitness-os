/** Current instant as ISO-8601 UTC string. All timestamps are stored this way. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Local calendar date as YYYY-MM-DD (used for day-based logs). */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday 00:00 (local time) of the week containing `d`. Weeks start on Monday (es). */
export function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (r.getDay() + 6) % 7; // 0 = Monday
  r.setDate(r.getDate() - offset);
  return r;
}

/** The 7 local dates (Mon..Sun) of the week containing `d`. */
export function weekDays(d: Date): Date[] {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return x;
  });
}

export type TimeRange = '7d' | '30d' | '3m' | '6m' | '12m' | 'all';

/** Start instant for a statistics range filter; `null` means the whole history. */
export function rangeStart(range: TimeRange, now: Date = new Date()): Date | null {
  const r = new Date(now);
  switch (range) {
    case '7d':
      r.setDate(r.getDate() - 7);
      return r;
    case '30d':
      r.setDate(r.getDate() - 30);
      return r;
    case '3m':
      r.setMonth(r.getMonth() - 3);
      return r;
    case '6m':
      r.setMonth(r.getMonth() - 6);
      return r;
    case '12m':
      r.setFullYear(r.getFullYear() - 1);
      return r;
    case 'all':
      return null;
  }
}
