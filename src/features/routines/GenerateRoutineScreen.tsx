import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, Card, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { CATALOG_EXERCISES } from '@/catalog';
import { useDatabase } from '@/database/DatabaseProvider';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import { createRoutineRepository } from '@/database/repositories/routineRepository';
import { generateRoutine } from '@/engine/workout-generator/generateRoutine';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, spacing } from '@/theme';
import { notify } from '@/utils/dialog';
import { prescriptionText } from '@/utils/duration';
import { haptics } from '@/utils/haptics';

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function GenerateRoutineScreen() {
  const { db, userId } = useDatabase();
  const { data: plan, loading } = useDbQuery(async (d, uid) => {
    const p = await createProfileRepository(d).getProfile(uid);
    if (!p) return null;
    return generateRoutine(
      {
        goal: p.goal,
        experience: p.experience,
        daysPerWeek: p.daysPerWeek,
        sessionMinutes: p.sessionMinutes,
        equipment: p.equipment,
        priorityMuscles: p.priorityMuscles,
        limitations: p.limitations.map((l) => l.area),
        liftExperience: p.liftExperience,
        preferMachines: p.preferences.preferMachines,
        includeCore: p.preferences.includeCore,
      },
      CATALOG_EXERCISES,
    );
  });

  if (!plan) {
    return (
      <Screen title="Generar rutina" back>
        {!loading ? (
          <EmptyState icon="person-outline" title="Configura tu perfil" description="El generador necesita tu objetivo, experiencia y disponibilidad." />
        ) : null}
      </Screen>
    );
  }

  const save = async () => {
    try {
      const id = await createRoutineRepository(db).saveGenerated(userId, plan, true);
      haptics.success();
      router.replace({ pathname: '/rutinas/[id]', params: { id } });
    } catch (e) {
      notify('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen
      title={plan.splitLabel}
      subtitle="Propuesta del motor"
      back
      footer={<Button label="Guardar y activar" icon="checkmark" onPress={save} />}
    >
      <View style={styles.badges}>
        <Badge label={`${plan.daysPerWeek} días/semana`} tone="accent" />
        <Badge label={plan.engineVersion} />
      </View>

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
        <View key={d.name} style={styles.gap}>
          <SectionHeader title={d.name} />
          <AppText variant="footnote" color="textTertiary">
            {WEEKDAYS[d.suggestedWeekday]} · {d.focus} · ~{d.estimatedMinutes} min
          </AppText>
          <Card padding="lg" style={styles.gap}>
            {d.exercises.map((e) => (
              <View key={e.slug} style={styles.ex}>
                <View style={[styles.dot, e.role === 'main' && styles.dotMain]} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{e.name}</AppText>
                  <AppText variant="footnote" color="textSecondary">
                    {prescriptionText(e)}
                  </AppText>
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
  badges: { flexDirection: 'row', gap: spacing.xs },
  gap: { gap: spacing.md },
  ex: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary },
  dotMain: { backgroundColor: colors.accent },
  flex: { flex: 1 },
});
