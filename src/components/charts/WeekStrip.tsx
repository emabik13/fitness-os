import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';
import { weekdayLetter } from '@/utils/format';
import { toLocalDateKey } from '@/utils/time';

interface WeekStripProps {
  days: readonly Date[];
  /** Local date keys (YYYY-MM-DD) with at least one completed workout. */
  trainedKeys: ReadonlySet<string>;
  today: Date;
}

/** Monday→Sunday strip marking trained days and today. */
export function WeekStrip({ days, trainedKeys, today }: WeekStripProps) {
  const todayKey = toLocalDateKey(today);
  return (
    <View style={styles.row}>
      {days.map((d, i) => {
        const key = toLocalDateKey(d);
        const trained = trainedKeys.has(key);
        const isToday = key === todayKey;
        return (
          <View
            key={key}
            style={styles.day}
            accessible
            accessibilityLabel={`${d.toLocaleDateString('es-ES', { weekday: 'long' })}${
              trained ? ', entrenado' : ''
            }${isToday ? ', hoy' : ''}`}
          >
            <AppText variant="caption" color={isToday ? 'textPrimary' : 'textTertiary'}>
              {weekdayLetter(i)}
            </AppText>
            <View style={[styles.dot, trained && styles.dotTrained, isToday && !trained && styles.dotToday]}>
              <AppText variant="caption" color={trained ? 'onAccent' : isToday ? 'textPrimary' : 'textSecondary'}>
                {d.getDate()}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: spacing.sm, flex: 1 },
  dot: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  dotTrained: { backgroundColor: colors.accent },
  dotToday: { borderWidth: 1.5, borderColor: colors.accent, backgroundColor: 'transparent' },
});
