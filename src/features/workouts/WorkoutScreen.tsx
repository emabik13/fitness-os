import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, EmptyState, Screen } from '@/components/ui';
import { useDatabase } from '@/database/DatabaseProvider';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import { createWorkoutRepository, toSessions, type WorkoutExercise } from '@/database/repositories/workoutRepository';
import { adviseNextSession } from '@/engine/progression/doubleProgression';
import { encodePick } from '@/features/exercises/pick';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useKeepScreenOn } from '@/hooks/useKeepScreenOn';
import { useRestTimer } from '@/stores/restTimerStore';
import { spacing } from '@/theme';
import { confirmAsync, notify } from '@/utils/dialog';
import { formatClock } from '@/utils/duration';
import { haptics } from '@/utils/haptics';

import { ExerciseCard, type ExerciseCardHandlers } from './ExerciseCard';
import { RestTimerBar } from './RestTimerBar';

function ElapsedClock({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <AppText variant="metricSmall" color="accent" accessibilityLabel="Tiempo transcurrido">
      {formatClock((now - Date.parse(startedAt)) / 1000)}
    </AppText>
  );
}

export function WorkoutScreen() {
  useKeepScreenOn();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, userId } = useDatabase();
  const repo = createWorkoutRepository(db);
  const timerActive = useRestTimer((s) => s.endsAt !== null);
  const startTimer = useRestTimer((s) => s.start);
  const [finishing, setFinishing] = useState(false);

  const { data, refresh, loading } = useDbQuery(
    async (d, uid) => {
      const r = createWorkoutRepository(d);
      const workout = await r.get(id);
      if (!workout) return null;
      const profile = await createProfileRepository(d).getProfile(uid);
      const extra = await Promise.all(
        workout.exercises.map(async (e) => {
          const hist = await r.history(uid, e.exerciseId, { limit: 6, excludeWorkoutId: workout.id });
          const sets = e.sets.filter((s) => s.setType !== 'warmup').length || 3;
          const advice =
            e.repMin && e.repMax
              ? adviseNextSession({ sets, repMin: e.repMin, repMax: e.repMax, targetRir: e.targetRir }, toSessions(hist), e.equipment)
              : null;
          return [e.id, { previous: hist[hist.length - 1], advice }] as const;
        }),
      );
      return { workout, extra: new Map(extra), effortScale: profile?.preferences.effortScale ?? 'rir' };
    },
    [id],
  );

  if (!data) {
    return (
      <Screen title="Entrenamiento" back>
        {!loading ? <EmptyState icon="alert-circle-outline" title="Entrenamiento no encontrado" description="Puede que se haya descartado." /> : null}
      </Screen>
    );
  }
  const { workout } = data;
  if (workout.status === 'completed') return <Redirect href={{ pathname: '/entrenamiento/resumen/[id]', params: { id: workout.id } }} />;

  const guard = async (fn: () => Promise<unknown>, reload = true) => {
    try {
      await fn();
      if (reload) refresh();
    } catch (e) {
      notify('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
  };

  const toEffort = (v: number | null) => (data.effortScale === 'rir' ? { rir: v, rpe: null } : { rpe: v, rir: null });

  const h: ExerciseCardHandlers = {
    saveSet: (setId, v) => guard(() => repo.updateSet(setId, { weightKg: v.weightKg, reps: v.reps, ...toEffort(v.effort) }), false),
    toggleSet: (ex, setId, v, done) =>
      guard(async () => {
        await repo.updateSet(setId, { weightKg: v.weightKg, reps: v.reps, ...toEffort(v.effort) });
        await repo.completeSet(setId, done);
        if (done) startTimer(ex.restSeconds, ex.name);
      }),
    setType: (setId, t) => guard(() => repo.updateSet(setId, { setType: t })),
    deleteSet: (setId) => guard(() => repo.deleteSet(setId)),
    addSet: (ex) => guard(() => repo.addSet(ex.id)),
    move: (ex, dir) => guard(() => repo.moveExercise(workout.id, ex.id, dir)),
    remove: async (ex: WorkoutExercise) => {
      if (await confirmAsync('Quitar ejercicio', `¿Quitar "${ex.name}" de este entrenamiento?`, 'Quitar', true)) await guard(() => repo.removeExercise(ex.id));
    },
    update: (ex, p) => guard(() => repo.updateExercise(ex.id, p)),
    applyWeight: (ex, kg) =>
      guard(async () => {
        for (const s of ex.sets) if (!s.isCompleted && s.setType !== 'warmup') await repo.updateSet(s.id, { weightKg: kg });
      }),
  };

  const finish = async () => {
    const pending = workout.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.isCompleted).length, 0);
    if (pending > 0 && !(await confirmAsync('Finalizar entrenamiento', `Hay ${pending} series sin completar que no se guardarán. ¿Finalizar?`, 'Finalizar'))) return;
    setFinishing(true);
    try {
      await repo.finish(userId, workout.id);
      useRestTimer.getState().stop();
      haptics.success();
      router.replace({ pathname: '/entrenamiento/resumen/[id]', params: { id: workout.id } });
    } catch (e) {
      notify('No se pudo finalizar', e instanceof Error ? e.message : String(e));
    } finally {
      setFinishing(false);
    }
  };

  const discard = async () => {
    if (await confirmAsync('Descartar entrenamiento', 'Se borrará este entrenamiento y sus series. No se puede deshacer.', 'Descartar', true)) {
      await repo.discard(workout.id);
      useRestTimer.getState().stop();
      router.replace('/entrenar');
    }
  };

  return (
    <Screen
      back
      title={workout.name}
      headerRight={<Button label="Finalizar" size="md" onPress={finish} loading={finishing} />}
      footer={timerActive ? <RestTimerBar /> : undefined}
    >
      <View style={styles.meta}>
        <ElapsedClock startedAt={workout.startedAt} />
        <AppText variant="caption" color="textTertiary">
          Guardado automático · {workout.exercises.length} ejercicios
        </AppText>
      </View>
      {workout.exercises.length === 0 ? (
        <EmptyState icon="barbell-outline" title="Entrenamiento vacío" description="Añade ejercicios desde la biblioteca." />
      ) : null}
      {workout.exercises.map((ex, i) => {
        const x = data.extra.get(ex.id);
        return (
          <ExerciseCard
            key={`${ex.id}-${ex.exerciseId}`}
            ex={ex}
            workoutId={workout.id}
            previous={x?.previous}
            advice={x?.advice ?? null}
            effortScale={data.effortScale}
            first={i === 0}
            last={i === workout.exercises.length - 1}
            h={h}
          />
        );
      })}
      <Button
        label="Añadir ejercicio"
        icon="add"
        variant="secondary"
        onPress={() => router.push({ pathname: '/ejercicios', params: { pick: encodePick({ kind: 'workout', id: workout.id }) } })}
      />
      <Button label="Descartar entrenamiento" icon="trash-outline" variant="danger" onPress={discard} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
});
