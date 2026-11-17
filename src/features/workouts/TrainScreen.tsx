import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, Card, EmptyState, ListGroup, ListRow, Screen, SectionHeader } from '@/components/ui';
import { goalLabel } from '@/constants/labels';
import { useDatabase } from '@/database/DatabaseProvider';
import { createRoutineRepository } from '@/database/repositories/routineRepository';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, spacing } from '@/theme';
import { formatShortDate } from '@/utils/dates';
import { notify } from '@/utils/dialog';
import { formatDuration, prescriptionText } from '@/utils/duration';

import { startWorkout } from './startWorkout';

export async function loadTrainData(db: Parameters<typeof createWorkoutRepository>[0], userId: string) {
  const workouts = createWorkoutRepository(db);
  const routines = createRoutineRepository(db);
  const activeId = await workouts.getActiveId(userId);
  const [active, next, list, history] = await Promise.all([
    activeId ? workouts.get(activeId) : null,
    routines.nextDay(userId),
    routines.list(userId),
    workouts.listCompleted(userId, null, 10),
  ]);
  return { active, next, list, history };
}

export function TrainScreen() {
  const { db, userId } = useDatabase();
  const { data, refreshing, refresh } = useDbQuery((d, uid) => loadTrainData(d, uid));
  const start = async (dayId?: string) => {
    try {
      await startWorkout(db, userId, dayId);
    } catch (e) {
      notify('No se pudo empezar', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen title="Entrenar" refreshing={refreshing} onRefresh={refresh}>
      {data?.active ? (
        <Card variant="accent" padding="xl" style={styles.gap} onPress={() => router.push({ pathname: '/entrenamiento/[id]', params: { id: data.active!.id } })} accessibilityLabel="Continuar entrenamiento en curso">
          <AppText variant="overline" color="onAccent">
            En curso
          </AppText>
          <AppText variant="title2" color="onAccent">
            {data.active.name}
          </AppText>
          <AppText variant="callout" color="onAccent">
            Continuar entrenamiento →
          </AppText>
        </Card>
      ) : data?.next ? (
        <Card variant="raised" padding="xl" style={styles.gap}>
          <AppText variant="overline" color="textTertiary">
            Próxima sesión · {data.next.routineName}
          </AppText>
          <AppText variant="title2">{data.next.day.name}</AppText>
          {data.next.day.exercises.slice(0, 6).map((e) => (
            <AppText key={e.id} variant="footnote" color="textSecondary">
              {e.name} — {prescriptionText(e)}
            </AppText>
          ))}
          <Button label="Empezar" icon="play" onPress={() => start(data.next!.day.id)} />
        </Card>
      ) : null}

      <View style={styles.row}>
        <Button label="Entrenamiento libre" icon="flash-outline" variant="secondary" size="md" onPress={() => start()} style={styles.flex} />
        <Button label="Ejercicios" icon="library-outline" variant="secondary" size="md" onPress={() => router.push('/ejercicios')} style={styles.flex} />
      </View>

      <SectionHeader title="Mis rutinas" />
      {data && data.list.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="Todavía no tienes rutinas"
          description="El motor crea una rutina a tu medida (objetivo, experiencia, días, tiempo, equipamiento y limitaciones) y explica cada decisión."
        />
      ) : null}
      {(data?.list ?? []).map((r) => (
        <Card key={r.id} padding="lg" style={styles.gapSm} onPress={() => router.push({ pathname: '/rutinas/[id]', params: { id: r.id } })} accessibilityLabel={`Rutina ${r.name}`}>
          <View style={styles.rowBetween}>
            <AppText variant="bodyStrong" style={styles.flex}>
              {r.name}
            </AppText>
            {r.isActive ? <Badge label="Activa" tone="accent" /> : null}
          </View>
          <AppText variant="footnote" color="textSecondary">
            {goalLabel(r.goal)} · {r.dayCount} {r.dayCount === 1 ? 'día' : 'días'} · {r.generatedBy === 'engine' ? 'Generada por el motor' : 'Personalizada'}
          </AppText>
        </Card>
      ))}
      <View style={styles.row}>
        <Button label="Generar rutina" icon="sparkles-outline" size="md" onPress={() => router.push('/rutinas/generar')} style={styles.flex} />
        <Button
          label="Crear vacía"
          icon="add"
          size="md"
          variant="secondary"
          style={styles.flex}
          onPress={async () => {
            const id = await createRoutineRepository(db).createEmpty(userId, 'Mi rutina', 'recomposition');
            router.push({ pathname: '/rutinas/[id]', params: { id } });
          }}
        />
      </View>

      <SectionHeader title="Historial" />
      {data && data.history.length === 0 ? (
        <AppText variant="footnote" color="textSecondary">
          Aquí aparecerán tus entrenamientos completados.
        </AppText>
      ) : (
        <ListGroup>
          {(data?.history ?? []).map((w) => (
            <ListRow
              key={w.id}
              icon="checkmark-done-outline"
              title={w.name}
              subtitle={`${formatShortDate(w.startedAt)} · ${w.durationSeconds ? formatDuration(w.durationSeconds) : '—'} · ${w.sets} series`}
              trailing={w.volumeKg ? `${Math.round(w.volumeKg).toLocaleString('es-ES')} kg` : undefined}
              onPress={() => router.push({ pathname: '/entrenamiento/resumen/[id]', params: { id: w.id } })}
            />
          ))}
        </ListGroup>
      )}
      <View style={styles.hint}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textTertiary} />
        <AppText variant="caption" color="textTertiary" style={styles.flex}>
          Los entrenamientos se guardan en el dispositivo en cada cambio: si cierras la app, retomarás donde lo dejaste.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  gapSm: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  hint: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
});
