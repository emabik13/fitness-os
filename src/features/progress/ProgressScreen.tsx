import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HBar } from '@/components/charts/HBar';
import { Sparkline } from '@/components/charts/Sparkline';
import { WeekBars } from '@/components/charts/WeekBars';
import { AppText, Card, EmptyState, ListGroup, ListRow, Screen, SectionHeader, SegmentedControl, StatTile } from '@/components/ui';
import { BODY_FAT_METHOD_LABELS, createBodyRepository } from '@/database/repositories/bodyRepository';
import { createNutritionRepository } from '@/database/repositories/nutritionRepository';
import { averageRecovery, createRecoveryRepository } from '@/database/repositories/recoveryRepository';
import { createStatsRepository } from '@/database/repositories/statsRepository';
import { createWorkoutRepository } from '@/database/repositories/workoutRepository';
import type { SqlExecutor } from '@/database/types';
import { movingAverage, summarizeTrend } from '@/engine/body/weightTrend';
import { bucketize } from '@/engine/statistics/buckets';
import { RANGE_OPTIONS } from '@/features/statistics/ExerciseStatsScreen';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';
import { formatShortDate } from '@/utils/dates';
import { formatDuration } from '@/utils/duration';
import { formatKg } from '@/utils/format';
import { rangeStart, toLocalDateKey, type TimeRange } from '@/utils/time';

const int = (n: number) => Math.round(n).toLocaleString('es-ES');

export async function loadProgress(db: SqlExecutor, userId: string, range: TimeRange, now = new Date()) {
  const fromDate = rangeStart(range, now);
  const from = fromDate?.toISOString() ?? null;
  const stats = createStatsRepository(db);
  const body = createBodyRepository(db);
  const dayFrom = fromDate ? toLocalDateKey(fromDate) : '0000-01-01';
  const [totals, workouts, muscles, top, weights, measurements, nutrition, recovery] = await Promise.all([
    stats.getTrainingTotals(userId, from),
    createWorkoutRepository(db).listCompleted(userId, from, 200),
    stats.muscleVolume(userId, from),
    stats.topExercises(userId, from),
    body.listWeights(userId, from),
    body.listMeasurements(userId, from),
    createNutritionRepository(db).dailyTotals(userId, dayFrom, toLocalDateKey(now)),
    createRecoveryRepository(db).list(userId, dayFrom),
  ]);
  const weeks = fromDate ? Math.max(1, (now.getTime() - fromDate.getTime()) / (7 * 86_400_000)) : null;
  return { totals, workouts, muscles, top, weights, measurements, nutrition, recovery, weeks };
}

