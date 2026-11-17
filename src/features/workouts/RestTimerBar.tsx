import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { remainingSeconds, useRestTimer } from '@/stores/restTimerStore';
import { colors, radii, spacing } from '@/theme';
import { formatClock } from '@/utils/duration';
import { haptics } from '@/utils/haptics';

/** Bottom bar with the running rest countdown. Renders nothing when idle. */
export function RestTimerBar() {
  const { endsAt, total, label, add, stop } = useRestTimer();
  const [now, setNow] = useState(() => Date.now());
  const notified = useRef<number | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);

  const left = remainingSeconds(endsAt, now);
  useEffect(() => {
    if (endsAt && left === 0 && notified.current !== endsAt) {
      notified.current = endsAt;
      haptics.success();
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
    }
  }, [left, endsAt]);

  if (!endsAt) return null;
  const done = left === 0;
  const pct = total > 0 ? Math.min(1, 1 - left / total) : 1;
  return (
    <View style={styles.root} accessibilityLiveRegion="polite" accessibilityLabel={done ? 'Descanso terminado' : `Descanso: ${formatClock(left)}`}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }, done && styles.fillDone]} />
      </View>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="caption" color="textTertiary" numberOfLines={1}>
            {done ? '¡A por la siguiente serie!' : `Descanso · ${label}`}
          </AppText>
          <AppText variant="metric" color={done ? 'accent' : 'textPrimary'}>
            {formatClock(left)}
          </AppText>
        </View>
        <Button label="−15" size="md" variant="secondary" onPress={() => add(-15)} accessibilityHint="Resta 15 segundos" />
        <Button label="+15" size="md" variant="secondary" onPress={() => add(15)} accessibilityHint="Suma 15 segundos" />
        <Button label={done ? 'Cerrar' : 'Saltar'} size="md" onPress={stop} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, backgroundColor: colors.surfaceRaised, borderRadius: radii.lg, padding: spacing.md },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.info },
  fillDone: { backgroundColor: colors.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
