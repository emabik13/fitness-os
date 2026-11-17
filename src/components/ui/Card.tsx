import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { PressableScale } from './PressableScale';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  variant?: 'default' | 'raised' | 'accent' | 'outline';
  padding?: keyof typeof spacing | 0;
  style?: StyleProp<ViewStyle>;
}

/**
 * Minimal card surface. Only becomes pressable (with scale feedback) when an
 * `onPress` handler is provided, so static cards never look tappable.
 */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'default',
  padding = 'lg',
  style,
}: CardProps) {
  const cardStyle = [
    styles.base,
    variantStyles[variant],
    { padding: padding === 0 ? 0 : spacing[padding] },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={cardStyle}
      >
        {children}
      </PressableScale>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.lg, overflow: 'hidden' },
});

const variantStyles = StyleSheet.create({
  default: { backgroundColor: colors.surface },
  raised: { backgroundColor: colors.surfaceRaised },
  accent: { backgroundColor: colors.accent },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
});
