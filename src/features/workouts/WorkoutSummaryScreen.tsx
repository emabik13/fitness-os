import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen, SectionHeader, StatTile } from '@/components/ui';
import { formatRecord, RECORD_TYPE_LABELS } from '@/constants/labels';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, spacing } from '@/theme';
import { formatShortDate } from '@/utils/dates';
import { formatDuration } from '@/utils/duration';
import { formatKg } from '@/utils/format';

const int = (n: number) => Math.round(n).toLocaleString('es-ES');

function Delta({ now, before, unit }: { now: number; before: number; unit: string }) {
  const d = now - before;
  const pct = before > 0 ? Math.round((d / before) * 100) : null;
  const tone = d > 0 ? 'accent' : d < 0 ? 'warning' : 'textSecondary';
  return (
    <AppText variant="callout" color={tone}>
      {d > 0 ? '+' : ''}
      {int(d)} {unit}
      {pct !== null ? ` (${pct > 0 ? '+' : ''}${pct} %)` : ''}
    </AppText>
  );
}

export function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useDbQuery((db, userId) => createWorkoutRepository(db).summary(userId, id), [id]);
  if (!data) {
    return (
      <Screen title="Resumen" back>
        {!loading ? <EmptyState icon="alert-circle-outline" title="Entrenamiento no encontrado" description="Puede que se haya eliminado." /> : null}
      </Screen>
    );
  }
  const { workout, totals, records, previous } = data;
  return (
    <Screen
      title={workout.name}
      subtitle={`${workout.status === 'completed' ? 'Completado' : 'En curso'} · ${formatShortDate(workout.startedAt)}`}
      back
      footer={<Button label="Volver al inicio" onPress={() => router.replace('/')} />}
    >
      <View style={styles.row}>
        <StatTile label="Tiempo" value={formatDuration(totals.durationSeconds)} />
        <StatTile label="Ejercicios" value={String(totals.exercises)} />
      </View>
      <View style={styles.row}>
        <StatTile label="Series" value={String(totals.sets)} />
        <StatTile label="Repeticiones" value={int(totals.reps)} />
      </View>
      <StatTile label="Volumen total" value={int(totals.volumeKg)} unit="kg" hint="Peso × repeticiones de series efectivas (sin calentamiento)." />

      <SectionHeader title="Récords personales" />
      {records.length ? (
        <Card padding="lg" style={styles.gap}>
          {records.map((r, i) => (
            <View key={i} style={styles.rec}>
              <Ionicons name="trophy" size={18} color={colors.accent} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{r.exerciseName}</AppText>
                <AppText variant="footnote" color="textSecondary">
                  {RECORD_TYPE_LABELS[r.type]}: {formatRecord(r.type, r.value, r.weightKg, r.reps)}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <AppText variant="footnote" color="textSecondary">
          Sin récords en esta sesión. Los récords se comparan con todo tu historial (la primera vez que haces un ejercicio solo se registra como referencia).
        </AppText>
      )}

      <SectionHeader title="Comparación con la sesión anterior" />
      {previous ? (
        <Card padding="lg" style={styles.gap}>
          <AppText variant="caption" color="textTertiary">
            {formatShortDate(previous.startedAt)}
          </AppText>
          <View style={styles.cmp}>
            <AppText variant="callout">Volumen</AppText>
            <Delta now={totals.volumeKg} before={previous.volumeKg} unit="kg" />
          </View>
          <View style={styles.cmp}>
            <AppText variant="callout">Series</AppText>
            <Delta now={totals.sets} before={previous.sets} unit="" />
          </View>
          <View style={styles.cmp}>
            <AppText variant="callout">Repeticiones</AppText>
            <Delta now={totals.reps} before={previous.reps} unit="" />
          </View>
          <AppText variant="caption" color="textTertiary">
            El volumen varía con la selección de ejercicios y el número de series; compáralo junto con las cargas de cada ejercicio.
          </AppText>
        </Card>
      ) : (
        <AppText variant="footnote" color="textSecondary">
          Es la primera vez que haces esta sesión.
        </AppText>
      )}

      <SectionHeader title="Detalle" />
      {workout.exercises.map((e) => (
        <Card key={e.id} padding="lg" style={styles.gapSm}>
          <AppText variant="bodyStrong">{e.name}</AppText>
          {e.sets.map((s, i) => (
            <AppText key={s.id} variant="footnote" color={s.setType === 'warmup' ? 'textTertiary' : 'textSecondary'}>
              {s.setType === 'warmup' ? 'C' : i + 1}.  {s.weightKg !== null ? `${formatKg(s.weightKg)} kg` : '—'} × {s.reps ?? '—'}
              {s.rir !== null ? ` · RIR ${formatKg(s.rir)}` : ''}
              {s.rpe !== null ? ` · RPE ${formatKg(s.rpe)}` : ''}
            </AppText>
          ))}
          {e.notes ? (
            <AppText variant="caption" color="textTertiary">
              {e.notes}
            </AppText>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.xs },
  rec: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1 },
  cmp: { flexDirection: 'row', justifyContent: 'space-between' },
});
