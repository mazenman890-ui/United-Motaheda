/**
 * LoyaltyHubScreen — برنامج المكافآت (main hub).
 *
 * Sections:
 *   1. Animated gradient hero — user greeting, tier glow ring, live balance
 *   2. Tier journey rail — all tiers as connected nodes, current highlighted
 *   3. Active campaigns — horizontal cards with multiplier + countdown
 *   4. Quick destinations — 2×2 grid linking to wallet / coupons / gifts / history
 *   5. Recent activity — last 3 ledger entries with kind icons & deltas
 *   6. Ways to earn — static info cards
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Easing,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Text } from "@/shared/ui";
import { theme } from "@/theme";
import { useScreenTrace } from "@/features/observability";
import { useAuth } from "@/features/auth/context";
import { useLoyaltyBalance }  from "../hooks/useLoyaltyBalance";
import { useRewardTiers }     from "../hooks/useRewardTiers";
import { useActiveCampaigns } from "../hooks/useActiveCampaigns";
import { useLoyaltyHistory }  from "../hooks/useLoyaltyHistory";
import type { LoyaltyBalance, RewardTier, RewardCampaign, LedgerEntry } from "../types";

// Platform-aware useNativeDriver: use native driver on iOS/Android, JS-based on web
const useNativeDriver = Platform.OS !== "web";

function blurActiveElementOnWeb() {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") return;
  const webDoc = (globalThis as unknown as {
    document?: { activeElement?: { blur?: () => void } };
  }).document;
  const activeElement = webDoc?.activeElement;
  if (activeElement?.blur) activeElement.blur();
}

// ─── Props ────────────────────────────────────────────────────────────────────

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

// ─── Ionicons type alias ──────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Component ───────────────────────────────────────────────────────────────

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
  const { user } = useAuth();
  const isAuthed = !!user;

  const balance   = useLoyaltyBalance(isAuthed);
  const tiers     = useRewardTiers(isAuthed);
  const campaigns = useActiveCampaigns(isAuthed);
  const history   = useLoyaltyHistory({ enabled: isAuthed });

  const refreshing = balance.isFetching && !balance.isLoading;

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void balance.refetch();
    void tiers.refetch();
    void campaigns.refetch();
    void history.refetch();
  }, [balance, tiers, campaigns, history]);

  // ── All hooks must be called unconditionally — before any early return ─────
  // (Rules of Hooks: never call hooks after a conditional return.)

  const recentEntries: LedgerEntry[] = useMemo(() => {
    const pages = history.data?.pages ?? [];
    return pages.flatMap((p) => p.entries).slice(0, 3);
  }, [history.data]);

  const tierList    = tiers.data ?? [];
  const sorted      = useMemo(
    () => [...tierList].sort((a, b) => a.min_lifetime_points - b.min_lifetime_points),
    [tierList],
  );

  const bal         = balance.data ?? null;
  const currentTier = useMemo(
    () => (bal ? sorted.find((t) => t.id === bal.tier_id) ?? sorted[0] ?? null : null),
    [bal, sorted],
  );
  const nextTier    = useMemo(
    () => (bal ? sorted.find((t) => t.min_lifetime_points > bal.lifetime_earned) ?? null : null),
    [bal, sorted],
  );

  const activeCampaigns: RewardCampaign[] = useMemo(
    () => (campaigns.data ?? []).filter((c) => c.is_active),
    [campaigns.data],
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        blurActiveElementOnWeb();
      };
    }, []),
  );

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <HubHeader />
        <UnauthPanel />
      </View>
    );
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (balance.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <HubHeader />
        <HubSkeleton />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (balance.isError || !bal) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <HubHeader />
        <FullErrorPanel onRetry={onRefresh} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <HubHeader onGoToCampaigns={onGoToCampaigns} />
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

        {/* 1 ── Hero */}
        <HeroSection
          user={user}
          balance={bal}
          currentTier={currentTier}
          nextTier={nextTier}
          tierList={sorted}
        />

        {/* 2 ── Tier journey */}
        <TierJourney
          tiers={sorted}
          balance={bal}
          currentTier={currentTier}
          nextTier={nextTier}
          onGoToTiers={onGoToTiers}
        />

        {/* 3 ── Active campaigns */}
        {(activeCampaigns.length > 0 || campaigns.isLoading) && (
          <CampaignsSection
            campaigns={activeCampaigns}
            isLoading={campaigns.isLoading}
            onSeeAll={onGoToCampaigns}
          />
        )}

        {/* 4 ── Quick destinations */}
        <QuickDestinations
          onWallet={onGoToWallet}
          onCoupons={onGoToCoupons}
          onGifts={onGoToGifts}
          onHistory={onGoToHistory}
        />

        {/* 5 ── Recent activity */}
        <RecentActivity
          entries={recentEntries}
          isLoading={history.isLoading}
          isError={history.isError}
          onSeeAll={onGoToHistory}
          onRetry={() => void history.refetch()}
        />

        {/* 6 ── Ways to earn */}
        <WaysToEarn onInvite={onGoToInvite} onShop={onGoToShop} onCampaigns={onGoToCampaigns} />

      </ScrollView>
    </View>
  );
}

