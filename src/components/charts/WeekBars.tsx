import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

interface WeekBarsProps {
  values: readonly number[];
  labels: readonly string[];
  height?: number;
  accessibilityLabel: string;
  highlightLast?: boolean;
}

/** Simple vertical bar chart (e.g. weekly sets). */
export function WeekBars({ values, labels, height = 110, accessibilityLabel, highlightLast = true }: WeekBarsProps) {
  const max = Math.max(1, ...values);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={[styles.bars, { height }]}>
        {values.map((v, i) => (
          <View key={i} style={styles.col}>
            <AppText variant="caption" color="textTertiary">
              {v > 0 ? Math.round(v) : ''}
            </AppText>
            <View
              style={[
                styles.bar,
                { height: Math.max(2, (v / max) * (height - 20)) },
                highlightLast && i === values.length - 1 ? styles.barOn : null,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {labels.map((l, i) => (
          <AppText key={i} variant="caption" color="textTertiary" style={styles.label} numberOfLines={1}>
            {l}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  bar: { width: '70%', borderRadius: radii.sm, backgroundColor: colors.surfaceRaised },
  barOn: { backgroundColor: colors.accent },
  labels: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  label: { flex: 1, textAlign: 'center', fontSize: 10 },
});
