import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, type ColorToken } from '@/theme';

import { AppText } from './AppText';

type Tone = 'neutral' | 'accent' | 'warning' | 'danger' | 'info';

const tones: Record<Tone, { bg: string; fg: ColorToken }> = {
  neutral: { bg: colors.surfaceRaised, fg: 'textSecondary' },
  accent: { bg: colors.accentMuted, fg: 'accent' },
  warning: { bg: colors.warningMuted, fg: 'warning' },
  danger: { bg: colors.dangerMuted, fg: 'danger' },
  info: { bg: colors.infoMuted, fg: 'info' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <AppText variant="caption" color={t.fg}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radii.pill,
  },
});
