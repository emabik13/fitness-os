import { create } from 'zustand';

/**
 * Rest timer. Stores the absolute end instant (not a countdown), so the
 * remaining time stays correct if the app is backgrounded or the JS timer is
 * throttled.
 */
interface RestTimerState {
  endsAt: number | null;
  total: number;
  label: string;
  start: (seconds: number, label: string) => void;
  add: (seconds: number) => void;
  stop: () => void;
}

export const useRestTimer = create<RestTimerState>((set, get) => ({
  endsAt: null,
  total: 0,
  label: '',
  start: (seconds, label) => {
    if (seconds <= 0) return set({ endsAt: null, total: 0, label: '' });
    set({ endsAt: Date.now() + seconds * 1000, total: seconds, label });
  },
  add: (seconds) => {
    const { endsAt, total } = get();
    if (!endsAt) return;
    const next = Math.max(Date.now(), endsAt + seconds * 1000);
    set({ endsAt: next, total: Math.max(1, total + seconds) });
  },
  stop: () => set({ endsAt: null, total: 0, label: '' }),
}));

export function remainingSeconds(endsAt: number | null, now = Date.now()): number {
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}
