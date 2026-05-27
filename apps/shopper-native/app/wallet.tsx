/**
 * Wallet route — wraps the production-grade LoyaltyWalletScreen from the
 * loyalty feature module. Navigate here via `/wallet`.
 */

import React, { useCallback } from "react";
import { useRouter } from "expo-router";
import { LoyaltyWalletScreen } from "@/features/loyalty";

export default function WalletRoute() {
  const router = useRouter();

  const onBrowseCoupons   = useCallback(() => router.push("/coupons"),              [router]);
  const onBrowseGifts     = useCallback(() => router.push("/gifts"),                [router]);
  const onViewHistory     = useCallback(() => router.push("/loyalty-history"),      [router]);
  const onViewRedemptions = useCallback(() => router.push("/redemption-history"),   [router]);

  // "Earn points" / "تسوق الآن" → shop home tab
  const onEarnPoints = useCallback(() => router.push("/(tabs)"), [router]);

  return (
    <LoyaltyWalletScreen
      onBrowseCoupons={onBrowseCoupons}
      onBrowseGifts={onBrowseGifts}
      onViewHistory={onViewHistory}
      onEarnPoints={onEarnPoints}
      onViewRedemptions={onViewRedemptions}
    />
  );
}
