import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';

interface PhaseNoticeProps {
  phase: number;
  title: string;
  description: string;
}

/**
 * Non-interactive notice for a module that is not built yet. Deliberately not
 * pressable: the app must not show buttons that do nothing.
 */
export function PhaseNotice({ phase, title, description }: PhaseNoticeProps) {
  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel={`${title}. En desarrollo, fase ${phase}. ${description}`}
    >
      <View style={styles.icon}>
        <Ionicons name="construct-outline" size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" style={styles.flex}>
            {title}
          </AppText>
          <AppText variant="caption" color="textTertiary">
            FASE {phase}
          </AppText>
        </View>
        <AppText variant="footnote" color="textSecondary">
          {description}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
