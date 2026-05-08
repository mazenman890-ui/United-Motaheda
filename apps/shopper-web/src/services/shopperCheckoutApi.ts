/**
 * shopperCatalogApi.ts
 *
 * Provides two tiers of catalog access:
 *
 * TIER 1 — Legacy full-snapshot helpers (kept for backward-compat):
 *   • getCachedShopperCatalogSnapshot()  — in-memory/localStorage snapshot
 *   • fetchShopperCatalogSnapshot()      — full catalog from catalog.ts pipeline
 *
 * TIER 2 — Paginated / server-side APIs (NEW — used by the refactored context):
 *   • fetchProductsPage()      — 20-row paginated fetch with optional filters
 *   • fetchCategoriesQuick()   — category list only, fast path (< 500 ms)
 *   • searchProducts()         — server-side ilike search with pagination
 *   • fetchProductsByCategory() — category-filtered page
 *   • prefetchProductsPage()   — fire-and-forget background prefetch
 *   • getCachedCategoriesQuick() — synchronous in-memory category read
 *
 * SUPABASE CLIENT PATH
 * --------------------
 * Adjust the import below to match your project layout.
 * Common locations:
 *   ../integrations/supabase/client   (Lovable / Supabase-generated)
 *   ../lib/supabase                   (manual setup)
 *   ../lib/supabaseClient
 *
 * NORMALIZATION
 * -------------
 * This file imports `normalizeSupabaseProduct` from catalog.ts.
 * If that function is not yet exported, add `export` in front of it in catalog.ts.
 *
 * DB COLUMN NAMES (products table)
 * ---------------------------------
 * id, code, barcode, name_ar, name_en, category_id, price,
 * stock, is_active, image_url
 * Adjust `DB_SELECT_COLUMNS` if your schema differs.
 */

import {
  fetchCatalogSnapshot,
  getCachedCatalogSnapshot,
  normalizeSupabaseProduct, // ← export this from catalog.ts if not already
  type CatalogSnapshot,
  type CatalogCategory,
  type CatalogProduct,
} from "../app/catalog";

// ── TODO: adjust this import to match your project ──────────────────────────
import { supabase } from "../integrations/supabase/client";

// ── Constants ────────────────────────────────────────────────────────────────

/** Rows fetched per page.  20 is a good balance: visible in one viewport,
 *  fast to fetch, and leaves room for VirtuosoGrid's overscan buffer. */
const PAGE_SIZE = 20;

const DB_SELECT_COLUMNS =
  "id, code, barcode, name_ar, name_en, category_id, price, stock, is_active, image_url";

// ── In-memory page cache ──────────────────────────────────────────────────────
//
// Keyed by "<page>|<filtersJson>" so different filter combos get separate
// entries.  Lives for the lifetime of the tab — no stale-while-revalidate
// needed at this layer because React Query / the context handles that.

const pageCache = new Map<string, CatalogProduct[]>();

