import { useQuery } from "@tanstack/react-query";
import { listTiers } from "../api/loyaltyApi";
import { loyaltyKeys } from "../api/queryKeys";

export function useRewardTiers(enabled = true) {
  return useQuery({
    queryKey: loyaltyKeys.tiers(),
    queryFn:  ({ signal }) => listTiers(signal),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}
