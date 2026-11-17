import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PressableScale,
  Screen,
  SectionHeader,
  Stepper,
  TextField,
  goBack,
} from '@/components/ui';
import { useDatabase } from '@/database/DatabaseProvider';
import { createRoutineRepository, type RoutineDayRow, type RoutineExerciseRow } from '@/database/repositories/routineRepository';
import { encodePick } from '@/features/exercises/pick';
import { startWorkout } from '@/features/workouts/startWorkout';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, radii, spacing } from '@/theme';
import { confirmAsync, notify } from '@/utils/dialog';
import { formatRest, prescriptionText } from '@/utils/duration';

export function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, userId } = useDatabase();
  const repo = createRoutineRepository(db);
  const { data, refresh, loading } = useDbQuery((d) => createRoutineRepository(d).get(id), [id]);
  const [showWhy, setShowWhy] = useState(false);

  if (!data) {
    return (
      <Screen title="Rutina" back>
        {!loading ? <EmptyState icon="alert-circle-outline" title="Rutina no encontrada" description="Puede que se haya eliminado." /> : null}
      </Screen>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      refresh();
    } catch (e) {
      notify('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
  };

  const start = (dayId: string) => run(() => startWorkout(db, userId, dayId));

  return (
    <Screen title={data.name} subtitle={data.isActive ? 'Rutina activa' : 'Rutina'} back>
      <NameField
        key={data.id}
        initial={data.name}
        onSave={(v) => run(() => repo.rename(data.id, v))}
      />
      <View style={styles.row}>
        {data.isActive ? (
          <Badge label="Activa" tone="accent" />
        ) : (
          <Button label="Activar" size="md" variant="secondary" onPress={() => run(() => repo.setActive(userId, data.id))} />
        )}
        {data.rationale ? (
          <Button
            label={showWhy ? 'Ocultar justificación' : 'Ver justificación'}
            size="md"
            variant="ghost"
            onPress={() => setShowWhy((v) => !v)}
          />
        ) : null}
      </View>
      {showWhy && data.rationale ? (
        <Card padding="lg" style={styles.gap}>
          {data.rationale.split('\n').map((r) => (
            <AppText key={r} variant="footnote" color="textSecondary">
              •  {r}
            </AppText>
          ))}
        </Card>
      ) : null}

      {data.days.map((day) => (
        <DayEditor
          key={day.id}
          day={day}
          canRemove={data.days.length > 1}
          onStart={() => start(day.id)}
          onRun={run}
          routineId={data.id}
        />
      ))}

      <Button label="Añadir día" icon="add" variant="secondary" onPress={() => run(() => repo.addDay(data.id))} />
      <Button
        label="Eliminar rutina"
        icon="trash-outline"
        variant="danger"
        onPress={async () => {
          if (await confirmAsync('Eliminar rutina', `¿Eliminar "${data.name}"? Tu historial de entrenamientos se conserva.`, 'Eliminar', true)) {
            await repo.remove(data.id);
            goBack();
          }
        }}
      />
    </Screen>
  );
}

/** Text field that saves on blur/submit when the trimmed value changed. */
export function NameField({ initial, onSave, label = 'Nombre' }: { initial: string; onSave: (v: string) => void; label?: string }) {
  const [value, setValue] = useState(initial);
  const commit = () => {
    const v = value.trim();
    if (v && v !== initial) onSave(v);
    else if (!v) setValue(initial);
  };
  return <TextField label={label} value={value} onChangeText={setValue} onBlur={commit} onSubmitEditing={commit} maxLength={60} returnKeyType="done" />;
}

function DayEditor({
  day,
  canRemove,
  onStart,
  onRun,
  routineId,
}: {
  day: RoutineDayRow;
  canRemove: boolean;
  onStart: () => void;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
  routineId: string;
}) {
  const { db } = useDatabase();
  const repo = createRoutineRepository(db);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <View style={styles.gap}>
      <SectionHeader title={day.name} />
      {day.focus || day.estimatedMinutes ? (
        <AppText variant="footnote" color="textTertiary">
          {[day.focus, day.estimatedMinutes ? `~${day.estimatedMinutes} min` : null].filter(Boolean).join(' · ')}
        </AppText>
      ) : null}
      <Card padding="sm" style={styles.gapSm}>
        {day.exercises.length === 0 ? (
          <AppText variant="footnote" color="textSecondary" style={styles.pad}>
            Sin ejercicios todavía.
          </AppText>
        ) : null}
        {day.exercises.map((e, i) => (
          <ExerciseItem
            key={e.id}
            ex={e}
            open={editing === e.id}
            onToggle={() => setEditing(editing === e.id ? null : e.id)}
            first={i === 0}
            last={i === day.exercises.length - 1}
            onRun={onRun}
            dayId={day.id}
          />
        ))}
        <View style={styles.dayActions}>
          <Button
            label="Añadir ejercicio"
            icon="add"
            size="md"
            variant="ghost"
            onPress={() => router.push({ pathname: '/ejercicios', params: { pick: encodePick({ kind: 'routineDay', id: day.id }) } })}
          />
          {canRemove ? (
            <IconButton
              icon="trash-outline"
              variant="plain"
              color={colors.textTertiary}
              accessibilityLabel={`Eliminar ${day.name}`}
              onPress={async () => {
                if (await confirmAsync('Eliminar día', `¿Eliminar "${day.name}" de la rutina?`, 'Eliminar', true)) {
                  await onRun(() => repo.removeDay(routineId, day.id));
                }
              }}
            />
          ) : null}
        </View>
      </Card>
      {day.exercises.length ? <Button label={`Empezar ${day.name}`} icon="play" onPress={onStart} /> : null}
    </View>
  );
}

