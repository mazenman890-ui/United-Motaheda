import { useQuery } from "@tanstack/react-query";
import { listCouponBatches } from "../api/loyaltyApi";
import { loyaltyKeys } from "../api/queryKeys";

export function useCouponBatches(enabled = true) {
  return useQuery({
    queryKey: loyaltyKeys.couponBatches(),
    queryFn:  ({ signal }) => listCouponBatches(signal),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
