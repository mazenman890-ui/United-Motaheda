import { useQuery } from "@tanstack/react-query";
import { listRedemptions } from "../api/loyaltyApi";
import { loyaltyKeys } from "../api/queryKeys";

export function useRedemptions(enabled = true) {
  return useQuery({
    queryKey: loyaltyKeys.redemptions(),
    queryFn:  ({ signal }) => listRedemptions(signal),
    enabled,
    staleTime: 30 * 1000,
  });
}
