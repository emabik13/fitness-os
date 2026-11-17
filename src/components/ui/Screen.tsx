import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gutter, spacing } from '@/theme';

import { AppText } from './AppText';
import { IconButton } from './IconButton';

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
  /** Shows a back button (stack screens). */
  back?: boolean;
  /** Content pinned below the scroll view (e.g. primary action). */
  footer?: ReactNode;
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
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
  back,
  footer,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const backRow = back ? (
    <View style={styles.backRow}>
      <IconButton icon="chevron-back" onPress={goBack} accessibilityLabel="Volver" variant="plain" />
    </View>
  ) : null;

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
    paddingTop: insets.top + (back ? spacing.xs : spacing.md),
    paddingBottom: footer ? spacing.xxl : spacing.huge * 2,
  };
  const footerNode = footer ? (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>{footer}</View>
  ) : null;

  if (!scroll) {
    return (
      <View style={styles.root}>
        <View style={[styles.root, padding, styles.content, contentStyle]}>
          {backRow}
          {header}
          {children}
        </View>
        {footerNode}
      </View>
    );
  }

  return (
    <View style={styles.root}>
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
      {backRow}
      {header}
      {children}
    </ScrollView>
    {footerNode}
    </View>
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
  backRow: { marginLeft: -spacing.md, marginBottom: -spacing.md },
  footer: {
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
