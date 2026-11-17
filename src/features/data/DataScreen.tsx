import { router } from 'expo-router';
import { useState } from 'react';

import { AppText, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { useDatabase } from '@/database/DatabaseProvider';
import { deleteAllUserData, exportBackup, importBackup } from '@/services/backup/backup';
import { canPickFile, pickTextFile, saveTextFile } from '@/services/backup/fileIO';
import { useSessionStore } from '@/stores/sessionStore';
import { spacing } from '@/theme';
import { confirmAsync, notify } from '@/utils/dialog';
import { toLocalDateKey } from '@/utils/time';

export function DataScreen() {
  const { db, userId } = useDatabase();
  const [busy, setBusy] = useState<'export' | 'import' | 'delete' | null>(null);

  const doExport = async () => {
    setBusy('export');
    try {
      const data = await exportBackup(db, userId);
      await saveTextFile(`fitness-os-${toLocalDateKey(new Date())}.json`, JSON.stringify(data));
    } catch (e) {
      notify('No se pudo exportar', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    const text = await pickTextFile();
    if (!text) return;
    setBusy('import');
    try {
      const r = await importBackup(db, userId, JSON.parse(text));
      const profile = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM user_profiles WHERE user_id = ? AND onboarding_completed_at IS NOT NULL', [userId]);
      if (profile?.n) useSessionStore.getState().setOnboarded(true);
      notify(
        'Importación completada',
        `${r.inserted} registros añadidos, ${r.updated} actualizados, ${r.skipped} sin cambios.${r.errors.length ? `\n\nAvisos:\n${r.errors.join('\n')}` : ''}`,
      );
    } catch (e) {
      notify('No se pudo importar', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    if (!(await confirmAsync('Borrar todos mis datos', 'Se eliminarán de este dispositivo tu perfil, rutinas, entrenamientos, mediciones, nutrición y recuperación. Exporta una copia antes si quieres conservarlos. No se puede deshacer.', 'Borrar todo', true))) return;
    setBusy('delete');
    try {
      await deleteAllUserData(db, userId);
      useSessionStore.getState().setOnboarded(false);
      router.replace('/onboarding');
    } catch (e) {
      notify('No se pudo borrar', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title="Tus datos" subtitle="Privacidad" back>
      <Card padding="lg" style={{ gap: spacing.sm }}>
        <AppText variant="body">Todo se guarda únicamente en este dispositivo. No hay servidor ni cuenta por ahora.</AppText>
        <AppText variant="footnote" color="textSecondary">
          En la app web instalada (iPhone), si eliminas el icono de la pantalla de inicio iOS borra también sus datos. Exporta copias de seguridad con regularidad.
        </AppText>
      </Card>

      <SectionHeader title="Copia de seguridad" />
      <Button label="Exportar copia (JSON)" icon="download-outline" onPress={doExport} loading={busy === 'export'} />
      {canPickFile ? (
        <Button label="Importar copia" icon="push-outline" variant="secondary" onPress={doImport} loading={busy === 'import'} />
      ) : null}
      <AppText variant="caption" color="textTertiary">
        La copia incluye perfil, rutinas, entrenamientos, récords, peso, medidas, nutrición y recuperación. Las fotos de progreso no se incluyen. Importar una copia
        varias veces no duplica registros: se conserva siempre la versión más reciente de cada uno.
      </AppText>

      <SectionHeader title="Zona de peligro" />
      <Button label="Borrar todos mis datos" icon="trash-outline" variant="danger" onPress={doDelete} loading={busy === 'delete'} />
    </Screen>
  );
}
