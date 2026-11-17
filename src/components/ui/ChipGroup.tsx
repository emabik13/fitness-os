import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  options: readonly ChipOption<T>[];
  selected: readonly T[];
  onToggle: (value: T) => void;
  accessibilityLabel?: string;
}

/** Wrapping chips; works for single (replace) or multi (toggle) selection. */
export function ChipGroup<T extends string>({ options, selected, onToggle, accessibilityLabel }: ChipGroupProps<T>) {
  return (
    <View style={styles.wrap} accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <PressableScale
            key={o.value}
            onPress={() => onToggle(o.value)}
            haptic="selection"
            activeScale={0.95}
            accessibilityRole="checkbox"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: on }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <AppText variant="callout" color={on ? 'onAccent' : 'textPrimary'}>
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