/** In-memory category cache — populated by fetchCategoriesQuick(). */
let categoriesMemoryCache: CatalogCategory[] | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1 — Legacy full-snapshot helpers (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the in-memory or localStorage cached snapshot immediately (sync),
 * or null if nothing is cached yet.
 */
export function getCachedShopperCatalogSnapshot(): CatalogSnapshot | null {
  return getCachedCatalogSnapshot();
}

/**
 * Fetches the full product catalog from Supabase with 1 000-row pagination
 * and normalises every row.  Pass `forceRefresh = true` to skip caches.
 *
 * @deprecated — prefer the Tier 2 paginated APIs for new code.
 */
export async function fetchShopperCatalogSnapshot(
  forceRefresh = false,
): Promise<CatalogSnapshot> {
  return fetchCatalogSnapshot(forceRefresh);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER 2 — Paginated / server-side APIs
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export type ProductFilters = {
  searchQuery?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
};

export type PageResult = {
  products: CatalogProduct[];
  totalCount: number;
  hasNextPage: boolean;
};

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Build a stable cache key from page + filters. */
function pageCacheKey(pageNumber: number, filters?: ProductFilters): string {
  return `${pageNumber}|${JSON.stringify(filters ?? {})}`;
}

/**
 * Apply shared filter clauses to a Supabase query builder.
 * Returns the modified query (Supabase builder is immutable — each method
 * returns a new instance).
 */
function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: ProductFilters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (filters.searchQuery?.trim()) {
    const term = filters.searchQuery.trim();
    // Case-insensitive substring search across both name columns
    query = query.or(`name_ar.ilike.%${term}%,name_en.ilike.%${term}%`);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }

  return query;
}

// ── fetchProductsPage ─────────────────────────────────────────────────────────

/**
 * Fetch a single page of products (PAGE_SIZE items) from Supabase.
 *
 * Responses are cached in-memory for the current tab session so that
 * navigating back to the same page doesn't re-fetch.
 *
 * @param pageNumber - 1-indexed.  Page 1 fetches rows 0–19.
 * @param filters    - Optional server-side filter set.
 */
export async function fetchProductsPage(
  pageNumber: number,
  filters?: ProductFilters,
): Promise<PageResult> {
  const key = pageCacheKey(pageNumber, filters);

  // Serve from memory cache when possible
  const cached = pageCache.get(key);
  if (cached) {
    // We don't store totalCount in the page cache, so we return a sentinel (-1)
    // and let the caller ignore it on cache hits if not critical.
    return { products: cached, totalCount: -1, hasNextPage: cached.length === PAGE_SIZE };
  }

  const from = (pageNumber - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("products")
    .select(DB_SELECT_COLUMNS, { count: "exact" })
    .eq("is_active", true)
    .order("name_ar", { ascending: true })
    .range(from, to);

  if (filters) {
    query = applyFilters(query, filters);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`fetchProductsPage: ${error.message}`);
  }

  const rows = data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = rows.map((row: any) => normalizeSupabaseProduct(row)).filter(Boolean) as CatalogProduct[];
  const totalCount = count ?? products.length;
  const hasNextPage = from + products.length < totalCount;

  pageCache.set(key, products);

  return { products, totalCount, hasNextPage };
}

// ── fetchCategoriesQuick ──────────────────────────────────────────────────────

/**
 * Return categories as fast as possible:
 *
 *  1. In-memory cache hit → synchronous return
 *  2. Legacy snapshot in localStorage → parse + return
 *  3. Fall back to a lightweight Supabase distinct-category query
 *
 * Expected latency: < 200 ms (memory/localStorage) or < 500 ms (network).
 */
export async function fetchCategoriesQuick(): Promise<CatalogCategory[]> {
  // 1. In-memory
  if (categoriesMemoryCache) {
    return categoriesMemoryCache;
  }

  // 2. Legacy snapshot stored by the catalog.ts pipeline
  const snapshot = getCachedCatalogSnapshot();
  if (snapshot?.categories?.length) {
    categoriesMemoryCache = snapshot.categories;
    return categoriesMemoryCache;
  }

  // 3. Network: fetch the full snapshot (categories are derived from seed +
  //    distinct DB values inside catalog.ts — there's no separate categories
  //    table, so the cheapest path is still the snapshot pipeline, which caches
  //    aggressively).  If your schema has a dedicated categories table, replace
  //    this with a direct Supabase query for better isolation.
  const freshSnapshot = await fetchCatalogSnapshot(false);
  categoriesMemoryCache = freshSnapshot.categories;
  return categoriesMemoryCache;
}

// ── getCachedCategoriesQuick ──────────────────────────────────────────────────

/**
 * Synchronous read of the in-memory category cache.
 * Returns null if `fetchCategoriesQuick()` hasn't completed yet.
 */
export function getCachedCategoriesQuick(): CatalogCategory[] | null {
  if (categoriesMemoryCache) return categoriesMemoryCache;

  // Try the legacy snapshot without network
  const snapshot = getCachedCatalogSnapshot();
  if (snapshot?.categories?.length) {
    categoriesMemoryCache = snapshot.categories;
    return categoriesMemoryCache;
  }

  return null;
}

// ── searchProducts ────────────────────────────────────────────────────────────

/**
 * Server-side full-text search using PostgreSQL ILIKE.
 *
 * Searches both `name_ar` and `name_en` columns so bilingual queries work
 * naturally.  Results are paginated — call again with `pageNumber > 1` to
 * load more.
 *
 * @param query       - Search term (raw user input — NOT escaped, Supabase
 *                      handles parameterisation).
 * @param pageNumber  - 1-indexed; defaults to 1.
 * @param filters     - Optional additional filters (category, price range).
 */
export async function searchProducts(
  query: string,
  pageNumber = 1,
  filters?: Omit<ProductFilters, "searchQuery">,
): Promise<{ products: CatalogProduct[]; totalCount: number; hasNextPage: boolean }> {
  return fetchProductsPage(pageNumber, { ...filters, searchQuery: query });
}

// ── fetchProductsByCategory ───────────────────────────────────────────────────

/**
 * Fetch products filtered to a single category with pagination.
 *
 * @param categoryId  - The category ID to filter by (e.g. "cat-antibiotics").
 * @param pageNumber  - 1-indexed page; defaults to 1.
 */
export async function fetchProductsByCategory(
  categoryId: string,
  pageNumber = 1,
): Promise<PageResult> {
  return fetchProductsPage(pageNumber, { categoryId });
}

// ── prefetchProductsPage ──────────────────────────────────────────────────────

/**
 * Silently prefetch a page into the in-memory cache.
 * Designed to be called fire-and-forget — it swallows errors because a
 * prefetch failure is never user-visible (the page will simply be fetched
 * on-demand when the user scrolls to it).
 *
 * @param pageNumber - The page number to prefetch.
 * @param filters    - The same filters that are active in the current view.
 */
export async function prefetchProductsPage(
  pageNumber: number,
  filters?: ProductFilters,
): Promise<void> {
  const key = pageCacheKey(pageNumber, filters);
  if (pageCache.has(key)) return; // already cached

  try {
    await fetchProductsPage(pageNumber, filters);
  } catch {
    // Silently ignore prefetch failures — user-facing fetch will retry
  }
}

// ── invalidatePageCache ───────────────────────────────────────────────────────

/**
 * Clear the in-memory page cache and the category cache.
 * Called by `refreshCatalog(forceRefresh = true)` to ensure stale data is
 * not served.
 */
export function invalidatePageCache(): void {
  pageCache.clear();
  categoriesMemoryCache = null;
}