export function ProgressScreen() {
  const [range, setRange] = useState<TimeRange>('30d');
  const { data, refreshing, refresh } = useDbQuery((db, uid) => loadProgress(db, uid, range), [range]);
  const t = data?.totals;
  const buckets = data ? bucketize(data.workouts.map((w) => w.startedAt), range) : [];
  const trend = data ? summarizeTrend(data.weights) : null;
  const ma = data ? movingAverage(data.weights) : [];
  const maxEff = Math.max(1, ...(data?.muscles ?? []).map((m) => m.effective));
  const lastFat = [...(data?.measurements ?? [])].reverse().find((m) => m.bodyFatPct !== null);
  const nutAvg = data && data.nutrition.length
    ? {
        kcal: data.nutrition.reduce((a, d) => a + d.caloriesKcal, 0) / data.nutrition.length,
        p: data.nutrition.reduce((a, d) => a + d.proteinG, 0) / data.nutrition.length,
        days: data.nutrition.length,
      }
    : null;
  const rec = data ? averageRecovery(data.recovery) : null;

  return (
    <Screen title="Progreso" refreshing={refreshing} onRefresh={refresh}>
      <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} accessibilityLabel="Periodo" />

      <SectionHeader title="Entrenamiento" />
      <View style={styles.row}>
        <StatTile label="Sesiones" value={t ? int(t.workouts) : null} />
        <StatTile label="Tiempo" value={t ? formatDuration(t.durationSeconds) : null} />
      </View>
      <View style={styles.row}>
        <StatTile label="Series" value={t ? int(t.sets) : null} />
        <StatTile label="Repeticiones" value={t ? int(t.reps) : null} />
      </View>
      <StatTile label="Volumen" value={t ? int(t.volumeKg) : null} unit="kg" hint="Series de calentamiento excluidas." />
      {t && t.workouts > 0 ? (
        <Card padding="lg" style={styles.gap}>
          <AppText variant="callout">Sesiones por {range === '7d' || range === '30d' || range === '3m' ? 'semana' : 'mes'}</AppText>
          <WeekBars values={buckets.map((b) => b.count)} labels={buckets.map((b) => b.label)} accessibilityLabel="Sesiones por periodo" />
        </Card>
      ) : null}

      <SectionHeader title="Volumen por músculo" />
      {data && data.muscles.length ? (
        <Card padding="lg" style={styles.gap}>
          {data.muscles.map((m) => (
            <HBar
              key={m.muscleGroupId}
              label={m.name}
              value={m.effective}
              max={maxEff}
              valueLabel={
                data.weeks
                  ? `${formatKg(Math.round((m.effective / data.weeks) * 10) / 10)} series/sem`
                  : `${formatKg(m.effective)} series`
              }
            />
          ))}
          <AppText variant="caption" color="textTertiary">
            Series efectivas: agonista = 1, sinergista = 0,5.
          </AppText>
        </Card>
      ) : (
        <EmptyState icon="body-outline" title="Sin series en este periodo" description="El volumen por músculo aparecerá al completar entrenamientos." />
      )}

      {data && data.top.length ? (
        <>
          <SectionHeader title="Por ejercicio" />
          <ListGroup>
            {data.top.map((e) => (
              <ListRow
                key={e.exerciseId}
                title={e.name}
                subtitle={`${e.sessions} ${e.sessions === 1 ? 'sesión' : 'sesiones'} · ${e.sets} series`}
                onPress={() => router.push({ pathname: '/estadisticas/ejercicio/[id]', params: { id: e.exerciseId } })}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      {data && data.workouts.length ? (
        <>
          <SectionHeader title="Por entrenamiento" />
          <ListGroup>
            {data.workouts.slice(0, 15).map((w) => (
              <ListRow
                key={w.id}
                title={w.name}
                subtitle={`${formatShortDate(w.startedAt)} · ${w.durationSeconds ? formatDuration(w.durationSeconds) : '—'} · ${w.sets} series`}
                trailing={w.volumeKg ? `${int(w.volumeKg)} kg` : undefined}
                onPress={() => router.push({ pathname: '/entrenamiento/resumen/[id]', params: { id: w.id } })}
              />
            ))}
          </ListGroup>
        </>
      ) : null}

      <SectionHeader title="Composición corporal" actionLabel="Registrar" onAction={() => router.push('/registro/peso')} />
      {ma.length >= 2 ? (
        <Card padding="lg" style={styles.gap}>
          <View style={styles.rowBetween}>
            <AppText variant="callout">Peso · media 7 días</AppText>
            <AppText variant="callout" color="textSecondary">
              {formatKg(ma[0]!.average)} → {formatKg(ma[ma.length - 1]!.average)} kg
            </AppText>
          </View>
          <Sparkline values={ma.map((p) => p.average)} height={110} accessibilityLabel="Media móvil del peso" />
          <AppText variant="footnote" color="textSecondary">
            {trend?.message}
          </AppText>
        </Card>
      ) : (
        <EmptyState icon="scale-outline" title="Sin tendencia de peso" description="Necesitas al menos dos pesajes en el periodo. Una variación aislada no indica cambio de grasa." />
      )}
      <ListGroup>
        <ListRow icon="scale-outline" title="Peso corporal" subtitle={`${data?.weights.length ?? 0} registros en el periodo`} onPress={() => router.push('/registro/peso')} />
        <ListRow
          icon="resize-outline"
          title="Medidas"
          subtitle={
            lastFat
              ? `Último % grasa: ${formatKg(lastFat.bodyFatPct!)} %${lastFat.bodyFatErrorPct !== null ? ` ±${formatKg(lastFat.bodyFatErrorPct)}` : ''} (${BODY_FAT_METHOD_LABELS[lastFat.bodyFatMethod!]}, estimación)`
              : `${data?.measurements.length ?? 0} registros en el periodo`
          }
          onPress={() => router.push('/registro/medidas')}
        />
      </ListGroup>

      <SectionHeader title="Nutrición y recuperación" />
      <ListGroup>
        <ListRow
          icon="restaurant-outline"
          title="Nutrición"
          subtitle={nutAvg ? `Media: ${int(nutAvg.kcal)} kcal · ${int(nutAvg.p)} g proteína (${nutAvg.days} días registrados)` : 'Sin registros en el periodo'}
          onPress={() => router.push('/nutricion')}
        />
        <ListRow
          icon="moon-outline"
          title="Recuperación"
          subtitle={
            rec && rec.days
              ? `Sueño medio ${rec.sleepHours !== null ? formatKg(rec.sleepHours) : '—'} h · recuperación ${rec.recoveryScore !== null ? formatKg(rec.recoveryScore) : '—'}/5`
              : 'Sin registros en el periodo'
          }
          onPress={() => router.push('/recuperacion')}
        />
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  gap: { gap: spacing.md },
});
