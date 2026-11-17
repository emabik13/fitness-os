import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseContextProvider } from '@/database/DatabaseProvider';
import { createProfileRepository } from '@/database/repositories/profileRepository';
import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import { EQUIPMENT } from '@/domain/profile';
import type { SqlExecutor } from '@/database/types';
import { useSessionStore } from '@/stores/sessionStore';
import { createTestDb } from '@/test/nodeSqliteExecutor';

let ctx: { db: SqlExecutor; userId: string; schemaVersion: number };

beforeEach(async () => {
  const db = createTestDb();
  const { userId, schemaVersion } = await bootstrapDatabase(db);
  ctx = { db, userId, schemaVersion };
  useSessionStore.getState().setOnboarded(false);
});

async function seedProfile() {
  await createProfileRepository(ctx.db).saveProfile(ctx.userId, {
    ageYears: 30, sex: null, heightCm: 178, weightKg: 80, targetWeightKg: null, goal: 'recomposition',
    experience: 'intermediate', daysPerWeek: 4, sessionMinutes: 60, priorityMuscles: [], limitations: [],
    liftExperience: {}, equipment: [...EQUIPMENT], preferences: { effortScale: 'rir', preferMachines: false, includeCore: true },
  });
  useSessionStore.getState().setOnboarded(true);
}

/** Real (tabs) routes and screens; only the root layout is swapped to inject a real in-memory SQLite. */
function TestRootLayout() {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <DatabaseContextProvider value={ctx}>
        <Stack screenOptions={{ headerShown: false }} />
      </DatabaseContextProvider>
    </SafeAreaProvider>
  );
}

async function renderApp(initialUrl = '/') {
  await renderRouter({ appDir: './src/app', overrides: { _layout: TestRootLayout } }, { initialUrl });
}

describe('onboarding', () => {
  it('redirects a new user to onboarding and saves the profile', async () => {
    await renderApp();
    await waitFor(() => expect(screen).toHavePathname('/onboarding'));
    // Step 1 with invalid data shows errors and does not advance.
    await act(async () => fireEvent.press(screen.getByLabelText('Continuar')));
    expect(await screen.findByText('Revisa los campos marcados')).toBeTruthy();
    await act(async () => fireEvent.changeText(screen.getByLabelText('Edad'), '31'));
    await act(async () => fireEvent.changeText(screen.getByLabelText('Altura'), '178'));
    await act(async () => fireEvent.changeText(screen.getByLabelText('Peso actual'), '82,4'));
    for (const title of ['Objetivo', 'Disponibilidad', 'Gimnasio y salud']) {
      await act(async () => fireEvent.press(screen.getByLabelText('Continuar')));
      expect(await screen.findByText(title)).toBeTruthy();
    }
    await act(async () => fireEvent.press(screen.getByLabelText('Empezar')));
    await waitFor(() => expect(screen).toHavePathname('/'));
    const p = await createProfileRepository(ctx.db).getProfile(ctx.userId);
    expect(p?.goal).toBe('recomposition');
    expect(p?.ageYears).toBe(31);
    const w = await ctx.db.getFirstAsync<{ weight_kg: number }>('SELECT weight_kg FROM body_weight_entries');
    expect(w?.weight_kg).toBe(82.4);
  });
});

