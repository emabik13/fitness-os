import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, PressableScale } from '@/components/ui';
import { DIFFICULTY_LABELS } from '@/catalog';
import type { ExerciseListItem } from '@/database/repositories/exerciseRepository';
import { EQUIPMENT_LABELS } from '@/domain/profile';
import { colors, radii, spacing } from '@/theme';

export function ExerciseRow({
  item,
  onPress,
  trailingIcon = 'chevron-forward',
  badge,
}: {
  item: ExerciseListItem;
  onPress: () => void;
  trailingIcon?: 'chevron-forward' | 'add-circle';
  badge?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      activeScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      style={styles.row}
    >
      <View style={styles.icon}>
        <Ionicons name="barbell-outline" size={18} color={colors.accent} />
      </View>
      <View style={styles.body}>
        <AppText variant="bodyStrong" numberOfLines={2}>
          {item.name}
        </AppText>
        <AppText variant="footnote" color="textSecondary">
          {item.primaryMuscleName} · {EQUIPMENT_LABELS[item.equipment]}
        </AppText>
        <View style={styles.badges}>
          <Badge label={DIFFICULTY_LABELS[item.difficulty]} tone={item.difficulty === 'advanced' ? 'warning' : 'neutral'} />
          {badge ? <Badge label={badge} tone="info" /> : null}
        </View>
      </View>
      <Ionicons
        name={trailingIcon}
        size={trailingIcon === 'add-circle' ? 26 : 18}
        color={trailingIcon === 'add-circle' ? colors.accent : colors.textTertiary}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
});
