/**
 * Loyalty Hub — برنامج المكافآت.
 *
 * Main entry point for the loyalty programme. Shows the user's tier, live
 * balance, active campaigns, quick links to wallet / coupons / gifts / history,
 * recent ledger activity, and tips for earning more points.
 */

import React, { useCallback } from "react";
import { useRouter } from "expo-router";
import { LoyaltyHubScreen } from "@/features/loyalty";

export default function LoyaltyRoute() {
  const router = useRouter();

  const onGoToWallet    = useCallback(() => router.push("/wallet"),           [router]);
  const onGoToCoupons   = useCallback(() => router.push("/coupons"),          [router]);
  const onGoToGifts     = useCallback(() => router.push("/gifts"),            [router]);
  const onGoToHistory   = useCallback(() => router.push("/loyalty-history"),  [router]);
  const onGoToTiers     = useCallback(() => router.push("/tiers"),            [router]);
  const onGoToCampaigns = useCallback(() => router.push("/campaigns"),        [router]);
  const onGoToInvite    = useCallback(() => router.push("/invite"),           [router]);
  const onGoToShop      = useCallback(() => router.push("/(tabs)/products"),  [router]);

  return (
    <LoyaltyHubScreen
      onGoToWallet={onGoToWallet}
      onGoToCoupons={onGoToCoupons}
      onGoToGifts={onGoToGifts}
      onGoToHistory={onGoToHistory}
      onGoToTiers={onGoToTiers}
      onGoToCampaigns={onGoToCampaigns}
      onGoToInvite={onGoToInvite}
      onGoToShop={onGoToShop}
    />
  );
}
