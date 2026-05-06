/**
 * useCatalogCategorySearch.ts
 *
 * Synchronous, in-memory fuzzy search over the category list.
 * Uses `useDeferredValue` so the category grid remains responsive while
 * the sort runs in a background React pass.
 *
 * ── CHANGE ───────────────────────────────────────────────────────────────────
 * Replaced `.map().filter(Boolean)` + `entry!` non-null assertions with
 * `.flatMap()`, which is both type-safe and avoids the unnecessary intermediate
 * array allocation from the null-producing `.map()`.
 */

import { useDeferredValue, useMemo } from "react";
import {
  type CatalogCategory,
  getCatalogCategorySearchMetadata,
} from "../catalog";
import { fuzzyMatch, fuzzyScore } from "../../utils/fuzzySearch";

function getCategorySearchText(category: CatalogCategory): string {
  const metadata = getCatalogCategorySearchMetadata(category.id);
  return [
    category.descAr,
    category.descEn,
    metadata.aliases.join(" "),
    metadata.keywords.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

export function useCatalogCategorySearch(
  categories: CatalogCategory[],
  query: string,
): CatalogCategory[] {
  const deferredQuery = useDeferredValue(query.trim());

  return useMemo(() => {
    if (!deferredQuery) {
      return categories;
    }

    return categories
      .flatMap((category, index) => {
        const fields = {
          nameAr:   category.name,
          nameEn:   category.nameEn,
          category: getCategorySearchText(category),
        };

        if (!fuzzyMatch(deferredQuery, fields)) return [];

        return [{ category, index, score: fuzzyScore(deferredQuery, fields) }];
      })
      .sort((left, right) => {
        // Primary: fuzzy score (higher = better)
        if (right.score !== left.score) return right.score - left.score;
        // Secondary: category product count (prefer populous categories)
        if (right.category.count !== left.category.count) {
          return right.category.count - left.category.count;
        }
        // Tertiary: original list order (stable for equal score + count)
        return left.index - right.index;
      })
      .map((entry) => entry.category);
  }, [categories, deferredQuery]);
}