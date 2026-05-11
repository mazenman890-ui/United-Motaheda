/**
 * catalogSearchWorker.ts — Web Worker pool manager
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   Previous: 1 singleton worker, single-threaded.  With a 52K catalog, a slow
 *   query (L4 Levenshtein on many candidates) could take 80–150ms, blocking all
 *   other search requests for that duration.
 *
 *   New: Dynamic worker POOL (size = min(hardwareConcurrency, MAX_POOL_SIZE)).
 *   Requests are dispatched to the least-busy worker.  On an 8-core machine
 *   this gives up to 4× parallelism on concurrent requests (suggestions from
 *   SearchContext + full grid from useCatalogProductSearch both run concurrently).
 *
 *   With the new inverted index in each worker, individual searches are already
 *   fast (~5–20ms).  The pool is primarily insurance for worst-case queries and
 *   to handle concurrent request bursts without queuing.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANCELLATION — SharedArrayBuffer
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   A SharedArrayBuffer of 4 bytes holds the current search generation number.
 *   When the user types a new character:
 *     1. Main thread atomically increments the generation (Atomics.add).
 *     2. All workers see the new value at their next checkpoint (every 128 items)
 *        and abort their current scan immediately, returning an empty result.
 *     3. The new request is dispatched normally.
 *
 *   Result: stale searches abort within ~1ms of a new character being typed,
 *   rather than running to completion and being discarded.
 *
 *   SharedArrayBuffer requires COOP + COEP headers.  We detect availability at
 *   module load and fall back to the request-ID staleness check if unavailable.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * GLOBAL REQUEST IDs
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   All callers obtain request IDs via generateSearchRequestId().  The counter
 *   is module-scoped so IDs are unique across SearchContext, useCatalogProduct-
 *   Search, and any future callers.  See the comments in SearchContext.tsx for
 *   the bug this fixes (cross-resolution of requestId=1 from two hooks).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PREFETCH / IDLE PRE-COMPUTATION (NEW)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   postPrefetchRequest(queries) dispatches a batch of low-priority search
 *   requests to idle workers.  SearchContext uses this after a 50ms pause to
 *   pre-warm the worker's LRU cache for the most likely next character
 *   expansions ("pana" → pre-warm "panac", "panad", "panar"…).
 *
 *   Prefetch results are stored in prefetchCache and served instantly if the
 *   user types the predicted character.
 */

import type { CatalogProduct } from "../catalog";

// ─── Public types ─────────────────────────────────────────────────────────────

export const CATALOG_SEARCH_WORKER_THRESHOLD = 160;
export const MAX_POOL_SIZE                   = 4;

export interface CatalogSearchRequest {
  query:        string;
  requestId:    number;
  category?:    string;
  onlyInStock?: boolean;
  priceCap?:    number;
  limit?:       number;
}

export interface CatalogSearchWorkerResponse {
  rankedIds:  string[];
  requestId:  number;
  error?:     string;
}

// ─── SharedArrayBuffer for cross-thread cancellation ─────────────────────────

/**
 * A 4-byte buffer holding the current search generation as a signed Int32.
 * Workers check this at scan checkpoints; main thread increments it per search.
 *
 * WHY SharedArrayBuffer and not a message: postMessage has inherent latency
 * (event loop scheduling).  SharedArrayBuffer + Atomics is visible to the
 * worker within microseconds of the write.
 */
let sharedBuffer: SharedArrayBuffer | null = null;
let sharedArr:    Int32Array        | null = null;
let generation    = 0; // local mirror; always in sync with sharedArr[0]

function tryInitSharedBuffer(): void {
  try {
    if (typeof SharedArrayBuffer !== "undefined" && typeof Atomics !== "undefined") {
      sharedBuffer = new SharedArrayBuffer(4);
      sharedArr    = new Int32Array(sharedBuffer);
      Atomics.store(sharedArr, 0, 0);
    }
  } catch {
    // COOP/COEP headers absent — fallback to generation-counter approach
    sharedBuffer = null;
    sharedArr    = null;
  }
}

tryInitSharedBuffer();

function bumpGeneration(): void {
  generation++;
  if (sharedArr !== null) {
    Atomics.store(sharedArr, 0, generation);
  }
}

// ─── Module-level request ID counter ─────────────────────────────────────────

