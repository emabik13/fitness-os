import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';

interface StatTileProps {
  label: string;
  /** Formatted value. Pass `null` when there is no data yet — renders "—". */
  value: string | null;
  unit?: string;
  hint?: string;
}

/** Compact metric tile. Never invents a value: empty data shows an em dash. */
export function StatTile({ label, value, unit, hint }: StatTileProps) {
  const hasValue = value !== null;
  return (
    <Card style={styles.tile} padding="lg">
      <AppText variant="overline" color="textTertiary">
        {label}
      </AppText>
      <View style={styles.valueRow}>
        <AppText variant="metric" color={hasValue ? 'textPrimary' : 'textTertiary'}>
          {hasValue ? value : '—'}
        </AppText>
        {hasValue && unit ? (
          <AppText variant="callout" color="textSecondary">
            {unit}
          </AppText>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="caption" color="textTertiary" numberOfLines={2}>
          {hint}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: spacing.xs },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
});
