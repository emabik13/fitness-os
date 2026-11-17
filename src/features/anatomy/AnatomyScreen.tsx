import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  ListGroup,
  ListRow,
  Screen,
  SectionHeader,
  SegmentedControl,
} from "@/components/ui";
import { createCatalogRepository } from "@/database/repositories/catalogRepository";
import { ModelViewer } from "@/features/viewer3d/ModelViewer";
import { useDbQuery } from "@/hooks/useDbQuery";
import { ANATOMY_BODY_MODEL } from "@/services/media/manifest";
import { colors, radii, spacing } from "@/theme";

type BodyView = "front" | "back";

const VIEW_OPTIONS = [
  { value: "front", label: "Frontal" },
  { value: "back", label: "Posterior" },
] as const;

const REGION_LABEL = {
  upper: "Tren superior",
  lower: "Tren inferior",
  core: "Core",
} as const;

const ROLE_LEGEND = [
  { label: "Agonistas", color: colors.muscleAgonist },
  { label: "Sinergistas", color: colors.muscleSynergist },
  { label: "Estabilizadores", color: colors.muscleStabilizer },
];

export function AnatomyScreen() {
  const [view, setView] = useState<BodyView>("front");
  const { data } = useDbQuery((db) =>
    createCatalogRepository(db).listMuscleGroups(),
  );

  const visible = (data ?? []).filter(
    (m) => m.bodyView === view || m.bodyView === "both",
  );

  return (
    <Screen title="Anatomía">
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={view}
        onChange={setView}
        accessibilityLabel="Vista del cuerpo"
      />

      {/* Viewer: verified body model if registered, otherwise explicit pending state (no fake imagery). */}
      {ANATOMY_BODY_MODEL ? (
        <ModelViewer
          uri={ANATOMY_BODY_MODEL.uri}
          source={ANATOMY_BODY_MODEL.source}
          license={ANATOMY_BODY_MODEL.license}
          attribution={ANATOMY_BODY_MODEL.attribution}
          roles={new Map()}
        />
      ) : (
        <View
          style={styles.viewer}
          accessible
          accessibilityLabel="Visor anatómico 3D pendiente de contenido"
        >
          <Ionicons name="cube-outline" size={36} color={colors.textTertiary} />
          <AppText variant="bodyStrong" align="center">
            Visor anatómico 3D
          </AppText>
          <AppText variant="footnote" color="textSecondary" align="center">
            Pendiente de contenido. El visor (rotación, zoom, vistas y
            animación) ya está listo y carga modelos GLB con fuente y licencia
            verificadas; no se muestran ilustraciones inventadas. Toca un
            músculo de la lista.
          </AppText>
          <View style={styles.legend}>
            {ROLE_LEGEND.map((r) => (
              <View key={r.label} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: r.color }]}
                />
                <AppText variant="caption" color="textSecondary">
                  {r.label}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      <SectionHeader
        title={
          view === "front"
            ? "Músculos · vista frontal"
            : "Músculos · vista posterior"
        }
      />
      <ListGroup>
        {visible.map((m) => (
          <ListRow
            key={m.id}
            title={m.nameEs}
            subtitle={REGION_LABEL[m.region]}
            onPress={() =>
              router.push({ pathname: "/musculo/[id]", params: { id: m.id } })
            }
          />
        ))}
      </ListGroup>

      <Button
        label="Biblioteca de ejercicios"
        icon="library-outline"
        variant="secondary"
        onPress={() => router.push("/ejercicios")}
      />
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
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});
