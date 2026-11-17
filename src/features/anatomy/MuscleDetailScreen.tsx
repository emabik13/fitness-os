import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { WeekBars } from '@/components/charts/WeekBars';
import { AppText, Button, Card, EmptyState, Screen, SectionHeader, StatTile } from '@/components/ui';
import { createCatalogRepository } from '@/database/repositories/catalogRepository';
import { createExerciseRepository } from '@/database/repositories/exerciseRepository';
import { createStatsRepository } from '@/database/repositories/statsRepository';
import { ExerciseRow } from '@/features/exercises/ExerciseRow';
import { ROLE_COLORS } from '@/features/exercises/MuscleRoleList';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';

export function MuscleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useDbQuery(
    async (db, userId) => {
      const [muscle, exercises, weeks] = await Promise.all([
        createCatalogRepository(db).getMuscle(id),
        createExerciseRepository(db).byMuscle(id),
        createStatsRepository(db).muscleWeeklySets(userId, id, 8),
      ]);
      return { muscle, exercises, weeks };
    },
    [id],
  );

  if (!data?.muscle) return <Screen title="Músculo" back>{null}</Screen>;
  const { muscle, exercises, weeks } = data;
  const agonist = exercises.filter((e) => e.role === 'agonist');
  const compounds = exercises.filter((e) => e.role !== 'agonist' && e.movementType === 'compound');
  const current = weeks[weeks.length - 1]!;
  const anyTraining = weeks.some((w) => w.effective > 0);

  return (
    <Screen title={muscle.nameEs} subtitle="Anatomía" back>
      <Card padding="lg" style={styles.gap}>
        <AppText variant="overline" color="textTertiary">
          Descripción anatómica
        </AppText>
        <AppText variant="body">{muscle.description ?? 'Sin descripción.'}</AppText>
        <AppText variant="overline" color="textTertiary">
          Función
        </AppText>
        <AppText variant="body">{muscle.functionText ?? '—'}</AppText>
      </Card>

      <SectionHeader title="Volumen esta semana" />
      <View style={styles.row}>
        <StatTile label="Series directas" value={String(current.direct)} hint="Como agonista" />
        <StatTile label="Series efectivas" value={String(current.effective).replace('.', ',')} hint="Sinergista cuenta 0,5" />
      </View>

      <SectionHeader title="Evolución (8 semanas)" />
      {anyTraining ? (
        <Card padding="lg">
          <WeekBars
            values={weeks.map((w) => w.effective)}
            labels={weeks.map((w) => w.weekStart.slice(8, 10) + '/' + w.weekStart.slice(5, 7))}
            accessibilityLabel={`Series efectivas semanales de ${muscle.nameEs}`}
          />
        </Card>
      ) : (
        <EmptyState icon="bar-chart-outline" title="Sin series registradas" description="Al completar entrenamientos verás aquí el volumen semanal de este músculo." />
      )}

      <SectionHeader title="Ejercicios recomendados" />
      <AppText variant="footnote" color="textSecondary">
        Ejercicios donde {muscle.nameEs.toLowerCase()} actúa como agonista (motor principal). Otros músculos también participan.
      </AppText>
      <View style={styles.list}>
        {agonist.map((e) => (
          <ExerciseRow key={e.id} item={e} onPress={() => router.push({ pathname: '/ejercicios/[id]', params: { id: e.id } })} />
        ))}
      </View>

      {compounds.length ? (
        <>
          <SectionHeader title="Participación en ejercicios compuestos" />
          <View style={styles.list}>
            {compounds.map((e) => (
              <ExerciseRow
                key={e.id}
                item={e}
                badge={e.role === 'synergist' ? 'Sinergista' : 'Estabilizador'}
                onPress={() => router.push({ pathname: '/ejercicios/[id]', params: { id: e.id } })}
              />
            ))}
          </View>
          <View style={styles.legend}>
            {(['synergist', 'stabilizer'] as const).map((r) => (
              <View key={r} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: ROLE_COLORS[r] }]} />
                <AppText variant="caption" color="textSecondary">
                  {r === 'synergist' ? 'Sinergista: ayuda al motor principal' : 'Estabilizador: mantiene la postura'}
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Button
        label="Ver en la biblioteca"
        variant="secondary"
        icon="library-outline"
        onPress={() => router.push({ pathname: '/ejercicios', params: { muscle: muscle.id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  list: { gap: spacing.sm },
  legend: { gap: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
