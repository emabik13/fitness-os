/**
 * Minimal async SQL interface. It is a strict subset of expo-sqlite's
 * `SQLiteDatabase`, so the real database satisfies it directly, and tests can
 * provide an adapter backed by Node's built-in `node:sqlite` to run the very
 * same SQL (no mocks of query results).
 */
export type SqlParam = string | number | null;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlParam[]): Promise<RunResult>;
  getFirstAsync<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
