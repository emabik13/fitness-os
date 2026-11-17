import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';

export function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <AppText variant="bodyStrong">{title}</AppText>
        {hint ? (
          <AppText variant="footnote" color="textSecondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  head: { gap: spacing.xxs },
});
