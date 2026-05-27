/**
 * MMKV-backed React Query persister.
 *
 * Persists the query cache across cold starts so the next boot paints from
 * disk while the network refreshes. Mutations and queries tagged "sensitive"
 * are excluded — auth tokens, PII, and anything user-specific stays in
 * Supabase's own AsyncStorage session, not in the rehydratable cache.
 *
 * Cache schema is versioned via QUERY_CACHE_BUSTER. Bump it whenever query
 * keys or response DTOs change shape in a backwards-incompatible way.
 */

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { queryCacheStorage } from "./mmkv";
import { QUERY_CACHE_BUSTER } from "./queryClient";

/** Query key prefixes that should NEVER be persisted. */
const SENSITIVE_PREFIXES = new Set([
  "auth",
  "profile",
  "loyalty",
  "orders",
  "cart",
  "payment-methods",
  "addresses",
  "notifications",
  "prescriptions",
  "health-profile",
]);

function isSensitive(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0];
  return typeof head === "string" && SENSITIVE_PREFIXES.has(head);
}

export const queryPersister = createSyncStoragePersister({
  storage: queryCacheStorage,
  key:     "rq-cache",
  // ~6 MB headroom; MMKV handles larger but parsing a huge cache blocks the JS
  // thread on rehydrate. Cap conservatively.
  throttleTime: 1000,
  serialize(client) {
    const filtered: PersistedClient = {
      ...client,
      clientState: {
        ...client.clientState,
        queries: client.clientState.queries.filter(
          (q) => !isSensitive(q.queryKey) && q.state.status === "success",
        ),
        mutations: [],
      },
    };
    return JSON.stringify(filtered);
  },
  deserialize(raw) {
    return JSON.parse(raw) as PersistedClient;
  },
});

export const persistOptions = {
  persister: queryPersister,
  /** Max age before cache is considered too stale to rehydrate at all. */
  maxAge: 24 * 60 * 60 * 1000,
  buster: QUERY_CACHE_BUSTER,
} as const;
