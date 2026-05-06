/**
 * shopperCatalogApi.ts
 *
 * Thin wrapper around the canonical catalog pipeline that lives in
 * `../app/catalog`.  This file used to contain a full duplicate of that
 * pipeline (its own Supabase fetch loop, row mapper, cache key, etc.).
 * That duplicate had several silent bugs:
 *
 *   1. `is_active` null default was `false` instead of `true`, so every
 *      product whose DB row had NULL in that column appeared out-of-stock,
 *      collapsing the visible product list to zero.
 *
 *   2. The `category` field was set to the raw DB value (e.g. "الأدوية")
 *      instead of going through `resolveCategory()`, so no product matched a
 *      known seed ID and `buildSpotlightProducts` produced an empty array.
 *
 *   3. The cache was keyed separately from `catalog.ts` (`v1`/`v2` vs `v6`),
 *      so stale objects with the old `isActive` shape were always served on
 *      page load, bypassing any live-fetch fix.
 *
 * The correct implementation already exists in `catalog.ts`:
 *   • `fetchCatalogSnapshot`      – paginated Supabase fetch + normalisation
 *   • `getCachedCatalogSnapshot`  – in-memory + localStorage read
 *
 * This file now re-exports those two functions under the names that
 * `CatalogContext.tsx` already imports, so no other file needs to change.
 */

import {
  fetchCatalogSnapshot,
  getCachedCatalogSnapshot,
  type CatalogSnapshot,
} from "../app/catalog";

/**
 * Returns the in-memory or localStorage cached snapshot immediately (sync),
 * or null if nothing is cached yet.
 *
 * Delegates to `getCachedCatalogSnapshot` from `catalog.ts`, which uses the
 * correct cache key `"united-pharmacies-catalog-v6"` and the fully-validated
 * `CatalogProduct` shape (including `inStock: boolean`).
 */
export function getCachedShopperCatalogSnapshot(): CatalogSnapshot | null {
  return getCachedCatalogSnapshot();
}

/**
 * Fetches the full product catalog from Supabase with 1 000-row pagination,
 * normalises every row via `normalizeSupabaseProduct` (which handles NULL
 * `is_active`, resolves category slugs, deduplicates, and sorts), then caches
 * the result in both memory and localStorage.
 *
 * Pass `forceRefresh = true` to bypass both caches and re-fetch from the DB.
 *
 * Delegates to `fetchCatalogSnapshot` from `catalog.ts`.
 */
export async function fetchShopperCatalogSnapshot(
  forceRefresh = false,
): Promise<CatalogSnapshot> {
  return fetchCatalogSnapshot(forceRefresh);
}