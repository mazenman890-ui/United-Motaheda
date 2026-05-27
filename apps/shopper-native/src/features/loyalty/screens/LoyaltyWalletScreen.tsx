/**
 * LoyaltyWalletScreen — محفظة المكافآت (redesigned).
 *
 * Features:
 *   • Animated gradient balance hero with tier badge + next-tier progress bar
 *   • Quick-action row (Earn / Coupons / Gifts / History)
 *   • First-time interactive tour (4 steps, AsyncStorage-backed)
 *   • Coupons section with native Share (copy to clipboard workaround)
 *   • Pending gifts/redemptions section
 *   • Skeleton loading, error-with-retry, unauthenticated state, frozen warning
 *   • Full RTL + Arabic a11y labels
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated as RNAnimated,
  Easing,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { theme } from "@/theme";
import { useScreenTrace } from "@/features/observability";
import { useAuth } from "@/features/auth/context";
import { useLoyaltyBalance } from "../hooks/useLoyaltyBalance";
import { useUserCoupons }    from "../hooks/useUserCoupons";
import { useRedemptions }    from "../hooks/useRedemptions";
import { useRewardTiers }    from "../hooks/useRewardTiers";
import type { LoyaltyBalance, Coupon, GiftRedemption, RewardTier } from "../types";

// ─── Tour ────────────────────────────────────────────────────────────────────

const TOUR_SEEN_KEY = "loyalty_tour_seen_v1";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TOUR_STEPS: { icon: IoniconsName; title: string; body: string }[] = [
  {
    icon:  "wallet-outline",
    title: "رصيدك من النقاط",
    body:  "تكتسب نقاطاً مع كل عملية شراء. كلما اشتريت أكثر كلما كسبت أكثر!",
  },
  {
    icon:  "star-outline",
    title: "مستويات المكافآت",
    body:  "ارتقِ من برونزي إلى فضي إلى ذهبي للحصول على مضاعف كسب أعلى وعروض حصرية.",
  },
  {
    icon:  "pricetag-outline",
    title: "قسائم الخصم",
    body:  "استبدل نقاطك بقسائم فورية — انسخ الكود وطبّقه مباشرةً عند الدفع.",
  },
  {
    icon:  "gift-outline",
    title: "هدايا مميزة",
    body:  "اختر هديةً من الكتالوج وتلقَّها على باب منزلك مجاناً!",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LoyaltyWalletScreenProps {
  title?:              string;
  onBrowseCoupons?:    () => void;
  onBrowseGifts?:      () => void;
  onViewHistory?:      () => void;
  onEarnPoints?:       () => void;
  onViewRedemptions?:  () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LoyaltyWalletScreen({
  title = "محفظة المكافآت",
  onBrowseCoupons,
  onBrowseGifts,
  onViewHistory,
  onEarnPoints,
  onViewRedemptions,
}: LoyaltyWalletScreenProps) {
  useScreenTrace("loyalty-wallet");
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const isAuthed = !!user;

  const balance = useLoyaltyBalance(isAuthed);
  const coupons = useUserCoupons(isAuthed);
  const redeems = useRedemptions(isAuthed);
  const tiers   = useRewardTiers(isAuthed);

  const [tourVisible, setTourVisible] = useState(false);
  const [tourStep,    setTourStep]    = useState(0);

  // Check if first-time visitor
  useEffect(() => {
    if (!isAuthed) return;
    AsyncStorage.getItem(TOUR_SEEN_KEY).then((seen) => {
      if (!seen) setTourVisible(true);
    }).catch(() => {});
  }, [isAuthed]);

  const dismissTour = useCallback(async () => {
    setTourVisible(false);
    setTourStep(0);
    await AsyncStorage.setItem(TOUR_SEEN_KEY, "1").catch(() => {});
  }, []);

  const advanceTour = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep((s) => s + 1);
    } else {
      void dismissTour();
    }
  }, [tourStep, dismissTour]);

  const refreshing = (balance.isFetching && !balance.isLoading) ||
                     (coupons.isFetching && !coupons.isLoading);

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void balance.refetch();
    void coupons.refetch();
    void redeems.refetch();
    void tiers.refetch();
  }, [balance, coupons, redeems, tiers]);

  // ── Unauthenticated ────────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title={title} />
        <UnauthPanel />
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (balance.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title={title} />
        <WalletSkeleton />
      </View>
    );
  }

  // ── Balance fetch error ────────────────────────────────────────────────────
  if (balance.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title={title} />
        <ErrorPanel onRetry={onRefresh} />
      </View>
    );
  }

  const bal       = balance.data!;
  const tierList  = tiers.data ?? [];
  const currentTier = tierList.find((t) => t.id === bal.tier_id) ?? null;
  const nextTier    = getNextTier(bal, tierList);
  const tierProgress = getTierProgress(bal, currentTier, nextTier);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* First-time tour overlay */}
      <TourModal
        visible={tourVisible}
        step={tourStep}
        onNext={advanceTour}
        onSkip={dismissTour}
      />

      <ScreenHeader title={title} onTourPress={() => setTourVisible(true)} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            accessibilityLabel="تحديث الرصيد"
          />
        }
        showsVerticalScrollIndicator={false}>

        {/* ── Balance hero card ──────────────────────────────────────────── */}
        <BalanceHero
          balance={bal}
          currentTier={currentTier}
          nextTier={nextTier}
          progress={tierProgress}
        />

        {/* ── Quick actions ──────────────────────────────────────────────── */}
        <QuickActions
          onEarn={onEarnPoints}
          onCoupons={onBrowseCoupons}
          onGifts={onBrowseGifts}
          onHistory={onViewHistory}
          onRedemptions={onViewRedemptions}
        />

        {/* ── Frozen warning ─────────────────────────────────────────────── */}
        {bal.frozen && (
          <View style={styles.frozenBanner} accessibilityRole="alert">
            <Ionicons name="lock-closed" size={16} color={theme.colors.rose[700]} />
            <Text style={styles.frozenText}>
              حسابك مجمَّد مؤقتاً — يُرجى التواصل مع الدعم لإعادة التفعيل
            </Text>
          </View>
        )}

        {/* ── Coupons ────────────────────────────────────────────────────── */}
        <SectionHeader title="قسائمي" icon="pricetag-outline" onSeeAll={onBrowseCoupons} />
        <CouponsSection
          isLoading={coupons.isLoading}
          isError={coupons.isError}
          coupons={coupons.data ?? []}
          onRetry={() => void coupons.refetch()}
          onBrowse={onBrowseCoupons}
        />

        {/* ── Pending gifts ──────────────────────────────────────────────── */}
        <SectionHeader title="الهدايا قيد التسليم" icon="gift-outline" onSeeAll={onViewRedemptions} />
        <RedemptionsSection
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

