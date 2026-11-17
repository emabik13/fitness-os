import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  FormSection,
  IconButton,
  ProgressBar,
  Screen,
  SectionHeader,
  TextField,
} from '@/components/ui';
import { useDatabase } from '@/database/DatabaseProvider';
import { createDashboardRepository } from '@/database/repositories/dashboardRepository';
import { createNutritionRepository, sumDay } from '@/database/repositories/nutritionRepository';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import { parseDecimal } from '@/domain/profile';
import { nutritionTargets } from '@/engine/nutrition/targets';
import { useDbQuery } from '@/hooks/useDbQuery';
import { colors, spacing } from '@/theme';
import { notify } from '@/utils/dialog';
import { haptics } from '@/utils/haptics';
import { toLocalDateKey } from '@/utils/time';

function shift(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return toLocalDateKey(new Date(y!, m! - 1, d! + days));
}

function dayLabel(date: string): string {
  const today = toLocalDateKey(new Date());
  if (date === today) return 'Hoy';
  if (date === shift(today, -1)) return 'Ayer';
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function NutritionScreen() {
  const { db, userId } = useDatabase();
  const [date, setDate] = useState(() => toLocalDateKey(new Date()));
  const [form, setForm] = useState({ label: '', kcal: '', p: '', c: '', f: '' });
  const [showWhy, setShowWhy] = useState(false);
  const { data, refresh } = useDbQuery(
    async (d, uid) => {
      const [entries, profile, weight] = await Promise.all([
        createNutritionRepository(d).listDay(uid, date),
        createProfileRepository(d).getProfile(uid),
        createDashboardRepository(d).getLatestWeight(uid),
      ]);
      const targets = profile
        ? nutritionTargets({
            sex: profile.sex, ageYears: profile.ageYears, heightCm: profile.heightCm, weightKg: weight?.weightKg ?? null,
            trainingDaysPerWeek: profile.daysPerWeek, goal: profile.goal,
          })
        : null;
      return { entries, targets };
    },
    [date],
  );
  const totals = sumDay(data?.entries ?? []);
  const t = data?.targets;
  const isToday = date === toLocalDateKey(new Date());

  const add = async (water?: number) => {
    const repo = createNutritionRepository(db);
    const base = { entryDate: date, label: null, caloriesKcal: null, proteinG: null, carbsG: null, fatG: null, waterMl: null };
    try {
      if (water) {
        await repo.add(userId, { ...base, label: 'Agua', waterMl: water });
      } else {
        const kcal = parseDecimal(form.kcal);
        const p = parseDecimal(form.p);
        const c = parseDecimal(form.c);
        const f = parseDecimal(form.f);
        if ([kcal, p, c, f].every((v) => v === null)) return notify('Registro vacío', 'Introduce al menos un valor.');
        if ([kcal, p, c, f].some((v) => v !== null && v < 0) || (kcal ?? 0) > 20000) return notify('Valor no válido', 'Revisa las cantidades.');
        await repo.add(userId, { ...base, label: form.label.trim() || null, caloriesKcal: kcal, proteinG: p, carbsG: c, fatG: f });
        setForm({ label: '', kcal: '', p: '', c: '', f: '' });
      }
      haptics.success();
      refresh();
    } catch (e) {
      notify('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen title="Nutrición" back>
      <View style={styles.dayNav}>
        <IconButton icon="chevron-back" accessibilityLabel="Día anterior" onPress={() => setDate(shift(date, -1))} />
        <AppText variant="bodyStrong" style={styles.flexCenter}>
          {dayLabel(date)}
        </AppText>
        <IconButton icon="chevron-forward" accessibilityLabel="Día siguiente" onPress={() => !isToday && setDate(shift(date, 1))} />
      </View>

      <Card padding="lg" style={styles.gap}>
        <ProgressBar label="Calorías" value={totals.caloriesKcal} min={t?.calories?.min} max={t?.calories?.max} unit="kcal" />
        <ProgressBar label="Proteínas" value={totals.proteinG} min={t?.proteinG?.min} max={t?.proteinG?.max} unit="g" />
        <ProgressBar label="Carbohidratos" value={totals.carbsG} min={t?.carbsG?.min} max={t?.carbsG?.max} unit="g" />
        <ProgressBar label="Grasas" value={totals.fatG} min={t?.fatMinG} max={null} unit="g" />
        <ProgressBar label="Agua" value={totals.waterMl} min={t?.waterMl.min} max={t?.waterMl.max} unit="ml" />
        <View style={styles.row}>
          <Button label="+250 ml" size="md" variant="secondary" onPress={() => add(250)} style={styles.flex} />
          <Button label="+500 ml" size="md" variant="secondary" onPress={() => add(500)} style={styles.flex} />
        </View>
        <Button label={showWhy ? 'Ocultar explicación' : '¿De dónde salen estos objetivos?'} variant="ghost" size="md" onPress={() => setShowWhy((s) => !s)} />
        {showWhy && t ? (
          <View style={styles.gapSm}>
            {t.notes.map((n) => (
              <AppText key={n} variant="footnote" color="textSecondary">
                •  {n}
              </AppText>
            ))}
            {t.fatMinG ? (
              <AppText variant="footnote" color="textSecondary">
                •  Grasas: mínimo orientativo de {t.fatMinG} g (0,6 g/kg). Los carbohidratos completan el resto de la energía.
              </AppText>
            ) : null}
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Añadir comida" />
      <Card padding="lg" style={styles.gap}>
        <FormSection title="Valores" hint="Introduce lo que conozcas; todos los campos son opcionales.">
          <TextField label="Descripción" value={form.label} onChangeText={(v) => setForm({ ...form, label: v })} maxLength={60} />
          <View style={styles.row}>
            <TextField label="Calorías" value={form.kcal} onChangeText={(v) => setForm({ ...form, kcal: v })} keyboardType="decimal-pad" suffix="kcal" maxLength={5} />
            <TextField label="Proteínas" value={form.p} onChangeText={(v) => setForm({ ...form, p: v })} keyboardType="decimal-pad" suffix="g" maxLength={4} />
          </View>
          <View style={styles.row}>
            <TextField label="Carbohidratos" value={form.c} onChangeText={(v) => setForm({ ...form, c: v })} keyboardType="decimal-pad" suffix="g" maxLength={4} />
            <TextField label="Grasas" value={form.f} onChangeText={(v) => setForm({ ...form, f: v })} keyboardType="decimal-pad" suffix="g" maxLength={4} />
          </View>
        </FormSection>
        <Button label="Añadir" icon="add" onPress={() => add()} />
      </Card>

      <SectionHeader title="Registros del día" />
      {(data?.entries ?? []).length === 0 ? (
        <AppText variant="footnote" color="textSecondary">
          Sin registros este día.
        </AppText>
      ) : (
        <Card padding="sm">
          {data!.entries.map((e) => (
            <View key={e.id} style={styles.entry}>
              <View style={styles.flex}>
                <AppText variant="callout">{e.label ?? 'Registro'}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {[
                    e.caloriesKcal !== null ? `${Math.round(e.caloriesKcal)} kcal` : null,
                    e.proteinG !== null ? `P ${Math.round(e.proteinG)} g` : null,
                    e.carbsG !== null ? `C ${Math.round(e.carbsG)} g` : null,
                    e.fatG !== null ? `G ${Math.round(e.fatG)} g` : null,
                    e.waterMl !== null ? `${Math.round(e.waterMl)} ml` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
              </View>
              <IconButton
                icon="trash-outline"
                variant="plain"
                color={colors.textTertiary}
                accessibilityLabel={`Eliminar ${e.label ?? 'registro'}`}
                onPress={async () => {
                  await createNutritionRepository(db).remove(e.id);
                  refresh();
                }}
              />
            </View>
          ))}
        </Card>
      )}
      <AppText variant="caption" color="textTertiary">
        La nutrición es un módulo complementario: el entrenamiento funciona igual aunque no la registres.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.lg },
  gapSm: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  flexCenter: { flex: 1, textAlign: 'center' },
  dayNav: { flexDirection: 'row', alignItems: 'center' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.md, minHeight: 52 },
});
