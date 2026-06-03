import React, { useCallback, useEffect, useState } from "react";
import { Platform, RefreshControl, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { theme } from "@/shared/theme";
import { Text } from "@/shared/ui";
import { useScreenTrace } from "@/features/observability";
import { useAuth } from "@/features/auth/context";
import { useLoyaltyBalance } from "../hooks/useLoyaltyBalance";
import { useUserCoupons }    from "../hooks/useUserCoupons";
import { useRedemptions }    from "../hooks/useRedemptions";
import { useRewardTiers }    from "../hooks/useRewardTiers";
import type { LoyaltyBalance, RewardTier } from "../types";
import { BalanceHero }               from "../components/wallet/BalanceHero";
import { WalletQuickActions }        from "../components/wallet/WalletQuickActions";
import { WalletCouponsSection, SectionHeader } from "../components/wallet/WalletCouponsSection";
import { WalletRedemptionsSection }  from "../components/wallet/WalletRedemptionsSection";
import { WalletTourModal }           from "../components/wallet/WalletTourModal";
import {
  ScreenHeader,
  WalletSkeleton,
  ErrorPanel,
  UnauthPanel,
} from "../components/wallet/WalletSharedViews";
import { feedbackStyles as fs } from "../components/wallet/wallet.styles";

const TOUR_SEEN_KEY = "loyalty_tour_seen_v1";

export interface LoyaltyWalletScreenProps {
  title?:             string;
  onBrowseCoupons?:   () => void;
  onBrowseGifts?:     () => void;
  onViewHistory?:     () => void;
  onEarnPoints?:      () => void;
  onViewRedemptions?: () => void;
}

export function LoyaltyWalletScreen({
  title,
  onBrowseCoupons,
  onBrowseGifts,
  onViewHistory,
  onEarnPoints,
  onViewRedemptions,
}: LoyaltyWalletScreenProps) {
  useScreenTrace("loyalty-wallet");
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const { t }    = useTranslation();
  const isAuthed = !!user;

  const balance = useLoyaltyBalance(isAuthed);
  const coupons = useUserCoupons(isAuthed);
  const redeems = useRedemptions(isAuthed);
  const tiers   = useRewardTiers(isAuthed);

  const [tourVisible, setTourVisible] = useState(false);
  const [tourStep,    setTourStep]    = useState(0);

  useEffect(() => {
    if (!isAuthed) return;
    AsyncStorage.getItem(TOUR_SEEN_KEY)
      .then((seen) => { if (!seen) setTourVisible(true); })
      .catch(() => {});
  }, [isAuthed]);

  const dismissTour = useCallback(async () => {
    setTourVisible(false);
    setTourStep(0);
    await AsyncStorage.setItem(TOUR_SEEN_KEY, "1").catch(() => {});
  }, []);

  const advanceTour = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    setTourStep((s) => {
      if (s < 3) return s + 1;
      void dismissTour();
      return s;
    });
  }, [dismissTour]);

  const refreshing =
    (balance.isFetching && !balance.isLoading) ||
    (coupons.isFetching && !coupons.isLoading);

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void balance.refetch();
    void coupons.refetch();
    void redeems.refetch();
    void tiers.refetch();
  }, [balance, coupons, redeems, tiers]);

  const resolvedTitle = title ?? t("loyalty.walletTitle");

  if (!isAuthed) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title={resolvedTitle} />
        <UnauthPanel />
      </View>
    );
  }

  if (balance.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title={resolvedTitle} />
        <WalletSkeleton />
      </View>
    );
  }

  if (balance.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title={resolvedTitle} />
        <ErrorPanel onRetry={onRefresh} />
      </View>
    );
  }

  const bal         = balance.data!;
  const tierList    = tiers.data ?? [];
  const currentTier = tierList.find((tier) => tier.id === bal.tier_id) ?? null;
  const nextTier    = getNextTier(bal, tierList);
  const tierProgress = getTierProgress(bal, currentTier, nextTier);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <WalletTourModal
        visible={tourVisible}
        step={tourStep}
        onNext={advanceTour}
        onSkip={dismissTour}
      />

      <ScreenHeader title={resolvedTitle} onTourPress={() => setTourVisible(true)} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            accessibilityLabel={t("loyalty.walletRefreshA11y")}
          />
        }
        showsVerticalScrollIndicator={false}>

        <BalanceHero
          balance={bal}
          currentTier={currentTier}
          nextTier={nextTier}
          progress={tierProgress}
        />

        <WalletQuickActions
          onEarn={onEarnPoints}
          onCoupons={onBrowseCoupons}
          onGifts={onBrowseGifts}
          onHistory={onViewHistory}
          onRedemptions={onViewRedemptions}
        />

        {bal.frozen && (
          <View style={fs.frozenBanner} accessibilityRole="alert">
            <Ionicons name="lock-closed" size={16} color={theme.colors.rose[700]} />
            <Text style={fs.frozenText}>{t("loyalty.walletFrozenMsg")}</Text>
          </View>
        )}

        <SectionHeader
          title={t("loyalty.walletMyCoupons")}
          icon="pricetag-outline"
          onSeeAll={onBrowseCoupons}
        />
        <WalletCouponsSection
          isLoading={coupons.isLoading}
          isError={coupons.isError}
          coupons={coupons.data ?? []}
          onRetry={() => void coupons.refetch()}
          onBrowse={onBrowseCoupons}
        />

        <SectionHeader
          title={t("loyalty.walletPendingGifts")}
          icon="gift-outline"
          onSeeAll={onViewRedemptions}
        />
        <WalletRedemptionsSection
          isLoading={redeems.isLoading}
          isError={redeems.isError}
          redemptions={redeems.data ?? []}
          onRetry={() => void redeems.refetch()}
          onViewAll={onViewRedemptions}
        />

      </ScrollView>
    </View>
  );
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────

function getNextTier(balance: LoyaltyBalance, tierList: RewardTier[]): RewardTier | null {
  if (!tierList.length) return null;
  const sorted = [...tierList].sort((a, b) => a.min_lifetime_points - b.min_lifetime_points);
  return sorted.find((t) => t.min_lifetime_points > balance.lifetime_earned) ?? null;
}

function getTierProgress(
  balance:  LoyaltyBalance,
  current:  RewardTier | null,
  next:     RewardTier | null,
): number {
  if (!next) return 1;
  const from  = current?.min_lifetime_points ?? 0;
  const range = next.min_lifetime_points - from;
  if (range <= 0) return 1;
  return Math.max(0, Math.min(1, (balance.lifetime_earned - from) / range));
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
});

export default LoyaltyWalletScreen;
