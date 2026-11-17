import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radii, spacing, touch } from '@/theme';

import { AppText } from './AppText';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  suffix?: string;
  error?: string | null;
  hint?: string;
  compact?: boolean;
}

/** Labelled input. Numeric fields should pass keyboardType="decimal-pad". */
export function TextField({ label, suffix, error, hint, compact, ...rest }: TextFieldProps) {
  return (
    <View style={styles.root}>
      {label ? (
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
      ) : null}
      <View style={[styles.box, compact && styles.compact, !!error && styles.boxError]}>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          accessibilityLabel={label}
          {...rest}
          style={[styles.input, compact && styles.inputCompact]}
        />
        {suffix ? (
          <AppText variant="callout" color="textTertiary">
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="textTertiary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs, flex: 1 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.large,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  compact: { minHeight: 44, paddingHorizontal: spacing.sm },
  boxError: { borderColor: colors.danger },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
    fontSize: 17,
    paddingVertical: spacing.sm,
    minWidth: 0,
  },
  inputCompact: { fontSize: 16, textAlign: 'center', paddingVertical: spacing.xs },
});
