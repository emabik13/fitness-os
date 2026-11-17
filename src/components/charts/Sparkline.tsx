import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme';

import { areaPath, linePath, scaleSeries } from './geometry';

interface SparklineProps {
  values: readonly number[];
  height?: number;
  color?: string;
  accessibilityLabel: string;
}

/** Minimal area line chart. Requires ≥ 2 values to draw a line. */
export function Sparkline({ values, height = 72, color = colors.accent, accessibilityLabel }: SparklineProps) {
  const [width, setWidth] = useState(0);
  const points = width > 0 ? scaleSeries(values, width, height, 6) : [];
  const last = points[points.length - 1];

  return (
    <View
      style={{ height }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {width > 0 && points.length > 1 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath(points, height)} fill="url(#sparkFill)" />
          <Path d={linePath(points)} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
          {last ? <Circle cx={last.x} cy={last.y} r={4} fill={color} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}
