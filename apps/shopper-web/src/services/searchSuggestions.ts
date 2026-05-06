/**
 * searchSuggestions.ts — Remote suggestion API client + local fuzzy fallback
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHANGES IN THIS VERSION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. IN-FLIGHT REQUEST DEDUPLICATION
 *    A Map<cacheKey, Promise> holds in-flight fetch promises.  If two callers
 *    request the same query simultaneously (e.g. a fast re-render cycle), only
 *    one HTTP request is made; both callers await the same promise.  This
 *    prevents duplicate API calls during React StrictMode double-invocations
 *    and rapid suggestion updates.
 *
 * 2. TWO-TIER CACHE: SESSION LRU + SHORT-LIVED TTL
 *    - Session LRU (512 entries): keeps results for the browser session.
 *      Backspace ("Panadol" → "Panado") is an O(1) cache hit.
 *    - TTL guard (60 seconds): entries older than TTL are treated as stale and
 *      refetched on the next call.  This handles the case where the server's
 *      suggestion index is updated mid-session (price/stock changes).
 *
 * 3. AbortSignal PROPAGATION
 *    The fetch is aborted as soon as the caller's signal fires.  Previously,
 *    the signal was passed to fetch() but the in-flight promise map still held
 *    a reference, preventing GC.  Now the in-flight entry is cleaned up on abort.
 *
 * 4. LOCAL FALLBACK QUALITY
 *    buildLocalSuggestions uses fuzzyMatch + fuzzyScore (bilingual engine) instead
 *    of the previous .toLowerCase().includes(), giving identical match quality to
 *    the worker for the API-down path.  (Preserved from previous version.)
 *
 * 5. ARABIC NORMALISATION IN RESOLVER
 *    resolveCatalogProduct uses normalise() before comparison, so hamza variants
 *    and ta marbuta don't cause false mismatches.  (Preserved from previous version.)
 *
 * 6. STRICT TYPE SAFETY
 *    Eliminated all implicit `any`.  ApiSuggestion and all internal types are
 *    explicitly typed discriminated-union-safe structures.
 */

import { publicEnv } from "../app/env";
import type { CatalogProduct } from "../app/catalog";
import { getLocalizedProductName } from "../app/localization";
import { normalise, fuzzyMatch, fuzzyScore, LRUCache } from "../utils/fuzzySearch";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SearchSuggestionVariation {
  type: string;
}

