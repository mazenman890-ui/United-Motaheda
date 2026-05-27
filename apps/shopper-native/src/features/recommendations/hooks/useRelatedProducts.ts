import { useQuery } from "@tanstack/react-query";
import { fetchRelatedProducts } from "../api/recommendationsApi";
import { recommendationKeys } from "../api/queryKeys";

export function useRelatedProducts(productId: string | undefined, limit = 12) {
  return useQuery({
    queryKey: recommendationKeys.related(productId ?? "", limit),
    queryFn:  ({ signal }) => fetchRelatedProducts(productId ?? "", limit, signal),
    enabled:  Boolean(productId),
    staleTime: 5 * 60 * 1000,
  });
}
