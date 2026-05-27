/**
 * Global React Query telemetry. Mount once at root with
 * attachQueryClientTelemetry(queryClient).
 *
 * Tracks:
 *  - query started → finished latency (per first key segment)
 *  - cache hit ratio (queries that resolved before the first fetch settled)
 *  - mutation success / failure counts
 *  - slow queries (> 1.5 s) → warn breadcrumb
 *
 * No PII. The query key is reduced to its first segment ("products",
 * "loyalty", ...) so telemetry stays generic.
 */

import type { Query, QueryClient, QueryKey, Mutation } from "@tanstack/react-query";
import { addBreadcrumb } from "./breadcrumbs";
import { incCounter, recordDuration } from "./metrics";

const SLOW_QUERY_MS = 1500;
const inFlight = new WeakMap<Query, number>();
const inFlightMutations = new WeakMap<Mutation<unknown, unknown, unknown, unknown>, number>();

function keyRoot(key: QueryKey): string {
  const first = key[0];
  return typeof first === "string" ? first : "unknown";
}

export function attachQueryClientTelemetry(qc: QueryClient): () => void {
  const queryCache    = qc.getQueryCache();
  const mutationCache = qc.getMutationCache();

  const unsubQuery = queryCache.subscribe((event) => {
    if (!event) return;
    const root = keyRoot(event.query.queryKey);
    const state = event.query.state;

    if (event.type === "updated") {
      if (state.fetchStatus === "fetching" && !inFlight.has(event.query)) {
        inFlight.set(event.query, Date.now());
        incCounter(`query.${root}.start`);
      } else if (state.fetchStatus === "idle" && inFlight.has(event.query)) {
        const started = inFlight.get(event.query)!;
        inFlight.delete(event.query);
        const dur = Date.now() - started;
        recordDuration(`query.${root}`, dur);
        if (state.status === "success") {
          incCounter(`query.${root}.success`);
        } else if (state.status === "error") {
          incCounter(`query.${root}.error`);
          addBreadcrumb({
            category: "query",
            level:    "error",
            message:  `query failed: ${root}`,
            data:     { ms: dur, error: stringifyError(state.error) },
          });
        }
        if (dur > SLOW_QUERY_MS && state.status === "success") {
          incCounter(`query.${root}.slow`);
          addBreadcrumb({
            category: "query",
            level:    "warn",
            message:  `slow query: ${root}`,
            data:     { ms: dur },
          });
        }
      }
    }

    if (event.type === "added") {
      // First-render fresh-cache hit: query resolves immediately without
      // ever entering "fetching". We notice it because `dataUpdatedAt` is
      // recent and status === "success" without an in-flight entry.
      if (state.status === "success" && state.dataUpdatedAt > 0 && state.fetchStatus === "idle") {
        incCounter(`query.${root}.cache_hit`);
      }
    }
  });

  const unsubMutation = mutationCache.subscribe((event) => {
    if (!event) return;
    const m = event.mutation;
    if (!m) return;
    const root = m.options.mutationKey ? keyRoot(m.options.mutationKey) : "anonymous";

    if (event.type === "updated") {
      const status = m.state.status;
      if (status === "pending" && !inFlightMutations.has(m)) {
        inFlightMutations.set(m, Date.now());
        incCounter(`mutation.${root}.start`);
      } else if ((status === "success" || status === "error") && inFlightMutations.has(m)) {
        const started = inFlightMutations.get(m)!;
        inFlightMutations.delete(m);
        const dur = Date.now() - started;
        recordDuration(`mutation.${root}`, dur);
        incCounter(`mutation.${root}.${status}`);
        if (status === "error") {
          addBreadcrumb({
            category: "mutation",
            level:    "error",
            message:  `mutation failed: ${root}`,
            data:     { ms: dur, error: stringifyError(m.state.error) },
          });
        }
      }
    }
  });

  return () => {
    unsubQuery();
    unsubMutation();
  };
}

function stringifyError(e: unknown): string {
  if (!e) return "unknown";
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e).slice(0, 200); }
  catch { return "[unserialisable]"; }
}
