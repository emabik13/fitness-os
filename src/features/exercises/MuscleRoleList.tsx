import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { ROLE_LABELS, type MuscleRole } from '@/catalog';
import { colors, spacing } from '@/theme';

export const ROLE_COLORS: Record<MuscleRole, string> = {
  agonist: colors.muscleAgonist,
  synergist: colors.muscleSynergist,
  stabilizer: colors.muscleStabilizer,
};

export function MuscleRoleList({ muscles }: { muscles: { id: string; name: string; role: MuscleRole; functionText?: string | null }[] }) {
  return (
    <View style={styles.list}>
      {muscles.map((m) => (
        <View key={m.id} style={styles.item} accessible accessibilityLabel={`${m.name}: ${ROLE_LABELS[m.role]}`}>
          <View style={[styles.dot, { backgroundColor: ROLE_COLORS[m.role] }]} />
          <View style={styles.body}>
            <View style={styles.head}>
              <AppText variant="bodyStrong">{m.name}</AppText>
              <AppText variant="caption" style={{ color: ROLE_COLORS[m.role] }}>
                {ROLE_LABELS[m.role].toUpperCase()}
              </AppText>
            </View>
            {m.functionText ? (
              <AppText variant="footnote" color="textSecondary" numberOfLines={3}>
                {m.functionText}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  item: { flexDirection: 'row', gap: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  body: { flex: 1, gap: 2 },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
});
