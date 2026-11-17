import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { openExecutor } from './sqlite/client';
import { bootstrapDatabase } from './sqlite/bootstrap';
import type { SqlExecutor } from './types';

interface DatabaseContextValue {
  db: SqlExecutor;
  userId: string;
  schemaVersion: number;
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; value: DatabaseContextValue }
  | { status: 'error'; error: Error };

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
  /** Rendered while migrations run. */
  fallback: ReactNode;
  /** Rendered if the database cannot be opened/migrated. */
  renderError: (error: Error, retry: () => void) => ReactNode;
  onReady?: () => void;
}

/** Opens SQLite, runs migrations and exposes the executor + local user id. */
export function DatabaseProvider({ children, fallback, renderError, onReady }: DatabaseProviderProps) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openExecutor();
        const { schemaVersion, userId } = await bootstrapDatabase(db);
        if (!cancelled) setState({ status: 'ready', value: { db, userId, schemaVersion } });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: e instanceof Error ? e : new Error(String(e)) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (state.status !== 'loading') onReady?.();
  }, [state.status, onReady]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  if (state.status === 'loading') return <>{fallback}</>;
  if (state.status === 'error') return <>{renderError(state.error, retry)}</>;
  return <DatabaseContext.Provider value={state.value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase debe usarse dentro de <DatabaseProvider>.');
  return ctx;
}

/** For tests: provide an already-bootstrapped executor. */
export const DatabaseContextProvider = DatabaseContext.Provider;
