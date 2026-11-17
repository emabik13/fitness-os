import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gutter, spacing } from '@/theme';

import { AppText } from './AppText';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  /** Element rendered on the right of the large title (e.g. an IconButton). */
  headerRight?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
}

/**
 * Base screen: dark background, safe-area aware, large-title header in the
 * style of iOS/Hevy. Bottom padding leaves room for the tab bar.
 */
export function Screen({
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const header = title ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {subtitle ? (
          <AppText variant="overline" color="textTertiary">
            {subtitle}
          </AppText>
        ) : null}
        <AppText variant="title1" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {headerRight}
    </View>
  ) : null;

  const padding = {
    paddingTop: insets.top + spacing.md,
    paddingBottom: spacing.huge * 2,
  };

  if (!scroll) {
    return (
      <View style={[styles.root, padding, styles.content, contentStyle]}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[padding, styles.content, contentStyle]}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    >
      {header}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: gutter, gap: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  headerText: { flex: 1, gap: spacing.xxs },
});