// ─── Screen header ────────────────────────────────────────────────────────────

function ScreenHeader({ title, onTourPress }: { title: string; onTourPress?: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.screenHeader}>
      {/* Title — RTL start (visual right) */}
      <Text style={styles.screenTitle} accessibilityRole="header">{title}</Text>

      {/* Tour button — middle (only when authenticated) */}
      {onTourPress && (
        <Pressable
          onPress={onTourPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="عرض الجولة التعريفية"
          style={styles.tourBtn}>
          <Ionicons name="help-circle-outline" size={22} color={theme.colors.text.secondary} />
        </Pressable>
      )}

      {/* Back button — RTL end (visual left) */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        style={({ pressed }) => [styles.walletBackBtn, pressed && styles.walletBackBtnPressed]}>
        <Ionicons name="chevron-forward" size={22} color={theme.colors.text.primary} />
      </Pressable>
    </View>
  );
}

// ─── Balance hero ─────────────────────────────────────────────────────────────

interface BalanceHeroProps {
  balance:     LoyaltyBalance;
  currentTier: RewardTier | null;
  nextTier:    RewardTier | null;
  progress:    number; // 0-1
}

function BalanceHero({ balance, currentTier, nextTier, progress }: BalanceHeroProps) {
  // Count-up animation (addListener avoids Arabic-Indic digit crash in interpolate)
  const animVal = useRef(new RNAnimated.Value(0)).current;
  const prevBalance = useRef(0);
  const [displayBalance, setDisplayBalance] = useState(
    () => balance.balance.toLocaleString("ar-EG"),
  );

  useEffect(() => {
    const from = prevBalance.current;
    const to   = balance.balance;
    prevBalance.current = to;
    animVal.setValue(from);
    const id = animVal.addListener(({ value }) => {
      setDisplayBalance(Math.round(value).toLocaleString("ar-EG"));
    });
    RNAnimated.timing(animVal, {
      toValue:         to,
      duration:        800,
      easing:          Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start(() => animVal.removeListener(id));
    return () => animVal.removeListener(id);
  }, [balance.balance, animVal]);

  const tierLabel   = currentTier?.name ?? "برونزي";
  const tierIcon    = getTierIcon(tierLabel);
  const tierColor   = getTierColor(tierLabel);
  const pointsToNext = nextTier
    ? nextTier.min_lifetime_points - balance.lifetime_earned
    : null;

  return (
    <View style={styles.heroWrap}>
      <LinearGradient
        colors={["#1e3a5f", "#2d5a8e", "#1a4a75"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}>

        {/* Tier badge */}
        <View style={styles.heroTopRow}>
          <View style={[styles.tierBadge, { backgroundColor: tierColor + "33", borderColor: tierColor }]}>
            <Ionicons name={tierIcon} size={13} color={tierColor} />
            <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tierLabel}</Text>
          </View>
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>
              ×{(currentTier?.earn_multiplier ?? 1).toFixed(1)} مضاعف
            </Text>
          </View>
        </View>

        {/* Balance */}
        <View style={styles.balanceCenter}>
          <Text style={styles.balanceEyebrow}>الرصيد الحالي</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>{displayBalance}</Text>
            <Text style={styles.balanceUnit}>نقطة</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatChip label="مجموع المكتسب" value={balance.lifetime_earned} />
          <View style={styles.statsSep} />
          <StatChip label="مجموع المستبدل" value={balance.lifetime_redeemed} />
        </View>

        {/* Tier progress bar */}
        {nextTier && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                {pointsToNext && pointsToNext > 0
                  ? `${pointsToNext.toLocaleString("ar-EG")} نقطة للوصول إلى ${nextTier.name}`
                  : `وصلت إلى ${nextTier.name}!`}
              </Text>
              <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` as `${number}%` }]} />
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statChip} accessibilityRole="text" accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statChipValue}>{value.toLocaleString("ar-EG")}</Text>
      <Text style={styles.statChipLabel}>{label}</Text>
    </View>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

interface QuickActionsProps {
  onEarn?:        () => void;
  onCoupons?:     () => void;
  onGifts?:       () => void;
  onHistory?:     () => void;
  onRedemptions?: () => void;
}

function QuickActions({ onEarn, onCoupons, onGifts, onHistory, onRedemptions }: QuickActionsProps) {
  return (
    <View style={styles.quickActionsWrap}>
      <View style={styles.quickActionsRow}>
        <QuickActionTile icon="bag-handle-outline"  label="اكسب نقاط"  onPress={onEarn}    color="#3B82F6" />
        <QuickActionTile icon="pricetag-outline"    label="القسائم"     onPress={onCoupons} color="#8B5CF6" />
        <QuickActionTile icon="gift-outline"        label="الهدايا"     onPress={onGifts}   color="#EC4899" />
      </View>
      <View style={styles.quickActionsRow}>
        <QuickActionTile icon="receipt-outline"     label="سجل النقاط"  onPress={onHistory}     color="#10B981" />
        <QuickActionTile icon="cube-outline"        label="طلبات الهدايا" onPress={onRedemptions} color="#F59E0B" />
        <QuickActionTile icon="storefront-outline"  label="تسوق الآن"   onPress={onEarn}    color="#06B6D4" />
      </View>
    </View>
  );
}

interface QuickActionTileProps {
  icon:     IoniconsName;
  label:    string;
  onPress?: () => void;
  color:    string;
}

function QuickActionTile({ icon, label, onPress, color }: QuickActionTileProps) {
  const scale = useRef(new RNAnimated.Value(1)).current;

  const onPressIn = () =>
    RNAnimated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () =>
    RNAnimated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <RNAnimated.View style={[styles.quickTileOuter, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !onPress }}
        style={[styles.quickTile, !onPress && styles.quickTileDisabled]}>
        <View style={[styles.quickTileIconWrap, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={22} color={onPress ? color : theme.colors.text.disabled} />
        </View>
        <Text
          style={[styles.quickTileLabel, !onPress && { color: theme.colors.text.disabled }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}>
          {label}
        </Text>
      </Pressable>
    </RNAnimated.View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title:     string;
  icon:      IoniconsName;
  onSeeAll?: () => void;
}

function SectionHeader({ title, icon, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionTitleWrap}>
        <Ionicons name={icon} size={16} color={theme.colors.brand[600]} />
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}
          accessibilityRole="button" accessibilityLabel={`عرض كل ${title}`}>
          <Text style={styles.seeAll}>عرض الكل</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Coupons section ──────────────────────────────────────────────────────────

interface CouponsSectionProps {
  isLoading: boolean;
  isError:   boolean;
  coupons:   Coupon[];
  onRetry:   () => void;
  onBrowse?: () => void;
}

function CouponsSection({ isLoading, isError, coupons, onRetry, onBrowse }: CouponsSectionProps) {
  if (isLoading) return <ListSkeleton rows={2} />;
  if (isError)   return <ErrorRow onRetry={onRetry} />;

  const active = coupons.filter((c) => c.state === "issued");

  if (coupons.length === 0) {
    return (
      <EmptyCard
        icon="pricetag-outline"
        title="لا توجد قسائم بعد"
        body="استبدل نقاطك بقسائم خصم فورية تُطبَّق عند الدفع."
        ctaLabel="استعرض القسائم"
        onCta={onBrowse}
      />
    );
  }

  if (active.length === 0) {
    return (
      <View style={styles.emptyRow}>
        <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.brand[600]} />
        <Text style={styles.emptyText}>استُخدمت جميع قسائمك — أضف قسيمة جديدة!</Text>
      </View>
    );
  }

  return (
    <View style={styles.cardList}>
      {active.slice(0, 3).map((c) => <CouponCard key={c.id} coupon={c} />)}
      {active.length > 3 && onBrowse && (
        <Pressable onPress={onBrowse} style={styles.showMoreBtn} accessibilityRole="button">
          <Text style={styles.showMoreText}>+{active.length - 3} قسائم أخرى</Text>
          <Ionicons name="chevron-back" size={14} color={theme.colors.brand[600]} />
        </Pressable>
      )}
    </View>
  );
}

function CouponCard({ coupon }: { coupon: Coupon }) {
  const [copied, setCopied] = useState(false);

  const expiry = coupon.expires_at
    ? new Date(coupon.expires_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })
    : null;

  const handleCopy = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await Share.share({ message: coupon.code, title: "كود الخصم" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* user cancelled share */ }
  }, [coupon.code]);

  return (
    <View style={styles.couponCard}
      accessibilityRole="text"
      accessibilityLabel={`قسيمة ${coupon.code}${expiry ? ` صالحة حتى ${expiry}` : ""}`}>

      {/* Left accent */}
      <View style={styles.couponAccent} />

      {/* Code + expiry */}
      <View style={{ flex: 1 }}>
        <Text style={styles.couponCode} maxFontSizeMultiplier={1.2}>{coupon.code}</Text>
        {expiry && (
          <Text style={styles.couponExpiry} maxFontSizeMultiplier={1.3}>
            صالحة حتى {expiry}
          </Text>
        )}
      </View>

      {/* State badge */}
      <View style={styles.activeBadge}>
        <Ionicons name="checkmark-circle" size={10} color="#fff" />
        <Text style={styles.activeBadgeText}>متاحة</Text>
      </View>

      {/* Copy button */}
      <Pressable
        onPress={handleCopy}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={copied ? "تم النسخ" : "نسخ الكود"}
        style={[styles.copyBtn, copied && styles.copyBtnDone]}>
        <Ionicons
          name={copied ? "checkmark" : "copy-outline"}
          size={15}
          color={copied ? "#fff" : theme.colors.brand[700]}
        />
      </Pressable>
    </View>
  );
}

// ─── Redemptions section ──────────────────────────────────────────────────────

interface RedemptionsSectionProps {
  isLoading:   boolean;
  isError:     boolean;
  redemptions: GiftRedemption[];
  onRetry:     () => void;
  onViewAll?:  () => void;
}

function RedemptionsSection({ isLoading, isError, redemptions, onRetry, onViewAll }: RedemptionsSectionProps) {
  if (isLoading) return <ListSkeleton rows={1} />;
  if (isError)   return <ErrorRow onRetry={onRetry} />;

  const active = redemptions.filter((r) => r.state === "reserved" || r.state === "fulfilled");

  if (active.length === 0) {
    return (
      <EmptyCard
        icon="gift-outline"
        title="لا توجد هدايا قيد التسليم"
        body="استبدل نقاطك بهديةٍ مميزة من كتالوج المكافآت."
        ctaLabel={onViewAll ? "كل طلبات الهدايا" : undefined}
        onCta={onViewAll}
      />
    );
  }

  return (
    <View style={[styles.cardList, { marginBottom: 8 }]}>
      {active.slice(0, 3).map((r) => <RedemptionCard key={r.id} r={r} />)}
      {active.length > 3 && onViewAll && (
        <Pressable onPress={onViewAll} style={styles.showMoreBtn} accessibilityRole="button">
          <Text style={styles.showMoreText}>+{active.length - 3} طلبات أخرى</Text>
          <Ionicons name="chevron-back" size={14} color={theme.colors.brand[600]} />
        </Pressable>
      )}
    </View>
  );
}

function RedemptionCard({ r }: { r: GiftRedemption }) {
  const isDelivered = r.state === "fulfilled";
  return (
    <View style={styles.redemptionCard}
      accessibilityRole="text"
      accessibilityLabel={`هدية ${r.points_spent} نقطة — ${isDelivered ? "تم التسليم" : "قيد التوصيل"}`}>
      <View style={[styles.redemptionIcon, isDelivered && styles.redemptionIconDone]}>
        <Ionicons
          name={isDelivered ? "checkmark-circle" : "time-outline"}
          size={20}
          color={isDelivered ? theme.colors.brand[600] : theme.colors.amber[600]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.redemptionPts} maxFontSizeMultiplier={1.2}>
          {r.points_spent.toLocaleString("ar-EG")} نقطة
        </Text>
        <Text style={styles.redemptionState} maxFontSizeMultiplier={1.3}>
          {isDelivered ? "تم التسليم" : "قيد التوصيل…"}
        </Text>
      </View>
      <View style={[styles.stateChip, isDelivered ? styles.stateChipDone : styles.stateChipPending]}>
        <Text style={[styles.stateChipText, isDelivered ? styles.stateChipTextDone : styles.stateChipTextPending]}>
          {isDelivered ? "مُسلَّمة" : "محجوزة"}
        </Text>
      </View>
    </View>
  );
}

// ─── Tour modal ───────────────────────────────────────────────────────────────

interface TourModalProps {
  visible: boolean;
  step:    number;
  onNext:  () => void;
  onSkip:  () => void;
}

function TourModal({ visible, step, onNext, onSkip }: TourModalProps) {
  const current = TOUR_STEPS[step]!;
  const isLast  = step === TOUR_STEPS.length - 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
      accessibilityViewIsModal>
      <View style={styles.tourOverlay}>
        <View style={styles.tourCard}>
          {/* Icon */}
          <View style={styles.tourIconWrap}>
            <LinearGradient
              colors={["#1e3a5f", "#2d5a8e"]}
              style={styles.tourIconGrad}>
              <Ionicons name={current.icon} size={32} color="#fff" />
            </LinearGradient>
          </View>

          {/* Content */}
          <Text style={styles.tourTitle}>{current.title}</Text>
          <Text style={styles.tourBody}>{current.body}</Text>

          {/* Progress dots */}
          <View style={styles.tourDots}>
            {TOUR_STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.tourDot, i === step && styles.tourDotActive]}
              />
            ))}
          </View>

          {/* Actions */}
          <View style={styles.tourActions}>
            <Pressable onPress={onSkip} style={styles.tourSkip}
              accessibilityRole="button" accessibilityLabel="تخطي الجولة">
              <Text style={styles.tourSkipText}>تخطي</Text>
            </Pressable>
            <Pressable onPress={onNext} style={styles.tourNext}
              accessibilityRole="button" accessibilityLabel={isLast ? "إنهاء الجولة" : "التالي"}>
              <LinearGradient colors={["#2d5a8e", "#1e3a5f"]} style={styles.tourNextGrad}>
                <Text style={styles.tourNextText}>{isLast ? "ابدأ الآن!" : "التالي"}</Text>
                {!isLast && <Ionicons name="arrow-back" size={14} color="#fff" />}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Shared sub-views ─────────────────────────────────────────────────────────

function EmptyCard({
  icon, title, body, ctaLabel, onCta,
}: { icon: IoniconsName; title: string; body: string; ctaLabel?: string; onCta?: () => void }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyCardIcon}>
        <Ionicons name={icon} size={26} color={theme.colors.brand[400]} />
      </View>
      <Text style={styles.emptyCardTitle}>{title}</Text>
      <Text style={styles.emptyCardBody}>{body}</Text>
      {ctaLabel && onCta && (
        <Pressable onPress={onCta} style={styles.emptyCardCta} accessibilityRole="button" accessibilityLabel={ctaLabel}>
          <Text style={styles.emptyCardCtaText}>{ctaLabel}</Text>
          <Ionicons name="arrow-back" size={13} color={theme.colors.brand[700]} />
        </Pressable>
      )}
    </View>
  );
}

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorRow}>
      <Text style={styles.errorRowText}>تعذّر التحميل</Text>
      <Pressable onPress={onRetry} style={styles.retryBtn}
        accessibilityRole="button" accessibilityLabel="إعادة المحاولة">
        <Ionicons name="refresh" size={13} color={theme.colors.brand[700]} />
        <Text style={styles.retryText}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <View style={{ gap: 8, paddingHorizontal: 16, marginBottom: 4 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow} accessibilityLabel="جارٍ التحميل" />
      ))}
    </View>
  );
}

function WalletSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
      <View style={[styles.skeletonHero]} />
      <View style={styles.skeletonActions}>
        {[0, 1, 2, 3].map((i) => <View key={i} style={styles.skeletonTile} />)}
      </View>
      <View style={styles.skeletonRow} />
      <View style={styles.skeletonRow} />
    </View>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.fullPanel}>
      <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.slate[400]} />
      <Text style={styles.fullPanelTitle}>تعذّر تحميل المحفظة</Text>
      <Text style={styles.fullPanelBody}>تحقق من اتصالك وحاول مرة أخرى.</Text>
      <Pressable onPress={onRetry} style={styles.fullPanelBtn}
        accessibilityRole="button" accessibilityLabel="إعادة المحاولة">
        <LinearGradient colors={["#2d5a8e", "#1e3a5f"]} style={styles.fullPanelBtnGrad}>
          <Ionicons name="refresh" size={14} color="#fff" />
          <Text style={styles.fullPanelBtnText}>إعادة المحاولة</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function UnauthPanel() {
  return (
    <View style={styles.fullPanel} accessibilityRole="text">
      <Ionicons name="lock-closed-outline" size={40} color={theme.colors.slate[400]} />
      <Text style={styles.fullPanelTitle}>سجّل دخولك لعرض محفظتك</Text>
      <Text style={styles.fullPanelBody}>
        تحتاج إلى حساب لعرض رصيد النقاط والقسائم والمكافآت.
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextTier(balance: LoyaltyBalance, tiers: RewardTier[]): RewardTier | null {
  if (!tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => a.min_lifetime_points - b.min_lifetime_points);
  return sorted.find((t) => t.min_lifetime_points > balance.lifetime_earned) ?? null;
}

function getTierProgress(
  balance: LoyaltyBalance,
  current: RewardTier | null,
  next: RewardTier | null,
): number {
  if (!next) return 1;
  const from  = current?.min_lifetime_points ?? 0;
  const to    = next.min_lifetime_points;
  const range = to - from;
  if (range <= 0) return 1;
  return Math.max(0, Math.min(1, (balance.lifetime_earned - from) / range));
}

function getTierIcon(tierName: string): IoniconsName {
  const n = tierName.toLowerCase();
  if (n.includes("بلاتين") || n.includes("plat")) return "diamond-outline";
  if (n.includes("ذهب")   || n.includes("gold")) return "trophy-outline";
  if (n.includes("فضي")   || n.includes("silv")) return "medal-outline";
  return "star-outline";
}

function getTierColor(tierName: string): string {
  const n = tierName.toLowerCase();
  if (n.includes("بلاتين") || n.includes("plat")) return "#E5E4E2";
  if (n.includes("ذهب")   || n.includes("gold")) return "#F59E0B";
  if (n.includes("فضي")   || n.includes("silv")) return "#94A3B8";
  return "#CD7F32"; // bronze
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },

  // ── Screen header ─────────────────────────────────────────────────────────
  screenHeader: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
  },
  screenTitle: {
    flex:          1,
    fontFamily:    theme.fonts.black,
    fontSize:      22,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.4,
  },
  tourBtn: {
    width:           36,
    height:          36,
    borderRadius:    12,
    backgroundColor: theme.colors.subtle,
    alignItems:      "center",
    justifyContent:  "center",
  },
  walletBackBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: theme.colors.subtle,
    alignItems:      "center",
    justifyContent:  "center",
  },
  walletBackBtnPressed: {
    backgroundColor: theme.colors.border.default,
  },

  // ── Hero card ──────────────────────────────────────────────────────────────
  heroWrap: {
    paddingHorizontal: 16,
    paddingBottom:     4,
  },
  heroCard: {
    borderRadius: 24,
    padding:      20,
    gap:          14,
    overflow:     "hidden",
  },
  heroTopRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  tierBadge: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      20,
    borderWidth:       1,
  },
  tierBadgeText: {
    fontFamily: theme.fonts.black,
    fontSize:   11,
    letterSpacing: 0.3,
  },
  multiplierBadge: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      10,
    backgroundColor:   "rgba(255,255,255,0.15)",
  },
  multiplierText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.85)",
  },
  balanceCenter: {
    alignItems: "center",
    gap:        4,
  },
  balanceEyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      11,
    color:         "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  balanceRow: {
    flexDirection: "row-reverse",
    alignItems:    "baseline",
    gap:           8,
  },
  balanceValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      48,
    color:         "#fff",
    letterSpacing: -2,
  },
  balanceUnit: {
    fontFamily: theme.fonts.bold,
    fontSize:   18,
    color:      "rgba(255,255,255,0.80)",
  },
  statsRow: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius:    16,
    padding:         12,
  },
  statChip: {
    flex:    1,
    gap:     3,
    alignItems: "center",
  },
  statChipValue: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
    color:      "#fff",
  },
  statChipLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      "rgba(255,255,255,0.55)",
  },
  statsSep: {
    width:           1,
    height:          32,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginHorizontal: 8,
  },
  progressSection: {
    gap: 8,
  },
  progressLabelRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.70)",
    flex:       1,
    textAlign:  "right",
  },
  progressPct: {
    fontFamily: theme.fonts.black,
    fontSize:   12,
    color:      "#fff",
    marginStart: 8,
  },
  progressTrack: {
    height:          6,
    backgroundColor: "rgba(255,255,255,0.20)",
    borderRadius:    3,
    overflow:        "hidden",
  },
  progressFill: {
    height:          6,
    backgroundColor: "#F59E0B",
    borderRadius:    3,
  },

  // ── Frozen banner ──────────────────────────────────────────────────────────
  frozenBanner: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               8,
    marginHorizontal:  16,
    marginBottom:      4,
    paddingVertical:   10,
    paddingHorizontal: 14,
    borderRadius:      14,
    backgroundColor:   theme.colors.rose[50],
    borderWidth:       1,
    borderColor:       theme.colors.rose[100],
  },
  frozenText: {
    flex:       1,
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.rose[700],
    textAlign:  "right",
    lineHeight: 17,
  },

  // ── Quick actions ──────────────────────────────────────────────────────────
  quickActionsWrap: {
    paddingHorizontal: 16,
    paddingVertical:   10,
    gap:               8,
  },
  quickActionsRow: {
    flexDirection: "row-reverse",
    gap:           8,
  },
  quickTileOuter: {
    flex: 1,
  },
  quickTile: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    paddingVertical: 12,
    alignItems:      "center",
    gap:             6,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    ...theme.shadow.hairline,
  },
  quickTileDisabled: {
    backgroundColor: theme.colors.subtle,
    borderColor:     theme.colors.border.hairline,
  },
  quickTileIconWrap: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },
  quickTileLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      theme.colors.text.primary,
    textAlign:  "center",
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingTop:        12,
    paddingBottom:     8,
  },
  sectionTitleWrap: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           6,
  },
  sectionTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  seeAll: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand[600],
  },

  // ── Cards list ─────────────────────────────────────────────────────────────
  cardList: {
    paddingHorizontal: 16,
    gap:               8,
  },

  // ── Coupon card ────────────────────────────────────────────────────────────
  couponCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             10,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    paddingVertical: 14,
    paddingEnd:      14,
    paddingStart:    0,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    overflow:        "hidden",
    ...theme.shadow.card,
  },
  couponAccent: {
    width:           4,
    alignSelf:       "stretch",
    backgroundColor: theme.colors.brand[500],
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    marginEnd:       10,
  },
  couponCode: {
    fontFamily:    theme.fonts.black,
    fontSize:      17,
    color:         theme.colors.text.primary,
    letterSpacing: 1.2,
    textAlign:     "right",
  },
  couponExpiry: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
    marginTop:  2,
  },
  activeBadge: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               3,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      8,
    backgroundColor:   theme.colors.brand[600],
  },
  activeBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize:   9,
    color:      "#fff",
  },
  copyBtn: {
    width:           34,
    height:          34,
    borderRadius:    10,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     theme.colors.brand[200],
  },
  copyBtnDone: {
    backgroundColor: theme.colors.brand[600],
    borderColor:     theme.colors.brand[600],
  },

  // ── Show more ──────────────────────────────────────────────────────────────
  showMoreBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               6,
    paddingVertical:   12,
    borderRadius:      14,
    borderWidth:       1,
    borderColor:       theme.colors.brand[200],
    borderStyle:       "dashed",
    backgroundColor:   theme.colors.brand[50],
  },
  showMoreText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand[700],
  },

  // ── Redemption card ────────────────────────────────────────────────────────
  redemptionCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
    ...theme.shadow.card,
  },
  redemptionIcon: {
    width:           42,
    height:          42,
    borderRadius:    12,
    backgroundColor: theme.colors.amber[50],
    alignItems:      "center",
    justifyContent:  "center",
  },
  redemptionIconDone: {
    backgroundColor: theme.colors.brand[50],
  },
  redemptionPts: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  redemptionState: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
    marginTop:  2,
  },
  stateChip: {
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderRadius:      8,
  },
  stateChipPending: {
    backgroundColor: theme.colors.amber[50],
    borderWidth:     1,
    borderColor:     theme.colors.amber[200],
  },
  stateChipDone: {
    backgroundColor: theme.colors.brand[50],
    borderWidth:     1,
    borderColor:     theme.colors.brand[200],
  },
  stateChipText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
  },
  stateChipTextPending: { color: theme.colors.amber[700] },
  stateChipTextDone:    { color: theme.colors.brand[700] },

  // ── Empty / error shared ──────────────────────────────────────────────────
  emptyRow: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               10,
    marginHorizontal:  16,
    paddingVertical:   14,
    paddingHorizontal: 16,
    borderRadius:      14,
    backgroundColor:   theme.colors.surfaceSunken,
    marginBottom:      4,
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      theme.colors.text.secondary,
    flex:       1,
    textAlign:  "right",
  },
  emptyCard: {
    marginHorizontal:  16,
    backgroundColor:   theme.colors.surfaceSunken,
    borderRadius:      18,
    padding:           20,
    alignItems:        "center",
    gap:               8,
    marginBottom:      4,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  emptyCardIcon: {
    width:           60,
    height:          60,
    borderRadius:    18,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    4,
  },
  emptyCardTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.2,
  },
  emptyCardBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 18,
    maxWidth:   280,
  },
  emptyCardCta: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      10,
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.brand[200],
    marginTop:         4,
  },
  emptyCardCtaText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.brand[700],
  },
  errorRow: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "space-between",
    marginHorizontal:  16,
    paddingVertical:   12,
    paddingHorizontal: 14,
    borderRadius:      14,
    backgroundColor:   theme.colors.surfaceSunken,
    marginBottom:      4,
  },
  errorRowText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.text.secondary,
    textAlign:  "right",
  },
  retryBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    backgroundColor:   theme.colors.surface,
  },
  retryText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.brand[700],
  },

  // ── Skeleton ───────────────────────────────────────────────────────────────
  skeletonHero: {
    height:          200,
    borderRadius:    24,
    backgroundColor: theme.colors.surfaceSunken,
  },
  skeletonActions: {
    flexDirection: "row-reverse",
    gap:           8,
  },
  skeletonTile: {
    flex:            1,
    height:          78,
    borderRadius:    16,
    backgroundColor: theme.colors.surfaceSunken,
  },
  skeletonRow: {
    height:          60,
    borderRadius:    16,
    backgroundColor: theme.colors.surfaceSunken,
    marginHorizontal: 16,
    marginBottom:    4,
  },

  // ── Full-screen panels ─────────────────────────────────────────────────────
  fullPanel: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 32,
    gap:             12,
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
  },
  fullPanelBtn: {
    marginTop:    8,
    borderRadius: 14,
    overflow:     "hidden",
  },
  fullPanelBtnGrad: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 24,
    paddingVertical:   13,
  },
  fullPanelBtnText: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      "#fff",
  },

  // ── Tour modal ─────────────────────────────────────────────────────────────
  tourOverlay: {
    flex:            1,
    backgroundColor: "rgba(0,0,0,0.60)",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         24,
  },
  tourCard: {
    width:           "100%",
    maxWidth:        380,
    backgroundColor: theme.colors.surface,
    borderRadius:    28,
    padding:         28,
    alignItems:      "center",
    gap:             12,
    ...theme.shadow.lg,
  },
  tourIconWrap: {
    borderRadius: 24,
    overflow:     "hidden",
    marginBottom: 4,
  },
  tourIconGrad: {
    width:          80,
    height:         80,
    alignItems:     "center",
    justifyContent: "center",
  },
  tourTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      19,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.3,
  },
  tourBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   14,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 22,
    maxWidth:   300,
  },
  tourDots: {
    flexDirection: "row",
    gap:           6,
    marginTop:     4,
  },
  tourDot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: theme.colors.border.default,
  },
  tourDotActive: {
    width:           20,
    backgroundColor: theme.colors.brand[600],
  },
  tourActions: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             10,
    width:           "100%",
    marginTop:       8,
  },
  tourSkip: {
    paddingVertical:   12,
    paddingHorizontal: 18,
    borderRadius:      14,
    backgroundColor:   theme.colors.subtle,
  },
  tourSkipText: {
    fontFamily: theme.fonts.bold,
    fontSize:   14,
    color:      theme.colors.text.secondary,
  },
  tourNext: {
    flex:         1,
    borderRadius: 14,
    overflow:     "hidden",
  },
  tourNextGrad: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "center",
    gap:            6,
    paddingVertical: 13,
  },
  tourNextText: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      "#fff",
  },
});

export default LoyaltyWalletScreen;