// ─── 0. Hub header ────────────────────────────────────────────────────────────

function HubHeader({ onGoToCampaigns }: { onGoToCampaigns?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.hubHeader}>
      {/* Title — RTL start (visual right) */}
      <Text style={styles.hubTitle} accessibilityRole="header">برنامج المكافآت</Text>

      {/* Campaigns badge — middle */}
      {onGoToCampaigns && (
        <Pressable
          onPress={onGoToCampaigns}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="العروض النشطة"
          style={styles.campaignsBadge}>
          <Ionicons name="megaphone-outline" size={15} color={theme.colors.brand.base} />
          <Text style={styles.campaignsBadgeText}>العروض</Text>
        </Pressable>
      )}

      {/* Back button — RTL end (visual left) */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        style={({ pressed }) => [styles.hubBackBtn, pressed && styles.hubBackBtnPressed]}>
        <Ionicons name="chevron-forward" size={22} color={theme.colors.text.primary} />
      </Pressable>
    </View>
  );
}

// ─── 1. Hero section ──────────────────────────────────────────────────────────

interface HeroSectionProps {
  user:        { name?: string; email: string };
  balance:     LoyaltyBalance;
  currentTier: RewardTier | null;
  nextTier:    RewardTier | null;
  tierList:    RewardTier[];
}

