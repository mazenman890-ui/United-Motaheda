/**
 * useCatalogFilters.ts
 *
 * Price-range utilities
 * ─────────────────────
 * `getMaxPrice` / `getMinPrice` use a plain `for` loop instead of
 * `Math.max(...products.map(p => p.price))`.
 *
 * Spreading 52 K values into a variadic call exceeds V8's argument-count limit
 * and risks a "Maximum call stack size exceeded" error.  The iterative
 * approach is O(n) with O(1) memory and never touches the call stack.
 */

import { useMemo } from "react";
import type { CatalogProduct } from "../catalog";
import { getLocalizedProductName } from "../localization";
import { fuzzyMatch } from "../../utils/fuzzySearch";

// ─── Public types ─────────────────────────────────────────────────────────────

export type CatalogSort = "featured" | "price_asc" | "price_desc" | "name";

export type CatalogFilters = {
  category?: string;
  onlyInStock?: boolean;
  query?: string;
  sort?: CatalogSort;
};

// ─── Price-range utilities (safe for arbitrarily large arrays) ────────────────

/**
 * Returns the highest `price` in `products`, or `0` when the array is empty.
 *
 * Uses a `for` loop instead of `Math.max(...array)` to avoid the V8
 * maximum-argument-count restriction that fires at ~65 K spread elements.
 */
export function getMaxPrice(products: CatalogProduct[]): number {
  if (products.length === 0) return 0;

  let max = products[0].price;
  for (let i = 1; i < products.length; i++) {
    if (products[i].price > max) max = products[i].price;
  }
  return max;
}

/**
 * Returns the lowest `price` in `products`, or `0` when the array is empty.
 */
export function getMinPrice(products: CatalogProduct[]): number {
  if (products.length === 0) return 0;

  let min = products[0].price;
  for (let i = 1; i < products.length; i++) {
    if (products[i].price < min) min = products[i].price;
  }
  return min;
}

/**
 * Returns `getMaxPrice` rounded up to the nearest `step` (default 50).
 * Mirrors the `Math.ceil(max / 50) * 50` pattern used in Products.tsx but
 * without the dangerous spread.
 *
 * @example
 * getMaxPriceCeiled(products, 50) // → 2_350 instead of 2_318.5
 */
export function getMaxPriceCeiled(products: CatalogProduct[], step = 50): number {
  const raw = getMaxPrice(products);
  return Math.ceil(raw / step) * step;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function normalizeQuery(value: string | undefined): string {
  return value?.trim() ?? "";
}

function matchesQuery(product: CatalogProduct, query: string): boolean {
  if (!query) return true;

  return fuzzyMatch(query, {
    nameAr: product.nameAr ?? product.name,
    nameEn: product.nameEn ?? product.name,
    code: product.code,
    barcode: product.barcode,
    category: product.categoryName,
  });
}

// ─── Core filter + sort logic ─────────────────────────────────────────────────

export function filterCatalogProducts(
  products: CatalogProduct[],
  filters: CatalogFilters,
): CatalogProduct[] {
  const query = normalizeQuery(filters.query);

  const filteredProducts = products.filter((product) => {
    if (
      filters.category &&
      filters.category !== "all" &&
      product.category !== filters.category
    ) {
      return false;
    }

    if (filters.onlyInStock && !product.inStock) return false;

    return matchesQuery(product, query);
  });

  return [...filteredProducts].sort((left, right) => {
    if (filters.sort === "price_asc") return left.price - right.price;
    if (filters.sort === "price_desc") return right.price - left.price;

    if (filters.sort === "name") {
      return getLocalizedProductName(left, "en").localeCompare(
        getLocalizedProductName(right, "en"),
        "en",
      );
    }

    // "featured" — query-aware relevance sort
    const leftStartsQuery = query
      ? Number(
          getLocalizedProductName(left, "en")
            .toLowerCase()
            .startsWith(query.toLowerCase()),
        )
      : 0;
    const rightStartsQuery = query
      ? Number(
          getLocalizedProductName(right, "en")
            .toLowerCase()
            .startsWith(query.toLowerCase()),
        )
      : 0;

    if (rightStartsQuery !== leftStartsQuery) return rightStartsQuery - leftStartsQuery;
    if (Number(right.inStock) !== Number(left.inStock)) {
      return Number(right.inStock) - Number(left.inStock);
    }
    if (right.stock !== left.stock) return right.stock - left.stock;
    if (left.price !== right.price) return left.price - right.price;

    return left.name.localeCompare(right.name, "en");
  });
}

// ─── React hook ───────────────────────────────────────────────────────────────

export function useCatalogFilters(
  products: CatalogProduct[],
  filters: CatalogFilters,
): CatalogProduct[] {
  return useMemo(
    () => filterCatalogProducts(products, filters),
    [filters, products],
  );
}