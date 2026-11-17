import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ScoreSelector, Screen, SectionHeader, Stepper, TextField } from '@/components/ui';
import { useDatabase } from '@/database/DatabaseProvider';
import { averageRecovery, createRecoveryRepository, type RecoveryEntry } from '@/database/repositories/recoveryRepository';
import { useDbQuery } from '@/hooks/useDbQuery';
import { spacing } from '@/theme';
import { notify } from '@/utils/dialog';
import { formatKg } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { toLocalDateKey } from '@/utils/time';

function RecoveryForm({ today, initial, onSaved }: { today: string; initial: RecoveryEntry | null; onSaved: () => void }) {
  const { db, userId } = useDatabase();
  const [sleep, setSleep] = useState(initial?.sleepHours ?? 7);
  const [recovery, setRecovery] = useState<number | null>(initial?.recoveryScore ?? null);
  const [fatigue, setFatigue] = useState<number | null>(initial?.fatigue ?? null);
  const [soreness, setSoreness] = useState<number | null>(initial?.soreness ?? null);
  const [energy, setEnergy] = useState<number | null>(initial?.energy ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const save = async () => {
    try {
      await createRecoveryRepository(db).upsert(userId, {
        entryDate: today, sleepHours: sleep, recoveryScore: recovery, fatigue, soreness, energy, notes: notes.trim() || null,
      });
      haptics.success();
      onSaved();
    } catch (e) {
      notify('No se pudo guardar', e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <Card padding="lg" style={styles.gap}>
      <Stepper label="Horas de sueño" value={sleep} min={0} max={14} step={0.5} format={(v) => `${formatKg(v)} h`} onChange={setSleep} />
      <ScoreSelector label="Percepción de recuperación" value={recovery} onChange={setRecovery} lowLabel="Nada recuperado" highLabel="Totalmente" />
      <ScoreSelector label="Fatiga" value={fatigue} onChange={setFatigue} lowLabel="Ninguna" highLabel="Mucha" />
      <ScoreSelector label="Dolor muscular" value={soreness} onChange={setSoreness} lowLabel="Ninguno" highLabel="Intenso" />
      <ScoreSelector label="Energía" value={energy} onChange={setEnergy} lowLabel="Muy baja" highLabel="Muy alta" />
      <TextField label="Observaciones" value={notes} onChangeText={setNotes} maxLength={200} />
      <Button label={initial ? 'Actualizar registro de hoy' : 'Guardar registro de hoy'} icon="checkmark" onPress={save} />
    </Card>
  );
}

export function RecoveryScreen() {
  const { data, refresh } = useDbQuery(async (db, uid) => {
    const now = new Date();
    const today = toLocalDateKey(now);
    const from = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13));
    const repo = createRecoveryRepository(db);
    const [todayEntry, last14] = await Promise.all([repo.getDay(uid, today), repo.list(uid, from)]);
    return { todayEntry, last14, today };
  });
  if (!data) return <Screen title="Recuperación" back>{null}</Screen>;
  const avg = averageRecovery(data.last14);
  const f = (v: number | null, s = '') => (v === null ? '—' : `${formatKg(v)}${s}`);

  return (
    <Screen title="Recuperación" back>
      <AppText variant="footnote" color="textSecondary">
        Registro subjetivo para entender tu rendimiento. No es un diagnóstico médico: ante dolor persistente o síntomas, consulta a un profesional sanitario.
      </AppText>
      <RecoveryForm key={data.todayEntry?.id ?? 'new'} today={data.today} initial={data.todayEntry} onSaved={refresh} />

      <SectionHeader title="Últimos 14 días" />
      <Card padding="lg" style={styles.gapSm}>
        {avg.days === 0 ? (
          <AppText variant="footnote" color="textSecondary">
            Aún no hay registros.
          </AppText>
        ) : (
          <>
            <View style={styles.rowBetween}>
              <AppText variant="callout">Sueño medio</AppText>
              <AppText variant="callout">{f(avg.sleepHours, ' h')}</AppText>
            </View>
            <View style={styles.rowBetween}>
              <AppText variant="callout">Recuperación</AppText>
              <AppText variant="callout">{f(avg.recoveryScore, ' / 5')}</AppText>
            </View>
            <View style={styles.rowBetween}>
              <AppText variant="callout">Fatiga</AppText>
              <AppText variant="callout">{f(avg.fatigue, ' / 5')}</AppText>
            </View>
            <View style={styles.rowBetween}>
              <AppText variant="callout">Dolor muscular</AppText>
              <AppText variant="callout">{f(avg.soreness, ' / 5')}</AppText>
            </View>
            <View style={styles.rowBetween}>
              <AppText variant="callout">Energía</AppText>
              <AppText variant="callout">{f(avg.energy, ' / 5')}</AppText>
            </View>
            <AppText variant="caption" color="textTertiary">
              {avg.days} días registrados.
              {avg.sleepHours !== null && avg.sleepHours < 7 ? ' Dormir menos de 7 h de forma habitual puede limitar la recuperación y el rendimiento.' : ''}
            </AppText>
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.xl },
  gapSm: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
});
