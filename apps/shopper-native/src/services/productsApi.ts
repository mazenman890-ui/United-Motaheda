/**
 * @deprecated Compatibility shim — re-exports from `@/features/products`.
 *
 * All real product logic lives in `src/features/products/`. New code should
 * import directly from there. This file exists so the existing call sites
 * (ProductCard, wishlist store, screens) compile without changes during the
 * Phase 5 modular migration.
 *
 * Once the remaining screens have been migrated to the feature module
 * directly, delete this file and update the imports.
 */

import {
  fetchProductsPage,
  type FetchProductsArgs,
} from "@/features/products/api/productsApi";
import type { ProductPage } from "@/features/products/types";

export type {
  NativeProduct,
  NativeCategory,
  ProductFilters,
  ProductSortMode,
  ProductPage as PageResult,
} from "@/features/products/types";

export {
  fetchProductById,
  fetchFeaturedProducts,
  fetchCategories,
  fetchCatalogStats,
} from "@/features/products/api/productsApi";

export type { CatalogStats } from "@/features/products/api/productsApi";

/**
 * Legacy entry point preserved for callers that haven't been migrated to
 * `fetchProductsPage` / `useInfiniteProducts` yet. Same contract as before:
 * single-page, returns PageResult.
 */
export function fetchProducts(args: FetchProductsArgs = {}): Promise<ProductPage> {
  return fetchProductsPage(args);
}
