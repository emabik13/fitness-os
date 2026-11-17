import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, PressableScale } from '@/components/ui';
import type { SetType, WorkoutSet } from '@/database/repositories/workoutRepository';
import { parseDecimal } from '@/domain/profile';
import { colors, fonts, radii, spacing } from '@/theme';
import { formatKg } from '@/utils/format';

export interface SetValues {
  weightKg: number | null;
  reps: number | null;
  effort: number | null;
}

interface SetRowProps {
  set: WorkoutSet;
  label: string;
  previous: { weightKg: number | null; reps: number | null } | null;
  repsPlaceholder: string;
  effortScale: 'rir' | 'rpe';
  onSave: (values: SetValues) => Promise<void>;
  onToggleComplete: (values: SetValues, done: boolean) => Promise<void>;
  onCycleType: () => void;
  onDelete: () => void;
}

const num = (v: number | null) => (v === null || v === undefined ? '' : formatKg(v));
const TYPE_TAG: Record<SetType, string> = { warmup: 'C', working: '', dropset: 'D', failure: 'F' };

/** One set line: previous · kg · reps · RIR/RPE · ✓. Edits are auto-saved. */
export function SetRow({ set, label, previous, repsPlaceholder, effortScale, onSave, onToggleComplete, onCycleType, onDelete }: SetRowProps) {
  const [weight, setWeight] = useState(num(set.weightKg));
  const [reps, setReps] = useState(set.reps === null ? '' : String(set.reps));
  const [effort, setEffort] = useState(num(effortScale === 'rir' ? set.rir : set.rpe));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ weight, reps, effort });
  useEffect(() => {
    latest.current = { weight, reps, effort };
  }, [weight, reps, effort]);

  const values = (): SetValues => ({
    weightKg: parseDecimal(latest.current.weight),
    reps: parseDecimal(latest.current.reps),
    effort: parseDecimal(latest.current.effort),
  });

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    void onSave(values());
  };
  const schedule = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  // Save pending edits if the row unmounts (e.g. navigating away).
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void onSave(values());
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const toggle = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const v = values();
    if (!set.isCompleted) {
      // Empty fields take the previous session's values (like Hevy's placeholders).
      if (v.weightKg === null && previous?.weightKg !== undefined && previous?.weightKg !== null) {
        v.weightKg = previous.weightKg;
        setWeight(num(previous.weightKg));
      }
      if (v.reps === null && previous?.reps) {
        v.reps = previous.reps;
        setReps(String(previous.reps));
      }
    }
    void onToggleComplete(v, !set.isCompleted);
  };

  const done = set.isCompleted;
  const prevText = previous && (previous.weightKg !== null || previous.reps !== null) ? `${num(previous.weightKg) || '—'}×${previous.reps ?? '—'}` : '—';

  return (
    <View style={[styles.row, done && styles.rowDone]}>
      <PressableScale
        onPress={onCycleType}
        onLongPress={onDelete}
        haptic="selection"
        accessibilityRole="button"
        accessibilityLabel={`Serie ${label}. Pulsa para cambiar el tipo, mantén para eliminar`}
        style={styles.typeCell}
      >
        <AppText variant="bodyStrong" color={set.setType === 'warmup' ? 'warning' : set.setType === 'working' ? 'textPrimary' : 'info'}>
          {TYPE_TAG[set.setType] || label}
        </AppText>
      </PressableScale>
      <AppText variant="footnote" color="textTertiary" style={styles.prev} numberOfLines={1}>
        {prevText}
      </AppText>
      <TextInput
        style={[styles.input, done && styles.inputDone]}
        value={weight}
        onChangeText={(t) => {
          setWeight(t);
          latest.current = { ...latest.current, weight: t };
          schedule();
        }}
        onBlur={flush}
        placeholder={previous?.weightKg !== null && previous?.weightKg !== undefined ? num(previous.weightKg) : 'kg'}
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel={`Peso serie ${label}`}
        maxLength={6}
      />
      <TextInput
        style={[styles.input, done && styles.inputDone]}
        value={reps}
        onChangeText={(t) => {
          const v = t.replace(/[^0-9]/g, '');
          setReps(v);
          latest.current = { ...latest.current, reps: v };
          schedule();
        }}
        onBlur={flush}
        placeholder={previous?.reps ? String(previous.reps) : repsPlaceholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        selectTextOnFocus
        accessibilityLabel={`Repeticiones serie ${label}`}
        maxLength={3}
      />
      <TextInput
        style={[styles.input, styles.inputSmall, done && styles.inputDone]}
        value={effort}
        onChangeText={(t) => {
          setEffort(t);
          latest.current = { ...latest.current, effort: t };
          schedule();
        }}
        onBlur={flush}
        placeholder={effortScale === 'rir' ? 'RIR' : 'RPE'}
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
        selectTextOnFocus
        accessibilityLabel={`${effortScale === 'rir' ? 'RIR' : 'RPE'} serie ${label}`}
        maxLength={4}
      />
      <PressableScale
        onPress={toggle}
        haptic="medium"
        activeScale={0.9}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Completar serie ${label}`}
        style={[styles.check, done && styles.checkDone]}
      >
        <Ionicons name="checkmark" size={22} color={done ? colors.onAccent : colors.textSecondary} />
      </PressableScale>
    </View>
  );
}

export function SetHeader({ effortScale }: { effortScale: 'rir' | 'rpe' }) {
  return (
    <View style={styles.header}>
      <AppText variant="caption" color="textTertiary" style={styles.typeCellH}>
        SERIE
      </AppText>
      <AppText variant="caption" color="textTertiary" style={styles.prev}>
        ANTERIOR
      </AppText>
      <AppText variant="caption" color="textTertiary" style={styles.hCell}>
        KG
      </AppText>
      <AppText variant="caption" color="textTertiary" style={styles.hCell}>
        REPS
      </AppText>
      <AppText variant="caption" color="textTertiary" style={[styles.hCell, styles.inputSmall]}>
        {effortScale.toUpperCase()}
      </AppText>
      <View style={styles.checkH} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.xs, borderRadius: radii.sm },
  rowDone: { backgroundColor: 'rgba(200, 241, 53, 0.08)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  typeCell: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: colors.surfaceRaised },
  typeCellH: { width: 36, textAlign: 'center' },
  prev: { flex: 1.3, textAlign: 'center' },
  input: {
    flex: 1,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 16,
    textAlign: 'center',
    minWidth: 0,
    fontVariant: ['tabular-nums'],
  },
  inputSmall: { flex: 0.8 },
  inputDone: { backgroundColor: 'transparent' },
  hCell: { flex: 1, textAlign: 'center' },
  check: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  checkDone: { backgroundColor: colors.accent },
  checkH: { width: 44 },
});
