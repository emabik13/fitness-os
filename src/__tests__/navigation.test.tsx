import { Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseContextProvider } from '@/database/DatabaseProvider';
import { bootstrapDatabase } from '@/database/sqlite/bootstrap';
import type { SqlExecutor } from '@/database/types';
import { createTestDb } from '@/test/nodeSqliteExecutor';

let ctx: { db: SqlExecutor; userId: string; schemaVersion: number };

beforeEach(async () => {
  const db = createTestDb();
  const { userId, schemaVersion } = await bootstrapDatabase(db);
  ctx = { db, userId, schemaVersion };
});

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

describe('navigation', () => {
  it('opens on Inicio with honest empty states from the database', async () => {
    await renderApp();
    expect(screen).toHavePathname('/');
    expect(await screen.findByText('Sin rutina activa')).toBeTruthy();
    expect(await screen.findByText('0 entrenamientos completados')).toBeTruthy();
    expect(screen.getByText('Sin récords todavía')).toBeTruthy();
  });

  it.each([
    ['Entrenar', '/entrenar', 'Mis rutinas'],
    ['Anatomía', '/anatomia', 'Visor anatómico 3D'],
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

  it('profile shows schema version and fixed units', async () => {
    await renderApp('/perfil');
    expect(await screen.findByText(`Esquema v${ctx.schemaVersion}`)).toBeTruthy();
    expect(screen.getByText('Kilogramos (kg)')).toBeTruthy();
  });
});
