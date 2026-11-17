import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ChipGroup,
  DayPicker,
  EmptyState,
  FormSection,
  IconButton,
  Screen,
  SectionHeader,
  TextField,
} from '@/components/ui';
import { useDatabase } from '@/database/DatabaseProvider';
import {
  BODY_FAT_METHOD_LABELS,
  BODY_FAT_METHODS,
  createBodyRepository,
  MEASUREMENT_FIELDS,
  type BodyFatMethod,
  type MeasurementKey,
} from '@/database/repositories/bodyRepository';
import { parseDecimal } from '@/domain/profile';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, spacing } from '@/theme';
import { formatShortDate, resolveDayChoice, type DayChoice } from '@/utils/dates';
import { confirmAsync, notify } from '@/utils/dialog';
import { formatKg } from '@/utils/format';
import { haptics } from '@/utils/haptics';

const LIMITS: Record<MeasurementKey, [number, number]> = {
  waist_cm: [30, 250], hip_cm: [30, 250], chest_cm: [30, 250], arm_cm: [10, 80], thigh_cm: [20, 120], calf_cm: [15, 80],
};

export function MeasurementsScreen() {
  const { db, userId } = useDatabase();
  const { data, refresh } = useDbQuery((d, uid) => createBodyRepository(d).listMeasurements(uid));
  const [vals, setVals] = useState<Partial<Record<MeasurementKey, string>>>({});
  const [fat, setFat] = useState('');
  const [method, setMethod] = useState<BodyFatMethod | null>(null);
  const [err, setErr] = useState('');
  const [notes, setNotes] = useState('');
  const [day, setDay] = useState<DayChoice>('today');
  const [other, setOther] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = async () => {
    const e: Record<string, string> = {};
    const values: Partial<Record<MeasurementKey, number | null>> = {};
    for (const f of MEASUREMENT_FIELDS) {
      const v = parseDecimal(vals[f.key] ?? '');
      const [lo, hi] = LIMITS[f.key];
      if (v !== null && (v < lo || v > hi)) e[f.key] = `Entre ${lo} y ${hi} cm`;
      values[f.key] = v;
    }
    const bf = parseDecimal(fat);
    const be = parseDecimal(err);
    if (bf !== null && (bf < 2 || bf > 70)) e.fat = 'Entre 2 y 70 %';
    if (bf !== null && !method) e.method = 'Indica cómo se obtuvo el % de grasa';
    if (be !== null && (be < 0 || be > 20)) e.err = 'Entre 0 y 20 puntos';
    const when = resolveDayChoice(day, other);
    if (!when) e.date = 'Fecha no válida';
    const empty = Object.values(values).every((v) => v === null) && bf === null;
    if (empty) e.form = 'Introduce al menos una medida';
    setErrors(e);
    if (Object.keys(e).length || !when) return;
    try {
      await createBodyRepository(db).addMeasurement(userId, {
        measuredAt: when,
        values,
        bodyFatPct: bf,
        bodyFatMethod: bf !== null ? method : null,
        bodyFatErrorPct: bf !== null ? be : null,
        notes: notes.trim() || null,
      });
      haptics.success();
      setVals({});
      setFat('');
      setErr('');
      setNotes('');
      refresh();
    } catch (x) {
      notify('No se pudo guardar', x instanceof Error ? x.message : String(x));
    }
  };

  const list = data ?? [];
  const first = list[0];
  const last = list[list.length - 1];

  return (
    <Screen title="Medidas corporales" back>
      <Card padding="lg" style={styles.gap}>
        <FormSection title="Nuevo registro" hint="Mide siempre en el mismo punto y condiciones (por la mañana, relajado, cinta sin apretar).">
          <View style={styles.grid}>
            {MEASUREMENT_FIELDS.map((f) => (
              <View key={f.key} style={styles.cell}>
                <TextField
                  label={f.label}
                  value={vals[f.key] ?? ''}
                  onChangeText={(t) => setVals((v) => ({ ...v, [f.key]: t }))}
                  keyboardType="decimal-pad"
                  suffix="cm"
                  error={errors[f.key]}
                  maxLength={5}
                />
              </View>
            ))}
          </View>
        </FormSection>
        <FormSection
          title="% de grasa corporal (opcional)"
          hint="Solo si procede de una báscula o evaluación externa. Ningún método es exacto: indica el método y, si lo conoces, su margen de error."
        >
          <View style={styles.grid}>
            <View style={styles.cell}>
              <TextField label="% grasa" value={fat} onChangeText={setFat} keyboardType="decimal-pad" suffix="%" error={errors.fat} maxLength={4} />
            </View>
            <View style={styles.cell}>
              <TextField label="Margen de error (±)" value={err} onChangeText={setErr} keyboardType="decimal-pad" suffix="pts" error={errors.err} maxLength={4} />
            </View>
          </View>
          <ChipGroup
            options={BODY_FAT_METHODS.map((m) => ({ value: m, label: BODY_FAT_METHOD_LABELS[m] }))}
            selected={method ? [method] : []}
            onToggle={(m) => setMethod(method === m ? null : m)}
          />
          {errors.method ? (
            <AppText variant="caption" color="danger">
              {errors.method}
            </AppText>
          ) : null}
        </FormSection>
        <DayPicker choice={day} onChoice={setDay} otherText={other} onOtherText={setOther} error={errors.date} />
        <TextField label="Observaciones" value={notes} onChangeText={setNotes} maxLength={200} />
        {errors.form ? (
          <AppText variant="caption" color="danger">
            {errors.form}
          </AppText>
        ) : null}
        <Button label="Guardar medidas" icon="checkmark" onPress={save} />
      </Card>

      {first && last && first !== last ? (
        <>
          <SectionHeader title="Cambios desde el primer registro" />
          <Card padding="lg" style={styles.gap}>
            {MEASUREMENT_FIELDS.map((f) => {
              const a = list.find((m) => m.values[f.key] != null)?.values[f.key];
              const b = [...list].reverse().find((m) => m.values[f.key] != null)?.values[f.key];
              if (a == null || b == null) return null;
              const d = b - a;
              return (
                <View key={f.key} style={styles.rowBetween}>
                  <AppText variant="callout">{f.label}</AppText>
                  <AppText variant="callout" color="textSecondary">
                    {formatKg(a)} → {formatKg(b)} cm ({d > 0 ? '+' : ''}
                    {formatKg(Math.round(d * 10) / 10)})
                  </AppText>
                </View>
              );
            })}
            <AppText variant="caption" color="textTertiary">
              Diferencias menores de ~0,5–1 cm pueden deberse al propio error de medición.
            </AppText>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Historial" />
      {list.length === 0 ? (
        <EmptyState icon="resize-outline" title="Sin medidas" description="Registra tus perímetros para seguir la recomposición más allá del peso." />
      ) : (
        [...list].reverse().map((m) => (
          <Card key={m.id} padding="lg" style={styles.gapSm}>
            <View style={styles.rowBetween}>
              <AppText variant="bodyStrong">{formatShortDate(m.measuredAt)}</AppText>
              <IconButton
                icon="trash-outline"
                variant="plain"
                color={colors.textTertiary}
                accessibilityLabel="Eliminar registro"
                onPress={async () => {
                  if (await confirmAsync('Eliminar', '¿Eliminar este registro de medidas?', 'Eliminar', true)) {
                    await createBodyRepository(db).deleteMeasurement(m.id);
                    refresh();
                  }
                }}
              />
            </View>
            <AppText variant="footnote" color="textSecondary">
              {MEASUREMENT_FIELDS.filter((f) => m.values[f.key] != null)
                .map((f) => `${f.label} ${formatKg(m.values[f.key]!)}`)
                .join(' · ') || 'Sin perímetros'}
            </AppText>
            {m.bodyFatPct !== null ? (
              <AppText variant="footnote" color="textSecondary">
                Grasa: {formatKg(m.bodyFatPct)} %{m.bodyFatErrorPct !== null ? ` ±${formatKg(m.bodyFatErrorPct)}` : ''} ·{' '}
                {m.bodyFatMethod ? BODY_FAT_METHOD_LABELS[m.bodyFatMethod] : ''} (estimación)
              </AppText>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.lg },
  gapSm: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { width: '47%', flexGrow: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});
