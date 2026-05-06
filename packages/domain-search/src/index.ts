import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";
import { getApiClient } from "@pharmacy/api-client";
import { emitWorkflowEvent } from "@pharmacy/domain-core";
import { queryKeys } from "@pharmacy/domain-core";
import type { LanguageCode, SearchEnvelope, SearchResultItem } from "@pharmacy/types";

type SearchStoreState = {
  searchQuery: string;
  committedQuery: string;
  setSearchQuery: (value: string) => void;
  commitQuery: (value: string) => void;
};

const useSearchStore = create<SearchStoreState>((set) => ({
  searchQuery: "",
  committedQuery: "",
  setSearchQuery: (value) => set({ searchQuery: value }),
  commitQuery: (value) => set({ searchQuery: value, committedQuery: value.trim() }),
}));

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}

export function useSearchState() {
  return useSearchStore();
}

export function useSearchEnvelope(
  products: SearchResultItem[],
  lang: LanguageCode,
): {
  envelope: SearchEnvelope;
  isLoading: boolean;
  isError: boolean;
  debouncedQuery: string;
} {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const debouncedQuery = useDebouncedValue(searchQuery, 220);
  const apiClient = useMemo(() => getApiClient(), []);

  const query = useQuery({
    queryKey: queryKeys.search(debouncedQuery.trim(), lang),
    queryFn: async ({ signal }) => {
      const nextEnvelope = await apiClient.searchCatalog({
        query: debouncedQuery,
        lang,
        products,
        signal,
      });

      return nextEnvelope;
    },
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (query.data) {
      emitWorkflowEvent("QuoteRefreshed", {
        source: "search-envelope",
        query: debouncedQuery.trim(),
        resultCount: query.data.results.length,
      });
    }
  }, [debouncedQuery, query.data]);

  return {
    envelope: query.data ?? {
      query: debouncedQuery,
      suggestions: [],
      results: products,
      collections: [],
      facets: [],
      updatedAt: new Date().toISOString(),
    },
    isLoading: query.isLoading,
    isError: query.isError,
    debouncedQuery,
  };
}
