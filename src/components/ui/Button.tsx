import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing, touch, type ColorToken } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const variantConfig: Record<
  NonNullable<ButtonProps['variant']>,
  { bg: string; fg: ColorToken; border?: string }
> = {
  primary: { bg: colors.accent, fg: 'onAccent' },
  secondary: { bg: colors.surfaceRaised, fg: 'textPrimary', border: colors.border },
  ghost: { bg: 'transparent', fg: 'accent' },
  danger: { bg: colors.dangerMuted, fg: 'danger' },
};

/** Primary action button. Heights are ≥ 48pt for gym use. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading,
  disabled,
  fullWidth,
  accessibilityHint,
  style,
}: ButtonProps) {
  const cfg = variantConfig[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic={variant === 'primary' ? 'medium' : 'light'}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={[
        styles.base,
        {
          backgroundColor: cfg.bg,
          minHeight: size === 'lg' ? touch.large : touch.min,
          borderColor: cfg.border ?? 'transparent',
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[cfg.fg]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={20} color={colors[cfg.fg]} /> : null}
          <AppText variant="bodyStrong" color={cfg.fg}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
