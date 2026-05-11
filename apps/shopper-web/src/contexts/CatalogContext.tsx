/**
 * CatalogContext — owner of the full catalog snapshot.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * RESPONSIBILITY (single, narrow)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Load the full product catalog ONCE per session, expose it as a stable
 * read-only snapshot to consumers, and provide narrow mutation actions for
 * admin write paths (`upsertProduct`, `removeProduct`) and explicit refresh.
 *
 * This context is the **source of truth** — not a derived/filtered view.
 * Filtering, sorting, and search are computed downstream by:
 *
 *   - `useCatalogProductSearch`  (worker-backed full-grid search)
 *   - `useCatalogCategorySearch` (category list filter)
 *   - `useCatalogFilters`        (category + stock + price + sort)
 *   - `SearchContext`            (suggestion dropdown)
 *
 * Each of those hooks consumes the snapshot from `useCatalog()` and produces
 * its own derived view. The snapshot itself never mutates in response to a
 * user search/filter — only on explicit refresh or admin write.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHAT THIS REPLACES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The previous version had:
 *
 *   - `search(query)` and `filterByCategory(id)` actions that **replaced**
 *     `products` state with the filtered subset. Subsequent searches then ran
 *     against the already-filtered set — clearing the search did not bring
 *     products back. Both actions had zero call sites in the codebase but
 *     were silently corrupting the catalog any time something accidentally
 *     invoked them.
 *
 *   - A `searchIndex` memo whose code did UNION (OR) while its comment said
 *     INTERSECTION (AND), and that rebuilt on every state mutation.
 *
 *   - A `debouncedQuery` ref initialized to a hardcoded empty string, against
 *     which the search short-circuited and never ran.
 *
 *   - Dead pagination state (`currentPage`, `hasNextPage`, `totalProductCount`,
 *     `applyPageResult`) that the all-at-once load path never updated.
 *
 *   - An `alternativeProductPool` memo that allocated a 52K-element copy of
 *     each product on every `productMap` change — and had zero consumers.
 *
 * All of the above is removed. The surviving surface is exactly what real
 * call sites consume.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NOTE ON DATA SCALE / FUTURE WORK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The catalog currently loads as a single snapshot via `fetchShopperCatalogSnapshot`,
 * which paginates Supabase 1000 rows at a time. For ~52K products this is the
 * dominant boot cost. A future migration to server-paginated reads via
 * `fetchProductsPage` is desirable but is a multi-file change that also
 * requires re-architecting the worker init flow (`ensureCatalogSearchWorkerInit`
 * currently expects the full product set to build its inverted index). That
 * migration is not in scope for this pass.
 */

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildSpotlightProducts,
  deriveCatalogCategories,
  type CatalogCategory,
  type CatalogProduct,
} from "../app/catalog";
import {
  fetchCategoriesQuick,
  fetchShopperCatalogSnapshot,
  getCachedCategoriesQuick,
  getCachedShopperCatalogSnapshot,
} from "../services/shopperCatalogApi";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CatalogMetrics = {
  totalProducts:    number;
  totalCategories:  number;
  inStockProducts:  number;
  barcodedProducts: number;
  lowStockProducts: number;
};

export type CatalogContextType = {
  // ── Core data (read-only snapshot) ─────────────────────────────────────────
  products:         CatalogProduct[];
  categories:       CatalogCategory[];
  productsById:     Record<string, CatalogProduct>;
  categoriesById:   Record<string, CatalogCategory>;
  featuredProducts: CatalogProduct[];
  inStockProducts:  CatalogProduct[];
  metrics:          CatalogMetrics;
  lastUpdated:      string | null;

  // ── Loading / error state ──────────────────────────────────────────────────
  isLoading: boolean;
  error:     string | null;

  // ── Mutation actions (refresh + admin writes) ──────────────────────────────
  refreshCatalog:    (forceRefresh?: boolean) => Promise<void>;
  refreshCategories: () => Promise<void>;
  upsertProduct:     (product: CatalogProduct) => void;
  removeProduct:     (identifier: string) => void;

  // ── Derived helpers consumed by other hooks ────────────────────────────────
  /** id → "name nameEn" lowercased — used by Categories.tsx for substring search. */
  categorySearchIndex: Record<string, string>;
};

