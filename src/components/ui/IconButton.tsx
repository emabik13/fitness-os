import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';

import { colors, radii, touch } from '@/theme';

import { PressableScale } from './PressableScale';

interface IconButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'filled' | 'plain';
  color?: string;
}

/** Square icon-only button, 48×48 hit area. Requires an accessibility label. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'filled',
  color = colors.textPrimary,
}: IconButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      haptic="selection"
      style={[styles.base, variant === 'filled' && styles.filled]}
      hitSlop={4}
    >
      <Ionicons name={icon} size={22} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touch.min,
    height: touch.min,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: colors.surfaceRaised },
});
