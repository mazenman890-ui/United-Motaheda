/**
 * useOffers — Server-paginated feed of active (is_active = true) products.
 *
 * Thin wrapper around useInfiniteProducts with `inStock: true` locked in,
 * so callers get the full offers catalog independent of CatalogContext state.
 * Supports the same search / category / sort filters as useInfiniteProducts.
 */

import {
  useInfiniteProducts,
  type InfiniteProductsFilters,
  type UseInfiniteProductsResult,
} from "./useInfiniteProducts";

export type OffersFilters = Omit<InfiniteProductsFilters, "inStock">;

export function useOffers(filters: OffersFilters = {}): UseInfiniteProductsResult {
  return useInfiniteProducts({ ...filters, inStock: true });
}
