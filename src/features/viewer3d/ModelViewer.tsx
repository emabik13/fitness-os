import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

import type { ModelViewerProps } from './types';

/**
 * Native build: lightweight alternative. The WebGL viewer runs in the web/PWA
 * build; a native renderer (expo-gl + three) requires a development build and
 * is documented as pending in PROJECT_STATUS.md.
 */
export function ModelViewer({ source, license, height = 300 }: ModelViewerProps) {
  return (
    <View style={[styles.root, { minHeight: height }]}>
      <Ionicons name="cube-outline" size={30} color={colors.textTertiary} />
      <AppText variant="bodyStrong" align="center">
        Vista 3D disponible en la versión web
      </AppText>
      <AppText variant="footnote" color="textSecondary" align="center">
        En esta versión se muestran los músculos implicados y la técnica en texto.
      </AppText>
      <AppText variant="caption" color="textTertiary" align="center">
        Fuente: {source} · Licencia: {license}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