function ExerciseItem({
  ex,
  open,
  onToggle,
  first,
  last,
  onRun,
  dayId,
}: {
  ex: RoutineExerciseRow;
  open: boolean;
  onToggle: () => void;
  first: boolean;
  last: boolean;
  onRun: (fn: () => Promise<unknown>) => Promise<void>;
  dayId: string;
}) {
  const { db } = useDatabase();
  const repo = createRoutineRepository(db);
  const upd = (p: Parameters<typeof repo.updateExercise>[1]) => onRun(() => repo.updateExercise(ex.id, p));
  return (
    <View style={[styles.item, open && styles.itemOpen]}>
      <PressableScale onPress={onToggle} activeScale={0.99} accessibilityRole="button" accessibilityLabel={`Editar ${ex.name}`} style={styles.itemHead}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{ex.name}</AppText>
          <AppText variant="footnote" color="textSecondary">
            {prescriptionText(ex)}
          </AppText>
          {ex.intensityNote ? (
            <AppText variant="caption" color="info">
              {ex.intensityNote}
            </AppText>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'create-outline'} size={18} color={colors.textTertiary} />
      </PressableScale>
      {open ? (
        <View style={styles.editor}>
          <Stepper label="Series" value={ex.sets} min={1} max={10} onChange={(v) => upd({ sets: v })} />
          <Stepper label="Reps mín." value={ex.repMin} min={1} max={ex.repMax} onChange={(v) => upd({ repMin: v })} />
          <Stepper label="Reps máx." value={ex.repMax} min={ex.repMin} max={50} onChange={(v) => upd({ repMax: v })} />
          <Stepper label="Descanso" value={ex.restSeconds} min={0} max={600} step={15} format={formatRest} onChange={(v) => upd({ restSeconds: v })} />
          <Stepper label="RIR objetivo" value={ex.targetRir ?? 2} min={0} max={5} onChange={(v) => upd({ targetRir: v })} />
          <View style={styles.actions}>
            <IconButton icon="arrow-up" accessibilityLabel="Subir" onPress={() => !first && onRun(() => repo.moveExercise(dayId, ex.id, -1))} />
            <IconButton icon="arrow-down" accessibilityLabel="Bajar" onPress={() => !last && onRun(() => repo.moveExercise(dayId, ex.id, 1))} />
            <IconButton
              icon="swap-horizontal"
              accessibilityLabel="Sustituir ejercicio"
              onPress={() => router.push({ pathname: '/ejercicios', params: { pick: encodePick({ kind: 'routineReplace', id: ex.id }) } })}
            />
            <IconButton
              icon="information-circle-outline"
              accessibilityLabel="Ver ficha"
              onPress={() => router.push({ pathname: '/ejercicios/[id]', params: { id: ex.exerciseId } })}
            />
            <IconButton icon="trash-outline" color={colors.danger} accessibilityLabel="Quitar ejercicio" onPress={() => onRun(() => repo.removeExercise(ex.id))} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.xs },
  pad: { padding: spacing.md },
  item: { borderRadius: radii.md },
  itemOpen: { backgroundColor: colors.surfaceRaised },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 56 },
  editor: { gap: spacing.md, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  actions: { flexDirection: 'row', justifyContent: 'space-between' },
  dayActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1, gap: 2 },
});
