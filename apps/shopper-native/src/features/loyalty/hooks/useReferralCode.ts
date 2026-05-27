import { useQuery } from "@tanstack/react-query";
import { getReferralCode, listReferralRewards } from "../api/loyaltyApi";
import type { ReferralCode, ReferralReward } from "../types";

export function useReferralCode(enabled = true) {
  return useQuery<ReferralCode | null>({
    queryKey: ["referral-code"],
    queryFn:  ({ signal }) => getReferralCode(signal),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime:    20 * 60 * 1000,
    retry:     1,
  });
}

export function useReferralRewards(enabled = true) {
  return useQuery<ReferralReward[]>({
    queryKey: ["referral-rewards"],
    queryFn:  ({ signal }) => listReferralRewards(20, 0, signal),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
    retry:     1,
  });
}
