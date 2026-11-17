import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { MuscleRole } from '@/catalog';
import type { ExerciseMedia } from '@/database/repositories/exerciseRepository';
import { ModelViewer } from '@/features/viewer3d/ModelViewer';
import { colors, radii, spacing } from '@/theme';

/**
 * Visual slot of an exercise card. Shows the 3D viewer only when a verified
 * asset (with source and license) exists; otherwise an explicit
 * "pending content" state. Never substitutes a static image for an animation.
 */
export function ExerciseVisual({ media, muscles }: { media: ExerciseMedia[]; muscles: { id: string; role: MuscleRole }[] }) {
  const animation = media.find((m) => m.kind === 'animation' && m.status === 'available');
  const model = media.find((m) => m.kind === 'anatomy_model' && m.status === 'available');
  const asset = animation ?? model;

  if (!asset) {
    return (
      <View style={styles.pending} accessible accessibilityLabel="Animación 3D pendiente de contenido">
        <Ionicons name="cube-outline" size={30} color={colors.textTertiary} />
        <AppText variant="bodyStrong" align="center">
          Animación 3D pendiente de contenido
        </AppText>
        <AppText variant="footnote" color="textSecondary" align="center">
          Aún no hay un modelo verificado con licencia para este ejercicio. Sigue las instrucciones técnicas y la
          biomecánica de esta ficha.
        </AppText>
      </View>
    );
  }

  return (
    <ModelViewer
      uri={asset.uri!}
      source={asset.source!}
      license={asset.license!}
      attribution={asset.attribution}
      roles={new Map(muscles.map((m) => [m.id, m.role]))}
    />
  );
}

const styles = StyleSheet.create({
  pending: {
    minHeight: 180,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
});
