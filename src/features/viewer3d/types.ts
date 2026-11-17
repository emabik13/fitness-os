import type { MuscleRole } from '@/catalog';

import type { ViewPreset } from './muscleHighlight';

export interface ModelViewerProps {
  uri: string;
  source: string;
  license: string;
  attribution?: string | null;
  /** muscle_groups id → role, for highlighting. */
  roles: ReadonlyMap<string, MuscleRole>;
  height?: number;
}

export interface CanvasProps {
  uri: string;
  roles: ReadonlyMap<string, MuscleRole>;
  preset: ViewPreset;
  playing: boolean;
  speed: number;
  restartToken: number;
  onLoaded: (info: { animated: boolean }) => void;
  onError: (message: string) => void;
}
