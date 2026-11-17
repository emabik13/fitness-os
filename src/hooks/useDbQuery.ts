import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDatabase } from '@/database/DatabaseProvider';
import type { SqlExecutor } from '@/database/types';

interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Runs a read against the local database and re-runs it whenever the screen
 * regains focus (so data written on another screen is always fresh) and when
 * `deps` change. Pull-to-refresh calls `refresh`.
 */
export function useDbQuery<T>(
  query: (db: SqlExecutor, userId: string) => Promise<T>,
  deps: readonly unknown[] = [],
): QueryState<T> {
  const { db, userId } = useDatabase();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  // Always call the latest query closure; re-run only when deps change.
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  });
  const depsKey = deps.map((d) => String(d)).join('|');

  const run = useCallback(
    async (isRefresh: boolean) => {
      const id = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      try {
        const result = await queryRef.current(db, userId);
        if (id === requestId.current) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (id === requestId.current) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // depsKey intentionally triggers a new callback (and a re-run on focus/effect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, userId, depsKey],
  );

  useFocusEffect(
    useCallback(() => {
      void run(false);
    }, [run]),
  );

  const refresh = useCallback(() => void run(true), [run]);
  return { data, error, loading, refreshing, refresh };
}
