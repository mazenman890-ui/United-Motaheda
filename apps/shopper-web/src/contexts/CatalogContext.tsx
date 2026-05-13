/**
 * M3 — Server-paginated catalog reads
 *
 * Boot path:
 *  1. Page-1 fetch (24 products) gives a fast first paint.
 *  2. requestIdleCallback triggers a full-catalog load in the background.
 *  3. Once the full catalog arrives, `allProducts` holds the complete 52K
 *     list for search workers and lookups; `products` stays paginated.
 *
 * Worker init:
 *  The fuzzy-search worker is initialized from `allProducts` (the stable
 *  full-catalog reference) rather than the transient paginated `products`.
 *  This prevents the worker from reinitialising on every `loadNextPage()`.
 *
 * `useFullCatalog()` gives admin pages and the search hook access to the
 *  full dataset without exposing it in the default catalog context shape.
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
  deriveCatalogCategories,
  buildSpotlightProducts,
  type CatalogCategory,
  type CatalogProduct,
} from "../app/catalog";
import {
  fetchProductsPage,
  fetchCategoriesQuick,
  getCachedCategoriesQuick,
  invalidatePageCache,
  fetchShopperCatalogSnapshot,
  getCachedShopperCatalogSnapshot,
  type ProductFilters,
  type PageResult,
} from "../services/shopperCatalogApi";

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogMetrics = {
  totalProducts: number;
  totalCategories: number;
  inStockProducts: number;
  barcodedProducts: number;
  lowStockProducts: number;
};

export type SearchFilters = Omit<ProductFilters, "searchQuery">;

type CatalogContextType = {
  // ── Core data ─────────────────────────────────────────────────────────────
  products: CatalogProduct[];
  categories: CatalogCategory[];
  productsById: Record<string, CatalogProduct>;
  categoriesById: Record<string, CatalogCategory>;
  featuredProducts: CatalogProduct[];
  inStockProducts: CatalogProduct[];
  metrics: CatalogMetrics;
  lastUpdated: string | null;

  // ── Full catalog (background-loaded) ──────────────────────────────────────
  allProducts: CatalogProduct[];
  allProductsById: Record<string, CatalogProduct>;
  isFullCatalogReady: boolean;

  // ── Loading states ────────────────────────────────────────────────────────
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // ── Pagination ────────────────────────────────────────────────────────────
  totalProductCount: number;
  hasNextPage: boolean;
  currentPage: number;
  activeFilters: ProductFilters;

  // ── Actions ───────────────────────────────────────────────────────────────
  loadNextPage: () => Promise<void>;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  filterByCategory: (categoryId: string | null) => Promise<void>;
  refreshCatalog: (forceRefresh?: boolean) => Promise<void>;
  refreshCategories: () => Promise<void>;
  upsertProduct: (product: CatalogProduct) => void;
  removeProduct: (identifier: string) => void;

};

// ─── Seed from cache ──────────────────────────────────────────────────────────

const initialSnapshot = getCachedShopperCatalogSnapshot();
const seedProducts = initialSnapshot?.products ?? [];
const seedCategories = getCachedCategoriesQuick() ?? [];

// ─── Context ──────────────────────────────────────────────────────────────────

const CatalogContext = createContext<CatalogContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CatalogProvider({ children }: { children: ReactNode }) {
  // ── Display-layer state (what the grid shows) ──────────────────────────────
  const [products, setProducts] = useState<CatalogProduct[]>(
    seedProducts.length > 0 ? seedProducts : [],
  );
  const [productMap, setProductMap] = useState<Record<string, CatalogProduct>>(
    () => Object.fromEntries(seedProducts.map((p) => [p.id, p])),
  );
  const [isLoading, setIsLoading] = useState(seedProducts.length === 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(
    initialSnapshot?.lastUpdated ?? null,
  );
  const [totalProductCount, setTotalCount] = useState(seedProducts.length);
  const [currentPage, setCurrentPage] = useState(1);
  // hasNextPage is true only in the pre-full-catalog window (server pagination)
  const [hasNextPage, setHasNextPage] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ProductFilters>({});

  // ── Full-catalog state (background, stable for worker init) ───────────────
  const [allProducts, setAllProducts] = useState<CatalogProduct[]>(seedProducts);
  const [allProductsMap, setAllProductsMap] = useState<Record<string, CatalogProduct>>(
    () => Object.fromEntries(seedProducts.map((p) => [p.id, p])),
  );
  const [isFullCatalogReady, setIsFullCatalogReady] = useState(seedProducts.length > 0);

  // ── Categories ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CatalogCategory[]>(seedCategories);

  // ── Ref guards ────────────────────────────────────────────────────────────
  const isLoadingMoreRef = useRef(false);
  const fullCatalogScheduled = useRef(false);

  // ── applyPageResult ───────────────────────────────────────────────────────

  const applyPageResult = useCallback(
    (result: PageResult, page: number, append: boolean) => {
      startTransition(() => {
        setProductMap((prev) => {
          const next = append ? { ...prev } : {};
          result.products.forEach((p) => { next[p.id] = p; });
          return next;
        });
        setProducts((prev) =>
          append ? [...prev, ...result.products] : result.products,
        );
        if (result.totalCount >= 0) setTotalCount(result.totalCount);
        setCurrentPage(page);
        setHasNextPage(result.hasNextPage);
        setIsLoading(false);
        setIsLoadingMore(false);
        setLastUpdated(new Date().toISOString());
        setError(null);
      });
      isLoadingMoreRef.current = false;
    },
    [],
  );

  // ── Full-catalog loader (idle-callback) ───────────────────────────────────

  const scheduleFullCatalogLoad = useCallback(
    (delayMs = 0) => {
      if (fullCatalogScheduled.current) return;
      fullCatalogScheduled.current = true;

      const doLoad = async () => {
        try {
          const snapshot = await fetchShopperCatalogSnapshot(false);
          startTransition(() => {
            setAllProducts(snapshot.products);
            setAllProductsMap(
              Object.fromEntries(snapshot.products.map((p) => [p.id, p])),
            );
            setIsFullCatalogReady(true);
            setCategories(snapshot.categories);
            setTotalCount(snapshot.products.length);
            setLastUpdated(new Date().toISOString());
          });
        } catch (err) {
          console.error("[CatalogContext] Background full-catalog load failed:", err);
          fullCatalogScheduled.current = false; // allow retry
        }
      };

      if (delayMs > 0) {
        setTimeout(() => void doLoad(), delayMs);
      } else if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => void doLoad(), { timeout: 8000 });
      } else {
        setTimeout(() => void doLoad(), 200);
      }
    },
    [],
  );

  // ── Mount: page-1 fetch if cold-start, then idle full-catalog ─────────────
  //
  // Categories note: on cold start we try the synchronous cache first so the
  // sidebar/nav already have categories before the async full-catalog arrives.
  // The separate `refreshCategories` effect was removed because it raced with
  // `scheduleFullCatalogLoad` — both awaited the same snapshot promise and both
  // called `setCategories`, producing two separate React update batches and two
  // extra consumer re-renders.  Now categories flow through one path only:
  //   • Sync cache → setCategories immediately (zero network cost)
  //   • scheduleFullCatalogLoad → setCategories as part of its batched update

  useEffect(() => {
    if (seedProducts.length > 0) {
      // Cache warm — schedule a silent background refresh to pick up new data.
      // Categories are already populated from the seed; no separate fetch needed.
      scheduleFullCatalogLoad();
      return;
    }

    // Cold start: populate categories from any available sync cache so the
    // navigation/sidebar can render before the async full-catalog arrives.
    const quickCats = getCachedCategoriesQuick();
    if (quickCats?.length) {
      startTransition(() => setCategories(quickCats));
    }

    // Fetch page 1 immediately for first paint.
    void (async () => {
      try {
        const result = await fetchProductsPage(1, {});
        applyPageResult(result, 1, false);
        scheduleFullCatalogLoad(150);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load catalog");
        setIsLoading(false);
        scheduleFullCatalogLoad(5000);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── refreshCategories (manual refresh, e.g. after admin upsert) ──────────

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await fetchCategoriesQuick();
      startTransition(() => setCategories(cats));
    } catch (err) {
      console.error("[CatalogContext] fetchCategoriesQuick failed:", err);
    }
  }, []);

  // ── loadNextPage ──────────────────────────────────────────────────────────

  const loadNextPage = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasNextPage || isFullCatalogReady) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const result = await fetchProductsPage(nextPage, activeFilters);
      applyPageResult(result, nextPage, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [currentPage, hasNextPage, activeFilters, applyPageResult, isFullCatalogReady]);

  // ── search (server-side) ──────────────────────────────────────────────────

  const search = useCallback(async (query: string, extraFilters?: SearchFilters) => {
    const filters: ProductFilters = { ...extraFilters, searchQuery: query };
    setActiveFilters(filters);
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchProductsPage(1, filters);
      applyPageResult(result, 1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setIsLoading(false);
    }
  }, [applyPageResult]);

  // ── filterByCategory (server-side) ───────────────────────────────────────

  const filterByCategory = useCallback(async (categoryId: string | null) => {
    const filters: ProductFilters = categoryId ? { categoryId } : {};
    setActiveFilters(filters);
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchProductsPage(1, filters);
      applyPageResult(result, 1, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Filter failed");
      setIsLoading(false);
    }
  }, [applyPageResult]);

  // ── refreshCatalog ────────────────────────────────────────────────────────

  const refreshCatalog = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    fullCatalogScheduled.current = false;

    try {
      const snapshot = await fetchShopperCatalogSnapshot(forceRefresh);
      startTransition(() => {
        setAllProducts(snapshot.products);
        setAllProductsMap(
          Object.fromEntries(snapshot.products.map((p) => [p.id, p])),
        );
        setIsFullCatalogReady(true);
        setCategories(snapshot.categories);
        setTotalCount(snapshot.products.length);
        setIsLoading(false);
        setLastUpdated(new Date().toISOString());
        setError(null);
      });
      invalidatePageCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
      setIsLoading(false);
    }
  }, []);

  // ── upsertProduct / removeProduct (optimistic mutations) ─────────────────

  const upsertProduct = useCallback((product: CatalogProduct) => {
    const merge = (prev: CatalogProduct[]) => {
      const idx = prev.findIndex(
        (p) => p.id === product.id || p.code === product.code,
      );
      if (idx === -1) return [product, ...prev];
      return prev.map((p, i) => (i === idx ? product : p));
    };
    startTransition(() => {
      setProductMap((prev) => ({ ...prev, [product.id]: product }));
      setProducts(merge);
      setAllProductsMap((prev) => ({ ...prev, [product.id]: product }));
      setAllProducts(merge);
      setLastUpdated(new Date().toISOString());
    });
  }, []);

  const removeProduct = useCallback((identifier: string) => {
    const exclude = (prev: CatalogProduct[]) =>
      prev.filter((p) => p.id !== identifier && p.code !== identifier);
    startTransition(() => {
      setProductMap((prev) => {
        const next = { ...prev };
        delete next[identifier];
        return next;
      });
      setProducts(exclude);
      setAllProductsMap((prev) => {
        const next = { ...prev };
        delete next[identifier];
        return next;
      });
      setAllProducts(exclude);
      setLastUpdated(new Date().toISOString());
    });
  }, []);

  // ── Derived values (prefer full catalog for accuracy) ─────────────────────

  const catalogSource = allProducts.length > 0 ? allProducts : products;

  const derivedCategories = useMemo(
    () => deriveCatalogCategories(catalogSource, categories),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogSource, categories],
  );

  const productsById = useMemo(() => productMap, [productMap]);

  const categoriesById = useMemo(
    () =>
      derivedCategories.reduce<Record<string, CatalogCategory>>((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      }, {}),
    [derivedCategories],
  );

  const inStockProducts = useMemo(
    () => catalogSource.filter((p) => p.inStock),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogSource],
  );

  const featuredProducts = useMemo(
    () => buildSpotlightProducts(catalogSource, derivedCategories, 180),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalogSource, derivedCategories],
  );

  const metrics = useMemo<CatalogMetrics>(() => {
    return {
      totalProducts: totalProductCount > 0 ? totalProductCount : catalogSource.length,
      totalCategories: derivedCategories.length,
      inStockProducts: inStockProducts.length,
      barcodedProducts: catalogSource.filter((p) => Boolean(p.barcode)).length,
      lowStockProducts: inStockProducts.filter((p) => p.stock <= 5).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogSource, derivedCategories, inStockProducts, totalProductCount]);

  // ── Context value ─────────────────────────────────────────────────────────

  return (
    <CatalogContext.Provider
      value={{
        products,
        categories: derivedCategories,
        productsById,
        categoriesById,
        featuredProducts,
        inStockProducts,
        metrics,
        lastUpdated,
        allProducts,
        allProductsById: allProductsMap,
        isFullCatalogReady,
        isLoading,
        isLoadingMore,
        error,
        totalProductCount,
        hasNextPage,
        currentPage,
        activeFilters,
        loadNextPage,
        search,
        filterByCategory,
        refreshCatalog,
        refreshCategories,
        upsertProduct,
        removeProduct,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

// ─── useCatalog ───────────────────────────────────────────────────────────────

export function useCatalog(): CatalogContextType {
  const ctx = useContext(CatalogContext);
  if (process.env.NODE_ENV !== "production" && ctx === null) {
    throw new Error(
      "[CatalogContext] useCatalog() was called outside <CatalogProvider>. " +
      "Wrap the route tree in <CatalogShell> (see App.tsx).",
    );
  }
  return ctx as CatalogContextType;
}

// ─── useFullCatalog ───────────────────────────────────────────────────────────

/** Returns the stable full-catalog dataset for worker init and admin pages. */
export function useFullCatalog() {
  const ctx = useContext(CatalogContext);
  if (process.env.NODE_ENV !== "production" && ctx === null) {
    throw new Error(
      "[CatalogContext] useFullCatalog() was called outside <CatalogProvider>.",
    );
  }
  const c = ctx as CatalogContextType;
  return {
    allProducts:       c.allProducts,
    allProductsById:   c.allProductsById,
    isFullCatalogReady: c.isFullCatalogReady,
  };
}
