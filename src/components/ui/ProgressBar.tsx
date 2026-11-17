import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';

interface ProgressBarProps {
  label: string;
  value: number;
  /** Target range; the bar fills relative to `max`. */
  min?: number | null;
  max?: number | null;
  unit: string;
}

/** Labelled progress toward a (range) target. Without target, shows the value only. */
export function ProgressBar({ label, value, min, max, unit }: ProgressBarProps) {
  const top = max ?? min ?? null;
  const pct = top ? Math.min(1, value / top) : 0;
  const inRange = min != null && max != null && value >= min && value <= max;
  const over = max != null && value > max;
  const targetText = min != null && max != null ? (min === max ? `${Math.round(max)}` : `${Math.round(min)}–${Math.round(max)}`) : null;
  return (
    <View style={styles.root} accessible accessibilityLabel={`${label}: ${Math.round(value)} ${unit}${targetText ? ` de ${targetText}` : ''}`}>
      <View style={styles.labels}>
        <AppText variant="callout">{label}</AppText>
        <AppText variant="callout" color={inRange ? 'accent' : over ? 'warning' : 'textSecondary'}>
          {Math.round(value).toLocaleString('es-ES')}
          {targetText ? ` / ${targetText}` : ''} {unit}
        </AppText>
      </View>
      {top ? (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }, inRange && styles.fillOk, over && styles.fillOver]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.info },
  fillOk: { backgroundColor: colors.accent },
  fillOver: { backgroundColor: colors.warning },
});
