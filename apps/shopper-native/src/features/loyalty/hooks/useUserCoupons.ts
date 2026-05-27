import { useQuery } from "@tanstack/react-query";
import { listUserCoupons } from "../api/loyaltyApi";
import { loyaltyKeys } from "../api/queryKeys";

export function useUserCoupons(enabled = true) {
  return useQuery({
    queryKey: loyaltyKeys.userCoupons(),
    queryFn:  ({ signal }) => listUserCoupons(signal),
    enabled,
    staleTime: 60 * 1000,
  });
}
