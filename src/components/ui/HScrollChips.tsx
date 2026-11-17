import { ScrollView, StyleSheet } from 'react-native';

import { colors, gutter, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props<T extends string> {
  options: readonly { value: T | null; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
  accessibilityLabel: string;
}

/** Single-select horizontal chip rail that bleeds to the screen edges. */
export function HScrollChips<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale
            key={o.value ?? 'all'}
            onPress={() => onChange(o.value)}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            style={[styles.chip, on && styles.on]}
          >
            <AppText variant="callout" color={on ? 'onAccent' : 'textPrimary'}>
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { marginHorizontal: -gutter, flexGrow: 0 },
  content: { paddingHorizontal: gutter, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
  },
  on: { backgroundColor: colors.accent },
});
