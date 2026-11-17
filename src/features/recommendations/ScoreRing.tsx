import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { colors } from '@/theme';

export function scoreColor(score: number): string {
  return score >= 85 ? colors.accent : score >= 70 ? colors.info : colors.warning;
}

/** Circular 0–100 score indicator. */
export function ScoreRing({ score, size = 64, label }: { score: number; size?: number; label?: string }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${label ?? 'Compatibilidad'}: ${score} de 100`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceRaised} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={scoreColor(score)}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <AppText variant="metricSmall">{score}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