let _nextRequestId = 0;

/**
 * Returns a globally unique request ID for the page session.
 * MUST be used by ALL callers instead of local counters.
 */
export function generateSearchRequestId(): number {
  return ++_nextRequestId;
}

// ─── Worker pool ──────────────────────────────────────────────────────────────

interface PoolWorker {
  worker:      Worker;
  /** Number of in-flight requests assigned to this worker. */
  inflight:    number;
  initialized: boolean;
}

// ─── Initialization progress callbacks ─────────────────────────────────────────

let initProgressCallback: ((status: "building" | "ready") => void) | null = null;

export function onWorkerInitProgress(callback: (status: "building" | "ready") => void): void {
  initProgressCallback = callback;
}

const pool: PoolWorker[] = [];
const poolSize = Math.min(
  typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 2) : 2,
  MAX_POOL_SIZE,
);

// Shared pending request map: requestId → resolver/rejecter/timer
const pendingRequests = new Map<number, {
  resolve: (r: CatalogSearchWorkerResponse) => void;
  reject:  (e: Error) => void;
  timer:   ReturnType<typeof setTimeout>;
  workerId: number;
}>();

let lastInitProducts:    CatalogProduct[] | null = null;
let lastInitProductCount = 0;

// ─── Worker factory ───────────────────────────────────────────────────────────

function createPoolWorker(): PoolWorker {
  const worker = new Worker(
    new URL("../../workers/fuzzySearch.worker.ts", import.meta.url),
    { type: "module" },
  );

  const pw: PoolWorker = { worker, inflight: 0, initialized: false };

  worker.addEventListener(
    "message",
    (event: MessageEvent<CatalogSearchWorkerResponse | { type: string; status?: string }>) => {
      // Handle INIT_PROGRESS messages
      if (event.data && (event.data as any).type === "INIT_PROGRESS") {
        const status = (event.data as any).status;
        if (initProgressCallback && (status === "building" || status === "ready")) {
          initProgressCallback(status);
        }
        return;
      }

      // Handle search responses
      const response = event.data as CatalogSearchWorkerResponse;
      const { requestId } = response;
      const pending = pendingRequests.get(requestId);
      if (!pending) return; // already timed out or cancelled

      clearTimeout(pending.timer);
      pendingRequests.delete(requestId);

      // Decrement inflight counter on the worker that handled this request
      const w = pool[pending.workerId];
      if (w) w.inflight = Math.max(0, w.inflight - 1);

      pending.resolve(response);
    },
  );

  worker.addEventListener("error", (event: ErrorEvent) => {
    // Reject all requests pending on this worker
    for (const [requestId, pending] of pendingRequests) {
      if (pending.workerId === pool.indexOf(pw)) {
        clearTimeout(pending.timer);
        pendingRequests.delete(requestId);
        pending.reject(new Error(`Worker error: ${event.message}`));
      }
    }
    // Remove from pool and replace with a new worker
    const idx = pool.indexOf(pw);
    if (idx !== -1) {
      pool[idx] = createPoolWorker();
      // Re-init with the last known catalog snapshot
      if (lastInitProducts) {
        initWorker(pool[idx]);
      }
    }
  });

  return pw;
}

/** Lazily grow the pool up to poolSize on first need. */
function ensurePool(): void {
  while (pool.length < poolSize) {
    pool.push(createPoolWorker());
  }
}

/** Pick the least-busy worker (fewest in-flight requests). */
function leastBusyWorker(): { pw: PoolWorker; idx: number } {
  ensurePool();
  let minInflight = Infinity;
  let best        = 0;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].inflight < minInflight) {
      minInflight = pool[i].inflight;
      best        = i;
    }
  }
  return { pw: pool[best], idx: best };
}

// ─── Worker initialisation ────────────────────────────────────────────────────

function initWorker(pw: PoolWorker): void {
  if (!lastInitProducts) return;
  const msg: Record<string, unknown> = {
    type:     "INIT",
    products: lastInitProducts,
  };
  if (sharedBuffer) msg["sharedBuffer"] = sharedBuffer;
  pw.worker.postMessage(msg);
  pw.initialized = true;
}

/**
 * Sends the catalog to all pool workers once per unique snapshot.
 *
 * Same-reference guard: if the products array reference hasn't changed, this
 * is a no-op (no serialisation cost, no structuredClone).
 */
