import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/charts/Sparkline';
import { AppText, Card, EmptyState, Screen, SectionHeader, SegmentedControl, StatTile } from '@/components/ui';
import { formatRecord, RECORD_TYPE_LABELS } from '@/constants/labels';
import { createExerciseRepository } from '@/database/repositories/exerciseRepository';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import { frequencyPerWeek, perSessionStats } from '@/engine/statistics/exerciseStats';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';
import { formatShortDate } from '@/utils/dates';
import { formatKg } from '@/utils/format';
import { rangeStart, type TimeRange } from '@/utils/time';

export const RANGE_OPTIONS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'all', label: 'Todo' },
] as const;

function ChartCard({ title, values, unit, fmt = formatKg }: { title: string; values: number[]; unit: string; fmt?: (n: number) => string }) {
  if (values.length < 2) return null;
  const last = values[values.length - 1]!;
  const first = values[0]!;
  return (
    <Card padding="lg" style={styles.gap}>
      <View style={styles.rowBetween}>
        <AppText variant="callout">{title}</AppText>
        <AppText variant="callout" color="textSecondary">
          {fmt(first)} → {fmt(last)} {unit}
        </AppText>
      </View>
      <Sparkline values={values} height={90} accessibilityLabel={`${title}: de ${fmt(first)} a ${fmt(last)} ${unit}`} />
    </Card>
  );
}

export function ExerciseStatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [range, setRange] = useState<TimeRange>('3m');
  const { data } = useDbQuery(
    async (db, userId) => {
      const from = rangeStart(range)?.toISOString() ?? null;
      const [exercise, history, records] = await Promise.all([
        createExerciseRepository(db).get(id),
        createWorkoutRepository(db).history(userId, id),
        db.getAllAsync<{ record_type: string; value: number; weight_kg: number | null; reps: number | null; achieved_at: string }>(
          `SELECT record_type, value, weight_kg, reps, achieved_at FROM personal_records
            WHERE user_id = ? AND exercise_id = ? AND deleted_at IS NULL ORDER BY achieved_at DESC LIMIT 12`,
          [userId, id],
        ),
      ]);
      const inRange = history.filter((h) => !from || h.startedAt >= from);
      return { exercise, stats: perSessionStats(inRange), records, from };
    },
    [id, range],
  );

  const stats = data?.stats ?? [];
  const e1 = stats.map((s) => s.bestE1rm).filter((v): v is number => v !== null);
  const top = stats.map((s) => s.topWeightKg).filter((v): v is number => v !== null);

  return (
    <Screen title={data?.exercise?.name ?? 'Estadísticas'} subtitle="Estadísticas" back>
      <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} accessibilityLabel="Periodo" />
      {stats.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="Sin sesiones en este periodo" description="Completa entrenamientos con este ejercicio para ver su evolución." />
      ) : (
        <>
          <View style={styles.row}>
            <StatTile label="Sesiones" value={String(stats.length)} />
            <StatTile label="Frecuencia" value={String(frequencyPerWeek(stats, data?.from ?? null)).replace('.', ',')} unit="/sem" />
          </View>
          <View style={styles.row}>
            <StatTile label="Peso máx." value={top.length ? formatKg(Math.max(...top)) : null} unit="kg" />
            <StatTile label="1RM estimado" value={e1.length ? formatKg(Math.max(...e1)) : null} unit="kg" hint="Estimación (Epley)" />
          </View>
          <ChartCard title="Carga máxima por sesión" values={top} unit="kg" />
          <ChartCard title="1RM estimado" values={e1} unit="kg" />
          <ChartCard title="Volumen por sesión" values={stats.map((s) => s.volumeKg)} unit="kg" fmt={(n) => Math.round(n).toLocaleString('es-ES')} />
          <ChartCard title="Repeticiones por sesión" values={stats.map((s) => s.reps)} unit="reps" fmt={(n) => String(Math.round(n))} />
        </>
      )}

      <SectionHeader title="Récords" />
      {data && data.records.length ? (
        <Card padding="lg" style={styles.gap}>
          {data.records.map((r, i) => (
            <View key={i} style={styles.rowBetween}>
              <AppText variant="callout" style={styles.flex}>
                {RECORD_TYPE_LABELS[r.record_type] ?? r.record_type}
              </AppText>
              <AppText variant="callout" color="accent" style={styles.flex}>
                {formatRecord(r.record_type, r.value, r.weight_kg, r.reps)}
              </AppText>
              <AppText variant="caption" color="textTertiary">
                {formatShortDate(r.achieved_at)}
              </AppText>
            </View>
          ))}
        </Card>
      ) : (
        <AppText variant="footnote" color="textSecondary">
          Aún no hay récords para este ejercicio.
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  gap: { gap: spacing.md },
  flex: { flex: 1 },
});
