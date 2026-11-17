import { createRoutineRepository } from '@/database/repositories/routineRepository';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import type { SqlExecutor } from '@/database/types';

/** Where an exercise chosen in the library goes (encoded in the `pick` route param). */
export type PickTarget =
  | { kind: 'workout'; id: string }
  | { kind: 'workoutReplace'; id: string }
  | { kind: 'routineDay'; id: string }
  | { kind: 'routineReplace'; id: string };

const KINDS = ['workout', 'workoutReplace', 'routineDay', 'routineReplace'] as const;

export function encodePick(t: PickTarget): string {
  return `${t.kind}:${t.id}`;
}

export function parsePickTarget(raw: string | string[] | undefined): PickTarget | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v) return null;
  const i = v.indexOf(':');
  const kind = v.slice(0, i) as PickTarget['kind'];
  const id = v.slice(i + 1);
  return (KINDS as readonly string[]).includes(kind) && id ? { kind, id } : null;
}

export function pickTitle(t: PickTarget): string {
  return t.kind === 'workoutReplace' || t.kind === 'routineReplace' ? 'Sustituir ejercicio' : 'Añadir ejercicio';
}

export async function applyPick(db: SqlExecutor, userId: string, t: PickTarget, exerciseId: string): Promise<void> {
  const workouts = createWorkoutRepository(db);
  const routines = createRoutineRepository(db);
  switch (t.kind) {
    case 'workout':
      await workouts.addExercise(userId, t.id, exerciseId);
      return;
    case 'workoutReplace':
      await workouts.replaceExercise(userId, t.id, exerciseId);
      return;
    case 'routineDay':
      await routines.addExercise(t.id, exerciseId);
      return;
    case 'routineReplace':
      await routines.replaceExercise(t.id, exerciseId);
      return;
  }
}
