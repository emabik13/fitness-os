import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

interface HBarProps {
  label: string;
  value: number;
  max: number;
  valueLabel: string;
}

/** Horizontal labelled bar (e.g. weekly sets per muscle). */
export function HBar({ label, value, max, valueLabel }: HBarProps) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <View style={styles.root} accessible accessibilityLabel={`${label}: ${valueLabel}`}>
      <View style={styles.labels}>
        <AppText variant="footnote">{label}</AppText>
        <AppText variant="footnote" color="textSecondary">
          {valueLabel}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.accent },
});