describe('navigation', () => {
  beforeEach(seedProfile);

  it('opens on Inicio with honest empty states from the database', async () => {
    await renderApp();
    expect(screen).toHavePathname('/');
    expect(await screen.findByText('Sin rutina activa')).toBeTruthy();
    expect(await screen.findByText('0 entrenamientos completados')).toBeTruthy();
    expect(screen.getByText('Sin récords todavía')).toBeTruthy();
  });

  it.each([
    ['Entrenar', '/entrenar', 'Mis rutinas'],
    ['Anatomía', '/anatomia', 'Biblioteca de ejercicios'],
    ['Progreso', '/progreso', 'Peso corporal'],
    ['Perfil', '/perfil', 'Datos y privacidad'],
  ])('tab %s navigates to %s', async (tab, path, marker) => {
    await renderApp();
    await screen.findByText('Sin rutina activa');
    await act(async () => {
      fireEvent.press(screen.getByLabelText(tab));
    });
    await waitFor(() => expect(screen).toHavePathname(path));
    expect(await screen.findByText(marker)).toBeTruthy();
  });

  it('anatomy front/back toggle filters muscle groups', async () => {
    await renderApp('/anatomia');
    expect(await screen.findByText('Pectorales')).toBeTruthy();
    expect(screen.queryByText('Dorsales')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Posterior'));
    });
    expect(await screen.findByText('Dorsales')).toBeTruthy();
    expect(screen.queryByText('Pectorales')).toBeNull();
    expect(screen.getByText('Deltoides')).toBeTruthy(); // visible in both views
  });

  it('progress reflects a real logged workout and range filter', async () => {
    const ts = new Date(Date.now() - 2 * 86400000).toISOString();
    await ctx.db.runAsync(
      `INSERT INTO workouts (id, user_id, name, status, started_at, ended_at, duration_seconds, created_at, updated_at)
       VALUES ('w1', ?, 'Full Body', 'completed', ?, ?, 2700, ?, ?)`,
      [ctx.userId, ts, ts, ts, ts],
    );
    await renderApp('/progreso');
    expect(await screen.findByText('45')).toBeTruthy(); // 2700 s → 45 min
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Todo'));
    });
    expect(await screen.findByText('45')).toBeTruthy();
  });

  it('profile shows saved data and fixed units', async () => {
    await renderApp('/perfil');
    expect(await screen.findByText(`Esquema v${ctx.schemaVersion}`)).toBeTruthy();
    expect(screen.getByText('Kilogramos (kg)')).toBeTruthy();
    expect(screen.getByText('4 días · 60 min')).toBeTruthy();
  });

  it('library search and exercise detail with technique', async () => {
    await renderApp('/ejercicios');
    await act(async () => fireEvent.changeText(await screen.findByLabelText('Buscar ejercicio'), 'jalon'));
    await act(async () => fireEvent.press(await screen.findByLabelText('Jalón al pecho')));
    expect(await screen.findByText('Cómo se hace')).toBeTruthy();
    expect(screen.getByText('Animación 3D pendiente de contenido')).toBeTruthy();
    expect(screen.getByText('Biomecánica')).toBeTruthy();
  });

  it('free workout: add exercise from library, complete a set, rest timer, finish and summary', async () => {
    await renderApp('/entrenar');
    await act(async () => fireEvent.press(await screen.findByLabelText('Entrenamiento libre')));
    await waitFor(() => expect(screen).toHavePathname(expect.stringMatching(/^\/entrenamiento\//)));
    await act(async () => fireEvent.press(await screen.findByLabelText('Añadir ejercicio')));
    await act(async () => fireEvent.press(await screen.findByLabelText('Press de banca con barra')));
    expect(await screen.findByText('Press de banca con barra')).toBeTruthy();
    await act(async () => fireEvent.changeText(screen.getByLabelText('Peso serie 1'), '40'));
    await act(async () => fireEvent.changeText(screen.getByLabelText('Repeticiones serie 1'), '12'));
    await act(async () => fireEvent.press(screen.getByLabelText('Completar serie 1')));
    expect(await screen.findByText(/Descanso · Press de banca/)).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByLabelText('Saltar')));
    // The user confirms that the 2 incomplete sets will be discarded.
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    await act(async () => fireEvent.press(screen.getByLabelText('Finalizar')));
    expect(alert).toHaveBeenCalledWith('Finalizar entrenamiento', expect.stringMatching(/2 series sin completar/), expect.anything());
    alert.mockRestore();
    await waitFor(() => expect(screen).toHavePathname(expect.stringMatching(/^\/entrenamiento\/resumen\//)));
    expect(await screen.findByText('Volumen total')).toBeTruthy();
    expect(screen.getByText('480')).toBeTruthy();
    const n = await ctx.db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM workout_sets WHERE deleted_at IS NULL AND is_completed = 1");
    expect(n?.n).toBe(1);
  });

  it('generates and saves a routine from the profile', async () => {
    await renderApp('/rutinas/generar');
    expect(await screen.findByText('Por qué esta rutina')).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByLabelText('Guardar y activar')));
    await waitFor(() => expect(screen).toHavePathname(expect.stringMatching(/^\/rutinas\/[^g]/)));
    expect(await screen.findByText('Rutina activa')).toBeTruthy();
  });

  it('logs a body weight entry from the profile', async () => {
    await renderApp('/registro/peso');
    await act(async () => fireEvent.changeText(await screen.findByLabelText('Peso'), '79,6'));
    await act(async () => fireEvent.press(screen.getByLabelText('Guardar pesaje')));
    expect(await screen.findByText('79,6 kg')).toBeTruthy();
  });
});
