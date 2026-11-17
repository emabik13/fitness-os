/**
 * Conflict resolution shared by backup import and (future) Supabase sync.
 * Last-writer-wins on a per-row version vector of length 1:
 *   higher `version` wins; on a tie, later `updated_at` wins; identical → keep local.
 * Deletions are rows with `deleted_at` set, so they propagate like any edit.
 */
export interface Versioned {
  version: number;
  updated_at: string;
}

export function incomingWins(local: Versioned | null, incoming: Versioned): boolean {
  if (!local) return true;
  if (incoming.version !== local.version) return incoming.version > local.version;
  return incoming.updated_at > local.updated_at;
}
