/**
 * SearchContext.tsx — Search input state + inline suggestions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   Two separate React contexts to prevent cascade re-renders:
 *
 *   SearchInputContext   → raw input string (stable between suggestion updates)
 *   SearchResultsContext → derived async suggestions (re-renders only when the
 *                          suggestion list changes)
 *
 *   The legacy useSearch() hook is preserved for backwards compatibility.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHANGES IN THIS VERSION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. ABORT CONTROLLER FOR SUGGESTIONS
 *    Each suggestions effect run creates a new AbortController.  If a new
 *    character is typed before the worker responds, the stale effect is
 *    immediately aborted.  This replaces the requestId staleness check (which
 *    still works but requires the full response to arrive before discarding).
 *
 * 2. PREFETCH ON IDLE (50ms)
 *    After the user pauses for 50ms with an active query, we pre-warm the worker
 *    LRU cache for the most likely next characters.  When the user resumes
 *    typing, the next keystrokes hit the cache (0ms) instead of the worker.
 *
 * 3. GLOBAL REQUEST IDs (unchanged from previous version)
 *    generateSearchRequestId() from catalogSearchWorker.ts — module-level counter
 *    shared across all callers so IDs are globally unique.
 *
 * 4. PROPER LRU CACHE FLUSH
 *    clearFuzzyCache() called on route change and catalog update (unchanged from
 *    previous version but now flushes both match and score LRU caches).
 *
 * 5. DEBOUNCE CANCEL ON CLEAR
 *    Pending commit is cancelled immediately when the input is cleared (unchanged
 *    from previous version).
 */

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearFuzzyCache, fuzzyMatch, fuzzyScore } from "../utils/fuzzySearch";
import type { CatalogProduct } from "../app/catalog";
import { useCatalog } from "./CatalogContext";
import {
  CATALOG_SEARCH_WORKER_THRESHOLD,
  clearPrefetchCache,
  ensureCatalogSearchWorkerInit,
  generateSearchRequestId,
  getPrefetchedResult,
  onWorkerInitProgress,
  postCatalogSearchRequest,
  postPrefetchRequests,
} from "../app/hooks/catalogSearchWorker";

// ─── Public types ─────────────────────────────────────────────────────────────

export type SearchInputContextValue = {
  searchQuery:    string;
  setSearchQuery: (value: string) => void;
  committedQuery: string;
  commitQuery:    (value: string) => void;
};

