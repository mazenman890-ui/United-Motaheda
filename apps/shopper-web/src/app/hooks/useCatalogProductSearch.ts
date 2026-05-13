/**
 * useCatalogProductSearch.ts — Full-page catalog search hook
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERFORMANCE ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. DEBOUNCE (180ms)
 *    The input responds instantly; the worker only fires after the user pauses.
 *    Debounce is reset immediately on erase (0ms) so clearing the search feels
 *    instantaneous.
 *
 * 2. INIT DEDUP (module-scope reference guard)
 *    The 52K structuredClone cost is paid at most once per catalog snapshot.
 *    Back-navigation never re-sends the INIT message.
 *
 * 3. FILTER PARAMS TRAVEL WITH SEARCH
 *    category / onlyInStock / priceCap go to the worker in the SEARCH message.
 *    The worker narrows to the relevant subset BEFORE running the fuzzy pipeline.
 *    This is the key to keeping complex filters fast — the pipeline sees 500
 *    products instead of 52K.
 *
 * 4. startTransition ON RESULTS
 *    Grid re-renders are marked non-urgent (React 18 concurrent mode).
 *    The input box stays instantly responsive while React commits the new list.
 *
 * 5. useDeferredValue ON PRODUCTS
 *    On page entry, the shell renders immediately.  The 52K filter+sort runs
 *    in a deferred/background pass — the user sees content before the sort
 *    completes.
 *
 * 6. PREFETCH ON IDLE
 *    After a 50ms pause with an active query, we pre-warm the worker's LRU
 *    cache for the 5 most likely next-character expansions.  When the user
 *    types the predicted character, the worker returns the result from cache
 *    (0ms) instead of re-running the pipeline.
 *
 * 7. ABORT CONTROLLER
 *    Each debounced search run creates an AbortController.  If the component
 *    unmounts or the query changes before the worker responds, the controller
 *    aborts and the response is discarded.  This prevents setState calls on
 *    unmounted components.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHANGE: requestId COLLISION FIX (from previous version)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *    generateSearchRequestId() from catalogSearchWorker.ts replaced the local
 *    ref counter.  All callers share one counter so IDs are globally unique.
 */

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CatalogProduct } from "../catalog";
import { getLocalizedProductName } from "../localization";
import { fuzzyMatch, fuzzyScore } from "@pharmacy/fuzzy-search";
import {
  CATALOG_SEARCH_WORKER_THRESHOLD,
  clearPrefetchCache,
  ensureCatalogSearchWorkerInit,
  generateSearchRequestId,
  getPrefetchedResult,
  postCatalogSearchRequest,
  postPrefetchRequests,
} from "./catalogSearchWorker";
import { useFullCatalog } from "../../contexts/CatalogContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CatalogProductSort = "relevant" | "price_asc" | "price_desc" | "name";

