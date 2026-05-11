/**
 * HIGH-PERFORMANCE SHOPPER CATALOG API
 *
 * Optimized for 52 000+ product catalogs with:
 * - Full snapshot loading via catalog.ts (1 000-row Supabase pagination under the hood)
 * - Server-side search and filtering for the paginated view (sub-3 s first paint)
 * - Non-blocking architecture with skeleton UI support
 * - Layered caching: in-memory LRU → localStorage slim-index → live Supabase fetch
 * - Automatic background refresh on stale cache
 */

import { getSupabaseClient } from "../lib/supabaseClient";
import {
  fetchCatalogSnapshot,
  getCachedCatalogSnapshot,
  type CatalogSnapshot,
  type CatalogProduct,
  type CatalogCategory,
  normalizeSupabaseProduct,
} from "../app/catalog";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductFilters {
  searchQuery?: string;
  categoryId?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price_asc" | "price_desc" | "name" | "relevant";
}

export interface PageResult {
  products: CatalogProduct[];
  totalCount: number;
  hasNextPage: boolean;
  currentPage: number;
  pageSize: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Products per page — fits common grid layouts (6×4, 8×3, 4×6). */
const PAGE_SIZE = 24;

/** Maximum pages to keep in the in-memory LRU page cache. */
const MAX_CACHE_SIZE = 50;

/** localStorage key for the category list (separate, lightweight entry). */
const CATEGORY_CACHE_KEY = "united-pharmacies-categories-v3";

/** 30-minute TTL for category localStorage cache (categories rarely change). */
const CATEGORY_CACHE_TTL_MS = 30 * 60 * 1000;

// ─── In-memory LRU Page Cache ─────────────────────────────────────────────────

interface CacheEntry {
  data: PageResult;
  timestamp: number;
  filtersHash: string;
}

class PageCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxSize = MAX_CACHE_SIZE;

  private getCacheKey(page: number, filters: ProductFilters): string {
    return `${page}:${this.hashFilters(filters)}`;
  }

  private hashFilters(filters: ProductFilters): string {
    return JSON.stringify({
      searchQuery: filters.searchQuery?.toLowerCase() ?? "",
      categoryId: filters.categoryId ?? "",
      inStock: filters.inStock ?? false,
      minPrice: filters.minPrice ?? 0,
      maxPrice: filters.maxPrice ?? 0,
    });
  }

