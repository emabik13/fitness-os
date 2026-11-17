import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  ChipGroup,
  EmptyState,
  FormSection,
  Screen,
  SegmentedControl,
  Stepper,
  TextField,
  goBack,
} from '@/components/ui';
import { GOAL_LABELS } from '@/constants/labels';
import { useDatabase } from '@/database/DatabaseProvider';
import { createCatalogRepository } from '@/database/repositories/catalogRepository';
import { createDashboardRepository } from '@/database/repositories/dashboardRepository';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXPERIENCE,
  EXPERIENCE_LABELS,
  GOALS,
  LIFT_LABELS,
  LIFT_LEVEL_LABELS,
  LIFT_LEVELS,
  LIFT_PATTERNS,
  LIMITATION_AREAS,
  LIMITATION_LABELS,
  SEXES,
  SEX_LABELS,
  type LiftLevel,
} from '@/domain/profile';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useSessionStore } from '@/stores/sessionStore';
import { colors, radii, spacing } from '@/theme';
import { notify } from '@/utils/dialog';
import { haptics } from '@/utils/haptics';

import { fieldErrors, initialFormState, STEP_FIELDS, toProfileInput, type ProfileFormState } from './profileFormState';

const GOAL_HINTS: Record<(typeof GOALS)[number], string> = {
  recomposition: 'Ganar músculo y reducir grasa de forma gradual.',
  hypertrophy: 'Priorizar el aumento de masa muscular.',
  strength: 'Mejorar la fuerza máxima en los ejercicios básicos.',
  fat_loss: 'Reducir grasa conservando la masa muscular.',
  maintenance: 'Mantener el nivel actual con menos volumen.',
};

const STEP_TITLES = ['Tus datos', 'Objetivo', 'Disponibilidad', 'Gimnasio y salud'];