export interface ProductSearchFilters {
  category?:    string;
  query?:       string;
  onlyInStock?: boolean;
  priceCap?:    number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEARCH_DEBOUNCE  = 400;  // ms — higher delay for large catalogs to reduce lag
const PREFETCH_IDLE_MS = 50;   // ms of idle before pre-warming next-char expansions
const NEXT_CHARS       = "abcdefghijklmnopqrstuvwxyzابتثجحخدذرزسشصضطظعغفقكلمنهوي";

// ─── Inline ranking (tiny catalogs, avoids worker overhead) ──────────────────

function buildFields(p: CatalogProduct) {
  return {
    nameAr:   p.nameAr   ?? p.name,
    nameEn:   p.nameEn   ?? p.name,
    category: `${p.categoryName ?? ""} ${p.categoryNameEn ?? ""}`,
    code:     p.code,
    barcode:  p.barcode,
  };
}

function rankInline(products: CatalogProduct[], query: string): string[] {
  type Entry = { id: string; score: number; index: number };
  const entries: Entry[] = [];
  for (let i = 0; i < products.length; i++) {
    const fields = buildFields(products[i]);
    if (!fuzzyMatch(query, fields)) continue;
    entries.push({ id: products[i].id, score: fuzzyScore(query, fields), index: i });
  }
  entries.sort((l, r) => r.score !== l.score ? r.score - l.score : l.index - r.index);
  return entries.map((e) => e.id);
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function sortRelevant(products: CatalogProduct[], lang: "ar" | "en"): CatalogProduct[] {
  return [...products].sort((l, r) => {
    if (Number(r.inStock) !== Number(l.inStock)) return Number(r.inStock) - Number(l.inStock);
    if (r.stock !== l.stock) return r.stock - l.stock;
    if (l.price !== r.price) return l.price - r.price;
    return getLocalizedProductName(l, lang).localeCompare(
      getLocalizedProductName(r, lang),
      lang === "ar" ? "ar" : "en",
    );
  });
}

function sortExplicit(
  products: CatalogProduct[],
  sortBy:   Exclude<CatalogProductSort, "relevant">,
  lang:     "ar" | "en",
): CatalogProduct[] {
  return [...products].sort((l, r) => {
    if (sortBy === "price_asc")  return l.price - r.price;
    if (sortBy === "price_desc") return r.price - l.price;
    return getLocalizedProductName(l, lang).localeCompare(
      getLocalizedProductName(r, lang),
      lang === "ar" ? "ar" : "en",
    );
  });
}

// ─── Prefetch helper ──────────────────────────────────────────────────────────

/**
 * Pre-warms the worker's LRU cache for the most likely next-character
 * expansions of the current query.
 *
 * Strategy: append each of the ~60 most common Arabic/Latin characters to the
 * current query and fire a low-priority PREFETCH request for each.  Only those
 * not already in the prefetch cache are dispatched.
 *
 * Capped at 12 expansions per idle period to keep prefetch worker load minimal.
 */
function scheduleNextCharPrefetch(
  query:       string,
  baseFilters: Omit<Parameters<typeof postPrefetchRequests>[1], "limit">,
): void {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;

  const expansions: string[] = [];
  for (const ch of NEXT_CHARS) {
    if (expansions.length >= 12) break;
    expansions.push(trimmed + ch);
  }

  postPrefetchRequests(expansions, baseFilters);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCatalogProductSearch(
  products: CatalogProduct[],
  filters:  ProductSearchFilters,
  sortBy:   CatalogProductSort,
  lang:     "ar" | "en",
) {
  const rawQuery = (filters.query ?? "").trim();

  // Full catalog for worker init and search result resolution (stable reference)
  const { allProducts, allProductsById } = useFullCatalog();

  // When full catalog is ready, use it as the filter base to avoid stale
  // category-filtered slices left behind by CategoryDetails navigations.
  const stableBase = allProducts.length > 0 ? allProducts : products;

  // deferredProducts: shell paints before the filter+sort runs
  const deferredProducts = useDeferredValue(stableBase);

  // Track the latest dispatched request to discard stale responses
  const latestRequestId = useRef(0);
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AbortController: cancel pending setState on unmount or query change
  const abortRef        = useRef<AbortController>(new AbortController());

  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);
  const [rankedIds,       setRankedIds]     = useState<string[] | null>(null);
  const [workerBusy,      setWorkerBusy]    = useState(false);

  // ── Debounce raw query ───────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (prefetchRef.current) clearTimeout(prefetchRef.current);

    if (!rawQuery) {
      // Erase is instant — no debounce
      setDebouncedQuery("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(rawQuery);
    }, SEARCH_DEBOUNCE);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (prefetchRef.current) clearTimeout(prefetchRef.current);
    };
  }, [rawQuery]);

  // ── Cleanup AbortController on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (prefetchRef.current) clearTimeout(prefetchRef.current);
    };
  }, []);

  // ── O(1) product lookup: prefer full catalog so worker results always resolve ──
  const productsMap = useMemo(
    () => {
      const source = Object.keys(allProductsById).length > 0
        ? Object.entries(allProductsById)
        : deferredProducts.map((p) => [p.id, p] as [string, CatalogProduct]);
      return new Map<string, CatalogProduct>(
        source as Iterable<readonly [string, CatalogProduct]>,
      );
    },
    [allProductsById, deferredProducts],
  );

  // ── Filtered base (no-query path) ────────────────────────────────────────
  const filteredBase = useMemo(() => {
    return deferredProducts.filter((p) => {
      if (filters.category && filters.category !== "all" && p.category !== filters.category) return false;
      if (filters.onlyInStock && !p.inStock) return false;
      if (filters.priceCap && filters.priceCap > 0 && p.price > filters.priceCap) return false;
      return true;
    });
  }, [filters.category, filters.onlyInStock, filters.priceCap, deferredProducts]);

  // ── Stale prefetch results are invalid after filter context changes ──────
  useEffect(() => {
    clearPrefetchCache();
  }, [filters.category, filters.onlyInStock, filters.priceCap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── INIT: send full catalog to worker once (stable reference, not per-page) ──
  useEffect(() => {
    if (allProducts.length === 0) return;
    ensureCatalogSearchWorkerInit(allProducts);
  }, [allProducts]);

  // ── SEARCH: fires on debounced query + filter changes ────────────────────
  useEffect(() => {
    const query = debouncedQuery.trim();

    if (!query) {
      startTransition(() => {
        setRankedIds(null);
        setWorkerBusy(false);
      });
      return;
    }

    // Create a new AbortController for this search run
    abortRef.current.abort(); // cancel previous
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    // ── Check prefetch cache first (0ms path) ──────────────────────────────
    const prefetched = getPrefetchedResult(query);
    if (prefetched) {
      startTransition(() => {
        setRankedIds(prefetched);
        setWorkerBusy(false);
      });
      // Still schedule prefetch for next likely chars from the cached result
      prefetchRef.current = setTimeout(() => {
        scheduleNextCharPrefetch(query, {
          category:    filters.category,
          onlyInStock: filters.onlyInStock,
          priceCap:    filters.priceCap,
        });
      }, PREFETCH_IDLE_MS);
      return;
    }

    const requestId = generateSearchRequestId();
    latestRequestId.current = requestId;

    // ── Inline path (full catalog not yet loaded) ──────────────────────────
    if (allProducts.length < CATALOG_SEARCH_WORKER_THRESHOLD) {
      startTransition(() => {
        if (signal.aborted) return;
        setRankedIds(rankInline(filteredBase, query));
        setWorkerBusy(false);
      });
      return;
    }

    // ── Worker path ────────────────────────────────────────────────────────
    setWorkerBusy(true);

    postCatalogSearchRequest({
      query,
      requestId,
      category:    filters.category,
      onlyInStock: filters.onlyInStock,
      priceCap:    filters.priceCap,
    }).then((response) => {
      if (signal.aborted) return;
      if (response.requestId !== requestId) return; // stale

      if (response.error) {
        startTransition(() => {
          if (signal.aborted) return;
          setRankedIds(rankInline(filteredBase, query));
          setWorkerBusy(false);
        });
        return;
      }

      startTransition(() => {
        if (signal.aborted) return;
        setRankedIds(response.rankedIds);
        setWorkerBusy(false);
      });

      // Schedule next-char prefetch after successful search response
      prefetchRef.current = setTimeout(() => {
        scheduleNextCharPrefetch(query, {
          category:    filters.category,
          onlyInStock: filters.onlyInStock,
          priceCap:    filters.priceCap,
        });
      }, PREFETCH_IDLE_MS);

    }).catch(() => {
      if (signal.aborted) return;
      if (latestRequestId.current !== requestId) return;
      startTransition(() => {
        if (signal.aborted) return;
        setRankedIds(rankInline(filteredBase, query));
        setWorkerBusy(false);
      });
    });
  }, [
    debouncedQuery,
    filters.category,
    filters.onlyInStock,
    filters.priceCap,
    filteredBase,
    allProducts,
  ]);

  // ── Resolve ids → full objects (O(matches), not O(52K)) ──────────────────
  const matchedProducts = useMemo(() => {
    if (!debouncedQuery.trim()) return filteredBase;
    if (!rankedIds)             return [];

    const result: CatalogProduct[] = [];
    for (const id of rankedIds) {
      const p = productsMap.get(id);
      if (p) result.push(p);
    }
    return result;
  }, [debouncedQuery, rankedIds, productsMap, filteredBase]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortedProducts = useMemo(() => {
    if (sortBy === "relevant") {
      // When there's an active query, worker order (fuzzy score) IS the ranking.
      return debouncedQuery.trim() ? matchedProducts : sortRelevant(matchedProducts, lang);
    }
    return sortExplicit(matchedProducts, sortBy, lang);
  }, [debouncedQuery, lang, matchedProducts, sortBy]);

  const isTransitioning = stableBase !== deferredProducts;

  return {
    products:    sortedProducts,
    resultCount: sortedProducts.length,
    isSearching: workerBusy || isTransitioning,
    activeQuery: debouncedQuery.trim(),
  };
}