  get(page: number, filters: ProductFilters): PageResult | null {
    const key = this.getCacheKey(page, filters);
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Filtered results expire sooner than baseline (unfiltered) results.
    const ttl =
      filters.searchQuery || filters.categoryId ? 5 * 60 * 1000 : 15 * 60 * 1000;
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    // Promote to most-recently-used position: delete then re-insert so that
    // Map's insertion-order reflects recency for LRU eviction in `set()`.
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(page: number, filters: ProductFilters, data: PageResult): void {
    const key = this.getCacheKey(page, filters);

    // If the key already exists, remove it first so re-insertion moves it to
    // the most-recently-used (tail) position before the size check.
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // LRU eviction: drop the least-recently-used (head) entry when full.
    if (this.cache.size >= this.maxSize) {
      const lruKey = this.cache.keys().next().value;
      if (lruKey !== undefined) this.cache.delete(lruKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      filtersHash: this.hashFilters(filters),
    });
  }

  /** Evict every entry for the given filter combination. */
  invalidateFilters(filters: ProductFilters): void {
    const hash = this.hashFilters(filters);
    // Collect keys first to avoid mutating the Map while iterating it.
    const keysToDelete: string[] = [];
    for (const [key, entry] of this.cache) {
      if (entry.filtersHash === hash) keysToDelete.push(key);
    }
    for (const key of keysToDelete) this.cache.delete(key);
  }

  /** Evict the entire cache (e.g. after a forced catalog refresh). */
  invalidateAll(): void {
    this.cache.clear();
  }
}

const pageCache = new PageCache();

// ─── Supabase Type Helper ─────────────────────────────────────────────────────

/**
 * `SupabaseClient` is used to type the `supabase` parameter of
 * `buildSupabaseQuery`.  We intentionally do NOT alias the return type of
 * `.from()` here — `.from("products")` returns a `PostgrestQueryBuilder`,
 * but the moment `.select()` is called the chain narrows to a
 * `PostgrestFilterBuilder` which carries `data`, `error`, and `count`.
 * Annotating the builder return type as `PostgrestQueryBuilder` causes TS to
 * lose those members (errors TS2339) and to complain about the missing
 * mutating methods (`insert`, `upsert`, `update`, `delete` — TS2739).
 * We therefore let TypeScript infer the return type of `buildSupabaseQuery`
 * from its implementation, which gives the correct `PostgrestFilterBuilder`.
 */
type SupabaseClient = ReturnType<typeof getSupabaseClient>;

// ─── Server-side Query Builder ────────────────────────────────────────────────

/**
 * Constructs a Supabase query with server-side search, filtering, sorting, and
 * pagination applied.
 *
 * The return type is intentionally inferred (not annotated). Calling
 * `.select()` on a `PostgrestQueryBuilder` narrows the chain to a
 * `PostgrestFilterBuilder`, which is what callers need to `await` for
 * `{ data, error, count }`. Annotating it as `PostgrestQueryBuilder` would
 * cause TS errors 2739 and 2339 — see the type comment above.
 *
 * Category filtering note: the products table stores categories as free-text in
 * `Category_Name` / `Category_Name_En`. True slug-based filtering (e.g.
 * `category_id = 'medications'`) requires a computed `category_id` column to be
 * added to the DB. Until then this function uses a case-insensitive `ilike`
 * match on both name columns, derived from the cached snapshot.
 */
function buildSupabaseQuery(
  supabase: SupabaseClient,
  filters: ProductFilters,
  page: number,
  pageSize: number,
) {
  // `.select()` returns PostgrestFilterBuilder — inferred, not cast.
  let query = supabase
    .from("products")
    .select("*", { count: "exact" });

  // Full-text search across name (AR + EN), product code, and barcode.
  if (filters.searchQuery) {
    const term = `%${filters.searchQuery.toLowerCase()}%`;
    query = query.or(
      [
        `Name_Ar.ilike.${term}`,
        `Name_En.ilike.${term}`,
        `Code.ilike.${term}`,
        `Barcode.ilike.${term}`,
      ].join(","),
    );
  }

  // Category filtering via display-name matching (AR + EN).
  // Resolves the slug to its human-readable names using the in-memory snapshot
  // so the query hits the actual DB columns without requiring a schema change.
  if (filters.categoryId) {
    const cachedCategory = getCachedCatalogSnapshot()?.categories.find(
      (c) => c.id === filters.categoryId,
    );

    if (cachedCategory) {
      const arName = `%${cachedCategory.name}%`;
      const enName = `%${cachedCategory.nameEn}%`;
      query = query.or(
        `Category_Name.ilike.${arName},Category_Name_En.ilike.${enName}`,
      );
    }
    // If the snapshot is not yet loaded, the category filter is skipped for
    // this request and will apply correctly on subsequent calls once the
    // snapshot is warm. Callers should warm the cache before paginated queries.
  }

  // Stock availability filter.
  // Note: `is_active` reflects whether the product is listed/enabled in the
  // catalog — confirm with the DB schema if true stock-level filtering is needed.
  if (filters.inStock !== undefined) {
    query = query.eq("is_active", filters.inStock);
  }

  // Price range filters.
  if (filters.minPrice !== undefined) {
    query = query.gte("Price", filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte("Price", filters.maxPrice);
  }

  // Sort order — default: in-stock first, then alphabetical by English name.
  if (filters.sortBy === "price_asc") {
    query = query.order("Price", { ascending: true });
  } else if (filters.sortBy === "price_desc") {
    query = query.order("Price", { ascending: false });
  } else if (filters.sortBy === "name") {
    query = query.order("Name_En", { ascending: true });
  } else {
    query = query
      .order("is_active", { ascending: false })
      .order("Name_En", { ascending: true });
  }

  // Pagination window.
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  return query;
}

// ─── localStorage Helpers ─────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeLocalStorageGet(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // QuotaExceededError — silently ignore.
  }
}

function safeLocalStorageRemove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the in-memory or localStorage cached snapshot immediately (sync),
 * or `null` if nothing is cached yet.
 *
 * Delegates to `getCachedCatalogSnapshot` from `catalog.ts`, which owns the
 * authoritative cache key and validates the `CatalogProduct` shape on read.
 */
export function getCachedShopperCatalogSnapshot(): CatalogSnapshot | null {
  return getCachedCatalogSnapshot();
}

/**
 * PRIMARY CATALOG FETCH — loads all 52 000+ products with maximum performance.
 *
 * Architecture:
 * 1. In-memory snapshot cache (instantaneous — zero network).
 * 2. localStorage slim-index (< 5 ms, survives page reload).
 * 3. Live Supabase fetch with automatic 1 000-row pagination.
 *
 * All caching, deduplication, normalization, and sorting are handled by
 * `catalog.ts`.  This function is a thin, error-recovering facade.
 *
 * @param forceRefresh — bypass all caches and re-fetch from the database.
 */
export async function fetchShopperCatalogSnapshot(
  forceRefresh = false,
): Promise<CatalogSnapshot> {
  // 1. Serve from in-memory / localStorage cache when possible.
  if (!forceRefresh) {
    const cached = getCachedShopperCatalogSnapshot();
    if (cached) return cached;
  }

  try {
    // 2. Fetch, normalize, deduplicate, and cache via catalog.ts.
    return await fetchCatalogSnapshot(forceRefresh);
  } catch (error) {
    console.error("[shopperCatalogApi] fetchShopperCatalogSnapshot failed:", error);

    // 3. Fallback to any stale cache rather than crashing the UI.
    const stale = getCachedShopperCatalogSnapshot();
    if (stale) {
      console.warn("[shopperCatalogApi] Serving stale cache due to fetch error.");
      return stale;
    }

    throw error;
  }
}

