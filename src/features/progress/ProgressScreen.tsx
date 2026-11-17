import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/charts/Sparkline';
import { AppText, Card, EmptyState, PhaseNotice, Screen, SectionHeader, SegmentedControl, StatTile } from '@/components/ui';
import { createStatsRepository } from '@/database/repositories/statsRepository';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';
import { formatKg } from '@/utils/format';
import { rangeStart, type TimeRange } from '@/utils/time';

const RANGES = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'all', label: 'Todo' },
] as const;

function formatInt(n: number): string {
  return Math.round(n).toLocaleString('es-ES');
}

export function ProgressScreen() {
  const [range, setRange] = useState<TimeRange>('30d');
  const { data, refreshing, refresh } = useDbQuery(
    async (db, userId) => {
      const from = rangeStart(range)?.toISOString() ?? null;
      const repo = createStatsRepository(db);
      const [totals, weights] = await Promise.all([
        repo.getTrainingTotals(userId, from),
        repo.getWeightSeries(userId, from),
      ]);
      return { totals, weights };
    },
    [range],
  );

  const t = data?.totals;
  const hasTraining = !!t && t.workouts > 0;

  return (
    <Screen title="Progreso" refreshing={refreshing} onRefresh={refresh}>
      <SegmentedControl options={RANGES} value={range} onChange={setRange} accessibilityLabel="Periodo" />

      <SectionHeader title="Entrenamiento" />
      <View style={styles.row}>
        <StatTile label="Sesiones" value={t ? formatInt(t.workouts) : null} />
        <StatTile label="Series" value={hasTraining ? formatInt(t.sets) : t ? '0' : null} />
      </View>
      <View style={styles.row}>
        <StatTile label="Repeticiones" value={hasTraining ? formatInt(t.reps) : t ? '0' : null} />
        <StatTile label="Volumen" value={hasTraining ? formatInt(t.volumeKg) : t ? '0' : null} unit="kg" />
      </View>
      <StatTile
        label="Tiempo entrenado"
        value={t ? formatInt(t.durationSeconds / 60) : null}
        unit="min"
        hint="Series de calentamiento excluidas del volumen."
      />

      <SectionHeader title="Peso corporal" />
      {data && data.weights.length >= 2 ? (
        <Card padding="lg" style={styles.gap}>
          <AppText variant="caption" color="textTertiary">
            {data.weights.length} registros · último {formatKg(data.weights[data.weights.length - 1]!.weightKg)} kg
          </AppText>
          <Sparkline
            values={data.weights.map((w) => w.weightKg)}
            height={120}
            accessibilityLabel={`Gráfico de peso con ${data.weights.length} registros`}
          />
        </Card>
      ) : (
        <EmptyState
          icon="scale-outline"
          title="Sin datos en este periodo"
          description="Registra tu peso para ver la tendencia. Una variación aislada no indica ganancia ni pérdida de grasa."
        />
      )}

      <PhaseNotice
        phase={9}
        title="Estadísticas detalladas"
        description="Evolución por ejercicio (cargas, récords, 1RM estimado), por músculo y por composición corporal."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  gap: { gap: spacing.md },
});
