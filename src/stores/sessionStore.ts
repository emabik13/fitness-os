import { create } from 'zustand';

/** Ephemeral app-session state (not persisted; derived from SQLite at boot). */
interface SessionState {
  onboarded: boolean | null;
  setOnboarded: (v: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  onboarded: null,
  setOnboarded: (v) => set({ onboarded: v }),
}));
