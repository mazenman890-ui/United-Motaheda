import { useQuery } from "@tanstack/react-query";
import { listActiveCampaigns } from "../api/loyaltyApi";
import { loyaltyKeys } from "../api/queryKeys";

export function useActiveCampaigns(enabled = true) {
  return useQuery({
    queryKey: loyaltyKeys.campaigns(),
    queryFn:  ({ signal }) => listActiveCampaigns(signal),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
