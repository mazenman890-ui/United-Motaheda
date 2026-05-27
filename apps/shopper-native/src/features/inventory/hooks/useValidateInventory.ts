import { useQuery } from "@tanstack/react-query";
import { validateInventory } from "../api/inventoryApi";
import { inventoryKeys } from "../api/queryKeys";

export interface UseValidateInventoryArgs {
  productId:  string | undefined;
  quantity:   number;
  enabled?:   boolean;
}

/**
 * Read-only RPC. Returns { ok, available, ... }. Use this from any UI that
 * needs to surface "can I add 3 of X to my cart?" without taking a hold on
 * the stock — for that, call useReserveInventory instead.
 */
export function useValidateInventory({ productId, quantity, enabled = true }: UseValidateInventoryArgs) {
  return useQuery({
    queryKey: inventoryKeys.validation(productId ?? "", quantity),
    queryFn:  ({ signal }) => validateInventory(productId ?? "", quantity, signal),
    enabled:  enabled && Boolean(productId) && quantity > 0,
    staleTime: 10 * 1000,
  });
}
