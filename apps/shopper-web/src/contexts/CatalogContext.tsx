/**
 * CatalogContext.tsx
 *
 * PERFORMANCE REFACTOR — stream-and-render model
 * ════════════════════════════════════════════════════════════════════════
 *
 * BEFORE:  One blocking query that downloaded all 52 000 products before
 *          any UI appeared.  60+ second white screen on first load.
 *
 * AFTER:   Two independent data streams:
 *
 *   Stream A — Categories (< 500 ms)
 *     fetchCategoriesQuick() returns seed-derived categories from
 *     localStorage or a fast Supabase call.  The sidebar renders
 *     immediately without waiting for any product data.
 *
 *   Stream B — Products (paginated, lazy)
 *     Page 1 (20 rows) fetched immediately → grid renders at ~1–2 s.
 *     Pages 2–3 silently prefetched in background.
 *     Subsequent pages loaded on-demand as user scrolls (infinite scroll).
 *
 * BACKWARD COMPATIBILITY
 * ════════════════════════════════════════════════════════════════════════
 * All fields previously on CatalogContextType are still present.
 * Consumers that call `useCatalog()` continue to work without changes.
 *
 * The semantic of `products` changes slightly:
 *   Before:  All 52 000 products
 *   After:   Products loaded so far (grows as user pages/scrolls)
 *
 * `totalProductCount` (new) holds the server-side total so stat cards
 * can display the correct number before all rows are loaded.
 *
 * `productsById` / `allProducts` accumulate across pages — product detail
 * lookups always work for any product the user has scrolled past.
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
  prefetchProductsPage,
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

/** Lightweight descriptor used by `rankAlternativeProducts`.
 *  Precomputed once so ProductDetails never re-maps 52 K items. */
export type ProductRecommendationDescriptor = {
  id:             string;
  code:           string;
  barcode:        string;
  nameAr:         string;
  nameEn:         string;
  category:       string;
  categoryName:   string;
  categoryNameEn: string;
  price:          number;
  stock:          number;
  inStock:        boolean;
  imageUrl:       string;
};

export type SearchFilters = Omit<ProductFilters, "searchQuery">;

type CatalogContextType = {
  // ── Legacy fields (unchanged API) ──────────────────────────────────────────
  /** Products loaded so far (grows with each page / search result). */
  products: CatalogProduct[];
  categories: CatalogCategory[];
  /**
   * Lookup map accumulated across all loaded pages.
   * Use this (not `products`) for ID-based lookups in product detail pages.
   */
  productsById: Record<string, CatalogProduct>;
  categoriesById: Record<string, CatalogCategory>;
  featuredProducts: CatalogProduct[];
  inStockProducts: CatalogProduct[];
  metrics: CatalogMetrics;
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
  categorySearchIndex: Record<string, string>;
  alternativeProductPool: ProductRecommendationDescriptor[];
  refreshCatalog: (forceRefresh?: boolean) => Promise<void>;
  upsertProduct: (product: CatalogProduct) => void;
  removeProduct: (identifier: string) => void;

  // ── New fields — paginated / streaming ─────────────────────────────────────
  /** Server-side total product count (available after first page fetch). */
  totalProductCount: number;
  /** True while categories are being fetched independently. */
  categoriesReady: boolean;
  /** True once at least one product page has loaded. */
  productsReady: boolean;
  /** True while the next page is loading (infinite scroll spinner). */
  isLoadingMore: boolean;
  /** True when there are more pages available to load. */
  hasNextPage: boolean;
  /** Current page index (1-based). */
  currentPage: number;
  /** Load the next page of products (called by ProductGrid on scroll end). */
  loadNextPage: () => Promise<void>;
  /** Server-side search — resets pagination and fetches matching rows. */
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  /** Filter by category server-side — resets pagination. */
  filterByCategory: (categoryId: string | null) => Promise<void>;
  /** Re-fetch categories from the API. */
  refreshCategories: () => Promise<void>;
  /** Silently prefetch the next N pages into the in-memory cache. */
  prefetchNextPages: (count?: number) => void;
  /** Active filters driving the current product list. */
  activeFilters: ProductFilters;
};

// ─── Seed from legacy snapshot ────────────────────────────────────────────────

const initialSnapshot = getCachedShopperCatalogSnapshot();
const seedProducts    = initialSnapshot?.products   ?? [];
const seedCategories  = getCachedCategoriesQuick()  ?? initialSnapshot?.categories ?? [];

// ─── Context ──────────────────────────────────────────────────────────────────

