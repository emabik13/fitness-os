import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface StepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}

export function Stepper({ label, value, onChange, min, max, step = 1, format = String }: StepperProps) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  return (
    <View style={styles.root} accessibilityLabel={`${label}: ${format(value)}`}>
      <AppText variant="callout" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.controls}>
        <PressableScale
          onPress={() => set(value - step)}
          disabled={value <= min}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={`Disminuir ${label}`}
          style={styles.btn}
        >
          <Ionicons name="remove" size={20} color={colors.textPrimary} />
        </PressableScale>
        <AppText variant="metricSmall" style={styles.value} align="center">
          {format(value)}
        </AppText>
        <PressableScale
          onPress={() => set(value + step)}
          disabled={value >= max}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${label}`}
          style={styles.btn}
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 64 },
});
