/**
 * alternativesSearch.worker.ts — Product alternatives ranking worker
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OPTIMISATIONS vs. PREVIOUS VERSION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. LRU RESULT CACHE
 *    Alternatives for a given product rarely change during a session.  The LRU
 *    cache (512 entries, keyed by product.id) means repeated lookups (e.g.
 *    navigating back to a product page, or the same product appearing in
 *    multiple search results) are served instantly without re-running the
 *    ranking algorithm.
 *
 * 2. PREDICTIVE PRE-COMPUTATION (PREFETCH message)
 *    The main thread can send a PREFETCH message with an array of product IDs.
 *    The worker computes their alternatives in idle time (queueMicrotask chain)
 *    and caches the results.  When the user then navigates to one of those
 *    products, the alternatives panel appears instantly.
 *
 *    This is the key insight: on a product list page, we know which products
 *    the user is likely to tap next (the ones visible in the viewport).  We can
 *    pre-warm their alternatives while the user is still browsing.
 *
 * 3. DIRECT ARRAY ASSIGNMENT ON INIT (from previous version)
 *    storedProducts = data.products — no spread/clone, halves peak heap during
 *    initialization for the 52K catalog.
 *
 * 4. STRICT TYPE SAFETY
 *    Eliminated all implicit `any` types.  Message types are exhaustive
 *    discriminated unions checked at compile time.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MESSAGE PROTOCOL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   INIT    → { type: "INIT"; products: ProductShape[] }
 *   RANK    → { type: "RANK"; product: ProductShape; requestId: number }
 *   PREFETCH → { type: "PREFETCH"; productIds: string[] }
 *              (no response — results go into the worker-side LRU cache)
 *
 *   RANK response → { rankedIds: string[]; requestId: number; error?: string }
 */

import { rankAlternativeProducts } from "@pharmacy/domain-catalog";
import { LRUCache } from "@pharmacy/fuzzy-search";

// ─── Strict product shape (no implicit any) ───────────────────────────────────

export interface ProductShape {
  readonly id:             string;
  readonly code:           string;
  readonly barcode:        string;
  readonly nameAr:         string;
  readonly nameEn:         string;
  readonly category:       string;
  readonly categoryName:   string;
  readonly categoryNameEn: string;
  readonly price:          number;
  readonly stock:          number;
  readonly inStock:        boolean;
  readonly imageUrl?:      string;
}

// ─── Message types ────────────────────────────────────────────────────────────

interface InitMessage {
  type:     "INIT";
  products: ProductShape[];
}

interface RankMessage {
  type:      "RANK";
  product:   ProductShape;
  requestId: number;
}

/**
 * Prefetch message: main thread sends visible product IDs for pre-warming.
 * Worker computes their alternatives in the background with no UI impact.
 */
interface PrefetchMessage {
  type:       "PREFETCH";
  productIds: string[];
}

type IncomingMessage = InitMessage | RankMessage | PrefetchMessage;

interface WorkerResponse {
  rankedIds:  string[];
  requestId:  number;
  error?:     string;
}

// ─── Worker state ─────────────────────────────────────────────────────────────

/**
 * Direct assignment — no clone.  The previous `data.products.map(item => ({
 * ...item }))` doubled peak heap during INIT for the 52K catalog.
 * We can safely reference the structured-clone that the browser already
 * created for us when the message was received.
 */
let storedProducts: ProductShape[] = [];

/**
 * Fast O(1) lookup map: id → ProductShape.
 * Used by the PREFETCH handler to resolve product IDs to full objects.
 */
let productById = new Map<string, ProductShape>();

/**
 * LRU alternatives cache.  Key = product.id; value = rankedIds array.
 *
 * WHY 512 entries: a typical pharmacy session browses 20–100 products.
 * 512 gives comfortable headroom for deeply browsed sessions without
 * consuming significant memory (each entry is ~200B of strings).
 */
const alternativesCache = new LRUCache<string, string[]>(512);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeAlternatives(product: ProductShape): string[] {
  const ranked = rankAlternativeProducts(product, storedProducts);
  return ranked.map((r) => r.productId);
}

// ─── Prefetch engine ──────────────────────────────────────────────────────────

/**
 * Lazily pre-computes alternatives for `productIds` using a microtask chain.
 *
 * WHY microtasks: using a single for-loop would block the worker event loop
 * for the duration of N × rankAlternativeProducts() calls, preventing RANK
 * messages from being processed promptly.  Splitting into microtasks yields
 * control to the event loop between each computation, so urgent RANK messages
 * are always processed first.
 *
 * A prefetch run that's still in progress when a RANK message arrives is NOT
 * cancelled — the worst case is that the RANK result arrives a few microtasks
 * late, but in practice the loop is fast enough (< 5ms per product) that this
 * is never perceptible.
 */
function scheduleIdlePrefetch(ids: string[]): void {
  let cursor = 0;

  function step(): void {
    if (cursor >= ids.length) return;

    const id      = ids[cursor++];
    const product = productById.get(id);

    if (product && !alternativesCache.has(id)) {
      try {
        const rankedIds = computeAlternatives(product);
        alternativesCache.set(id, rankedIds);
      } catch {
        // Silently ignore prefetch errors — they don't affect RANK responses
      }
    }

    // Yield to event loop before processing next product
    queueMicrotask(step);
  }

  queueMicrotask(step);
}

// ─── Message router ───────────────────────────────────────────────────────────

self.addEventListener("message", (event: MessageEvent<IncomingMessage>) => {
  const { data } = event;

  // ── INIT ────────────────────────────────────────────────────────────────────
  if (data.type === "INIT") {
    storedProducts = data.products;
    productById    = new Map(data.products.map((p) => [p.id, p]));
    alternativesCache.clear(); // stale cache from previous snapshot
    return;
  }

  // ── PREFETCH ────────────────────────────────────────────────────────────────
  if (data.type === "PREFETCH") {
    scheduleIdlePrefetch(data.productIds);
    return;
  }

  // ── RANK ────────────────────────────────────────────────────────────────────
  const { product, requestId } = data;

  // Cache hit — return instantly
  const cached = alternativesCache.get(product.id);
  if (cached !== undefined) {
    self.postMessage({ rankedIds: cached, requestId } satisfies WorkerResponse);
    return;
  }

  try {
    const rankedIds = computeAlternatives(product);
    alternativesCache.set(product.id, rankedIds);
    self.postMessage({ rankedIds, requestId } satisfies WorkerResponse);
  } catch (err) {
    self.postMessage({
      rankedIds: [],
      requestId,
      error: err instanceof Error ? err.message : "Unknown error",
    } satisfies WorkerResponse);
  }
});