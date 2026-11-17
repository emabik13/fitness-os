import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card, EmptyState, ListGroup, ListRow, Screen, SectionHeader } from '@/components/ui';
import { DIFFICULTY_LABELS, MOVEMENT_TYPE_LABELS, PATTERNS, type Biomechanics } from '@/catalog';
import { createExerciseRepository } from '@/database/repositories/exerciseRepository';
import { EQUIPMENT_LABELS } from '@/domain/profile';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';

import { ExerciseHistorySection } from './ExerciseHistorySection';
import { ExerciseVisual } from './ExerciseVisual';
import { MuscleRoleList } from './MuscleRoleList';

const BIOMECH_LABELS: [keyof Biomechanics, string][] = [
  ['start', 'Posición inicial'],
  ['path', 'Trayectoria'],
  ['concentric', 'Fase concéntrica'],
  ['eccentric', 'Fase excéntrica'],
  ['breathing', 'Respiración'],
  ['stabilization', 'Estabilización'],
  ['rom', 'Rango de movimiento'],
];

export function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading } = useDbQuery((db) => createExerciseRepository(db).get(id), [id]);

  if (!data) {
    return (
      <Screen title="Ejercicio" back>
        {!loading ? <EmptyState icon="alert-circle-outline" title="Ejercicio no encontrado" description="Puede que se haya eliminado." /> : null}
      </Screen>
    );
  }

  return (
    <Screen title={data.name} subtitle={data.primaryMuscleName} back>
      {data.altNames.length ? (
        <AppText variant="footnote" color="textTertiary">
          También: {data.altNames.join(' · ')}
        </AppText>
      ) : null}
      <View style={styles.badges}>
        <Badge label={EQUIPMENT_LABELS[data.equipment]} tone="accent" />
        <Badge label={DIFFICULTY_LABELS[data.difficulty]} tone={data.difficulty === 'advanced' ? 'warning' : 'neutral'} />
        <Badge label={MOVEMENT_TYPE_LABELS[data.movementType]} />
        <Badge label={PATTERNS[data.pattern]} />
      </View>

      <ExerciseVisual media={data.media} muscles={data.muscles} />

      {data.description ? (
        <AppText variant="body" color="textSecondary">
          {data.description}
        </AppText>
      ) : null}

      <SectionHeader title="Músculos implicados" />
      <Card padding="lg">
        <MuscleRoleList muscles={data.muscles} />
      </Card>

      <ExerciseHistorySection exerciseId={data.id} />

      <SectionHeader title="Cómo se hace" />
      <Card padding="lg" style={styles.gap}>
        {data.instructions.map((step, i) => (
          <View key={i} style={styles.step}>
            <AppText variant="bodyStrong" color="accent" style={styles.stepNum}>
              {i + 1}
            </AppText>
            <AppText variant="body" style={styles.flex}>
              {step}
            </AppText>
          </View>
        ))}
      </Card>

      <SectionHeader title="Biomecánica" />
      <Card padding="lg" style={styles.gap}>
        {BIOMECH_LABELS.map(([k, label]) =>
          data.biomechanics[k] ? (
            <View key={k} style={styles.bio}>
              <AppText variant="overline" color="textTertiary">
                {label}
              </AppText>
              <AppText variant="body">{data.biomechanics[k]}</AppText>
            </View>
          ) : null,
        )}
      </Card>

      <SectionHeader title="Errores frecuentes" />
      <Card padding="lg" style={styles.gap}>
        {data.errors.map((e, i) => (
          <AppText key={i} variant="body">
            ✕  {e}
          </AppText>
        ))}
      </Card>

      {data.tips.length ? (
        <>
          <SectionHeader title="Consejos" />
          <Card padding="lg" style={styles.gap}>
            {data.tips.map((t, i) => (
              <AppText key={i} variant="body">
                ✓  {t}
              </AppText>
            ))}
          </Card>
        </>
      ) : null}

      {data.substitutes.length || data.variants.length ? (
        <>
          <SectionHeader title="Variantes y sustituciones" />
          <ListGroup>
            {[...data.variants.map((v) => ({ ...v, kind: 'Variante' })), ...data.substitutes.map((s) => ({ ...s, kind: 'Sustitución' }))].map(
              (r) => (
                <ListRow
                  key={`${r.kind}-${r.id}`}
                  title={r.name}
                  subtitle={r.kind}
                  onPress={() => router.push({ pathname: '/ejercicios/[id]', params: { id: r.id } })}
                />
              ),
            )}
          </ListGroup>
        </>
      ) : null}

      {data.contentSource ? (
        <AppText variant="caption" color="textTertiary">
          Fuente del contenido: {data.contentSource}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gap: { gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md },
  stepNum: { width: 18 },
  bio: { gap: 2 },
  flex: { flex: 1 },
});
