/** Parses "DD/MM/AAAA" (or D/M/AA) into a local Date at 12:00. null if invalid. */
export function parseDayMonthYear(text: string): Date | null {
  const m = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  const date = new Date(y, mo - 1, d, 12);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDayMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export type DayChoice = 'today' | 'yesterday' | 'other';

/** Resolves a date choice to an ISO instant (today = now, others = local noon). */
export function resolveDayChoice(choice: DayChoice, otherText: string, now = new Date()): string | null {
  if (choice === 'today') return now.toISOString();
  if (choice === 'yesterday') {
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
    return y.toISOString();
  }
  const d = parseDayMonthYear(otherText);
  if (!d || d.getTime() > now.getTime() + 86_400_000) return null;
  return d.toISOString();
}
