import { StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, PhaseNotice, Screen, SectionHeader } from '@/components/ui';
import { createCatalogRepository } from '@/database/repositories/catalogRepository';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';

export function TrainScreen() {
  const { data, refreshing, refresh } = useDbQuery(async (db, userId) => {
    const routines = await db.getAllAsync<{ id: string; name: string; days_per_week: number }>(
      `SELECT id, name, days_per_week FROM routines
        WHERE user_id = ? AND deleted_at IS NULL ORDER BY is_active DESC, updated_at DESC`,
      [userId],
    );
    const exerciseCount = await createCatalogRepository(db).countExercises();
    return { routines, exerciseCount };
  });

  return (
    <Screen title="Entrenar" refreshing={refreshing} onRefresh={refresh}>
      <PhaseNotice
        phase={6}
        title="Modo entrenamiento"
        description="Registro de series, pesos, RIR, descansos automáticos y guardado continuo. Se habilitará aquí el botón para empezar."
      />

      <SectionHeader title="Mis rutinas" />
      {data && data.routines.length > 0 ? (
        <View style={styles.list}>
          {data.routines.map((r) => (
            <Card key={r.id} padding="lg">
              <AppText variant="bodyStrong">{r.name}</AppText>
              <AppText variant="footnote" color="textSecondary">
                {r.days_per_week} días por semana
              </AppText>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="Todavía no tienes rutinas"
          description="El generador (Full Body, Upper/Lower, PPL, Torso/Pierna) y el editor de rutinas llegan en la Fase 5."
        />
      )}

      <SectionHeader title="Biblioteca de ejercicios" />
      <Card padding="lg" style={styles.libCard}>
        <AppText variant="metric" color={data?.exerciseCount ? 'textPrimary' : 'textTertiary'}>
          {data ? data.exerciseCount : '—'}
        </AppText>
        <AppText variant="footnote" color="textSecondary">
          ejercicios en la base de datos local
        </AppText>
      </Card>
      <PhaseNotice
        phase={3}
        title="Biblioteca y filtros"
        description="Fichas con instrucciones verificadas, músculos implicados, variantes y sustituciones, con filtros por músculo, equipamiento, dificultad y patrón."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  libCard: { gap: spacing.xxs },
});