export function ProfileFlowScreen({ mode }: { mode: 'onboarding' | 'edit' }) {
  const { db, userId } = useDatabase();
  const { data } = useDbQuery(async (d, uid) => {
    const [profile, weight, muscles] = await Promise.all([
      createProfileRepository(d).getProfile(uid),
      createDashboardRepository(d).getLatestWeight(uid),
      createCatalogRepository(d).listMuscleGroups(),
    ]);
    return { profile, weight, muscles };
  });

  const [state, setState] = useState<ProfileFormState | null>(null);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !state) setState(initialFormState(data.profile, data.weight?.weightKg));
  }, [data, state]);

  const errors = useMemo(() => (state ? fieldErrors(state) : {}), [state]);
  if (!state || !data) return <Screen title={mode === 'edit' ? 'Editar perfil' : 'Bienvenido'} back={mode === 'edit'}>{null}</Screen>;

  const set = <K extends keyof ProfileFormState>(k: K, v: ProfileFormState[K]) => setState((s) => (s ? { ...s, [k]: v } : s));
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const stepHasErrors = STEP_FIELDS[step]!.some((f) => errors[f]);
  const err = (f: keyof typeof errors) => (showErrors ? errors[f] : null);
  const isLast = step === STEP_TITLES.length - 1;

  const next = async () => {
    if (stepHasErrors) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    const parsed = toProfileInput(state);
    if (!parsed.success) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await createProfileRepository(db).saveProfile(userId, parsed.data);
      haptics.success();
      useSessionStore.getState().setOnboarded(true);
      if (mode === 'onboarding') router.replace('/');
      else goBack();
    } catch (e) {
      notify('No se pudo guardar', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      back={mode === 'edit' || step > 0}
      subtitle={`Paso ${step + 1} de ${STEP_TITLES.length}`}
      title={STEP_TITLES[step]}
      footer={
        <View style={styles.footerRow}>
          {step > 0 ? (
            <Button label="Atrás" variant="secondary" onPress={() => setStep(step - 1)} style={styles.flex1} />
          ) : null}
          <Button
            label={isLast ? (mode === 'edit' ? 'Guardar cambios' : 'Empezar') : 'Continuar'}
            onPress={next}
            loading={saving}
            style={styles.flex2}
          />
        </View>
      }
    >
      <View style={styles.progress}>
        {STEP_TITLES.map((t, i) => (
          <View key={t} style={[styles.progressSeg, i <= step && styles.progressOn]} />
        ))}
      </View>

      {step === 0 ? (
        <>
          <View style={styles.row}>
            <TextField label="Edad" value={state.age} onChangeText={(v) => set('age', v)} keyboardType="number-pad" suffix="años" error={err('ageYears')} maxLength={3} />
            <TextField label="Altura" value={state.height} onChangeText={(v) => set('height', v)} keyboardType="decimal-pad" suffix="cm" error={err('heightCm')} maxLength={5} />
          </View>
          <View style={styles.row}>
            <TextField label="Peso actual" value={state.weight} onChangeText={(v) => set('weight', v)} keyboardType="decimal-pad" suffix="kg" error={err('weightKg')} maxLength={5} />
            <TextField label="Peso objetivo (opcional)" value={state.targetWeight} onChangeText={(v) => set('targetWeight', v)} keyboardType="decimal-pad" suffix="kg" error={err('targetWeightKg')} maxLength={5} />
          </View>
          <FormSection
            title="Sexo (opcional)"
            hint="Solo se usa para estimar el gasto energético (fórmula Mifflin-St Jeor). Sin este dato no se calcularán calorías."
          >
            <ChipGroup
              options={SEXES.map((v) => ({ value: v, label: SEX_LABELS[v] }))}
              selected={state.sex ? [state.sex] : []}
              onToggle={(v) => set('sex', state.sex === v ? null : v)}
            />
          </FormSection>
          <AppText variant="footnote" color="textTertiary">
            El peso objetivo es opcional: FITNESS OS no fija metas de peso por ti.
          </AppText>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <FormSection title="Objetivo principal">
            <View style={styles.list}>
              {GOALS.map((g) => (
                <Button
                  key={g}
                  label={GOAL_LABELS[g]}
                  variant={state.goal === g ? 'primary' : 'secondary'}
                  onPress={() => set('goal', g)}
                  accessibilityHint={GOAL_HINTS[g]}
                />
              ))}
              <AppText variant="footnote" color="textSecondary">
                {GOAL_HINTS[state.goal]}
              </AppText>
            </View>
          </FormSection>
          <FormSection title="Experiencia de entrenamiento">
            <ChipGroup
              options={EXPERIENCE.map((v) => ({ value: v, label: EXPERIENCE_LABELS[v] }))}
              selected={[state.experience]}
              onToggle={(v) => set('experience', v)}
            />
          </FormSection>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <View style={styles.card}>
            <Stepper label="Días por semana" value={state.daysPerWeek} onChange={(v) => set('daysPerWeek', v)} min={1} max={7} />
            <Stepper
              label="Minutos por sesión"
              value={state.sessionMinutes}
              onChange={(v) => set('sessionMinutes', v)}
              min={30}
              max={150}
              step={15}
              format={(v) => `${v} min`}
            />
          </View>
          <FormSection title="Grupos musculares prioritarios" hint="Hasta 3. Recibirán algo más de volumen semanal.">
            <ChipGroup
              options={data.muscles.map((m) => ({ value: m.id, label: m.nameEs }))}
              selected={state.priorityMuscles}
              onToggle={(v) => set('priorityMuscles', toggleIn(state.priorityMuscles, v))}
            />
            {err('priorityMuscles') ? (
              <AppText variant="caption" color="danger">
                {err('priorityMuscles')}
              </AppText>
            ) : null}
          </FormSection>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <FormSection title="Equipamiento disponible">
            <ChipGroup
              options={EQUIPMENT.map((v) => ({ value: v, label: EQUIPMENT_LABELS[v] }))}
              selected={state.equipment}
              onToggle={(v) => set('equipment', toggleIn(state.equipment, v))}
            />
            {err('equipment') ? (
              <AppText variant="caption" color="danger">
                {err('equipment')}
              </AppText>
            ) : null}
          </FormSection>
          <FormSection
            title="Limitaciones físicas"
            hint="El generador evitará ejercicios que cargan mucho esas zonas. No es una valoración médica: ante dolor o lesión consulta a un profesional sanitario."
          >
            <ChipGroup
              options={LIMITATION_AREAS.map((v) => ({ value: v, label: LIMITATION_LABELS[v] }))}
              selected={state.limitations}
              onToggle={(v) => set('limitations', toggleIn(state.limitations, v))}
            />
            {state.limitations.length ? (
              <TextField
                label="Observaciones (opcional)"
                value={state.limitationNote}
                onChangeText={(v) => set('limitationNote', v)}
                maxLength={200}
              />
            ) : null}
          </FormSection>
          <FormSection title="Experiencia con ejercicios básicos">
            {LIFT_PATTERNS.map((p) => (
              <View key={p} style={styles.liftRow}>
                <AppText variant="callout">{LIFT_LABELS[p]}</AppText>
                <SegmentedControl
                  options={LIFT_LEVELS.map((l) => ({ value: l, label: LIFT_LEVEL_LABELS[l] }))}
                  value={state.liftExperience[p] ?? 'none'}
                  onChange={(l: LiftLevel) => set('liftExperience', { ...state.liftExperience, [p]: l })}
                  accessibilityLabel={LIFT_LABELS[p]}
                />
              </View>
            ))}
          </FormSection>
          <FormSection title="Preferencias">
            <AppText variant="callout">Registrar el esfuerzo como</AppText>
            <SegmentedControl
              options={[
                { value: 'rir', label: 'RIR (reps en reserva)' },
                { value: 'rpe', label: 'RPE (1–10)' },
              ]}
              value={state.preferences.effortScale}
              onChange={(v) => set('preferences', { ...state.preferences, effortScale: v })}
            />
            <ChipGroup
              options={[
                { value: 'machines', label: 'Prefiero máquinas y poleas' },
                { value: 'core', label: 'Incluir trabajo de core' },
              ]}
              selected={[
                ...(state.preferences.preferMachines ? (['machines'] as const) : []),
                ...(state.preferences.includeCore ? (['core'] as const) : []),
              ]}
              onToggle={(v) =>
                set(
                  'preferences',
                  v === 'machines'
                    ? { ...state.preferences, preferMachines: !state.preferences.preferMachines }
                    : { ...state.preferences, includeCore: !state.preferences.includeCore },
                )
              }
            />
          </FormSection>
        </>
      ) : null}

      {showErrors && stepHasErrors ? (
        <EmptyState icon="alert-circle-outline" title="Revisa los campos marcados" description="Corrige los datos para continuar." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  list: { gap: spacing.sm },
  card: { gap: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg },
  liftRow: { gap: spacing.sm },
  progress: { flexDirection: 'row', gap: spacing.xs },
  progressSeg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised },
  progressOn: { backgroundColor: colors.accent },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
});
