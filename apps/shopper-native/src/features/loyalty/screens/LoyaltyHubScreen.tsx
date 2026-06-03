/**
 * LoyaltyHubScreen — thin orchestrator.
 *
 * All UI lives in src/features/loyalty/components/hub/.
 * All queries fire in parallel on mount — no sequential waterfall.
 * Each section owns its own loading/error state, so the screen never
 * blocks render waiting for a single query to settle.
 *
 * Balance counter: 100% UI-thread via Reanimated (see LoyaltyPointsCard).
 * Campaigns list:  FlashList (see CampaignsBanner).
 * Header:          SubScreenHeader — matches all other loyalty sub-screens.
 */

import React, { useCallback, useMemo } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { useScreenTrace } from "@/features/observability";
import { useAuth } from "@/features/auth/context";

import { useLoyaltyBalance }  from "../hooks/useLoyaltyBalance";
import { useRewardTiers }     from "../hooks/useRewardTiers";
import { useActiveCampaigns } from "../hooks/useActiveCampaigns";
import { useLoyaltyHistory }  from "../hooks/useLoyaltyHistory";

import { SubScreenHeader }    from "../components/SubScreenHeader";
import { LoyaltyPointsCard }  from "../components/hub/LoyaltyPointsCard";
import { TierProgress }       from "../components/hub/TierProgress";
import { CampaignsBanner }    from "../components/hub/CampaignsBanner";
import { QuickDestinations }  from "../components/hub/QuickDestinations";
import { RecentActivity }     from "../components/hub/RecentActivity";
import { WaysToEarn }         from "../components/hub/WaysToEarn";
import { screenStyles }       from "../components/hub/hub.styles";

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface LoyaltyHubScreenProps {
  onGoToWallet?:    () => void;
  onGoToCoupons?:   () => void;
  onGoToGifts?:     () => void;
  onGoToHistory?:   () => void;
  onGoToTiers?:     () => void;
  onGoToCampaigns?: () => void;
  onGoToInvite?:    () => void;
  onGoToShop?:      () => void;
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export function LoyaltyHubScreen({
  onGoToWallet,
  onGoToCoupons,
  onGoToGifts,
  onGoToHistory,
  onGoToTiers,
  onGoToCampaigns,
  onGoToInvite,
  onGoToShop,
}: LoyaltyHubScreenProps) {
  useScreenTrace("loyalty-hub");
  const insets   = useSafeAreaInsets();
  const { t }    = useTranslation();
  const { user } = useAuth();
  const isAuthed = !!user;

  // ── All 4 queries mount simultaneously — true parallel fetching ───────────
  // None of these block each other. react-query fires all requests at once.
  // Each section renders independently as its data arrives.
  const balance   = useLoyaltyBalance(isAuthed);
  const tiers     = useRewardTiers(isAuthed);
  const campaigns = useActiveCampaigns(isAuthed);
  const history   = useLoyaltyHistory({ enabled: isAuthed });

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void balance.refetch();
    void tiers.refetch();
    void campaigns.refetch();
    void history.refetch();
  }, [balance, tiers, campaigns, history]);

  const refreshing = balance.isFetching && !balance.isLoading;

  // ── Derived data (memoised) ───────────────────────────────────────────────
  const tierList = useMemo(
    () => [...(tiers.data ?? [])].sort((a, b) => a.min_lifetime_points - b.min_lifetime_points),
    [tiers.data],
  );

  const bal = balance.data ?? null;

  const currentTier = useMemo(
    () => (bal ? tierList.find((t) => t.id === bal.tier_id) ?? tierList[0] ?? null : null),
    [bal, tierList],
  );
  const nextTier = useMemo(
    () => (bal ? tierList.find((t) => t.min_lifetime_points > bal.lifetime_earned) ?? null : null),
    [bal, tierList],
  );

  const activeCampaigns = useMemo(
    () => (campaigns.data ?? []).filter((c) => c.is_active),
    [campaigns.data],
  );

  const recentEntries = useMemo(() => {
    const pages = history.data?.pages ?? [];
    return pages.flatMap((p) => p.entries).slice(0, 3);
  }, [history.data]);

  // ── Web focus cleanup ─────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => () => blurActiveElementOnWeb(), []),
  );

  // ── Header right element — campaigns badge ────────────────────────────────
  const campaignsBadge = onGoToCampaigns ? (
    <Pressable
      onPress={onGoToCampaigns}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={t("loyalty.hubCampaignsA11y")}
      style={s.campaignsBadge}>
      <Ionicons name="megaphone-outline" size={15} color={theme.colors.brand.base} />
      <Text style={s.campaignsBadgeText}>{t("loyalty.hubCampaignsLabel")}</Text>
    </Pressable>
  ) : undefined;

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <View style={[screenStyles.root, { paddingTop: insets.top }]}>
        <SubScreenHeader title={t("loyalty.hubTitle")} rightElement={campaignsBadge} />
        <UnauthPanel />
      </View>
    );
  }

  // ── Full-screen error (balance failed and no cached data) ─────────────────
  if (balance.isError && !bal) {
    return (
      <View style={[screenStyles.root, { paddingTop: insets.top }]}>
        <SubScreenHeader title={t("loyalty.hubTitle")} rightElement={campaignsBadge} />
        <FullErrorPanel onRetry={onRefresh} />
      </View>
    );
  }

  // ── Main render — sections are self-loading, no global gate ──────────────
  return (
    <View style={[screenStyles.root, { paddingTop: insets.top }]}>
      <SubScreenHeader title={t("loyalty.hubTitle")} rightElement={campaignsBadge} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand.base}
          />
        }
        showsVerticalScrollIndicator={false}>

        {/* 1 — Hero + balance (skeleton when loading) */}
        {balance.isLoading || !bal ? (
          <HeroSkeleton />
        ) : (
          <LoyaltyPointsCard
            user={user}
            balance={bal}
            currentTier={currentTier}
            nextTier={nextTier}
            onGoToTiers={onGoToTiers}
          />
        )}

        {/* 2 — Tier journey (only renders once balance is available) */}
        {bal && (
          <TierProgress
            tiers={tierList}
            balance={bal}
            currentTier={currentTier}
            nextTier={nextTier}
            onGoToTiers={onGoToTiers}
          />
        )}

        {/* 3 — Campaigns (only shown when there are campaigns or loading) */}
        {(activeCampaigns.length > 0 || campaigns.isLoading) && (
          <CampaignsBanner
            campaigns={activeCampaigns}
            isLoading={campaigns.isLoading}
            onSeeAll={onGoToCampaigns}
          />
        )}

        {/* 4 — Quick destinations (static, no loading) */}
        <QuickDestinations
          onWallet={onGoToWallet}
          onCoupons={onGoToCoupons}
          onGifts={onGoToGifts}
          onHistory={onGoToHistory}
        />

        {/* 5 — Recent activity (self-loading) */}
        <RecentActivity
          entries={recentEntries}
          isLoading={history.isLoading}
          isError={history.isError}
          onSeeAll={onGoToHistory}
          onRetry={() => void history.refetch()}
        />

        {/* 6 — Ways to earn (static) */}
        <WaysToEarn
          onInvite={onGoToInvite}
          onShop={onGoToShop}
          onCampaigns={onGoToCampaigns}
        />
      </ScrollView>
    </View>
  );
}

