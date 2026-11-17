import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { HBar } from '@/components/charts/HBar';
import { Sparkline } from '@/components/charts/Sparkline';
import { WeekStrip } from '@/components/charts/WeekStrip';
import { AppText, Badge, Button, Card, EmptyState, PressableScale, Screen, SectionHeader, StatTile } from '@/components/ui';
import { formatRecord, goalLabel, RECORD_TYPE_LABELS } from '@/constants/labels';
import { useDatabase } from '@/database/DatabaseProvider';
import { startWorkout } from '@/features/workouts/startWorkout';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, radii, spacing } from '@/theme';
import { notify } from '@/utils/dialog';
import { prescriptionText } from '@/utils/duration';
import { formatKg, formatLongDate, greeting } from '@/utils/format';
import { weekDays } from '@/utils/time';

import { loadDashboard } from './loadDashboard';

type IconName = ComponentProps<typeof Ionicons>['name'];
const QUICK: { label: string; icon: IconName; href: '/registro/peso' | '/registro/medidas' | '/nutricion' | '/recuperacion' }[] = [
  { label: 'Peso', icon: 'scale-outline', href: '/registro/peso' },
  { label: 'Medidas', icon: 'resize-outline', href: '/registro/medidas' },
  { label: 'Nutrición', icon: 'restaurant-outline', href: '/nutricion' },
  { label: 'Recuperación', icon: 'moon-outline', href: '/recuperacion' },
];

export function DashboardScreen() {
  const now = new Date();
  const { db, userId } = useDatabase();
  const { data, error, refreshing, refresh } = useDbQuery((d, uid) => loadDashboard(d, uid));
  const target = data?.profile?.daysPerWeek ?? null;

  const start = async (dayId: string) => {
    try {
      await startWorkout(db, userId, dayId);
    } catch (e) {
      notify('No se pudo empezar', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen subtitle={formatLongDate(now)} title={greeting(now)} refreshing={refreshing} onRefresh={refresh}>
      {error ? <EmptyState icon="warning-outline" title="Error al cargar" description={error.message} /> : null}

      {/* Today */}
      {data?.active ? (
        <Card variant="accent" padding="xl" style={styles.hero} onPress={() => router.push({ pathname: '/entrenamiento/[id]', params: { id: data.active!.id } })} accessibilityLabel="Continuar entrenamiento">
          <AppText variant="overline" color="onAccent">
            Entrenamiento en curso
          </AppText>
          <AppText variant="title2" color="onAccent">
            {data.active.name}
          </AppText>
          <AppText variant="callout" color="onAccent">
            Continuar →
          </AppText>
        </Card>
      ) : (
        <Card variant="raised" padding="xl" style={styles.hero}>
          <View style={styles.heroTop}>
            <AppText variant="overline" color="textTertiary" numberOfLines={1} style={styles.flex}>
              {data?.next ? `Próximo · ${data.next.routineName}` : 'Hoy'}
            </AppText>
            <Badge label={goalLabel(data?.profile?.goal)} tone="accent" />
          </View>
          {data?.next ? (
            <>
              <AppText variant="title2">{data.next.day.name}</AppText>
              {data.next.day.exercises.slice(0, 4).map((e) => (
                <AppText key={e.id} variant="footnote" color="textSecondary" numberOfLines={1}>
                  {e.name} · {prescriptionText(e)}
                </AppText>
              ))}
              {data.next.day.exercises.length > 4 ? (
                <AppText variant="footnote" color="textTertiary">
                  +{data.next.day.exercises.length - 4} ejercicios más
                </AppText>
              ) : null}
              <Button label="Empezar entrenamiento" icon="play" onPress={() => start(data.next!.day.id)} style={styles.mt} />
            </>
          ) : (
            <>
              <AppText variant="title2">Sin rutina activa</AppText>
              <AppText variant="footnote" color="textSecondary">
                Genera una rutina adaptada a tu perfil y la sesión del día aparecerá aquí.
              </AppText>
              <Button label="Generar mi rutina" icon="sparkles-outline" onPress={() => router.push('/rutinas/generar')} style={styles.mt} />
              <Button label="Ver rutinas recomendadas" variant="ghost" size="md" onPress={() => router.push('/rutinas/explorar')} />
            </>
          )}
        </Card>
      )}

      {/* Quick actions */}
      <View style={styles.quick}>
        {QUICK.map((q) => (
          <PressableScale key={q.href} onPress={() => router.push(q.href)} accessibilityRole="button" accessibilityLabel={`Registrar ${q.label}`} style={styles.quickItem}>
            <Ionicons name={q.icon} size={22} color={colors.accent} />
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {q.label}
            </AppText>
          </PressableScale>
        ))}
      </View>

      {/* Week */}
      <SectionHeader title="Esta semana" />
      <Card padding="lg" style={styles.gapMd}>
        <WeekStrip days={weekDays(now)} trainedKeys={data?.trainedDayKeys ?? new Set()} today={now} />
        <View style={styles.rowBetween}>
          <AppText variant="footnote" color="textSecondary">
            {data
              ? target
                ? `${data.workoutsThisWeek} de ${target} ${target === 1 ? 'sesión' : 'sesiones'} planificadas`
                : `${data.workoutsThisWeek} ${data.workoutsThisWeek === 1 ? 'entrenamiento completado' : 'entrenamientos completados'}`
              : ' '}
          </AppText>
          {data && data.streakWeeks > 0 ? <Badge label={`Racha: ${data.streakWeeks} sem.`} tone="accent" /> : null}
        </View>
      </Card>

      {/* Body */}
      <View style={styles.row}>
        <StatTile
          label="Peso (media 7 d)"
          value={data?.trend.currentAverage != null ? formatKg(data.trend.currentAverage) : data?.latestWeight ? formatKg(data.latestWeight.weightKg) : null}
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

      <SectionHeader title="Evolución del peso" actionLabel="Registrar" onAction={() => router.push('/registro/peso')} />
      {data && data.weightSeries.length >= 2 ? (
        <Card padding="lg" style={styles.gapMd}>
          <AppText variant="caption" color="textTertiary">
            Últimos 30 días · {data.weightSeries.length} registros
          </AppText>
          <Sparkline
            values={data.weightSeries.map((p) => p.weightKg)}
            accessibilityLabel={`Evolución del peso, ${data.weightSeries.length} registros en 30 días`}
          />
          <AppText variant="caption" color="textSecondary">
            {data.trend.message}
          </AppText>
        </Card>
      ) : (
        <EmptyState
          icon="trending-up-outline"
          title="Aún no hay tendencia"
          description="Necesitas al menos dos registros de peso. La tendencia usa promedios móviles, no pesajes aislados."
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
            {formatRecord(data.latestRecord.recordType, data.latestRecord.value, data.latestRecord.weightKg, data.latestRecord.reps)}
          </AppText>
        </Card>
      ) : (
        <EmptyState icon="trophy-outline" title="Sin récords todavía" description="Los récords personales se detectan automáticamente al completar series." />
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
          <AppText variant="caption" color="textTertiary">
            Series directas esta semana (músculo como agonista).
          </AppText>
        </Card>
      ) : (
        <EmptyState icon="body-outline" title="Sin series esta semana" description="Aquí verás las series efectivas por grupo muscular de la semana actual." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.sm },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  mt: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  gapMd: { gap: spacing.md },
  gapXs: { gap: spacing.xs },
  quick: { flexDirection: 'row', gap: spacing.sm },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
});
