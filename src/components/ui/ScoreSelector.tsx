import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface ScoreSelectorProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  lowLabel: string;
  highLabel: string;
}

/** 1–5 scale; tapping the selected value clears it. */
export function ScoreSelector({ label, value, onChange, lowLabel, highLabel }: ScoreSelectorProps) {
  return (
    <View style={styles.root}>
      <AppText variant="callout">{label}</AppText>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n;
          return (
            <PressableScale
              key={n}
              onPress={() => onChange(on ? null : n)}
              haptic="selection"
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}: ${n} de 5`}
              style={[styles.cell, on && styles.on]}
            >
              <AppText variant="bodyStrong" color={on ? 'onAccent' : 'textPrimary'}>
                {n}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.ends}>
        <AppText variant="caption" color="textTertiary">
          {lowLabel}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {highLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  cell: { flex: 1, height: 48, borderRadius: radii.md, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.accent },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
