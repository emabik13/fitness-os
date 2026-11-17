import Constants from 'expo-constants';

import { ListGroup, ListRow, PhaseNotice, Screen, SectionHeader } from '@/components/ui';
import { goalLabel } from '@/constants/labels';
import { useDatabase } from '@/database/DatabaseProvider';
import { createDashboardRepository } from '@/database/repositories/dashboardRepository';
import { useDbQuery } from '@/hooks/useDbQuery';

export function ProfileScreen() {
  const { schemaVersion } = useDatabase();
  const { data } = useDbQuery((db, userId) => createDashboardRepository(db).getProfileSummary(userId));

  return (
    <Screen title="Perfil">
      {data?.onboardingCompleted ? (
        <ListGroup>
          <ListRow icon="flag-outline" title="Objetivo" trailing={goalLabel(data.goal)} />
        </ListGroup>
      ) : (
        <PhaseNotice
          phase={2}
          title="Perfil sin configurar"
          description="Podrás definir y editar edad, altura, peso, experiencia, disponibilidad, objetivo, músculos prioritarios y limitaciones."
        />
      )}

      <SectionHeader title="Unidades" />
      <ListGroup>
        <ListRow icon="barbell-outline" title="Peso" trailing="Kilogramos (kg)" />
        <ListRow icon="resize-outline" title="Medidas" trailing="Centímetros (cm)" />
        <ListRow icon="timer-outline" title="Tiempo" trailing="Minutos" />
      </ListGroup>

      <SectionHeader title="Datos y privacidad" />
      <ListGroup>
        <ListRow
          icon="phone-portrait-outline"
          title="Almacenamiento"
          subtitle="Tus datos se guardan solo en este dispositivo"
          trailing="Local"
        />
        <ListRow icon="server-outline" title="Base de datos" trailing={`Esquema v${schemaVersion}`} />
        <ListRow
          icon="cloud-offline-outline"
          title="Copia de seguridad y sincronización"
          subtitle="Supabase · disponible en la Fase 10"
          trailing="Desactivada"
        />
      </ListGroup>

      <SectionHeader title="Aplicación" />
      <ListGroup>
        <ListRow icon="information-circle-outline" title="Versión" trailing={Constants.expoConfig?.version ?? '—'} />
        <ListRow icon="moon-outline" title="Tema" trailing="Oscuro" />
      </ListGroup>
    </Screen>
  );
}
