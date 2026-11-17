import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { HBar } from '@/components/charts/HBar';
import { AppText, Button, Card, EmptyState, Screen, SectionHeader, StatTile } from '@/components/ui';
import type { MuscleId } from '@/catalog';
import { analyze, type Insight, type InsightAction } from '@/engine/analytics/insights';
import { loadAnalyticsInput } from '@/features/recommendations/loadContext';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, radii, spacing } from '@/theme';

const TONE: Record<Insight['tone'], { icon: ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
  warning: { icon: 'alert-circle', color: colors.warning, bg: colors.warningMuted },
  info: { icon: 'information-circle', color: colors.info, bg: colors.infoMuted },
  positive: { icon: 'checkmark-circle', color: colors.accent, bg: colors.accentMuted },
};

const MUSCLE_ES: Record<string, string> = {
  pectorals: 'Pecho', lats: 'Dorsal', quadriceps: 'Cuádriceps', hamstrings: 'Isquiotibiales', glutes: 'Glúteos', deltoids: 'Hombros',
  biceps: 'Bíceps', triceps: 'Tríceps', calves: 'Gemelos', traps: 'Trapecios', abdominals: 'Abdominales', forearms: 'Antebrazos',
};

function runAction(a: InsightAction) {
  switch (a.kind) {
    case 'exercise':
      return router.push({ pathname: '/ejercicios/[id]', params: { id: a.id } });
    case 'exerciseStats':
      return router.push({ pathname: '/estadisticas/ejercicio/[id]', params: { id: a.id } });
    case 'muscle':
      return router.push({ pathname: '/musculo/[id]', params: { id: a.id } });
    case 'explore':
      return router.push('/rutinas/explorar');
    case 'recovery':
      return router.push('/recuperacion');
  }
}

export function AnalysisScreen() {
  const { data, loading } = useDbQuery(async (db, uid) => {
    const input = await loadAnalyticsInput(db, uid);
    return input ? { input, report: analyze(input.analytics) } : null;
  });
  if (!data) {
    return (
      <Screen title="Análisis" back>
        {!loading ? <EmptyState icon="person-outline" title="Configura tu perfil" description="El análisis compara tu historial con tu plan." /> : null}
      </Screen>
    );
  }
  const { report, input } = data;
  const planned = input.analytics.plannedDays;
  const muscles = (Object.entries(report.weeklyDirect) as [MuscleId, number][]).sort((a, b) => b[1] - a[1]);

  return (
    <Screen title="Análisis" subtitle="Tu historial" back>
      <View style={styles.row}>
        <StatTile
          label="Sesiones/semana"
          value={report.meanSessions !== null ? String(Math.round(report.meanSessions * 10) / 10).replace('.', ',') : null}
          hint={`Plan: ${planned}`}
        />
        <StatTile label="Semanas analizadas" value={String(input.analytics.weeklyCounts.length)} hint="Desde tu 1.er entreno" />
      </View>

      <SectionHeader title="Diagnóstico" />
      {report.insights.map((ins) => {
        const t = TONE[ins.tone];
        return (
          <Card key={ins.id} padding="lg" style={styles.gap}>
            <View style={styles.insHead}>
              <View style={[styles.icon, { backgroundColor: t.bg }]}>
                <Ionicons name={t.icon} size={18} color={t.color} />
              </View>
              <AppText variant="bodyStrong" style={styles.flex}>
                {ins.title}
              </AppText>
            </View>
            <AppText variant="footnote" color="textSecondary">
              {ins.detail}
            </AppText>
            {ins.actions.length ? (
              <View style={styles.actions}>
                {ins.actions.map((a) => (
                  <Button key={a.label} label={a.label} size="md" variant="secondary" onPress={() => runAction(a)} />
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}

      <SectionHeader title="Probabilidad de completar sesiones" />
      <Card padding="lg" style={styles.gap}>
        {report.adherenceCurve.map((a) => (
          <HBar
            key={a.sessionsPerWeek}
            label={`≥ ${a.sessionsPerWeek} ${a.sessionsPerWeek === 1 ? 'sesión' : 'sesiones'}/semana${a.sessionsPerWeek === planned ? ' (tu plan)' : ''}`}
            value={a.probability}
            max={1}
            valueLabel={
              a.basis === 'history'
                ? `${Math.round(a.probability * 100)} % (${Math.round(a.low * 100)}–${Math.round(a.high * 100)} %)`
                : `${Math.round(a.probability * 100)} % (supuesto)`
            }
          />
        ))}
        <AppText variant="caption" color="textTertiary">
          {report.adherenceCurve[0]!.basis === 'history'
            ? 'Modelo Beta-Binomial con tus semanas completas: (1 + semanas que lo lograste) / (2 + semanas observadas). Entre paréntesis, intervalo creíble del 90 %.'
            : 'Con menos de 3 semanas completas no hay datos para estimarlo: se muestra una suposición inicial basada en los días que declaraste.'}
        </AppText>
      </Card>

      <SectionHeader title={`Series directas por semana (últimas ${input.analytics.windowWeeks} sem.)`} />
      {muscles.length ? (
        <Card padding="lg" style={styles.gap}>
          {muscles.map(([m, v]) => (
            <HBar key={m} label={MUSCLE_ES[m] ?? m} value={v} max={Math.max(20, ...muscles.map((x) => x[1]))} valueLabel={`${String(Math.round(v * 10) / 10).replace('.', ',')} series`} />
          ))}
          <AppText variant="caption" color="textTertiary">
            Referencias habituales: 6–10 series/semana como mínimo eficaz para ganar músculo; más de 20 rara vez aporta beneficio adicional.
          </AppText>
        </Card>
      ) : (
        <AppText variant="footnote" color="textSecondary">
          Completa entrenamientos para ver el reparto de volumen.
        </AppText>
      )}

      <Button label="Explorar rutinas recomendadas" icon="albums-outline" onPress={() => router.push('/rutinas/explorar')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  gap: { gap: spacing.md },
  insHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