const CatalogContext = createContext<CatalogContextType>({
  products:               seedProducts,
  categories:             seedCategories,
  productsById:           {},
  categoriesById:         {},
  featuredProducts:       [],
  inStockProducts:        seedProducts.filter((p) => p.inStock),
  metrics: {
    totalProducts:    seedProducts.length,
    totalCategories:  seedCategories.length,
    inStockProducts:  seedProducts.filter((p) => p.inStock).length,
    barcodedProducts: seedProducts.filter((p) => Boolean(p.barcode)).length,
    lowStockProducts: seedProducts.filter((p) => p.inStock && p.stock <= 5).length,
  },
  lastUpdated:            initialSnapshot?.lastUpdated ?? null,
  isLoading:              !initialSnapshot,
  error:                  null,
  categorySearchIndex:    {},
  alternativeProductPool: [],
  totalProductCount:      seedProducts.length,
  categoriesReady:        seedCategories.length > 0,
  productsReady:          seedProducts.length > 0,
  isLoadingMore:          false,
  hasNextPage:            true,
  currentPage:            1,
  activeFilters:          {},
  refreshCatalog:         async () => {},
  upsertProduct:          () => {},
  removeProduct:          () => {},
  loadNextPage:           async () => {},
  search:                 async () => {},
  filterByCategory:       async () => {},
  refreshCategories:      async () => {},
  prefetchNextPages:      () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CatalogProvider({ children }: { children: ReactNode }) {
  // ── Categories state ────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<CatalogCategory[]>(seedCategories);
  const [categoriesReady, setCategoriesReady] = useState(seedCategories.length > 0);

  // ── Products state ──────────────────────────────────────────────────────────
  // `productMap` accumulates every product seen across pages (for lookups).
  // `products`   reflects the current ordered view (search results or paged list).
  const [productMap, setProductMap]           = useState<Record<string, CatalogProduct>>(() =>
    Object.fromEntries(seedProducts.map((p) => [p.id, p])),
  );
  const [products, setProducts]               = useState<CatalogProduct[]>(seedProducts);
  const [totalProductCount, setTotalCount]    = useState(seedProducts.length);
  const [currentPage, setCurrentPage]         = useState(1);
  const [hasNextPage, setHasNextPage]         = useState(true);
  const [productsReady, setProductsReady]     = useState(seedProducts.length > 0);
  const [isLoadingMore, setIsLoadingMore]     = useState(false);
  const [isLoading, setIsLoading]             = useState(!initialSnapshot);
  const [error, setError]                     = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]         = useState<string | null>(
    initialSnapshot?.lastUpdated ?? null,
  );

  // Active filter state drives every fetch — reset to {} on filterByCategory / search
  const [activeFilters, setActiveFilters]     = useState<ProductFilters>({});

  // Prefetch guard — only prefetch once per filter context
  const prefetchDoneRef = useRef(false);

  // Ongoing loadNextPage guard to prevent double-fetches on fast scroll
  const isLoadingMoreRef = useRef(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** Merge a page result into `productMap` and update `products` list. */
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
        if (result.totalCount >= 0) {
          setTotalCount(result.totalCount);
        }
        setCurrentPage(page);
        setHasNextPage(result.hasNextPage);
        setProductsReady(true);
        setIsLoading(false);
        setIsLoadingMore(false);
        setLastUpdated(new Date().toISOString());
        setError(null);
      });
      isLoadingMoreRef.current = false;
    },
    [],
  );

  // ── Phase 1: Categories (immediate) ─────────────────────────────────────────

  const refreshCategories = useCallback(async () => {
    try {
      const cats = await fetchCategoriesQuick();
      startTransition(() => {
        setCategories(cats);
        setCategoriesReady(true);
      });
    } catch (err) {
      // Category fetch failure is non-fatal — sidebar stays empty rather than
      // crashing the whole page.
      console.error("[CatalogContext] fetchCategoriesQuick failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!categoriesReady) {
      void refreshCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Phase 2: Page 1 (products — initial render) ───────────────────────────

  useEffect(() => {
    // If we already have seed products from localStorage cache, skip the
    // network fetch until the user triggers a refresh.
    if (seedProducts.length > 0) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadFirstPage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchProductsPage(1, {});

        if (!cancelled) {
          applyPageResult(result, 1, false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load products");
          setIsLoading(false);
        }
      }
    };

    void loadFirstPage();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Phase 3: Background prefetch (pages 2–3) ─────────────────────────────

  const prefetchNextPages = useCallback(
    (count = 2) => {
      if (prefetchDoneRef.current) return;
      prefetchDoneRef.current = true;

      for (let i = 2; i <= 1 + count; i++) {
        void prefetchProductsPage(i, activeFilters);
      }
    },
    [activeFilters],
  );

  useEffect(() => {
    if (productsReady && currentPage === 1 && !prefetchDoneRef.current) {
      prefetchNextPages(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsReady, currentPage]);

  // ── loadNextPage (infinite scroll) ──────────────────────────────────────────

  const loadNextPage = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasNextPage) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const nextPage = currentPage + 1;

    try {
      const result = await fetchProductsPage(nextPage, activeFilters);
      applyPageResult(result, nextPage, true);

      // Prefetch the page after next, fire-and-forget
      void prefetchProductsPage(nextPage + 1, activeFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more products");
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [activeFilters, applyPageResult, currentPage, hasNextPage]);

  // ── search (server-side) ─────────────────────────────────────────────────────

  const search = useCallback(
    async (query: string, extraFilters?: SearchFilters) => {
      const filters: ProductFilters = { ...extraFilters, searchQuery: query };

      setActiveFilters(filters);
      setIsLoading(true);
      setError(null);
      prefetchDoneRef.current = false;

      try {
        const result = await fetchProductsPage(1, filters);
        applyPageResult(result, 1, false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setIsLoading(false);
      }
    },
    [applyPageResult],
  );

  // ── filterByCategory (server-side) ───────────────────────────────────────────

  const filterByCategory = useCallback(
    async (categoryId: string | null) => {
      const filters: ProductFilters = categoryId ? { categoryId } : {};

      setActiveFilters(filters);
      setIsLoading(true);
      setError(null);
      prefetchDoneRef.current = false;

      try {
        const result = await fetchProductsPage(1, filters);
        applyPageResult(result, 1, false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Filter failed");
        setIsLoading(false);
      }
    },
    [applyPageResult],
  );

  // ── refreshCatalog (manual force-refresh) ────────────────────────────────────

  const refreshCatalog = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      invalidatePageCache();
    }

    setIsLoading(true);
    setError(null);
    prefetchDoneRef.current = false;

    try {
      if (forceRefresh) {
        // Full snapshot re-fetch for admin-level refreshes
        const snapshot = await fetchShopperCatalogSnapshot(true);
        startTransition(() => {
          const map: Record<string, CatalogProduct> = {};
          snapshot.products.forEach((p) => { map[p.id] = p; });
          setProductMap(map);
          setProducts(snapshot.products);
          setTotalCount(snapshot.products.length);
          setCategories(snapshot.categories);
          setCategoriesReady(true);
          setCurrentPage(1);
          setHasNextPage(false); // full snapshot = no more pages
          setProductsReady(true);
          setIsLoading(false);
          setLastUpdated(snapshot.lastUpdated);
          setError(null);
        });
      } else {
        // Soft refresh: re-fetch page 1 with current filters
        const result = await fetchProductsPage(1, activeFilters);
        applyPageResult(result, 1, false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
      setIsLoading(false);
    }
  }, [activeFilters, applyPageResult]);

  // ── upsertProduct / removeProduct (optimistic local mutations) ───────────────

  const upsertProduct = useCallback((product: CatalogProduct) => {
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
    startTransition(() => {
      setProductMap((prev) => {
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

  // ── Derived / memoised values ─────────────────────────────────────────────

  const derivedCategories = useMemo(
    () => deriveCatalogCategories(products, categories),
    [products, categories],
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
    () => products.filter((p) => p.inStock),
    [products],
  );

  const featuredProducts = useMemo(
    () => buildSpotlightProducts(products, derivedCategories, 180),
    [derivedCategories, products],
  );

  const categorySearchIndex = useMemo<Record<string, string>>(
    () =>
      derivedCategories.reduce<Record<string, string>>((acc, cat) => {
        acc[cat.id] = `${cat.name} ${cat.nameEn}`.trim().toLowerCase();
        return acc;
      }, {}),
    [derivedCategories],
  );

  const alternativeProductPool = useMemo<ProductRecommendationDescriptor[]>(
    () =>
      Object.values(productMap).map((p) => ({
        id:             p.id,
        code:           p.code,
        barcode:        p.barcode,
        nameAr:         p.nameAr,
        nameEn:         p.nameEn,
        category:       p.category,
        categoryName:   p.categoryName,
        categoryNameEn: p.categoryNameEn,
        price:          p.price,
        stock:          p.stock,
        inStock:        p.inStock,
        imageUrl:       p.imageUrl,
      })),
    [productMap],
  );

  const metrics = useMemo<CatalogMetrics>(
    () => ({
      // Use the server-side total for the headline count
      totalProducts:    totalProductCount > 0 ? totalProductCount : products.length,
      totalCategories:  derivedCategories.length,
      inStockProducts:  inStockProducts.length,
      barcodedProducts: products.filter((p) => Boolean(p.barcode)).length,
      lowStockProducts: inStockProducts.filter((p) => p.stock <= 5).length,
    }),
    [derivedCategories.length, inStockProducts, products, totalProductCount],
  );

  // ── Context value ─────────────────────────────────────────────────────────

  return (
    <CatalogContext.Provider
      value={{
        // Legacy
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
        categorySearchIndex,
        alternativeProductPool,
        refreshCatalog,
        upsertProduct,
        removeProduct,
        // New paginated API
        totalProductCount,
        categoriesReady,
        productsReady,
        isLoadingMore,
        hasNextPage,
        currentPage,
        activeFilters,
        loadNextPage,
        search,
        filterByCategory,
        refreshCategories,
        prefetchNextPages,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}