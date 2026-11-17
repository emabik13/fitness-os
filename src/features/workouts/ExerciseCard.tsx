import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, IconButton, PressableScale, Stepper, TextField } from '@/components/ui';
import type { HistorySession, SetType, WorkoutExercise } from '@/database/repositories/workoutRepository';
import type { ProgressionAdvice } from '@/engine/progression/doubleProgression';
import { encodePick } from '@/features/exercises/pick';
import { colors, radii, spacing } from '@/theme';
import { formatRest, prescriptionText } from '@/utils/duration';
import { formatKg } from '@/utils/format';

import { SetHeader, SetRow, type SetValues } from './SetRow';

export interface ExerciseCardHandlers {
  saveSet: (setId: string, v: SetValues) => Promise<void>;
  toggleSet: (ex: WorkoutExercise, setId: string, v: SetValues, done: boolean) => Promise<void>;
  setType: (setId: string, t: SetType) => Promise<void>;
  deleteSet: (setId: string) => Promise<void>;
  addSet: (ex: WorkoutExercise) => Promise<void>;
  move: (ex: WorkoutExercise, dir: -1 | 1) => Promise<void>;
  remove: (ex: WorkoutExercise) => Promise<void>;
  update: (ex: WorkoutExercise, p: { restSeconds?: number; notes?: string | null }) => Promise<void>;
  applyWeight: (ex: WorkoutExercise, kg: number) => Promise<void>;
}

const NEXT_TYPE: Record<SetType, SetType> = { working: 'warmup', warmup: 'dropset', dropset: 'failure', failure: 'working' };

interface Props {
  ex: WorkoutExercise;
  workoutId: string;
  previous: HistorySession | undefined;
  advice: ProgressionAdvice | null;
  effortScale: 'rir' | 'rpe';
  first: boolean;
  last: boolean;
  h: ExerciseCardHandlers;
}

export function ExerciseCard({ ex, previous, advice, effortScale, first, last, h }: Props) {
  const [menu, setMenu] = useState(false);
  const [notes, setNotes] = useState(ex.notes ?? '');
  let working = 0;
  const labels = ex.sets.map((s) => (s.setType === 'warmup' ? 'C' : String(++working)));
  const pendingWeight = advice?.action === 'increase_load' && advice.suggestedWeightKg !== null;
  const reps = ex.repMin && ex.repMax ? `${ex.repMin}-${ex.repMax}` : 'reps';
  let prevIdx = 0;

  return (
    <Card padding="md" style={styles.card}>
      <View style={styles.head}>
        <PressableScale
          style={styles.flex}
          activeScale={0.99}
          onPress={() => router.push({ pathname: '/ejercicios/[id]', params: { id: ex.exerciseId } })}
          accessibilityRole="link"
          accessibilityLabel={`${ex.name}, ver ficha y técnica`}
        >
          <AppText variant="title3" color="accent">
            {ex.name}
          </AppText>
          <AppText variant="footnote" color="textSecondary">
            {ex.primaryMuscleName} · {prescriptionText({ repMin: ex.repMin, repMax: ex.repMax, targetRir: ex.targetRir, restSeconds: ex.restSeconds })}
          </AppText>
        </PressableScale>
        <IconButton icon={menu ? 'close' : 'ellipsis-horizontal'} variant="plain" accessibilityLabel={`Opciones de ${ex.name}`} onPress={() => setMenu((m) => !m)} />
      </View>

      {menu ? (
        <View style={styles.menu}>
          <Stepper
            label="Descanso"
            value={ex.restSeconds}
            min={0}
            max={600}
            step={15}
            format={formatRest}
            onChange={(v) => h.update(ex, { restSeconds: v })}
          />
          <View style={styles.menuRow}>
            <IconButton icon="arrow-up" accessibilityLabel="Subir ejercicio" onPress={() => !first && h.move(ex, -1)} />
            <IconButton icon="arrow-down" accessibilityLabel="Bajar ejercicio" onPress={() => !last && h.move(ex, 1)} />
            <IconButton
              icon="swap-horizontal"
              accessibilityLabel="Sustituir ejercicio"
              onPress={() => router.push({ pathname: '/ejercicios', params: { pick: encodePick({ kind: 'workoutReplace', id: ex.id }) } })}
            />
            <IconButton icon="trash-outline" color={colors.danger} accessibilityLabel="Quitar ejercicio" onPress={() => h.remove(ex)} />
          </View>
        </View>
      ) : null}

      {previous ? (
        <AppText variant="caption" color="textTertiary">
          Última vez: {previous.sets.map((s) => `${s.weightKg !== null ? formatKg(s.weightKg) : '—'}×${s.reps ?? '—'}`).join(' · ')}
        </AppText>
      ) : null}

      {advice && advice.action !== 'no_data' ? (
        <View style={[styles.advice, pendingWeight && styles.adviceUp]}>
          <View style={styles.flex}>
            <AppText variant="callout" color={pendingWeight ? 'accent' : 'textPrimary'}>
              {advice.headline}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {advice.detail}
            </AppText>
          </View>
          {pendingWeight ? (
            <Button label={`Usar ${formatKg(advice.suggestedWeightKg!)} kg`} size="md" onPress={() => h.applyWeight(ex, advice.suggestedWeightKg!)} />
          ) : null}
        </View>
      ) : advice?.action === 'no_data' ? (
        <AppText variant="caption" color="textSecondary">
          {advice.detail}
        </AppText>
      ) : null}

      <SetHeader effortScale={effortScale} />
      {ex.sets.map((s, i) => {
        const prev = s.setType === 'warmup' ? null : (previous?.sets[prevIdx++] ?? null);
        return (
          <SetRow
            key={s.id}
            set={s}
            label={labels[i]!}
            previous={prev}
            repsPlaceholder={reps}
            effortScale={effortScale}
            onSave={(v) => h.saveSet(s.id, v)}
            onToggleComplete={(v, done) => h.toggleSet(ex, s.id, v, done)}
            onCycleType={() => h.setType(s.id, NEXT_TYPE[s.setType])}
            onDelete={() => h.deleteSet(s.id)}
          />
        );
      })}
      <View style={styles.footer}>
        <Button label="Añadir serie" icon="add" size="md" variant="secondary" onPress={() => h.addSet(ex)} style={styles.flex} />
        {ex.sets.length > 0 ? (
          <IconButton
            icon="remove-circle-outline"
            accessibilityLabel="Eliminar última serie"
            onPress={() => h.deleteSet(ex.sets[ex.sets.length - 1]!.id)}
          />
        ) : null}
      </View>
      <TextField
        placeholder="Observaciones (técnica, molestias…)"
        value={notes}
        onChangeText={setNotes}
        onBlur={() => notes !== (ex.notes ?? '') && h.update(ex, { notes: notes.trim() || null })}
        accessibilityLabel={`Observaciones de ${ex.name}`}
        compact
        maxLength={300}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  menu: { gap: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radii.md, padding: spacing.md },
  menuRow: { flexDirection: 'row', justifyContent: 'space-around' },
  advice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceRaised },
  adviceUp: { backgroundColor: colors.accentMuted },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
