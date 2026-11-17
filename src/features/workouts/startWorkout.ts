import { router } from 'expo-router';

import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import type { SqlExecutor } from '@/database/types';
import { notify } from '@/utils/dialog';

/** Starts a workout (from a routine day or empty), resuming the open one if it exists. */
export async function startWorkout(db: SqlExecutor, userId: string, routineDayId?: string): Promise<void> {
  const repo = createWorkoutRepository(db);
  const active = await repo.getActiveId(userId);
  if (active) {
    notify('Entrenamiento en curso', 'Ya tienes un entrenamiento abierto. Termínalo o descártalo antes de empezar otro.');
    router.push({ pathname: '/entrenamiento/[id]', params: { id: active } });
    return;
  }
  const id = routineDayId ? await repo.startFromRoutineDay(userId, routineDayId) : await repo.startEmpty(userId);
  router.push({ pathname: '/entrenamiento/[id]', params: { id } });
}