// ─── Initial seed (sync, from cache) ──────────────────────────────────────────

const initialSnapshot  = getCachedShopperCatalogSnapshot();
const seedProducts     = initialSnapshot?.products  ?? [];
const seedCategories   = getCachedCategoriesQuick() ?? [];

// ─── Context ──────────────────────────────────────────────────────────────────

const EMPTY_METRICS: CatalogMetrics = {
  totalProducts:    0,
  totalCategories:  0,
  inStockProducts:  0,
  barcodedProducts: 0,
  lowStockProducts: 0,
};

const CatalogContext = createContext<CatalogContextType>({
  products:            seedProducts,
  categories:          seedCategories,
  productsById:        {},
  categoriesById:      {},
  featuredProducts:    [],
  inStockProducts:     [],
  metrics:             EMPTY_METRICS,
  lastUpdated:         initialSnapshot?.lastUpdated ?? null,
  isLoading:           false,
  error:               null,
  refreshCatalog:      async () => {},
  refreshCategories:   async () => {},
  upsertProduct:       () => {},
  removeProduct:       () => {},
  categorySearchIndex: {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CatalogProvider({ children }: { children: ReactNode }) {
  // ── Core snapshot state (immutable from the user's perspective) ────────────
  const [products,    setProducts]    = useState<CatalogProduct[]>(seedProducts);
  const [categories,  setCategories]  = useState<CatalogCategory[]>(seedCategories);
  const [productMap,  setProductMap]  = useState<Record<string, CatalogProduct>>(
    () => Object.fromEntries(seedProducts.map((p) => [p.id, p])),
  );
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(
    initialSnapshot?.lastUpdated ?? null,
  );

  // ── Track mounted state to avoid setState on unmount ─────────────────────────
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ── Apply a fresh snapshot to all derived state in one transition ──────────
  const applySnapshot = useCallback(
    (snapshotProducts: CatalogProduct[], snapshotCategories: CatalogCategory[]) => {
      if (!mountedRef.current) return;
      startTransition(() => {
        setProducts(snapshotProducts);
        setCategories(snapshotCategories);
        setProductMap(Object.fromEntries(snapshotProducts.map((p) => [p.id, p])));
        setLastUpdated(new Date().toISOString());
        setError(null);
        setIsLoading(false);
      });
    },
    [],
  );

  // ── Initial fetch (skipped if a fresh in-memory snapshot is already present) ──
  useEffect(() => {
    if (seedProducts.length > 0) {
      // Cached seed is already wired into state; still refresh in background so
      // the user eventually sees fresh data without blocking the first paint.
      void fetchShopperCatalogSnapshot(false)
        .then((snap) => {
          if (snap.products !== seedProducts) {
            applySnapshot(snap.products, snap.categories);
          }
        })
        .catch((err) => {
          console.warn("[CatalogContext] background refresh failed:", err);
        });
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchShopperCatalogSnapshot(false)
      .then((snap) => {
        if (cancelled) return;
        applySnapshot(snap.products, snap.categories);
      })
      .catch((err) => {
        if (cancelled || !mountedRef.current) return;
        const message = err instanceof Error ? err.message : "Failed to load catalog";
        console.error("[CatalogContext] initial load failed:", err);
        setError(message);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // applySnapshot is stable (useCallback with empty deps), so a one-shot effect
    // is safe; deliberately not depending on it to avoid re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Categories may resolve from a separate cache ahead of full snapshot ────
  const refreshCategories = useCallback(async () => {
    try {
      const cats = await fetchCategoriesQuick();
      if (!mountedRef.current) return;
      startTransition(() => {
        setCategories(cats);
      });
    } catch (err) {
      console.error("[CatalogContext] refreshCategories failed:", err);
    }
  }, []);

  useEffect(() => {
    if (categories.length === 0) {
      void refreshCategories();
    }
    // Run once if no seed; refreshCategories is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Explicit refresh (admin "reload" / post-mutation) ──────────────────────
  const refreshCatalog = useCallback(
    async (forceRefresh = false) => {
      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const snap = await fetchShopperCatalogSnapshot(forceRefresh);
        applySnapshot(snap.products, snap.categories);
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : "Refresh failed";
        console.error("[CatalogContext] refreshCatalog failed:", err);
        setError(message);
        setIsLoading(false);
      }
    },
    [applySnapshot],
  );

  // ── Optimistic admin writes (single product, no full reload) ───────────────
  const upsertProduct = useCallback((product: CatalogProduct) => {
    if (!mountedRef.current) return;
    startTransition(() => {
      setProductMap((prev) => ({ ...prev, [product.id]: product }));
      setProducts((prev) => {
        const idx = prev.findIndex((p) => p.id === product.id || p.code === product.code);
        if (idx === -1) return [product, ...prev];
        return prev.map((p, i) => (i === idx ? product : p));
      });
      setLastUpdated(new Date().toISOString());
    });
  }, []);

  const removeProduct = useCallback((identifier: string) => {
    if (!mountedRef.current) return;
    startTransition(() => {
      setProductMap((prev) => {
        if (!(identifier in prev)) return prev;
        const next = { ...prev };
        delete next[identifier];
        return next;
      });
      setProducts((prev) =>
        prev.filter((p) => p.id !== identifier && p.code !== identifier),
      );
      setLastUpdated(new Date().toISOString());
    });
  }, []);

  // ── Derived projections (cheap; recomputed only when products/categories change) ──

  const derivedCategories = useMemo(
    () => deriveCatalogCategories(products, categories),
    [products, categories],
  );

  const productsById = productMap;

  const categoriesById = useMemo(
    () =>
      derivedCategories.reduce<Record<string, CatalogCategory>>((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      }, {}),
    [derivedCategories],
  );

  const inStockProducts = useMemo(
    () => products.filter((p) => p.inStock),
    [products],
  );

  const featuredProducts = useMemo(
    () => buildSpotlightProducts(products, derivedCategories, 180),
    [products, derivedCategories],
  );

  const categorySearchIndex = useMemo<Record<string, string>>(
    () =>
      derivedCategories.reduce<Record<string, string>>((acc, cat) => {
        acc[cat.id] = `${cat.name} ${cat.nameEn}`.trim().toLowerCase();
        return acc;
      }, {}),
    [derivedCategories],
  );

  const metrics = useMemo<CatalogMetrics>(
    () => ({
      totalProducts:    products.length,
      totalCategories:  derivedCategories.length,
      inStockProducts:  inStockProducts.length,
      // Single-pass count rather than a second .filter() allocation.
      barcodedProducts: products.reduce((n, p) => (p.barcode ? n + 1 : n), 0),
      lowStockProducts: inStockProducts.reduce((n, p) => (p.stock <= 5 ? n + 1 : n), 0),
    }),
    [products, derivedCategories.length, inStockProducts],
  );

  // ── Memoize the context value so consumers don't re-render on identity churn ──
  const value = useMemo<CatalogContextType>(
    () => ({
      products,
      categories: derivedCategories,
      productsById,
      categoriesById,
      featuredProducts,
      inStockProducts,
      metrics,
      lastUpdated,
      isLoading,
      error,
      refreshCatalog,
      refreshCategories,
      upsertProduct,
      removeProduct,
      categorySearchIndex,
    }),
    [
      products,
      derivedCategories,
      productsById,
      categoriesById,
      featuredProducts,
      inStockProducts,
      metrics,
      lastUpdated,
      isLoading,
      error,
      refreshCatalog,
      refreshCategories,
      upsertProduct,
      removeProduct,
      categorySearchIndex,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  return useContext(CatalogContext);
}