export interface SearchSuggestionGroup {
  productId:  string;
  nameAr:     string;
  nameEn:     string;
  variations: SearchSuggestionVariation[];
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface ApiSuggestion {
  product_id?: string;
  productId?:  string;
  name_ar?:    string;
  name_en?:    string;
  nameAr?:     string;
  nameEn?:     string;
  name?:       string;
  variations?: Array<string | { type?: string }>;
}

interface ApiResponseShape {
  results?: ApiSuggestion[];
}

// ─── Session cache with TTL ───────────────────────────────────────────────────

/**
 * Two-tier caching for API suggestions:
 *
 *   Tier 1 — LRU (512 entries):
 *     Covers repeated queries within the session.  Backspace is O(1).
 *
 *   Tier 2 — TTL (60 seconds):
 *     Entries expire after 60s so mid-session catalog updates (restocking,
 *     price changes) are eventually reflected without forcing a page reload.
 *
 * WHY not just maxAge in the LRU: the LRU itself has no notion of time.
 * Storing a { value, timestamp } wrapper lets us check freshness on read.
 */
interface CacheEntry {
  groups:      SearchSuggestionGroup[];
  fetchedAt:   number; // Date.now() at insertion
}

const CACHE_TTL_MS    = 60_000; // 60 seconds
const suggestionCache = new LRUCache<string, CacheEntry>(512);

function makeCacheKey(query: string, lang: "ar" | "en"): string {
  return normalise(query) + "|" + lang;
}

function getCached(key: string): SearchSuggestionGroup[] | null {
  const entry = suggestionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null; // TTL expired
  return entry.groups;
}

function setCached(key: string, groups: SearchSuggestionGroup[]): void {
  suggestionCache.set(key, { groups, fetchedAt: Date.now() });
}

// ─── In-flight deduplication ─────────────────────────────────────────────────

/**
 * WHY: React StrictMode double-invokes effects, and fast typing can trigger
 * multiple simultaneous suggestion fetches for the same query.  Storing the
 * in-flight Promise in a Map means the second caller reuses the first caller's
 * fetch instead of making a duplicate HTTP request.
 *
 * The promise is removed from the map when the fetch settles (success, error,
 * or abort) so the map doesn't grow unboundedly.
 */
const inflight = new Map<string, Promise<SearchSuggestionGroup[]>>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryLabel(product: CatalogProduct, lang: "ar" | "en"): string {
  if (lang === "en") return (product.categoryNameEn || product.categoryName).trim();
  return (product.categoryName || product.categoryNameEn).trim();
}

function buildVariationList(value: string): SearchSuggestionVariation[] {
  const trimmed = value.trim();
  return trimmed ? [{ type: trimmed }] : [];
}

// ─── Local fallback ───────────────────────────────────────────────────────────

/**
 * Builds suggestions from the local catalog when the API is unavailable.
 *
 * Uses the full bilingual fuzzy engine (L1–L4) so cross-language queries and
 * Arabic script variants work exactly the same as the worker path.
 *
 * WHY collect 40 then slice to 8: we need enough candidates to sort by score
 * before truncating.  Stopping at 40 avoids scanning all 52K products for the
 * fallback path while still producing well-ranked results.
 */
function buildLocalSuggestions(
  products: CatalogProduct[],
  q:        string,
  lang:     "ar" | "en",
): SearchSuggestionGroup[] {
  if (!q.trim()) return [];

  type Candidate = { product: CatalogProduct; score: number; index: number };
  const candidates: Candidate[] = [];

  for (let i = 0; i < products.length; i++) {
    const p      = products[i];
    const fields = {
      nameAr:   getLocalizedProductName(p, "ar"),
      nameEn:   getLocalizedProductName(p, "en"),
      category: `${p.categoryName ?? ""} ${p.categoryNameEn ?? ""}`,
      code:     p.code,
      barcode:  p.barcode,
    };

    if (!fuzzyMatch(q, fields)) continue;

    candidates.push({ product: p, score: fuzzyScore(q, fields), index: i });
    if (candidates.length >= 40) break; // collect enough for ranking
  }

  return candidates
    .sort((a, b) => b.score !== a.score ? b.score - a.score : a.index - b.index)
    .slice(0, 8)
    .map(({ product }) => ({
      productId:  product.id,
      nameAr:     getLocalizedProductName(product, "ar"),
      nameEn:     getLocalizedProductName(product, "en"),
      variations: buildVariationList(getCategoryLabel(product, lang)),
    }));
}

// ─── API result normalisation ─────────────────────────────────────────────────

/**
 * Resolves an API suggestion row to a local CatalogProduct by matching ID or
 * name.  Uses normalise() for Arabic strings so script variants don't cause
 * false mismatches.
 */
function resolveCatalogProduct(
  products:   CatalogProduct[],
  suggestion: ApiSuggestion,
): CatalogProduct | undefined {
  const rawId   = String(suggestion.product_id ?? suggestion.productId ?? "").trim();
  const rawName = String(
    suggestion.name ?? suggestion.name_ar ?? suggestion.name_en ??
    suggestion.nameAr ?? suggestion.nameEn ?? "",
  ).trim();

  const normId   = normalise(rawId);
  const normName = normalise(rawName);

  return products.find((product) => {
    const candidates = [
      normalise(product.id),
      normalise(product.code),
      normalise(product.barcode),
      normalise(getLocalizedProductName(product, "ar")),
      normalise(getLocalizedProductName(product, "en")),
    ];
    return candidates.includes(normId) || (normName && candidates.includes(normName));
  });
}

function normaliseVariationType(
  variation: string | { type?: string },
  lang:      "ar" | "en",
  product?:  CatalogProduct,
): string {
  if (typeof variation === "string") return variation.trim();
  const type = String(variation?.type ?? "").trim();
  if (type) return type;
  return product ? getCategoryLabel(product, lang) : "";
}

function normaliseSuggestionRow(
  row:      ApiSuggestion,
  products: CatalogProduct[],
  lang:     "ar" | "en",
): SearchSuggestionGroup | null {
  const product      = resolveCatalogProduct(products, row);
  const productId    = String(row.product_id ?? row.productId ?? product?.id ?? "").trim();
  const nameAr       = String(row.name_ar ?? row.nameAr ?? (product ? getLocalizedProductName(product, "ar") : "")).trim();
  const nameEn       = String(row.name_en ?? row.nameEn ?? (product ? getLocalizedProductName(product, "en") : "")).trim();
  const fallbackName = String(row.name ?? "").trim();

  const variations = Array.isArray(row.variations)
    ? row.variations
        .map((v) => normaliseVariationType(v, lang, product))
        .filter(Boolean)
        .map((type) => ({ type }))
    : buildVariationList(product ? getCategoryLabel(product, lang) : "");

  if (!productId) return null;

  return {
    productId,
    nameAr: nameAr || fallbackName || nameEn,
    nameEn: nameEn || fallbackName || nameAr,
    variations,
  };
}

// ─── URL builders ─────────────────────────────────────────────────────────────

function buildSearchRequestUrls(query: string, lang: "ar" | "en"): string[] {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://example.com";
  const root = new URL(publicEnv.searchApiBase || origin, origin);

  const directUrl = new URL(root.toString());
  if (!directUrl.pathname || directUrl.pathname === "/") directUrl.pathname = "/search";
  directUrl.search = "";
  directUrl.searchParams.set("q", query.trim());
  directUrl.searchParams.set("lang", lang);

  const legacyUrl = new URL(root.toString());
  legacyUrl.search = "";
  legacyUrl.searchParams.set("action", "search_suggestions");
  legacyUrl.searchParams.set("q", query.trim());
  legacyUrl.searchParams.set("lang", lang);

  return Array.from(new Set([directUrl.toString(), legacyUrl.toString()]));
}

// ─── Core fetch logic ─────────────────────────────────────────────────────────

async function fetchFromApi(
  query:            string,
  lang:             "ar" | "en",
  fallbackProducts: CatalogProduct[],
  signal?:          AbortSignal,
): Promise<SearchSuggestionGroup[]> {
  for (const url of buildSearchRequestUrls(query, lang)) {
    if (signal?.aborted) break;

    try {
      const response = await fetch(url, {
        signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) continue;

      const data = (await response.json()) as ApiResponseShape | ApiSuggestion[];
      const list = Array.isArray(data) ? data : data.results;

      if (!Array.isArray(list)) continue;

      return list
        .map((row) => normaliseSuggestionRow(row, fallbackProducts, lang))
        .filter((row): row is SearchSuggestionGroup => Boolean(row));
    } catch (err) {
      // AbortError means the caller no longer needs this result — propagate it
      // so the in-flight map is cleaned up correctly in fetchSearchSuggestions.
      if (err instanceof Error && err.name === "AbortError") throw err;
      // Network/parse error on this URL — try the next URL
      continue;
    }
  }

  // All URLs failed (non-abort) — local fallback
  return buildLocalSuggestions(fallbackProducts, query, lang);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches search suggestions for `q` in `lang`.
 *
 * Call path:
 *   1. Check session LRU cache (O(1), TTL-guarded) → return immediately if fresh.
 *   2. Check in-flight map → if a fetch for this key is already running, await it.
 *   3. Fire the HTTP request → try direct URL, then legacy URL.
 *   4. On any non-abort error / bad response → fall back to local fuzzy matching.
 *   5. Store result in session cache and remove from in-flight map.
 *
 * @param q                 Raw user query string.
 * @param lang              UI language ("ar" | "en").
 * @param fallbackProducts  Local catalog for the fallback path.
 * @param signal            Optional AbortSignal from the caller.
 */
export async function fetchSearchSuggestions(
  q:                string,
  lang:             "ar" | "en",
  fallbackProducts: CatalogProduct[],
  signal?:          AbortSignal,
): Promise<SearchSuggestionGroup[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const key = makeCacheKey(trimmed, lang);

  // ── Tier 1: Session LRU cache hit ────────────────────────────────────────
  const cached = getCached(key);
  if (cached !== null) return cached;

  // ── Tier 2: In-flight deduplication ─────────────────────────────────────
  const existing = inflight.get(key);
  if (existing) {
    try {
      return await existing;
    } catch {
      // The in-flight request was aborted or failed.
      // Fall through to start a fresh fetch.
    }
  }

  // ── Tier 3: Fresh fetch ───────────────────────────────────────────────────
  const promise = fetchFromApi(trimmed, lang, fallbackProducts, signal)
    .then((groups) => {
      setCached(key, groups);
      return groups;
    })
    .finally(() => {
      // Always clean up the in-flight entry so the next caller fires a fresh request
      inflight.delete(key);
    });

  inflight.set(key, promise);

  try {
    return await promise;
  } catch (err) {
    // AbortError: caller no longer needs this; return empty rather than throwing
    if (err instanceof Error && err.name === "AbortError") return [];
    // Unexpected error: fall back to local matching
    return buildLocalSuggestions(fallbackProducts, trimmed, lang);
  }
}

/**
 * Proactively warm the suggestion cache for a query without blocking the caller.
 *
 * Called by SearchContext after the user pauses for PREFETCH_IDLE_MS.  The
 * warmed result will be served instantly on the next fetchSearchSuggestions call
 * for the same query.
 *
 * Uses requestIdleCallback (when available) so it only runs when the browser is
 * not busy with user interactions.
 */
export function prefetchSuggestions(
  q:                string,
  lang:             "ar" | "en",
  fallbackProducts: CatalogProduct[],
): void {
  const trimmed = q.trim();
  if (!trimmed || getCached(makeCacheKey(trimmed, lang))) return;

  const run = () => {
    fetchSearchSuggestions(trimmed, lang, fallbackProducts).catch(() => {
      // Prefetch errors are silently discarded
    });
  };

  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(run, { timeout: 1000 });
  } else {
    // Fallback: defer to next macrotask
    setTimeout(run, 0);
  }
}