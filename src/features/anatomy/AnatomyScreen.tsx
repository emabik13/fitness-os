import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ListGroup, ListRow, Screen, SectionHeader, SegmentedControl } from '@/components/ui';
import { createCatalogRepository } from '@/database/repositories/catalogRepository';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, radii, spacing } from '@/theme';

type BodyView = 'front' | 'back';

const VIEW_OPTIONS = [
  { value: 'front', label: 'Frontal' },
  { value: 'back', label: 'Posterior' },
] as const;

const REGION_LABEL = { upper: 'Tren superior', lower: 'Tren inferior', core: 'Core' } as const;

const ROLE_LEGEND = [
  { label: 'Agonistas', color: colors.muscleAgonist },
  { label: 'Sinergistas', color: colors.muscleSynergist },
  { label: 'Estabilizadores', color: colors.muscleStabilizer },
];

export function AnatomyScreen() {
  const [view, setView] = useState<BodyView>('front');
  const { data } = useDbQuery((db) => createCatalogRepository(db).listMuscleGroups());

  const visible = (data ?? []).filter((m) => m.bodyView === view || m.bodyView === 'both');

  return (
    <Screen title="Anatomía">
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={view}
        onChange={setView}
        accessibilityLabel="Vista del cuerpo"
      />

      {/* Viewer area: explicit pending-content state, no fake imagery. */}
      <View style={styles.viewer} accessible accessibilityLabel="Visor anatómico 3D pendiente de contenido">
        <Ionicons name="cube-outline" size={36} color={colors.textTertiary} />
        <AppText variant="bodyStrong" align="center">
          Visor anatómico 3D
        </AppText>
        <AppText variant="footnote" color="textSecondary" align="center">
          Pendiente de contenido. El visor carga modelos GLB externos con fuente y licencia verificadas; no se
          muestran ilustraciones inventadas.
        </AppText>
        <View style={styles.legend}>
          {ROLE_LEGEND.map((r) => (
            <View key={r.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: r.color }]} />
              <AppText variant="caption" color="textSecondary">
                {r.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <SectionHeader title={view === 'front' ? 'Músculos · vista frontal' : 'Músculos · vista posterior'} />
      <ListGroup>
        {visible.map((m) => (
          <ListRow
            key={m.id}
            title={m.nameEs}
            subtitle={REGION_LABEL[m.region]}
            onPress={() => router.push({ pathname: '/musculo/[id]', params: { id: m.id } })}
          />
        ))}
      </ListGroup>

      <Button label="Biblioteca de ejercicios" icon="library-outline" variant="secondary" onPress={() => router.push('/ejercicios')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewer: {
    minHeight: 280,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
