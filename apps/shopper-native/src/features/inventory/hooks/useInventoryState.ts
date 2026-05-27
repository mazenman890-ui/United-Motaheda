import { useQuery } from "@tanstack/react-query";
import { fetchInventoryState } from "../api/inventoryApi";
import { inventoryKeys } from "../api/queryKeys";

/**
 * Live availability lookup for a single product. staleTime is intentionally
 * short — a checkout decision must never lean on a >30s-old number. The RPC
 * re-validates atomically on commit anyway, so this is for UI hints only.
 */
export function useInventoryState(productId: string | undefined, enabled = true) {
  return useQuery({
    queryKey:  inventoryKeys.state(productId ?? ""),
    queryFn:   ({ signal }) => fetchInventoryState(productId ?? "", signal),
    enabled:   enabled && Boolean(productId),
    staleTime: 15 * 1000,
  });
}
