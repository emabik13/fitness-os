import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/charts/Sparkline';
import {
  AppText,
  Button,
  Card,
  DayPicker,
  EmptyState,
  FormSection,
  IconButton,
  ListGroup,
  Screen,
  SectionHeader,
  TextField,
} from '@/components/ui';
import { useDatabase } from '@/database/DatabaseProvider';
import { createBodyRepository } from '@/database/repositories/bodyRepository';
import { parseDecimal } from '@/domain/profile';
import { movingAverage, summarizeTrend } from '@/engine/body/weightTrend';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, spacing } from '@/theme';
import { formatShortDate, resolveDayChoice, type DayChoice } from '@/utils/dates';
import { confirmAsync, notify } from '@/utils/dialog';
import { formatKg } from '@/utils/format';
import { haptics } from '@/utils/haptics';

export function WeightLogScreen() {
  const { db, userId } = useDatabase();
  const { data, refresh } = useDbQuery((d, uid) => createBodyRepository(d).listWeights(uid));
  const [weight, setWeight] = useState('');
  const [day, setDay] = useState<DayChoice>('today');
  const [other, setOther] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const save = async () => {
    const w = parseDecimal(weight);
    const when = resolveDayChoice(day, other);
    setError(w === null || w < 25 || w > 350 ? 'Introduce un peso entre 25 y 350 kg' : null);
    setDateError(when ? null : 'Fecha no válida (DD/MM/AAAA, no futura)');
    if (w === null || w < 25 || w > 350 || !when) return;
    try {
      await createBodyRepository(db).addWeight(userId, { measuredAt: when, weightKg: w });
      haptics.success();
      setWeight('');
      refresh();
    } catch (e) {
      notify('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: string) => {
    if (await confirmAsync('Eliminar registro', '¿Eliminar este pesaje?', 'Eliminar', true)) {
      await createBodyRepository(db).deleteWeight(id);
      refresh();
    }
  };

  const entries = data ?? [];
  const trend = summarizeTrend(entries);
  const ma = movingAverage(entries);

  return (
    <Screen title="Peso corporal" back>
      <Card padding="lg" style={styles.gap}>
        <FormSection title="Nuevo pesaje" hint="Para comparar mejor, pésate en condiciones similares (p. ej. al levantarte).">
          <TextField label="Peso" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" suffix="kg" error={error} maxLength={5} />
          <DayPicker choice={day} onChoice={setDay} otherText={other} onOtherText={setOther} error={dateError} />
        </FormSection>
        <Button label="Guardar pesaje" icon="checkmark" onPress={save} />
      </Card>

      <SectionHeader title="Tendencia" />
      <Card padding="lg" style={styles.gap}>
        {trend.currentAverage !== null ? (
          <View style={styles.row}>
            <View>
              <AppText variant="overline" color="textTertiary">
                Media 7 días
              </AppText>
              <AppText variant="metric">{formatKg(trend.currentAverage)} kg</AppText>
            </View>
            {trend.weeklyChangeKg !== null ? (
              <View>
                <AppText variant="overline" color="textTertiary">
                  Ritmo
                </AppText>
                <AppText variant="metric" color={trend.direction === 'stable' ? 'textPrimary' : 'accent'}>
                  {trend.weeklyChangeKg > 0 ? '+' : ''}
                  {trend.weeklyChangeKg.toFixed(2).replace('.', ',')}
                </AppText>
                <AppText variant="caption" color="textTertiary">
                  kg/semana
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}
        {ma.length >= 2 ? (
          <Sparkline values={ma.map((p) => p.average)} height={100} accessibilityLabel="Media móvil del peso" />
        ) : null}
        <AppText variant="footnote" color="textSecondary">
          {trend.message}
        </AppText>
      </Card>

      <SectionHeader title="Historial" />
      {entries.length === 0 ? (
        <EmptyState icon="scale-outline" title="Sin pesajes" description="Registra tu primer peso arriba." />
      ) : (
        <ListGroup>
          {[...entries].reverse().map((e) => (
            <View key={e.id} style={styles.item}>
              <Ionicons name="scale-outline" size={18} color={colors.textSecondary} />
              <AppText variant="callout" style={styles.flex}>
                {formatShortDate(e.measuredAt)}
              </AppText>
              <AppText variant="bodyStrong">{formatKg(e.weightKg)} kg</AppText>
              <IconButton icon="trash-outline" variant="plain" color={colors.textTertiary} onPress={() => remove(e.id)} accessibilityLabel={`Eliminar pesaje del ${formatShortDate(e.measuredAt)}`} />
            </View>
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  flex: { flex: 1 },
});