export type SearchResultsContextValue = {
  suggestions:     CatalogProduct[];
  isSearching:     boolean;
  isWorkerReady:   boolean;
  workerStatus:    "idle" | "building" | "ready";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS_LIMIT  = 20;
const COMMIT_DEBOUNCE    = 300;  // ms after last keystroke before query commits
const PREFETCH_IDLE_MS   = 50;   // ms idle before next-char pre-warming

// ─── Contexts ─────────────────────────────────────────────────────────────────

const SearchInputContext   = createContext<SearchInputContextValue | undefined>(undefined);
const SearchResultsContext = createContext<SearchResultsContextValue | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProductSearchFields(product: CatalogProduct) {
  return {
    nameAr:   product.nameAr   ?? product.name,
    nameEn:   product.nameEn   ?? product.name,
    category: `${product.categoryName ?? ""} ${product.categoryNameEn ?? ""}`,
    code:     product.code,
    barcode:  product.barcode,
  };
}

function rankInline(
  products: CatalogProduct[],
  query:    string,
  limit?:   number,
): string[] {
  type Entry = { id: string; score: number; index: number };
  const entries: Entry[] = [];

  for (let i = 0; i < products.length; i++) {
    const fields = getProductSearchFields(products[i]);
    if (!fuzzyMatch(query, fields)) continue;
    entries.push({ id: products[i].id, score: fuzzyScore(query, fields), index: i });
  }

  entries.sort((l, r) =>
    r.score !== l.score ? r.score - l.score : l.index - r.index,
  );

  if (limit && limit > 0 && entries.length > limit) entries.length = limit;
  return entries.map((e) => e.id);
}

function mapIdsToProducts(
  rankedIds:   string[],
  productsById: Map<string, CatalogProduct>,
  limit?:      number,
): CatalogProduct[] {
  const mapped: CatalogProduct[] = [];
  const max = limit && limit > 0 ? Math.min(limit, rankedIds.length) : rankedIds.length;
  for (let i = 0; i < max; i++) {
    const p = productsById.get(rankedIds[i]);
    if (p) mapped.push(p);
  }
  return mapped;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SearchProvider({ children }: { children: ReactNode }) {
  const location     = useLocation();
  const navigate     = useNavigate();
  const { products } = useCatalog();

  // ── 1. Raw input state ────────────────────────────────────────────────────

  const [searchQuery,    setSearchQueryRaw] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const debounceTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefetchTimer                       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryRaw(value);
  }, []);

  const commitQuery = useCallback((value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const trimmed = value.trim();
      setCommittedQuery(trimmed);

      // Write to URL only on the /products route — this is the single
      // source of URL mutation for search. Products.tsx no longer has its
      // own URL-sync effect, so the URL is only updated here (explicit
      // commit) and in the clear effect below (explicit clear).
      if (
        location.pathname === "/products" ||
        location.pathname.startsWith("/products/")
      ) {
        const params = new URLSearchParams(location.search);
        if (trimmed) {
          params.set("search", trimmed);
        } else {
          params.delete("search");
        }
        navigate({ search: params.toString() }, { replace: true });
      }
    }, COMMIT_DEBOUNCE);
  }, [location.pathname, location.search, navigate]);

  // Cancel pending commit and clear URL search param when input is cleared.
  useEffect(() => {
    if (searchQuery) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    setCommittedQuery("");

    // Remove ?search= from the URL when the user explicitly clears the
    // input while on the /products route.
    if (
      location.pathname === "/products" ||
      location.pathname.startsWith("/products/")
    ) {
      const params = new URLSearchParams(location.search);
      if (params.has("search") || params.has("q")) {
        params.delete("search");
        params.delete("q");
        navigate({ search: params.toString() }, { replace: true });
      }
    }
  }, [searchQuery, location.pathname, location.search, navigate]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
    };
  }, []);

  // ── 2. URL sync ───────────────────────────────────────────────────────────

  const urlSyncRef = useRef<string | null>(null);

  useEffect(() => {
    const params     = new URLSearchParams(location.search);
    const nextSearch = params.get("search") ?? params.get("q") ?? "";

    if (nextSearch) {
      if (urlSyncRef.current !== nextSearch) {
        urlSyncRef.current = nextSearch;
        setSearchQueryRaw(nextSearch);
        setCommittedQuery(nextSearch);
      }
      return;
    }

    if (
      location.pathname === "/products" ||
      location.pathname.startsWith("/products/")
    ) {
      if (urlSyncRef.current !== "") {
        urlSyncRef.current = "";
        setSearchQueryRaw("");
        setCommittedQuery("");
      }
    }
  }, [location.pathname, location.search]);

  // ── 3. Clear caches on route change ──────────────────────────────────────

  useEffect(() => {
    clearFuzzyCache();
    clearPrefetchCache();
  }, [location.pathname]);

  // ── 4. Catalog update: flush caches + init worker ────────────────────────

  useEffect(() => {
    if (products.length === 0) return;
    clearFuzzyCache();
    clearPrefetchCache();
    ensureCatalogSearchWorkerInit(products);
  }, [products]);

  // ── 5. Deferred value (keeps input responsive) ────────────────────────────

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());

  // ── 6. Stable products map ────────────────────────────────────────────────

  const productsById = useMemo(
    () => new Map<string, CatalogProduct>(products.map((p) => [p.id, p])),
    [products],
  );

  // ── 7. Suggestions (worker-first, inline fallback, prefetch-backed) ───────

  const [suggestions,     setSuggestions]     = useState<CatalogProduct[]>([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [workerStatus,    setWorkerStatus]    = useState<"idle" | "building" | "ready">("idle");

  const latestSuggestionRequestId = useRef(0);
  // AbortController: signal to discard a stale suggestion response
  const suggestionAbort = useRef<AbortController>(new AbortController());

  // Set up worker initialization progress callback
  useEffect(() => {
    onWorkerInitProgress((status) => {
      setWorkerStatus(status === "building" ? "building" : "ready");
    });
  }, []);

  useEffect(() => {
    const query = deferredSearchQuery;

    if (query.length < 2) {
      startTransition(() => {
        setSuggestions([]);
        setSuggestionsBusy(false);
      });
      return;
    }

    // Abort the previous suggestion fetch immediately
    suggestionAbort.current.abort();
    suggestionAbort.current = new AbortController();
    const signal = suggestionAbort.current.signal;

    // ── Prefetch cache fast path ─────────────────────────────────────────
    const prefetched = getPrefetchedResult(query);
    if (prefetched) {
      startTransition(() => {
        if (signal.aborted) return;
        setSuggestions(
          mapIdsToProducts(prefetched, productsById, SUGGESTIONS_LIMIT),
        );
        setSuggestionsBusy(false);
      });
      // Schedule next-char prefetch
      if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
      prefetchTimer.current = setTimeout(() => {
        postPrefetchRequests(
          Array.from("abcdefghijklmnopqrstuvwxyzابتثجحخدذرزسشصضطظعغفقكلمنهوي")
            .slice(0, 12)
            .map((ch) => query + ch),
          { limit: SUGGESTIONS_LIMIT },
        );
      }, PREFETCH_IDLE_MS);
      return;
    }

    const requestId = generateSearchRequestId();
    latestSuggestionRequestId.current = requestId;
    setSuggestionsBusy(true);

    // Inline path for tiny catalogs
    if (products.length < CATALOG_SEARCH_WORKER_THRESHOLD) {
      startTransition(() => {
        if (signal.aborted) return;
        const ids = rankInline(products, query, SUGGESTIONS_LIMIT);
        setSuggestions(mapIdsToProducts(ids, productsById, SUGGESTIONS_LIMIT));
        setSuggestionsBusy(false);
      });
      return;
    }

    // Worker path
    postCatalogSearchRequest({
      query,
      requestId,
      limit: SUGGESTIONS_LIMIT,
    }).then((response) => {
      if (signal.aborted) return;
      if (response.requestId !== requestId) return; // stale

      if (response.error) {
        startTransition(() => {
          if (signal.aborted) return;
          const ids = rankInline(products, query, SUGGESTIONS_LIMIT);
          setSuggestions(mapIdsToProducts(ids, productsById, SUGGESTIONS_LIMIT));
          setSuggestionsBusy(false);
        });
        return;
      }

      startTransition(() => {
        if (signal.aborted) return;
        setSuggestions(
          mapIdsToProducts(response.rankedIds, productsById, SUGGESTIONS_LIMIT),
        );
        setSuggestionsBusy(false);
      });

      // Schedule next-char prefetch after successful response
      if (prefetchTimer.current) clearTimeout(prefetchTimer.current);
      prefetchTimer.current = setTimeout(() => {
        postPrefetchRequests(
          Array.from("abcdefghijklmnopqrstuvwxyzابتثجحخدذرزسشصضطظعغفقكلمنهوي")
            .slice(0, 12)
            .map((ch) => query + ch),
          { limit: SUGGESTIONS_LIMIT },
        );
      }, PREFETCH_IDLE_MS);

    }).catch(() => {
      if (signal.aborted) return;
      if (latestSuggestionRequestId.current !== requestId) return;
      startTransition(() => {
        if (signal.aborted) return;
        const ids = rankInline(products, query, SUGGESTIONS_LIMIT);
        setSuggestions(mapIdsToProducts(ids, productsById, SUGGESTIONS_LIMIT));
        setSuggestionsBusy(false);
      });
    });

  }, [deferredSearchQuery, products, productsById]);

  // ── 8. Context values (split to prevent cascade re-renders) ──────────────

  const inputValue = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      committedQuery,
      commitQuery,
    }),
    [searchQuery, setSearchQuery, committedQuery, commitQuery],
  );

  const resultsValue = useMemo(
    () => ({
      suggestions,
      isSearching:   suggestionsBusy,
      isWorkerReady: workerStatus === "ready",
      workerStatus,
    }),
    [suggestions, suggestionsBusy, workerStatus],
  );

  return (
    <SearchInputContext.Provider value={inputValue}>
      <SearchResultsContext.Provider value={resultsValue}>
        {children}
      </SearchResultsContext.Provider>
    </SearchInputContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSearchInput(): SearchInputContextValue {
  const ctx = useContext(SearchInputContext);
  if (!ctx) throw new Error("useSearchInput must be used within SearchProvider");
  return ctx;
}

export function useSearchResults(): SearchResultsContextValue {
  const ctx = useContext(SearchResultsContext);
  if (!ctx) throw new Error("useSearchResults must be used within SearchProvider");
  return ctx;
}

/**
 * Legacy combined hook — prefer useSearchInput() / useSearchResults() separately.
 */
export function useSearch() {
  return { ...useSearchInput(), ...useSearchResults() };
}