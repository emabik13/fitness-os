import Constants from 'expo-constants';
import { router } from 'expo-router';

import { Button, ListGroup, ListRow, Screen, SectionHeader, SegmentedControl } from '@/components/ui';
import { goalLabel } from '@/constants/labels';
import { useDatabase } from '@/database/DatabaseProvider';
import { createCatalogRepository } from '@/database/repositories/catalogRepository';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import { EQUIPMENT_LABELS, EXPERIENCE_LABELS, LIMITATION_LABELS, SEX_LABELS } from '@/domain/profile';
import { useDbQuery } from '@/hooks/useDbQuery';
import { formatKg } from '@/utils/format';

export function ProfileScreen() {
  const { db, userId, schemaVersion } = useDatabase();
  const { data, refresh } = useDbQuery(async (d, uid) => {
    const [profile, muscles] = await Promise.all([
      createProfileRepository(d).getProfile(uid),
      createCatalogRepository(d).listMuscleGroups(),
    ]);
    return { profile, muscles };
  });
  const p = data?.profile;
  const muscleName = (id: string) => data?.muscles.find((m) => m.id === id)?.nameEs ?? id;

  return (
    <Screen title="Perfil">
      {p ? (
        <>
          <ListGroup>
            <ListRow icon="flag-outline" title="Objetivo" trailing={goalLabel(p.goal)} />
            <ListRow icon="ribbon-outline" title="Experiencia" trailing={EXPERIENCE_LABELS[p.experience].split(' (')[0]} />
            <ListRow icon="calendar-outline" title="Disponibilidad" trailing={`${p.daysPerWeek} días · ${p.sessionMinutes} min`} />
            <ListRow icon="person-outline" title="Edad y altura" trailing={`${p.ageYears} años · ${formatKg(p.heightCm)} cm`} />
            <ListRow icon="male-female-outline" title="Sexo" trailing={p.sex ? SEX_LABELS[p.sex] : 'No indicado'} />
            <ListRow icon="locate-outline" title="Peso objetivo" trailing={p.targetWeightKg ? `${formatKg(p.targetWeightKg)} kg` : 'Sin definir'} />
            <ListRow
              icon="star-outline"
              title="Prioridades"
              subtitle={p.priorityMuscles.length ? p.priorityMuscles.map(muscleName).join(', ') : 'Ninguna'}
            />
            <ListRow
              icon="medkit-outline"
              title="Limitaciones"
              subtitle={p.limitations.length ? p.limitations.map((l) => LIMITATION_LABELS[l.area]).join(', ') : 'Ninguna'}
            />
            <ListRow
              icon="barbell-outline"
              title="Equipamiento"
              subtitle={p.equipment.map((e) => EQUIPMENT_LABELS[e]).join(', ')}
            />
          </ListGroup>
          <Button label="Editar perfil" icon="create-outline" variant="secondary" onPress={() => router.push('/perfil/editar')} />
        </>
      ) : (
        <Button label="Configurar perfil" icon="person-add-outline" onPress={() => router.push('/onboarding')} />
      )}

      <SectionHeader title="Registros" />
      <ListGroup>
        <ListRow icon="scale-outline" title="Peso corporal" onPress={() => router.push('/registro/peso')} />
        <ListRow icon="resize-outline" title="Medidas corporales" onPress={() => router.push('/registro/medidas')} />
        <ListRow icon="restaurant-outline" title="Nutrición" onPress={() => router.push('/nutricion')} />
        <ListRow icon="moon-outline" title="Recuperación" onPress={() => router.push('/recuperacion')} />
      </ListGroup>

      {p ? (
        <>
          <SectionHeader title="Registro del esfuerzo" />
          <SegmentedControl
            options={[
              { value: 'rir', label: 'RIR' },
              { value: 'rpe', label: 'RPE' },
            ]}
            value={p.preferences.effortScale}
            onChange={async (v) => {
              await createProfileRepository(db).updatePreferences(userId, { effortScale: v });
              refresh();
            }}
            accessibilityLabel="Escala de esfuerzo"
          />
        </>
      ) : null}

      <SectionHeader title="Unidades" />
      <ListGroup>
        <ListRow icon="barbell-outline" title="Peso" trailing="Kilogramos (kg)" />
        <ListRow icon="resize-outline" title="Medidas" trailing="Centímetros (cm)" />
        <ListRow icon="timer-outline" title="Tiempo" trailing="Minutos" />
      </ListGroup>

      <SectionHeader title="Datos y privacidad" />
      <ListGroup>
        <ListRow icon="phone-portrait-outline" title="Almacenamiento" subtitle="Tus datos se guardan solo en este dispositivo" trailing="Local" />
        <ListRow icon="server-outline" title="Base de datos" trailing={`Esquema v${schemaVersion}`} />
        <ListRow icon="shield-checkmark-outline" title="Copia de seguridad y borrado" onPress={() => router.push('/datos')} />
      </ListGroup>

      <SectionHeader title="Aplicación" />
      <ListGroup>
        <ListRow icon="information-circle-outline" title="Versión" trailing={Constants.expoConfig?.version ?? '—'} />
        <ListRow icon="moon-outline" title="Tema" trailing="Oscuro" />
      </ListGroup>
    </Screen>
  );
}
