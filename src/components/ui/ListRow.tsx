import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, touch } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface ListRowProps {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  /** Right side value text, or a custom node. */
  trailing?: ReactNode;
  onPress?: () => void;
}

/** Settings-style row. Shows a chevron only when it is actually pressable. */
export function ListRow({ icon, title, subtitle, trailing, onPress }: ListRowProps) {
  const content = (
    <>
      {icon ? (
        <View style={styles.icon}>
          <Ionicons name={icon} size={18} color={colors.textPrimary} />
        </View>
      ) : null}
      <View style={styles.body}>
        <AppText variant="callout">{title}</AppText>
        {subtitle ? (
          <AppText variant="footnote" color="textTertiary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {typeof trailing === 'string' ? (
        <AppText variant="callout" color="textSecondary">
          {trailing}
        </AppText>
      ) : (
        trailing
      )}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        activeScale={0.99}
        style={styles.row}
      >
        {content}
      </PressableScale>
    );
  }
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}>
      {content}
    </View>
  );
}

export function ListGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: touch.large,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
});
