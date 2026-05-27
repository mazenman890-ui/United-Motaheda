import { useQuery } from "@tanstack/react-query";
import { getLoyaltyBalance } from "../api/loyaltyApi";
import { loyaltyKeys } from "../api/queryKeys";

export function useLoyaltyBalance(enabled = true) {
  return useQuery({
    queryKey: loyaltyKeys.balance(),
    queryFn:  ({ signal }) => getLoyaltyBalance(signal),
    enabled,
    // Balance changes only via RPCs; staleTime is intentionally short so
    // a successful mutation that calls invalidate(balance()) refreshes
    // promptly even if the user just hit this screen seconds ago.
    staleTime: 30 * 1000,
  });
}