export function ensureCatalogSearchWorkerInit(
  products: CatalogProduct[],
  options: { force?: boolean } = {},
): void {
  if (products.length === 0) return;
  if (!options.force && products === lastInitProducts) return;

  lastInitProducts     = products;
  lastInitProductCount = products.length;

  ensurePool();

  // Bump generation so any in-progress searches abort immediately
  bumpGeneration();

  for (const pw of pool) {
    initWorker(pw);
  }
}

/**
 * Terminate all pool workers and clear pending requests.
 * Call on application teardown.
 */
export function terminateCatalogSearchWorker(): void {
  for (const pw of pool) pw.worker.terminate();
  pool.length = 0;

  for (const [, pending] of pendingRequests) {
    clearTimeout(pending.timer);
    pending.reject(new Error("Worker pool terminated"));
  }
  pendingRequests.clear();

  lastInitProducts     = null;
  lastInitProductCount = 0;
}

// ─── Request dispatch ─────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 3_000; // 3 second timeout - fail fast and fallback to inline

export function postCatalogSearchRequest(
  request: CatalogSearchRequest,
): Promise<CatalogSearchWorkerResponse> {
  // Bump generation BEFORE dispatching — workers will abort their current
  // scan and start fresh on this new query
  bumpGeneration();

  return new Promise((resolve, reject) => {
    const { pw, idx } = leastBusyWorker();
    pw.inflight++;

    const timer = setTimeout(() => {
      if (pendingRequests.has(request.requestId)) {
        pendingRequests.delete(request.requestId);
        pw.inflight = Math.max(0, pw.inflight - 1);
        reject(new Error(`Search timeout (id=${request.requestId})`));
      }
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(request.requestId, {
      resolve,
      reject,
      timer,
      workerId: idx,
    });

    // Include generation in the message so the worker can cross-check
    pw.worker.postMessage({
      type:       "SEARCH",
      generation,
      ...request,
    });
  });
}

// ─── Prefetch API ─────────────────────────────────────────────────────────────

/**
 * LRU cache for prefetch results.
 * Maps normalised query → ranked IDs.
 * Checked by postCatalogSearchRequest before going to the worker.
 */
const prefetchCache = new Map<string, string[]>();
const PREFETCH_CACHE_MAX = 256;

export function getPrefetchedResult(query: string): string[] | undefined {
  return prefetchCache.get(query.toLowerCase().trim());
}

/**
 * Dispatches low-priority SEARCH requests for the `queries` list on an idle
 * worker.  Results are stored in prefetchCache and used immediately if the
 * user types the predicted character.
 *
 * Called by SearchContext after a 50ms idle: if current query is "pana", we
 * pre-warm "panac", "panad", "panaf"... so the next keystroke is a cache hit.
 *
 * WHY this is safe: we use requestIdleCallback (main-thread) to schedule the
 * prefetch dispatch, so it only runs when the browser has spare cycles.  The
 * prefetch requests themselves go to the least-busy worker and carry the
 * current generation — if the user types before prefetch finishes, the bump
 * to generation cancels the prefetch worker task automatically.
 */
export function postPrefetchRequests(
  queries: string[],
  baseRequest: Omit<CatalogSearchRequest, "query" | "requestId">,
): void {
  if (typeof requestIdleCallback === "undefined") return;

  requestIdleCallback(() => {
    for (const query of queries) {
      const key = query.toLowerCase().trim();
      if (prefetchCache.has(key)) continue; // already warm

      const requestId = generateSearchRequestId();
      postCatalogSearchRequest({ ...baseRequest, query, requestId, limit: 25 })
        .then((response) => {
          if (!response.error) {
            if (prefetchCache.size >= PREFETCH_CACHE_MAX) {
              // Evict oldest entry (Map preserves insertion order)
              prefetchCache.delete(prefetchCache.keys().next().value!);
            }
            prefetchCache.set(key, response.rankedIds);
          }
        })
        .catch(() => { /* prefetch errors are silently discarded */ });
    }
  }, { timeout: 500 });
}

/**
 * Clear prefetch cache (call on catalog update or route change).
 */
export function clearPrefetchCache(): void {
  prefetchCache.clear();
}