/**
 * Fetch a single page of products with server-side filtering and pagination.
 *
 * Results are kept in the in-memory LRU page cache (TTL: 5 min for filtered
 * results, 15 min for unfiltered).
 */
export async function fetchProductsPage(
  pageNumber: number,
  filters: ProductFilters = {},
): Promise<PageResult> {
  const cached = pageCache.get(pageNumber, filters);
  if (cached) return cached;

  const supabase = getSupabaseClient();
  const query = buildSupabaseQuery(supabase, filters, pageNumber, PAGE_SIZE);

  // `query` is a PostgrestFilterBuilder — awaiting it yields { data, error, count }.
  const { data, error, count } = await query;

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (!data || !Array.isArray(data)) {
    throw new Error("Invalid data shape received from Supabase.");
  }

  const products: CatalogProduct[] = (data as Record<string, unknown>[])
    .map((row, index) => {
      const sourceRow = (pageNumber - 1) * PAGE_SIZE + index + 2;
      return normalizeSupabaseProduct(row, sourceRow);
    })
    .filter((p): p is CatalogProduct => p !== null);

  const totalCount = count ?? 0;
  const pageResult: PageResult = {
    products,
    totalCount,
    hasNextPage: totalCount > pageNumber * PAGE_SIZE,
    currentPage: pageNumber,
    pageSize: PAGE_SIZE,
  };

  pageCache.set(pageNumber, filters, pageResult);
  return pageResult;
}

/**
 * Return the catalog's category list as quickly as possible.
 *
 * Priority order:
 * 1. In-memory snapshot (already loaded → zero cost).
 * 2. localStorage category cache (persists across page reloads, 30-min TTL).
 * 3. Full catalog snapshot fetch (warms all caches for subsequent calls).
 *
 * Categories are derived from the actual product set (with accurate counts) so
 * they are always consistent with the loaded data.
 */
export async function fetchCategoriesQuick(): Promise<CatalogCategory[]> {
  // 1. In-memory snapshot is the fastest source and is always consistent.
  const liveSnapshot = getCachedCatalogSnapshot();
  if (liveSnapshot?.categories.length) return liveSnapshot.categories;

  // 2. Lightweight localStorage cache for instant render before the full
  //    snapshot is loaded.
  const localCategories = readCachedCategories();
  if (localCategories) return localCategories;

  // 3. Fetch the full snapshot (also populates the in-memory and slim-index
  //    caches in catalog.ts for subsequent calls).
  const snapshot = await fetchShopperCatalogSnapshot();
  writeCachedCategories(snapshot.categories);
  return snapshot.categories;
}

/**
 * Return the locally-cached category list synchronously, or `null` if the
 * cache is absent or expired.
 */
export function getCachedCategoriesQuick(): CatalogCategory[] | null {
  // Prefer the in-memory snapshot (always consistent, no serialisation cost).
  const liveSnapshot = getCachedCatalogSnapshot();
  if (liveSnapshot?.categories.length) return liveSnapshot.categories;

  return readCachedCategories();
}

/**
 * Prefetch a page into the in-memory cache (fire-and-forget).
 * Errors are silently swallowed — this is a best-effort optimisation.
 */
export async function prefetchProductsPage(
  pageNumber: number,
  filters: ProductFilters = {},
): Promise<void> {
  try {
    await fetchProductsPage(pageNumber, filters);
  } catch {
    // Intentionally silent.
  }
}

/**
 * Invalidate the entire in-memory page cache (e.g. after a forced catalog
 * refresh or a cart/stock mutation).
 */
export function invalidatePageCache(): void {
  pageCache.invalidateAll();
}

/**
 * Invalidate only the cached pages that match the given filter combination.
 */
export function invalidateFiltersCache(filters: ProductFilters): void {
  pageCache.invalidateFilters(filters);
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

interface CachedCategories {
  categories: CatalogCategory[];
  timestamp: number;
}

function readCachedCategories(): CatalogCategory[] | null {
  const raw = safeLocalStorageGet(CATEGORY_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed: CachedCategories = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.timestamp !== "number" ||
      !Array.isArray(parsed.categories)
    ) {
      safeLocalStorageRemove(CATEGORY_CACHE_KEY);
      return null;
    }

    if (Date.now() - parsed.timestamp > CATEGORY_CACHE_TTL_MS) {
      safeLocalStorageRemove(CATEGORY_CACHE_KEY);
      return null;
    }

    return parsed.categories;
  } catch {
    safeLocalStorageRemove(CATEGORY_CACHE_KEY);
    return null;
  }
}

function writeCachedCategories(categories: CatalogCategory[]): void {
  const payload: CachedCategories = { categories, timestamp: Date.now() };
  safeLocalStorageSet(CATEGORY_CACHE_KEY, JSON.stringify(payload));
}