function HeroSection({ user, balance, currentTier, nextTier }: HeroSectionProps) {
  const firstName   = (user.name ?? user.email).split(" ")[0] ?? "عزيزي";
  const tierLabel   = currentTier?.name ?? "برونزي";
  const tierColor   = getTierColor(tierLabel);
  const tierIcon    = getTierIcon(tierLabel);
  const multiplier  = currentTier?.earn_multiplier ?? 1;

  // Balance count-up animation (addListener avoids Arabic-Indic digit crash in interpolate)
  const animVal  = useRef(new RNAnimated.Value(0)).current;
  const prevBal  = useRef(0);
  const [displayBalance, setDisplayBalance] = useState(
    () => balance.balance.toLocaleString("ar-EG"),
  );
  useEffect(() => {
    const from = prevBal.current;
    const to   = balance.balance;
    prevBal.current = to;
    animVal.setValue(from);
    const id = animVal.addListener(({ value }) => {
      setDisplayBalance(Math.round(value).toLocaleString("ar-EG"));
    });
    RNAnimated.timing(animVal, {
      toValue: to, duration: 900,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start(() => animVal.removeListener(id));
    return () => animVal.removeListener(id);
  }, [balance.balance, animVal]);

  // Progress 0-1 toward next tier
  const progress = useMemo(() => {
    if (!nextTier) return 1;
    const from  = currentTier?.min_lifetime_points ?? 0;
    const range = nextTier.min_lifetime_points - from;
    if (range <= 0) return 1;
    return Math.max(0, Math.min(1, (balance.lifetime_earned - from) / range));
  }, [balance.lifetime_earned, currentTier, nextTier]);

  const pointsToNext = nextTier
    ? Math.max(0, nextTier.min_lifetime_points - balance.lifetime_earned)
    : null;

  // Avatar initials
  const initials = (user.name ?? user.email)
    .split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();

  return (
    <LinearGradient
      colors={["#071E3D", "#0D3460", "#1A5276"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}>

      {/* Top row: greeting + avatar */}
      <View style={styles.heroTopRow}>
        <View style={styles.heroGreeting}>
          <Text style={styles.heroWelcome}>أهلاً،</Text>
          <Text style={styles.heroName} numberOfLines={1}>{firstName} 👋</Text>
        </View>
        {/* Avatar with tier-color glow ring */}
        <View style={[styles.avatarRing, { borderColor: tierColor }]}>
          <View style={[styles.avatarInner, { backgroundColor: tierColor + "33" }]}>
            <Text style={[styles.avatarInitials, { color: tierColor }]}>{initials}</Text>
          </View>
        </View>
      </View>

      {/* Tier badge */}
      <View style={styles.heroBadgeRow}>
        <View style={[styles.tierBadge, { backgroundColor: tierColor + "22", borderColor: tierColor + "88" }]}>
          <Ionicons name={tierIcon} size={12} color={tierColor} />
          <Text style={[styles.tierBadgeLabel, { color: tierColor }]}>{tierLabel}</Text>
        </View>
        {multiplier > 1 && (
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>×{multiplier.toFixed(1)} نقطة/شراء</Text>
          </View>
        )}
      </View>

      {/* Balance */}
      <View style={styles.balanceBlock}>
        <Text style={styles.balanceEyebrow}>رصيدك الحالي</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceValue}>{displayBalance}</Text>
          <Text style={styles.balanceUnit}>نقطة</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatPill label="مكتسبة" value={balance.lifetime_earned} />
        <View style={styles.statsDiv} />
        <StatPill label="مستبدلة" value={balance.lifetime_redeemed} />
        <View style={styles.statsDiv} />
        <StatPill label="متاحة" value={balance.balance} highlight />
      </View>

      {/* Progress toward next tier */}
      {nextTier && (
        <View style={styles.progressWrap}>
          <View style={styles.progressMeta}>
            <Text style={styles.progressLabel}>
              {pointsToNext && pointsToNext > 0
                ? `${pointsToNext.toLocaleString("ar-EG")} نقطة للوصول إلى ${nextTier.name}`
                : `مبروك! وصلت إلى ${nextTier.name}`}
            </Text>
            <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <RNAnimated.View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.round(progress * 100))}%` as `${number}%` },
              ]}
            />
          </View>
        </View>
      )}

    </LinearGradient>
  );
}

function StatPill({
  label, value, highlight,
}: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillValue, highlight && styles.statPillValueHL]}>
        {value.toLocaleString("ar-EG")}
      </Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

// ─── 2. Tier journey ──────────────────────────────────────────────────────────

interface TierJourneyProps {
  tiers:       RewardTier[];
  balance:     LoyaltyBalance;
  currentTier: RewardTier | null;
  nextTier:    RewardTier | null;
  onGoToTiers?: () => void;
}

function TierJourney({ tiers, balance, currentTier, nextTier, onGoToTiers }: TierJourneyProps) {
  if (!tiers.length) return null;

  return (
    <View style={styles.sectionWrap}>
      <SectionHeader
        icon="trophy-outline"
        title="رحلة المستويات"
        ctaLabel="التفاصيل"
        onCta={onGoToTiers}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tierRailContent}
        style={styles.tierRail}>
        {tiers.map((tier, idx) => {
          const isReached  = balance.lifetime_earned >= tier.min_lifetime_points;
          const isCurrent  = tier.id === currentTier?.id;
          const isNext     = tier.id === nextTier?.id;
          const color      = getTierColor(tier.name);
          const icon       = getTierIcon(tier.name);
          const isLast     = idx === tiers.length - 1;

          return (
            <React.Fragment key={tier.id}>
              <TierNode
                tier={tier}
                color={color}
                icon={icon}
                isReached={isReached}
                isCurrent={isCurrent}
                isNext={isNext}
              />
              {!isLast && (
                <View style={[styles.tierConnector, isReached && styles.tierConnectorDone]} />
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface TierNodeProps {
  tier:      RewardTier;
  color:     string;
  icon:      IoniconsName;
  isReached: boolean;
  isCurrent: boolean;
  isNext:    boolean;
}

function TierNode({ tier, color, icon, isReached, isCurrent, isNext }: TierNodeProps) {
  const scale = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (isCurrent) {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(scale, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver }),
          RNAnimated.timing(scale, { toValue: 1.00, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        ]),
      ).start();
    }
  }, [isCurrent, scale]);

  return (
    <RNAnimated.View style={[styles.tierNodeWrap, { transform: [{ scale }] }]}>
      {/* Glow ring for current tier */}
      <View style={[
        styles.tierNodeRing,
        isReached  && { borderColor: color },
        isCurrent  && { borderColor: color, borderWidth: 2.5 },
        !isReached && styles.tierNodeRingDim,
      ]}>
        <View style={[
          styles.tierNodeIcon,
          isReached  && { backgroundColor: color + "22" },
          !isReached && { backgroundColor: theme.colors.surfaceSunken },
        ]}>
          <Ionicons
            name={icon}
            size={20}
            color={isReached ? color : theme.colors.text.disabled}
          />
        </View>
      </View>
      <Text style={[
        styles.tierNodeName,
        isReached && { color: color },
        isCurrent  && styles.tierNodeNameCurrent,
      ]}>{tier.name}</Text>
      {isCurrent && (
        <View style={[styles.tierCurrentChip, { backgroundColor: color + "22", borderColor: color + "66" }]}>
          <Text style={[styles.tierCurrentChipText, { color }]}>مستواك</Text>
        </View>
      )}
      {isNext && !isCurrent && (
        <View style={styles.tierNextChip}>
          <Text style={styles.tierNextChipText}>التالي</Text>
        </View>
      )}
      <Text style={styles.tierNodePts}>
        {tier.min_lifetime_points > 0
          ? `${tier.min_lifetime_points.toLocaleString("ar-EG")} ن`
          : "مجاناً"}
      </Text>
    </RNAnimated.View>
  );
}

// ─── 3. Active campaigns ──────────────────────────────────────────────────────

interface CampaignsSectionProps {
  campaigns: RewardCampaign[];
  isLoading: boolean;
  onSeeAll?: () => void;
}

function CampaignsSection({ campaigns, isLoading, onSeeAll }: CampaignsSectionProps) {
  return (
    <View style={styles.sectionWrap}>
      <SectionHeader
        icon="flame-outline"
        title="عروض نشطة الآن"
        ctaLabel="الكل"
        onCta={onSeeAll}
        accentColor={theme.colors.amber[500]}
      />
      {isLoading ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.campaignRailContent}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.campaignSkeletonCard} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.campaignRailContent}>
          {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
        </ScrollView>
      )}
    </View>
  );
}

function CampaignCard({ campaign }: { campaign: RewardCampaign }) {
  const daysLeft = campaign.ends_at
    ? Math.max(0, Math.ceil(
        (new Date(campaign.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ))
    : null;

  const isUrgent = daysLeft !== null && daysLeft <= 3;
  const gradColors: [string, string] = campaign.multiplier >= 3
    ? ["#7C3AED", "#9333EA"]
    : campaign.multiplier >= 2
    ? ["#0891B2", "#0DB8A8"]
    : ["#1A5276", "#2471A3"];

  return (
    <LinearGradient colors={gradColors} style={styles.campaignCard}>
      {/* Multiplier badge */}
      <View style={styles.campaignMultiplier}>
        <Text style={styles.campaignMultiplierText}>×{campaign.multiplier.toFixed(1)}</Text>
        <Text style={styles.campaignMultiplierSub}>نقطة</Text>
      </View>

      <Text style={styles.campaignName} numberOfLines={2}>{campaign.name}</Text>

      {campaign.description && (
        <Text style={styles.campaignDesc} numberOfLines={2}>{campaign.description}</Text>
      )}

      {campaign.min_purchase_cents && (
        <View style={styles.campaignMinSpend}>
          <Ionicons name="cart-outline" size={10} color="rgba(255,255,255,0.70)" />
          <Text style={styles.campaignMinSpendText}>
            حد أدنى {(campaign.min_purchase_cents / 100).toFixed(0)} ج.م
          </Text>
        </View>
      )}

      {/* Expiry */}
      {daysLeft !== null && (
        <View style={[styles.campaignExpiry, isUrgent && styles.campaignExpiryUrgent]}>
          <Ionicons name="time-outline" size={10} color={isUrgent ? "#FEF3C7" : "rgba(255,255,255,0.60)"} />
          <Text style={[styles.campaignExpiryText, isUrgent && styles.campaignExpiryTextUrgent]}>
            {daysLeft === 0 ? "آخر يوم!" : `ينتهي بعد ${daysLeft} يوم`}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ─── 4. Quick destinations ────────────────────────────────────────────────────

interface QuickDestinationsProps {
  onWallet?:  () => void;
  onCoupons?: () => void;
  onGifts?:   () => void;
  onHistory?: () => void;
}

function QuickDestinations({ onWallet, onCoupons, onGifts, onHistory }: QuickDestinationsProps) {
  return (
    <View style={styles.sectionWrap}>
      <SectionHeader icon="apps-outline" title="الخدمات" />
      <View style={styles.destGrid}>
        <DestCard
          icon="wallet-outline"
          label="محفظتي"
          sub="الرصيد والقسائم"
          color="#0891B2"
          gradient={["#0891B2", "#0DB8A8"]}
          onPress={onWallet}
        />
        <DestCard
          icon="pricetag-outline"
          label="قسائم الخصم"
          sub="استبدل نقاطك"
          color="#8B5CF6"
          gradient={["#7C3AED", "#9333EA"]}
          onPress={onCoupons}
        />
        <DestCard
          icon="gift-outline"
          label="كتالوج الهدايا"
          sub="هدايا مميزة"
          color="#EC4899"
          gradient={["#DB2777", "#EC4899"]}
          onPress={onGifts}
        />
        <DestCard
          icon="bar-chart-outline"
          label="سجل النقاط"
          sub="كل المعاملات"
          color="#10B981"
          gradient={["#059669", "#10B981"]}
          onPress={onHistory}
        />
      </View>
    </View>
  );
}

interface DestCardProps {
  icon:      IoniconsName;
  label:     string;
  sub:       string;
  color:     string;
  gradient:  [string, string];
  onPress?:  () => void;
}

function DestCard({ icon, label, sub, color: _color, gradient, onPress }: DestCardProps) {
  const scale = useRef(new RNAnimated.Value(1)).current;
  const onIn  = () => RNAnimated.spring(scale, { toValue: 0.95, useNativeDriver, speed: 50, bounciness: 4 }).start();
  const onOut = () => RNAnimated.spring(scale, { toValue: 1.00, useNativeDriver, speed: 50, bounciness: 4 }).start();

  return (
    <RNAnimated.View style={[styles.destCardOuter, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.destCard}>
        <LinearGradient colors={gradient} style={styles.destIconGrad}>
          <Ionicons name={icon} size={22} color="#fff" />
        </LinearGradient>
        <View style={styles.destText}>
          <Text style={styles.destLabel} numberOfLines={1}>{label}</Text>
          <Text style={styles.destSub}   numberOfLines={1}>{sub}</Text>
        </View>
        <Ionicons name="chevron-back" size={14} color={theme.colors.text.disabled} />
      </Pressable>
    </RNAnimated.View>
  );
}

// ─── 5. Recent activity ───────────────────────────────────────────────────────

interface RecentActivityProps {
  entries:   LedgerEntry[];
  isLoading: boolean;
  isError:   boolean;
  onSeeAll?: () => void;
  onRetry:   () => void;
}

function RecentActivity({ entries, isLoading, isError, onSeeAll, onRetry }: RecentActivityProps) {
  return (
    <View style={styles.sectionWrap}>
      <SectionHeader
        icon="receipt-outline"
        title="آخر المعاملات"
        ctaLabel="عرض الكل"
        onCta={entries.length > 0 ? onSeeAll : undefined}
      />
      {isLoading ? (
        <View style={styles.activityList}>
          {[0, 1, 2].map((i) => <View key={i} style={styles.activitySkeleton} />)}
        </View>
      ) : isError ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>تعذّر التحميل</Text>
          <Pressable onPress={onRetry} style={styles.retryBtn}
            accessibilityRole="button" accessibilityLabel="إعادة المحاولة">
            <Ionicons name="refresh" size={12} color={theme.colors.brand.base} />
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyActivity}>
          <Ionicons name="receipt-outline" size={28} color={theme.colors.text.disabled} />
          <Text style={styles.emptyActivityText}>لا توجد معاملات بعد</Text>
          <Text style={styles.emptyActivitySub}>ابدأ التسوق لتكسب نقاطك الأولى!</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {entries.map((e) => <ActivityRow key={e.id} entry={e} />)}
        </View>
      )}
    </View>
  );
}

function ActivityRow({ entry }: { entry: LedgerEntry }) {
  const isEarn  = entry.delta > 0;
  const icon    = getLedgerIcon(entry.kind);
  const color   = isEarn ? theme.colors.brand.base : theme.colors.rose[500];
  const bgColor = isEarn ? theme.colors.brand.lighter : theme.colors.rose[50];
  const sign    = isEarn ? "+" : "";

  const date = new Date(entry.created_at).toLocaleDateString("ar-EG", {
    day: "numeric", month: "short",
  });

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.activityMeta}>
        <Text style={styles.activitySource} numberOfLines={1}>
          {getLedgerLabel(entry.kind, entry.source)}
        </Text>
        <Text style={styles.activityDate}>{date}</Text>
      </View>
      <View style={styles.activityDeltaWrap}>
        <Text style={[styles.activityDelta, { color }]}>
          {sign}{Math.abs(entry.delta).toLocaleString("ar-EG")}
        </Text>
        <Text style={styles.activityPt}>ن</Text>
      </View>
    </View>
  );
}

// ─── 6. Ways to earn ──────────────────────────────────────────────────────────

interface WaysToEarnProps {
  onInvite?:    () => void;
  onShop?:      () => void;
  onCampaigns?: () => void;
}

function WaysToEarn({ onInvite, onShop, onCampaigns }: WaysToEarnProps) {
  const tips = [
    {
      icon:    "bag-handle-outline" as IoniconsName,
      color:   "#0891B2",
      title:   "اشترِ واكسب",
      body:    "تحصل على نقطة مقابل كل جنيه تنفقه، مع مضاعف يزداد كلما ارتفع مستواك.",
      onPress: onShop,
      cta:     "تسوق الآن",
    },
    {
      icon:    "people-outline" as IoniconsName,
      color:   "#8B5CF6",
      title:   "ادعُ صديقاً",
      body:    "احصل على نقاط مكافأة عند كل صديق يكمل أول طلب له باستخدام كودك.",
      onPress: onInvite,
      cta:     "شارك كودك",
    },
    {
      icon:    "flame-outline" as IoniconsName,
      color:   "#F59E0B",
      title:   "استغل العروض",
      body:    "تابع العروض الموسمية للحصول على نقاط مضاعفة في فترات محددة.",
      onPress: onCampaigns,
      cta:     "العروض",
    },
  ];

  return (
    <View style={styles.sectionWrap}>
      <SectionHeader icon="bulb-outline" title="كيف تكسب المزيد؟" />
      <View style={styles.earnList}>
        {tips.map((tip, i) => (
          <EarnCard key={i} {...tip} />
        ))}
      </View>
    </View>
  );
}

interface EarnCardProps {
  icon:     IoniconsName;
  color:    string;
  title:    string;
  body:     string;
  cta:      string;
  onPress?: () => void;
}

function EarnCard({ icon, color, title, body, cta, onPress }: EarnCardProps) {
  const scale = useRef(new RNAnimated.Value(1)).current;
  const onIn  = () => RNAnimated.spring(scale, { toValue: 0.97, useNativeDriver, speed: 50, bounciness: 4 }).start();
  const onOut = () => RNAnimated.spring(scale, { toValue: 1.00, useNativeDriver, speed: 50, bounciness: 4 }).start();

  return (
    <RNAnimated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        onPressIn={onIn}
        onPressOut={onOut}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={[styles.earnCard, onPress && styles.earnCardTappable]}>
        <View style={[styles.earnIcon, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.earnText}>
          <Text style={styles.earnTitle}>{title}</Text>
          <Text style={styles.earnBody}>{body}</Text>
        </View>
        {onPress && (
          <View style={[styles.earnCta, { backgroundColor: color + "14", borderColor: color + "30" }]}>
            <Text style={[styles.earnCtaText, { color }]}>{cta}</Text>
            <Ionicons name="chevron-back" size={11} color={color} />
          </View>
        )}
      </Pressable>
    </RNAnimated.View>
  );
}

// ─── Shared sub-views ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon:         IoniconsName;
  title:        string;
  ctaLabel?:    string;
  onCta?:       () => void;
  accentColor?: string;
}

function SectionHeader({ icon, title, ctaLabel, onCta, accentColor }: SectionHeaderProps) {
  const iconColor = accentColor ?? theme.colors.brand.base;
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionIconDot, { backgroundColor: iconColor + "20" }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {ctaLabel && onCta && (
        <Pressable onPress={onCta} hitSlop={8}
          accessibilityRole="button" accessibilityLabel={ctaLabel}>
          <Text style={styles.sectionCta}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function UnauthPanel() {
  return (
    <View style={styles.fullPanel}>
      <View style={styles.fullPanelIcon}>
        <Ionicons name="lock-closed-outline" size={32} color={theme.colors.brand.base} />
      </View>
      <Text style={styles.fullPanelTitle}>سجّل دخولك للاستمتاع بالمكافآت</Text>
      <Text style={styles.fullPanelBody}>
        اكسب نقاطاً مع كل عملية شراء واستبدلها بقسائم وهدايا مميزة.
      </Text>
    </View>
  );
}

function FullErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.fullPanel}>
      <View style={styles.fullPanelIcon}>
        <Ionicons name="cloud-offline-outline" size={32} color={theme.colors.slate[400]} />
      </View>
      <Text style={styles.fullPanelTitle}>تعذّر تحميل بيانات المكافآت</Text>
      <Text style={styles.fullPanelBody}>تحقق من اتصالك وحاول مجدداً.</Text>
      <Pressable onPress={onRetry} style={styles.retryBtnFull}
        accessibilityRole="button" accessibilityLabel="إعادة المحاولة">
        <LinearGradient colors={["#0891B2", "#0DB8A8"]} style={styles.retryBtnFullGrad}>
          <Ionicons name="refresh" size={14} color="#fff" />
          <Text style={styles.retryBtnFullText}>إعادة المحاولة</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function HubSkeleton() {
  return (
    <View style={{ gap: 12, paddingTop: 0 }}>
      <View style={styles.skeletonHero} />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <View style={styles.skeletonRow} />
        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
          {[0, 1, 2].map((i) => <View key={i} style={styles.skeletonCard} />)}
        </View>
        <View style={styles.skeletonRow} />
        <View style={styles.skeletonRow} />
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTierColor(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("بلاتين") || n.includes("plat")) return "#E5E4E2";
  if (n.includes("ذهب")   || n.includes("gold")) return "#F59E0B";
  if (n.includes("فضي")   || n.includes("silv")) return "#94A3B8";
  return "#CD7F32";
}

function getTierIcon(name: string): IoniconsName {
  const n = name.toLowerCase();
  if (n.includes("بلاتين") || n.includes("plat")) return "diamond-outline";
  if (n.includes("ذهب")   || n.includes("gold")) return "trophy-outline";
  if (n.includes("فضي")   || n.includes("silv")) return "medal-outline";
  return "star-outline";
}

function getLedgerIcon(kind: LedgerEntry["kind"]): IoniconsName {
  switch (kind) {
    case "earn":     return "add-circle-outline";
    case "redeem":   return "remove-circle-outline";
    case "bonus":    return "gift-outline";
    case "referral": return "people-outline";
    case "cashback": return "cash-outline";
    case "expire":   return "time-outline";
    case "adjust":   return "build-outline";
    case "reverse":  return "refresh-outline";
    default:         return "ellipse-outline";
  }
}

function getLedgerLabel(kind: LedgerEntry["kind"], source: string): string {
  switch (kind) {
    case "earn":     return `شراء — ${source}`;
    case "redeem":   return "استبدال نقاط";
    case "bonus":    return "مكافأة إضافية";
    case "referral": return "مكافأة إحالة";
    case "cashback": return "استرداد نقدي";
    case "expire":   return "انتهاء صلاحية نقاط";
    case "adjust":   return "تعديل يدوي";
    case "reverse":  return "إلغاء معاملة";
    default:         return source;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },

  // ── Hub header ─────────────────────────────────────────────────────────────
  hubHeader: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  hubTitle: {
    flex:          1,
    fontFamily:    theme.fonts.black,
    fontSize:      22,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.4,
  },
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
  hubBackBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: theme.colors.subtle,
    alignItems:      "center",
    justifyContent:  "center",
  },
  hubBackBtnPressed: {
    backgroundColor: theme.colors.border.default,
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 20,
    paddingTop:        22,
    paddingBottom:     24,
    gap:               14,
    marginHorizontal:  16,
    borderRadius:      24,
    overflow:          "hidden",
    marginBottom:      4,
    ...theme.shadow.lg,
  },
  heroTopRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  heroGreeting: {
    gap: 1,
  },
  heroWelcome: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      "rgba(255,255,255,0.55)",
    textAlign:  "right",
  },
  heroName: {
    fontFamily:    theme.fonts.black,
    fontSize:      20,
    color:         "#fff",
    textAlign:     "right",
    letterSpacing: -0.3,
    maxWidth:      200,
  },
  avatarRing: {
    width:        52,
    height:       52,
    borderRadius: 26,
    borderWidth:  2,
    alignItems:   "center",
    justifyContent: "center",
  },
  avatarInner: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
  },
  heroBadgeRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           8,
  },
  tierBadge: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      20,
    borderWidth:       1,
  },
  tierBadgeLabel: {
    fontFamily:    theme.fonts.black,
    fontSize:      11,
    letterSpacing: 0.2,
  },
  multiplierBadge: {
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      10,
    backgroundColor:   "rgba(255,255,255,0.14)",
  },
  multiplierText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.80)",
  },
  balanceBlock: {
    alignItems: "center",
    gap:        3,
  },
  balanceEyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      10,
    color:         "rgba(255,255,255,0.50)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  balanceRow: {
    flexDirection: "row-reverse",
    alignItems:    "baseline",
    gap:           8,
  },
  balanceValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      52,
    color:         "#fff",
    letterSpacing: -2,
  },
  balanceUnit: {
    fontFamily: theme.fonts.bold,
    fontSize:   20,
    color:      "rgba(255,255,255,0.75)",
  },
  statsRow: {
    flexDirection:   "row-reverse",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius:    16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statPill: {
    flex:       1,
    alignItems: "center",
    gap:        2,
  },
  statPillValue: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
    color:      "rgba(255,255,255,0.75)",
  },
  statPillValueHL: {
    color: "#fff",
    fontSize: 17,
  },
  statPillLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      "rgba(255,255,255,0.45)",
  },
  statsDiv: {
    width:           1,
    height:          32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf:       "center",
  },
  progressWrap: {
    gap: 7,
  },
  progressMeta: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.65)",
    flex:       1,
    textAlign:  "right",
  },
  progressPct: {
    fontFamily:  theme.fonts.black,
    fontSize:    12,
    color:       "#fff",
    marginStart: 8,
  },
  progressTrack: {
    height:          6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius:    3,
    overflow:        "hidden",
  },
  progressFill: {
    height:          6,
    backgroundColor: "#F59E0B",
    borderRadius:    3,
  },

  // ── Section wrapper ────────────────────────────────────────────────────────
  sectionWrap: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    marginBottom:      10,
  },
  sectionTitleRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           7,
  },
  sectionIconDot: {
    width:          26,
    height:         26,
    borderRadius:   8,
    alignItems:     "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  sectionCta: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand.base,
  },

  // ── Tier journey ───────────────────────────────────────────────────────────
  tierRail: {
    marginHorizontal: -2,
  },
  tierRailContent: {
    paddingHorizontal: 16,
    paddingVertical:   4,
    alignItems:        "center",
    gap:               0,
  },
  tierNodeWrap: {
    alignItems:  "center",
    width:       80,
    gap:         5,
  },
  tierNodeRing: {
    width:        52,
    height:       52,
    borderRadius: 26,
    borderWidth:  1.5,
    borderColor:  theme.colors.border.default,
    alignItems:   "center",
    justifyContent: "center",
    ...theme.shadow.card,
  },
  tierNodeRingDim: {
    borderColor: theme.colors.border.hairline,
  },
  tierNodeIcon: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     "center",
    justifyContent: "center",
  },
  tierConnector: {
    width:           32,
    height:          2,
    backgroundColor: theme.colors.border.default,
    borderRadius:    1,
    marginBottom:    24,
  },
  tierConnectorDone: {
    backgroundColor: theme.colors.brand[400],
  },
  tierNodeName: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.text.disabled,
    textAlign:  "center",
  },
  tierNodeNameCurrent: {
    fontFamily: theme.fonts.black,
  },
  tierCurrentChip: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      8,
    borderWidth:       1,
  },
  tierCurrentChipText: {
    fontFamily: theme.fonts.black,
    fontSize:   9,
    letterSpacing: 0.2,
  },
  tierNextChip: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      8,
    backgroundColor:   theme.colors.subtle,
  },
  tierNextChipText: {
    fontFamily: theme.fonts.bold,
    fontSize:   9,
    color:      theme.colors.text.tertiary,
  },
  tierNodePts: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      theme.colors.text.disabled,
    textAlign:  "center",
  },

  // ── Campaigns ──────────────────────────────────────────────────────────────
  campaignRailContent: {
    paddingHorizontal: 16,
    gap:               10,
    paddingBottom:     4,
  },
  campaignCard: {
    width:         200,
    borderRadius:  18,
    padding:       16,
    gap:           6,
    ...theme.shadow.md,
  },
  campaignSkeletonCard: {
    width:           200,
    height:          140,
    borderRadius:    18,
    backgroundColor: theme.colors.surfaceSunken,
  },
  campaignMultiplier: {
    flexDirection:     "row-reverse",
    alignItems:        "baseline",
    gap:               3,
    alignSelf:         "flex-end",
    backgroundColor:   "rgba(255,255,255,0.20)",
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      10,
  },
  campaignMultiplierText: {
    fontFamily: theme.fonts.black,
    fontSize:   18,
    color:      "#fff",
  },
  campaignMultiplierSub: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.75)",
  },
  campaignName: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         "#fff",
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  campaignDesc: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      "rgba(255,255,255,0.65)",
    textAlign:  "right",
    lineHeight: 16,
  },
  campaignMinSpend: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           4,
  },
  campaignMinSpendText: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      "rgba(255,255,255,0.65)",
  },
  campaignExpiry: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               4,
    alignSelf:         "flex-end",
    marginTop:         4,
  },
  campaignExpiryUrgent: {},
  campaignExpiryText: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      "rgba(255,255,255,0.55)",
  },
  campaignExpiryTextUrgent: {
    color: "#FEF3C7",
  },

  // ── Quick destinations ─────────────────────────────────────────────────────
  destGrid: {
    paddingHorizontal: 16,
    gap:               8,
  },
  destCardOuter: {},
  destCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.card,
  },
  destIconGrad: {
    width:          44,
    height:         44,
    borderRadius:   13,
    alignItems:     "center",
    justifyContent: "center",
  },
  destText: {
    flex: 1,
    gap:  2,
  },
  destLabel: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  destSub: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
  },

  // ── Recent activity ────────────────────────────────────────────────────────
  activityList: {
    paddingHorizontal: 16,
    gap:               6,
  },
  activityRow: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             10,
    backgroundColor: theme.colors.surface,
    borderRadius:    14,
    padding:         12,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.hairline,
  },
  activityIcon: {
    width:          38,
    height:         38,
    borderRadius:   11,
    alignItems:     "center",
    justifyContent: "center",
  },
  activityMeta: {
    flex: 1,
    gap:  2,
  },
  activitySource: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    textAlign:  "right",
  },
  activityDate: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
  },
  activityDeltaWrap: {
    flexDirection: "row-reverse",
    alignItems:    "baseline",
    gap:           2,
  },
  activityDelta: {
    fontFamily:    theme.fonts.black,
    fontSize:      16,
    letterSpacing: -0.5,
  },
  activityPt: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
  },
  activitySkeleton: {
    height:          56,
    borderRadius:    14,
    backgroundColor: theme.colors.surfaceSunken,
    marginBottom:    6,
  },
  emptyActivity: {
    alignItems:        "center",
    paddingVertical:   28,
    paddingHorizontal: 32,
    gap:               6,
  },
  emptyActivityText: {
    fontFamily: theme.fonts.bold,
    fontSize:   14,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
  },
  emptyActivitySub: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.tertiary,
    textAlign:  "center",
  },
  inlineError: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "space-between",
    marginHorizontal:  16,
    padding:           12,
    borderRadius:      12,
    backgroundColor:   theme.colors.surfaceSunken,
  },
  inlineErrorText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.text.secondary,
  },
  retryBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               4,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      8,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    backgroundColor:   theme.colors.surface,
  },
  retryText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.brand.base,
  },

  // ── Ways to earn ───────────────────────────────────────────────────────────
  earnList: {
    paddingHorizontal: 16,
    gap:               8,
  },
  earnCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.hairline,
  },
  earnCardTappable: {
    borderColor: theme.colors.border.default,
  },
  earnIcon: {
    width:          44,
    height:         44,
    borderRadius:   13,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  earnText: {
    flex: 1,
    gap:  3,
  },
  earnTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  earnBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    textAlign:  "right",
    lineHeight: 18,
  },
  earnCta: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               3,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      9,
    borderWidth:       1,
    flexShrink:        0,
  },
  earnCtaText: {
    fontFamily: theme.fonts.black,
    fontSize:   11,
  },

  // ── Full panels ────────────────────────────────────────────────────────────
  fullPanel: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               10,
  },
  fullPanelIcon: {
    width:           72,
    height:          72,
    borderRadius:    22,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    4,
  },
  fullPanelTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      17,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.3,
  },
  fullPanelBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   14,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 22,
    maxWidth:   280,
  },
  retryBtnFull: {
    marginTop:    12,
    borderRadius: 14,
    overflow:     "hidden",
  },
  retryBtnFullGrad: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 24,
    paddingVertical:   13,
  },
  retryBtnFullText: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      "#fff",
  },

  // ── Skeleton ───────────────────────────────────────────────────────────────
  skeletonHero: {
    height:          220,
    marginHorizontal: 16,
    borderRadius:    24,
    backgroundColor: theme.colors.surfaceSunken,
  },
  skeletonRow: {
    height:          56,
    borderRadius:    14,
    backgroundColor: theme.colors.surfaceSunken,
  },
  skeletonCard: {
    flex:            1,
    height:          80,
    borderRadius:    14,
    backgroundColor: theme.colors.surfaceSunken,
  },
});

export default LoyaltyHubScreen;
