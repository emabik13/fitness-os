/** 125 → "2:05" */
export function formatRest(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 3725 → "1 h 02 min", 1500 → "25 min" */
export function formatDuration(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

/** 3725 → "1:02:05" (live clock) */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export function prescriptionText(p: { sets?: number; repMin: number | null; repMax: number | null; targetRir: number | null; restSeconds?: number }): string {
  const reps = p.repMin && p.repMax ? (p.repMin === p.repMax ? `${p.repMin}` : `${p.repMin}–${p.repMax}`) : '—';
  const parts = [p.sets ? `${p.sets} × ${reps}` : `${reps} reps`];
  if (p.targetRir !== null && p.targetRir !== undefined) parts.push(`RIR ${p.targetRir}`);
  if (p.restSeconds) parts.push(`desc. ${formatRest(p.restSeconds)}`);
  return parts.join(' · ');
}
