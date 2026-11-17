import { StyleSheet, View } from 'react-native';

import { colors, gutter, spacing } from '@/theme';

import { AppText, Button } from './ui';

/** Shown when the local database cannot be opened or migrated. */
export function BootErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View style={styles.root}>
      <AppText variant="title2">No se pudo abrir tus datos</AppText>
      <AppText variant="body" color="textSecondary">
        La base de datos local no se inició correctamente. Tus datos no se han borrado.
      </AppText>
      <AppText variant="footnote" color="textTertiary" selectable>
        {error.message}
      </AppText>
      <Button label="Reintentar" icon="refresh" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: gutter,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
});
