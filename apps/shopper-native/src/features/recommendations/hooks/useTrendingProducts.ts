import { useQuery } from "@tanstack/react-query";
import { fetchTrendingProducts } from "../api/recommendationsApi";
import { recommendationKeys } from "../api/queryKeys";

export function useTrendingProducts(category: string | null = null, limit = 12) {
  return useQuery({
    queryKey: recommendationKeys.trending(category, limit),
    queryFn:  ({ signal }) => fetchTrendingProducts(category, limit, signal),
    staleTime: 5 * 60 * 1000,
  });
}
