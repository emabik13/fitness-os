const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

/** Spanish one-letter weekday for Monday-based index 0..6. */
export function weekdayLetter(mondayIndex: number): string {
  return WEEKDAYS_SHORT[mondayIndex] ?? '';
}

export function formatKg(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

/** Greeting based on local hour. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function formatLongDate(date: Date): string {
  const s = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
