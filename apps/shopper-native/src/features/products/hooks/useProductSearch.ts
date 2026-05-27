/**
 * useProductSearch — slim hook for the search suggestion overlay.
 *
 * Different from useInfiniteProducts in three ways:
 *  - Single page, small limit (7 by default) — for instant autocomplete.
 *  - Debounce is longer (300 ms) to avoid search thundering while typing.
 *  - Returns flat array, never paginates. Caller upgrades to the full grid
 *    by using useInfiniteProducts with the same query.
 */

import { useEffect, useMemo, useState } from "react";
import debounce from "lodash.debounce";
import { useQuery } from "@tanstack/react-query";
import { fetchProductsPage } from "../api/productsApi";
import { productKeys } from "../api/queryKeys";
import type { NativeProduct } from "../types";

const SUGGEST_LIMIT = 7;
const SEARCH_DEBOUNCE_MS = 300;

export interface UseProductSearchArgs {
  query:   string;
  limit?:  number;
  /** If false, the query is disabled. Useful for empty-input states. */
  enabled?: boolean;
}

export function useProductSearch({
  query,
  limit  = SUGGEST_LIMIT,
  enabled = true,
}: UseProductSearchArgs): {
  products:  NativeProduct[];
  isLoading: boolean;
  isError:   boolean;
} {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());

  const debouncedSetter = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), SEARCH_DEBOUNCE_MS),
    [],
  );

  useEffect(() => {
    debouncedSetter(query.trim());
  }, [query, debouncedSetter]);

  useEffect(() => {
    return () => {
      debouncedSetter.cancel();
    };
  }, [debouncedSetter]);

  const q = useQuery({
    queryKey: productKeys.search(debouncedQuery),
    queryFn:  ({ signal }) =>
      fetchProductsPage({
        search:   debouncedQuery || undefined,
        page:     1,
        pageSize: limit,
        sortBy:   "relevance",
        signal,
      }),
    enabled:    enabled && debouncedQuery.length > 0,
    staleTime:  60 * 1000,
  });

  return {
    products:  q.data?.products ?? [],
    isLoading: q.isLoading,
    isError:   q.isError,
  };
}
