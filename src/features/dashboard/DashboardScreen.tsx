import { StyleSheet, View } from 'react-native';

import { HBar } from '@/components/charts/HBar';
import { Sparkline } from '@/components/charts/Sparkline';
import { WeekStrip } from '@/components/charts/WeekStrip';
import { AppText, Badge, Card, EmptyState, Screen, SectionHeader, StatTile } from '@/components/ui';
import { goalLabel, RECORD_TYPE_LABELS } from '@/constants/labels';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';
import { formatKg, formatLongDate, greeting } from '@/utils/format';
import { weekDays } from '@/utils/time';

import { loadDashboard } from './loadDashboard';

export function DashboardScreen() {
  const now = new Date();
  const { data, error, refreshing, refresh } = useDbQuery((db, userId) => loadDashboard(db, userId));

  return (
    <Screen
      subtitle={formatLongDate(now)}
      title={greeting(now)}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {error ? (
        <EmptyState icon="warning-outline" title="Error al cargar" description={error.message} />
      ) : null}

      {/* Today */}
      <Card variant="raised" padding="xl" style={styles.hero}>
        <View style={styles.heroTop}>
          <AppText variant="overline" color="textTertiary" numberOfLines={1} style={styles.flex}>
            Hoy
          </AppText>
          <Badge label={goalLabel(data?.profile?.goal)} tone="accent" />
        </View>
        {data?.activeRoutineName ? (
          <AppText variant="title2">{data.activeRoutineName}</AppText>
        ) : (
          <>
            <AppText variant="title2">Sin rutina activa</AppText>
            <AppText variant="footnote" color="textSecondary">
              Cuando generes o crees una rutina, aquí verás la sesión del día con sus ejercicios, series y
              descansos.
            </AppText>
          </>
        )}
      </Card>

      {/* Week */}
      <SectionHeader title="Esta semana" />
      <Card padding="lg" style={styles.gapMd}>
        <WeekStrip days={weekDays(now)} trainedKeys={data?.trainedDayKeys ?? new Set()} today={now} />
        <AppText variant="footnote" color="textSecondary">
          {data
            ? `${data.workoutsThisWeek} ${data.workoutsThisWeek === 1 ? 'entrenamiento completado' : 'entrenamientos completados'}`
            : ' '}
        </AppText>
      </Card>

      {/* Body */}
      <View style={styles.row}>
        <StatTile
          label="Peso actual"
          value={data?.latestWeight ? formatKg(data.latestWeight.weightKg) : null}
          unit="kg"
          hint={data?.latestWeight ? undefined : 'Sin registros'}
        />
        <StatTile
          label="Peso objetivo"
          value={data?.profile?.targetWeightKg != null ? formatKg(data.profile.targetWeightKg) : null}
          unit="kg"
          hint={data?.profile?.targetWeightKg != null ? undefined : 'Opcional'}
        />
      </View>

      <SectionHeader title="Evolución del peso" />
      {data && data.weightSeries.length >= 2 ? (
        <Card padding="lg" style={styles.gapMd}>
          <AppText variant="caption" color="textTertiary">
            Últimos 30 días · {data.weightSeries.length} registros
          </AppText>
          <Sparkline
            values={data.weightSeries.map((p) => p.weightKg)}
            accessibilityLabel={`Evolución del peso, ${data.weightSeries.length} registros en 30 días`}
          />
        </Card>
      ) : (
        <EmptyState
          icon="trending-up-outline"
          title="Aún no hay tendencia"
          description="Necesitas al menos dos registros de peso. La tendencia usará promedios móviles, no pesajes aislados."
        />
      )}

      <SectionHeader title="Último récord" />
      {data?.latestRecord ? (
        <Card padding="lg" style={styles.gapXs}>
          <AppText variant="overline" color="textTertiary">
            {RECORD_TYPE_LABELS[data.latestRecord.recordType] ?? data.latestRecord.recordType}
          </AppText>
          <AppText variant="title3">{data.latestRecord.exerciseName}</AppText>
          <AppText variant="metricSmall" color="accent">
            {data.latestRecord.weightKg != null ? `${formatKg(data.latestRecord.weightKg)} kg` : ''}
            {data.latestRecord.reps != null ? ` × ${data.latestRecord.reps}` : ''}
          </AppText>
        </Card>
      ) : (
        <EmptyState
          icon="trophy-outline"
          title="Sin récords todavía"
          description="Los récords personales se detectan automáticamente al completar series."
        />
      )}

      <SectionHeader title="Resumen muscular" />
      {data && data.muscleSets.length > 0 ? (
        <Card padding="lg" style={styles.gapMd}>
          {data.muscleSets.map((m) => (
            <HBar
              key={m.muscleGroupId}
              label={m.name}
              value={m.sets}
              max={Math.max(...data.muscleSets.map((x) => x.sets))}
              valueLabel={`${m.sets} series`}
            />
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="body-outline"
          title="Sin series esta semana"
          description="Aquí verás las series efectivas por grupo muscular de la semana actual."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: spacing.md },
  gapMd: { gap: spacing.md },
  gapXs: { gap: spacing.xs },
});
