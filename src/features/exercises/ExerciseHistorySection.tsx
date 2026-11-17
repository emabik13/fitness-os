import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/charts/Sparkline';
import { AppText, Button, Card, SectionHeader } from '@/components/ui';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import { bestOneRm } from '@/engine/strength/oneRm';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';
import { formatDayMonth } from '@/utils/dates';
import { formatKg } from '@/utils/format';

/** The user's own history for this exercise (hidden when there is none). */
export function ExerciseHistorySection({ exerciseId }: { exerciseId: string }) {
  const { data } = useDbQuery((db, userId) => createWorkoutRepository(db).history(userId, exerciseId), [exerciseId]);
  if (!data || data.length === 0) return null;
  const last = data[data.length - 1]!;
  const e1rms = data.map((s) => bestOneRm(s.sets)).filter((v): v is number => v !== null);
  return (
    <>
      <SectionHeader title="Tu historial" />
      <Card padding="lg" style={styles.gap}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <AppText variant="overline" color="textTertiary">
              Última sesión · {formatDayMonth(last.startedAt)}
            </AppText>
            <AppText variant="callout">
              {last.sets.map((s) => `${s.weightKg !== null ? formatKg(s.weightKg) : '—'}×${s.reps ?? '—'}`).join('  ')}
            </AppText>
          </View>
          {e1rms.length ? (
            <View>
              <AppText variant="overline" color="textTertiary">
                1RM estimado
              </AppText>
              <AppText variant="metricSmall" color="accent">
                {formatKg(e1rms[e1rms.length - 1]!)} kg
              </AppText>
            </View>
          ) : null}
        </View>
        {e1rms.length >= 2 ? (
          <Sparkline values={e1rms} accessibilityLabel="Evolución del 1RM estimado" />
        ) : null}
        <AppText variant="caption" color="textTertiary">
          {data.length} {data.length === 1 ? 'sesión' : 'sesiones'}. El 1RM es una estimación (fórmula de Epley, series de hasta 12 repeticiones), no una medición.
        </AppText>
        <Button
          label="Ver estadísticas"
          variant="secondary"
          size="md"
          onPress={() => router.push({ pathname: '/estadisticas/ejercicio/[id]', params: { id: exerciseId } })}
        />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: spacing.xs },
});