// ─── Panel components (unauth / error / skeleton) ──────────────────────────────

function UnauthPanel() {
  const { t } = useTranslation();
  return (
    <View style={s.panel}>
      <View style={s.panelIcon}>
        <Ionicons name="lock-closed-outline" size={32} color={theme.colors.brand.base} />
      </View>
      <Text style={s.panelTitle}>{t("loyalty.unauthTitle")}</Text>
      <Text style={s.panelBody}>{t("loyalty.unauthBody")}</Text>
    </View>
  );
}

function FullErrorPanel({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={s.panel}>
      <View style={s.panelIcon}>
        <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.slate[400]} />
      </View>
      <Text style={s.panelTitle}>{t("loyalty.hubErrorTitle")}</Text>
      <Text style={s.panelBody}>{t("loyalty.hubErrorBody")}</Text>
      <Pressable
        onPress={onRetry}
        style={s.retryBtn}
        accessibilityRole="button"
        accessibilityLabel={t("common.retry")}>
        <LinearGradient
          colors={[theme.colors.brand[600], theme.colors.teal[500]]}
          style={s.retryGrad}>
          <Ionicons name="refresh" size={14} color="#fff" />
          <Text style={s.retryText}>{t("common.retry")}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function HeroSkeleton() {
  return (
    <View style={{ gap: 12, paddingTop: 0 }}>
      <View style={s.skeletonHero} />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <View style={s.skeletonRow} />
        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
          {[0, 1, 2].map((i) => <View key={i} style={s.skeletonCard} />)}
        </View>
        <View style={s.skeletonRow} />
        <View style={s.skeletonRow} />
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blurActiveElementOnWeb() {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") return;
  const webDoc = (globalThis as unknown as {
    document?: { activeElement?: { blur?: () => void } };
  }).document;
  webDoc?.activeElement?.blur?.();
}

// ─── Local styles (screen-level only) ────────────────────────────────────────

const s = StyleSheet.create({
  campaignsBadge: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      20,
    backgroundColor:   theme.colors.amber[50],
    borderWidth:       1,
    borderColor:       theme.colors.amber[200],
  },
  campaignsBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.amber[700],
  },
  panel: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               10,
  },
  panelIcon: {
    width:           72,
    height:          72,
    borderRadius:    22,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    4,
  },
  panelTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      17,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.3,
  },
  panelBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   14,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 22,
    maxWidth:   280,
  },
  retryBtn:  { marginTop: 12, borderRadius: 14, overflow: "hidden" },
  retryGrad: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 24,
    paddingVertical:   13,
  },
  retryText: { fontFamily: theme.fonts.black, fontSize: 14, color: "#fff" },
  skeletonHero: {
    height:           220,
    marginHorizontal: theme.spacing[4],
    borderRadius:     24,
    backgroundColor:  theme.colors.surfaceSunken,
  },
  skeletonRow:  { height: 56, borderRadius: 14, backgroundColor: theme.colors.surfaceSunken },
  skeletonCard: { flex: 1, height: 80, borderRadius: 14, backgroundColor: theme.colors.surfaceSunken },
});

export default LoyaltyHubScreen;
