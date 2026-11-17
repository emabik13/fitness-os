import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { CATALOG_EXERCISES } from '@/catalog';
import { useDatabase } from '@/database/DatabaseProvider';
import { createRoutineRepository } from '@/database/repositories/routineRepository';
import { parseRecommendationId, scoreRoutine } from '@/engine/recommendations/recommendRoutines';
import { generateRoutine } from '@/engine/workout-generator/generateRoutine';
import { loadRecommendationInputs } from '@/features/recommendations/loadContext';
import { ScoreRing, scoreColor } from '@/features/recommendations/ScoreRing';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, radii, spacing } from '@/theme';
import { notify } from '@/utils/dialog';
import { prescriptionText } from '@/utils/duration';
import { haptics } from '@/utils/haptics';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function GenerateRoutineScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { db, userId } = useDatabase();
  const { data, loading } = useDbQuery(
    async (d, uid) => {
      const inputs = await loadRecommendationInputs(d, uid);
      if (!inputs) return null;
      const opts = (id && parseRecommendationId(id)) || {};
      const routine = generateRoutine(inputs.input, CATALOG_EXERCISES, opts);
      return { routine, rec: scoreRoutine(inputs.input, routine, inputs.ctx) };
    },
    [id],
  );

  if (!data) {
    return (
      <Screen title="Generar rutina" back>
        {!loading ? (
          <EmptyState icon="person-outline" title="Configura tu perfil" description="El generador necesita tu objetivo, experiencia y disponibilidad." />
        ) : null}
      </Screen>
    );
  }
  const { routine: plan, rec } = data;

  const save = async (activate: boolean) => {
    try {
      const rid = await createRoutineRepository(db).saveGenerated(userId, plan, activate);
      haptics.success();
      router.replace({ pathname: '/rutinas/[id]', params: { id: rid } });
    } catch (e) {
      notify('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen
      title={plan.splitLabel}
      subtitle={id ? 'Propuesta del recomendador' : 'Propuesta del motor'}
      back
      footer={
        <View style={styles.row}>
          <Button label="Guardar" variant="secondary" onPress={() => save(false)} style={styles.flex1} />
          <Button label="Guardar y activar" icon="checkmark" onPress={() => save(true)} style={styles.flex2} />
        </View>
      }
    >
      <View style={styles.badges}>
        <Badge label={plan.styleLabel} tone="accent" />
        <Badge label={`${plan.daysPerWeek} días/semana`} />
        <Badge label={`hasta ${Math.max(...plan.days.map((d) => d.estimatedMinutes))} min`} />
      </View>

      <Card padding="lg" style={styles.gap}>
        <View style={styles.scoreHead}>
          <ScoreRing score={rec.score} size={72} />
          <View style={styles.flex1}>
            <AppText variant="bodyStrong">Compatibilidad con tu perfil</AppText>
            <AppText variant="footnote" color="textSecondary">
              Puntuación ponderada de 8 criterios. No es una predicción de resultados: resume cómo encaja el plan con tus datos.
            </AppText>
          </View>
        </View>
        {rec.components.map((c) => (
          <View key={c.key} style={styles.comp}>
            <View style={styles.rowBetween}>
              <AppText variant="callout">
                {c.label} <AppText variant="caption" color="textTertiary">· peso {Math.round(c.weight * 100)} %</AppText>
              </AppText>
              <AppText variant="callout" style={{ color: scoreColor(c.value * 100) }}>
                {Math.round(c.value * 100)}
              </AppText>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${c.value * 100}%`, backgroundColor: scoreColor(c.value * 100) }]} />
            </View>
            <AppText variant="caption" color="textSecondary">
              {c.detail}
            </AppText>
          </View>
        ))}
      </Card>

      {!id ? (
        <Button label="Ver todas las alternativas" icon="albums-outline" variant="secondary" onPress={() => router.push('/rutinas/explorar')} />
      ) : null}

      {plan.warnings.map((w) => (
        <Card key={w} variant="outline" padding="lg">
          <AppText variant="footnote" color="warning">
            {w}
          </AppText>
        </Card>
      ))}

      <SectionHeader title="Por qué esta rutina" />
      <Card padding="lg" style={styles.gap}>
        {plan.rationale.map((r) => (
          <AppText key={r} variant="footnote" color="textSecondary">
            •  {r}
          </AppText>
        ))}
      </Card>

      {plan.days.map((d) => (
        <View key={d.name + d.suggestedWeekday} style={styles.gap}>
          <SectionHeader title={d.name} />
          <AppText variant="footnote" color="textTertiary">
            {WEEKDAYS[d.suggestedWeekday]} · {d.focus} · ~{d.estimatedMinutes} min
          </AppText>
          <Card padding="lg" style={styles.gap}>
            {d.exercises.map((e) => (
              <View key={e.slug} style={styles.ex}>
                <View style={[styles.dot, e.role === 'main' && styles.dotMain]} />
                <View style={styles.flex1}>
                  <AppText variant="bodyStrong">{e.name}</AppText>
                  <AppText variant="footnote" color="textSecondary">
                    {prescriptionText(e)}
                  </AppText>
                  {e.note ? (
                    <AppText variant="caption" color="info">
                      {e.note}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        </View>
      ))}
      <AppText variant="caption" color="textTertiary">
        Después de guardarla podrás editar cualquier ejercicio, serie, repetición o descanso.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  gap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  comp: { gap: spacing.xs },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  ex: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary, marginTop: 8 },
  dotMain: { backgroundColor: colors.accent },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
});
