/**
 * GiftCatalogScreen — 2026 rebuild on the @/shared/kit design language.
 *
 * Architecture (completely new — replaces the dark navy hero layout):
 *   • Light boutique page: editorial header (back icon-button, start-aligned
 *     display title, floating balance pill), a stats band (available gifts /
 *     starting cost), then a 2-column gift grid.
 *   • Gift card: sunken image stage with an ink points-chip overlay, stock
 *     status line with a semantic dot, name, and a kit Button for redeem.
 *
 * Functional core (kept — crash-hardened, do not regress):
 *   • fmtN() wraps every number format (Hermes ICU variability can throw).
 *   • safeUri() validates image URLs before <Image>.
 *   • gifts.data is Array.isArray-gated; inventory math is NaN-proof.
 *   • GiftAddressSheet mounts only while visible with an active gift.
 *   • Redemption flow: balance check → address sheet → online RPC / offline
 *     queue → success/error sheets via decodeRedeemError.
 */

import React, { useCallback, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart, BACK_CHEVRON } from "@/utils/layout";
import { useScreenTrace } from "@/features/observability";
import { kit, Button, IconButton } from "@/shared/kit";
import { useGiftCatalog } from "../hooks/useGiftCatalog";
import { useLoyaltyBalance } from "../hooks/useLoyaltyBalance";
import { useQueuedRedeemGift } from "../hooks/useQueuedRedeemGift";
import { GiftAddressSheet } from "../components/GiftAddressSheet";
import type { GiftCatalogItem, GiftInventory, RedemptionAddress } from "../types";
import { showErrorSheet, showSuccessSheet } from "@/shared/store/appSheetStore";

type TFunc = ReturnType<typeof useTranslation>["t"];

const IS_RTL = isRtl();
const TEXT_START = textAlignStart(IS_RTL);

interface CatalogEntry extends GiftCatalogItem {
  inventory?: GiftInventory;
}

/**
 * Safe number formatter. `toLocaleString(locale)` can throw on some Hermes
 * builds depending on shipped ICU subsets; a render-path throw would put the
 * whole screen on the ErrorBoundary. Never let number formatting throw.
 */
function fmtN(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n ?? 0);
  if (!Number.isFinite(num)) return "0";
  try {
    return num.toLocaleString("ar-EG");
  } catch {
    try { return num.toLocaleString(); } catch { return String(num); }
  }
}

/** Defensively coerce to a valid URI string; never let a malformed url crash <Image>. */
function safeUri(u: unknown): string | null {
  if (typeof u !== "string") return null;
  const trimmed = u.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

export function GiftCatalogScreen() {
  useScreenTrace("loyalty-gifts");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const balance = useLoyaltyBalance();
  const gifts   = useGiftCatalog();
  const redeem  = useQueuedRedeemGift();

  const [redeemingGiftId, setRedeemingGiftId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeGift, setActiveGift] = useState<CatalogEntry | null>(null);

  const refreshing =
    (balance.isFetching && !balance.isLoading) ||
    (gifts.isFetching && !gifts.isLoading);
  const cardWidth = Math.max(150, Math.floor((width - kit.sp(5) * 2 - 12) / 2));

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void balance.refetch();
    void gifts.refetch();
  }, [balance, gifts]);

  const handleRedeem = useCallback(
    (gift: CatalogEntry) => {
      const currentBalance = balance.data?.balance ?? 0;
      if (currentBalance < gift.points_cost) {
        showErrorSheet(
          t("loyalty.insufficientPointsTitle"),
          t("loyalty.giftInsufficientBody", {
            cost:    fmtN(gift.points_cost),
            name:    gift.name,
            balance: fmtN(currentBalance),
          }),
        );
        return;
      }
      setActiveGift(gift);
      setSheetVisible(true);
    },
    [balance.data, t],
  );

  // Clear in-flight flag + show error/success sheet on settle.
  React.useEffect(() => {
    if (!redeem.isPending && redeemingGiftId !== null) {
      setRedeemingGiftId(null);
      if (redeem.isError && redeem.error) {
        showErrorSheet(t("loyalty.redeemErrorTitle"), decodeRedeemError(redeem.error, t));
        redeem.reset();
      } else if (redeem.isSuccess && redeem.data) {
        showSuccessSheet(
          t("loyalty.giftRedeemSuccessTitle"),
          t("loyalty.giftRedeemSuccessBody", { balance: fmtN(redeem.data.balance) }),
        );
        redeem.reset();
        setSheetVisible(false);
        setActiveGift(null);
      }
    }
  }, [redeem.isPending, redeem.isError, redeem.error, redeem.isSuccess, redeem.data, redeemingGiftId, redeem.reset, t]);

  const closeSheet = useCallback(() => {
    if (redeem.isPending) return;
    setSheetVisible(false);
    setActiveGift(null);
  }, [redeem.isPending]);

  const handleConfirmAddress = useCallback((address: RedemptionAddress) => {
    if (!activeGift) return;
    setRedeemingGiftId(activeGift.id);
    const result = redeem.redeem({ giftId: activeGift.id, address });
    if (result.mode === "queued") {
      setRedeemingGiftId(null);
      setSheetVisible(false);
      setActiveGift(null);
      showSuccessSheet(
        t("loyalty.giftQueuedTitle"),
        t("loyalty.giftQueuedBody"),
      );
    }
  }, [activeGift, redeem, t]);

  // ── Header (shared across load states) ──
  const header = (
    <View style={[s.header, { paddingTop: insets.top + 10 }]}>
      <View style={s.headerRow}>
        <IconButton
          icon={BACK_CHEVRON}
          onPress={() => router.back()}
          accessibilityLabel={t("common.back")}
        />
        {balance.data && (
          <View
            style={s.balancePill}
            accessibilityRole="text"
            accessibilityLabel={t("loyalty.balanceA11y", { n: balance.data.balance })}>
            <Ionicons name="star" size={13} color={kit.color.accentDeep} />
            <UIText style={s.balanceValue}>{fmtN(balance.data.balance)}</UIText>
            <UIText style={s.balanceUnit}>نقطة</UIText>
          </View>
        )}
      </View>
      <UIText style={s.title} accessibilityRole="header">
        {t("loyalty.giftCatalogTitle")}
      </UIText>
      <UIText style={s.subtitle}>{t("loyalty.giftCatalogSubtitle")}</UIText>
    </View>
  );

  if (gifts.isLoading) {
    return (
      <View style={s.screen}>
        {header}
        <ScrollView contentContainerStyle={s.content}>
          <GridSkeleton cardWidth={cardWidth} />
        </ScrollView>
      </View>
    );
  }

  if (gifts.isError) {
    return (
      <View style={s.screen}>
        {header}
        <ErrorPanel onRetry={() => void gifts.refetch()} />
      </View>
    );
  }

  const list = Array.isArray(gifts.data) ? gifts.data : [];
  const availableCount = list.filter((gift) => {
    const inv = gift.inventory;
    if (!inv) return true;
    const remaining = (inv.total_stock ?? 0) - (inv.reserved ?? 0) - (inv.fulfilled ?? 0);
    return remaining > 0;
  }).length;
  const lowestCost = list.length
    ? Math.min(...list.map((gift) => Number(gift.points_cost) || Infinity))
    : null;
  const lowestCostValid = lowestCost !== null && Number.isFinite(lowestCost) ? lowestCost : null;

  return (
    <View style={s.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={kit.color.accent}
            accessibilityLabel={t("loyalty.giftCatalogRefreshA11y")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats band ── */}
        <Animated.View entering={FadeInDown.duration(280)} style={s.statsBand}>
          <View style={s.statBlock}>
            <UIText style={s.statValue}>{fmtN(availableCount)}</UIText>
            <UIText style={s.statLabel}>هدايا متاحة</UIText>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBlock}>
            <UIText style={s.statValue}>
              {lowestCostValid !== null ? fmtN(lowestCostValid) : "—"}
            </UIText>
            <UIText style={s.statLabel}>أقل تكلفة بالنقاط</UIText>
          </View>
        </Animated.View>

        {list.length === 0 ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="gift-outline" size={30} color={kit.color.inkFaint} />
            </View>
            <UIText style={s.emptyText} maxFontSizeMultiplier={1.5}>
              {t("loyalty.giftCatalogEmpty")}
            </UIText>
          </View>
        ) : (
          <View style={s.grid}>
            {list.map((gift, i) => (
              <Animated.View
                key={gift.id}
                entering={FadeInDown.delay(Math.min(i, 6) * 50).duration(260)}>
                <GiftCard
                  gift={gift}
                  width={cardWidth}
                  currentBalance={balance.data?.balance ?? 0}
                  isRedeeming={redeemingGiftId === gift.id && redeem.isPending}
                  onRedeem={() => handleRedeem(gift)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {sheetVisible && activeGift && (
        <GiftAddressSheet
          visible={sheetVisible}
          giftName={activeGift.name}
          pointsCost={activeGift.points_cost}
          submitting={redeem.isPending && redeemingGiftId === activeGift.id}
          onConfirm={handleConfirmAddress}
          onClose={closeSheet}
        />
      )}
    </View>
  );
}

// ─── Gift card ───────────────────────────────────────────────────────────────

interface GiftCardProps {
  gift:           CatalogEntry;
  width:          number;
  currentBalance: number;
  isRedeeming:    boolean;
  onRedeem:       () => void;
}

function GiftCard({ gift, width, currentBalance, isRedeeming, onRedeem }: GiftCardProps) {
  const { t } = useTranslation();
  const available = (() => {
    const inv = gift.inventory;
    if (!inv) return null;
    const r = (inv.total_stock ?? 0) - (inv.reserved ?? 0) - (inv.fulfilled ?? 0);
    return Math.max(Number.isFinite(r) ? r : 0, 0);
  })();
  const soldOut   = available !== null && available <= 0;
  const lowStock  = available !== null && available > 0 && available <= 3;
  const canAfford = currentBalance >= gift.points_cost;
  const disabled  = isRedeeming || soldOut;

  const statusColor = soldOut ? kit.color.inkFaint : lowStock ? kit.color.warn : kit.color.success;
  const statusLabel = soldOut
    ? t("loyalty.giftSoldOutPill")
    : lowStock
    ? t("loyalty.giftStockRemaining", { n: available })
    : "متاح الآن";

  const buttonLabel = isRedeeming
    ? t("loyalty.redeemLoading")
    : soldOut
    ? t("loyalty.giftRedeemSoldOut")
    : !canAfford
    ? t("loyalty.giftRedeemInsufficient")
    : t("loyalty.giftRedeem");

  const uri = safeUri(gift.image_url);

  return (
    <View
      style={[s.card, { width }]}
      accessibilityRole="text"
      accessibilityLabel={t("loyalty.giftA11y", { name: gift.name, points: fmtN(gift.points_cost) })}>
      {/* Image stage */}
      <View style={s.cardStage}>
        {uri ? (
          <Image
            source={{ uri }}
            style={[s.cardImage, soldOut && s.cardImageMuted]}
            contentFit="contain"
            transition={150}
          />
        ) : (
          <Ionicons name="gift" size={30} color={kit.color.inkFaint} />
        )}
        {/* Points chip */}
        <View style={s.pointsChip}>
          <Ionicons name="star" size={9} color={kit.color.onInk} />
          <UIText style={s.pointsChipText} maxFontSizeMultiplier={1.2}>
            {fmtN(gift.points_cost)}
          </UIText>
        </View>
      </View>

      {/* Status */}
      <View style={s.statusRow}>
        <View style={[s.statusDot, { backgroundColor: statusColor }]} />
        <UIText style={[s.statusText, { color: statusColor }]} maxFontSizeMultiplier={1.2}>
          {statusLabel}
        </UIText>
      </View>

      {/* Name */}
      <UIText style={s.cardName} numberOfLines={2} maxFontSizeMultiplier={1.3}>
        {gift.name}
      </UIText>

      {/* Redeem */}
      <Button
        label={buttonLabel}
        onPress={onRedeem}
        variant={canAfford && !disabled ? "primary" : "secondary"}
        size="sm"
        full
        disabled={disabled || !canAfford}
        accessibilityLabel={t("loyalty.redeemBtnA11y", { name: gift.name, cost: fmtN(gift.points_cost) })}
      />
    </View>
  );
}

// ─── Shared sub-views ─────────────────────────────────────────────────────────

function GridSkeleton({ cardWidth }: { cardWidth: number }) {
  const { t } = useTranslation();
  return (
    <View style={s.grid} accessibilityLabel={t("common.loading")}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={[s.card, s.skeletonCard, { width: cardWidth }]}>
          <View style={[s.cardStage, s.skeletonBlock]} />
          <View style={[s.skeletonLine, { width: "55%" }]} />
          <View style={[s.skeletonLine, { width: "80%" }]} />
          <View style={[s.skeletonLine, { height: 34, borderRadius: kit.radius.pill }]} />
        </View>
      ))}
    </View>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={s.errorPanel}>
      <View style={s.emptyIcon}>
        <Ionicons name="cloud-offline-outline" size={30} color={kit.color.inkFaint} />
      </View>
      <UIText style={s.errorTitle} maxFontSizeMultiplier={1.4}>
        {t("loyalty.giftCatalogErrorTitle")}
      </UIText>
      <UIText style={s.errorBody} maxFontSizeMultiplier={1.5}>
        {t("loyalty.giftCatalogErrorBody")}
      </UIText>
      <Button
        label={t("common.retry")}
        onPress={onRetry}
        variant="primary"
        size="md"
        icon="refresh"
        style={{ marginTop: kit.sp(2) }}
      />
    </View>
  );
}

function decodeRedeemError(error: Error, t: TFunc): string {
  const m = error.message ?? "";
  if (m.includes("insufficient_balance")) return t("loyalty.redeemErrorInsufficientBalance");
  if (m.includes("out_of_stock"))         return t("loyalty.giftRedeemErrorOutOfStock");
  if (m.includes("gift_not_available"))   return t("loyalty.giftRedeemErrorNotAvailable");
  if (m.includes("account_frozen"))       return t("loyalty.redeemErrorAccountFrozen");
  if (m.includes("not_authenticated"))    return t("loyalty.redeemErrorNotAuthenticated");
  return t("loyalty.redeemErrorDefault");
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: kit.color.canvas },

  header: {
    paddingHorizontal: kit.sp(5),
    paddingBottom:     kit.sp(4),
    gap:               kit.sp(2),
  },
  headerRow: {
    flexDirection:  flexRow(IS_RTL),
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   kit.sp(2),
  },
  balancePill: {
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    gap:               5,
    backgroundColor:   kit.color.accentTint,
    borderRadius:      kit.radius.pill,
    paddingHorizontal: 14,
    paddingVertical:   8,
  },
  balanceValue: {
    fontFamily: theme.fonts.black,
    fontSize: 14, lineHeight: 20,
    color: kit.color.accentDeep,
    includeFontPadding: false,
  },
  balanceUnit: {
    fontFamily: theme.fonts.bold,
    fontSize: 10, lineHeight: 15,
    color: kit.color.accentDeep,
    includeFontPadding: false,
  },
  title: {
    fontFamily: theme.fonts.black,
    fontSize: kit.type.display.fontSize - 4,
    lineHeight: kit.type.display.lineHeight - 4,
    color: kit.color.ink,
    textAlign: TEXT_START,
    includeFontPadding: false,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: kit.type.body.fontSize - 1,
    lineHeight: kit.type.body.lineHeight - 2,
    color: kit.color.inkSoft,
    textAlign: TEXT_START,
    includeFontPadding: false,
  },

  content: {
    paddingHorizontal: kit.sp(5),
    gap:               kit.sp(4),
  },

  statsBand: {
    flexDirection:   flexRow(IS_RTL),
    alignItems:      "center",
    backgroundColor: kit.color.surface,
    borderRadius:    kit.radius.card,
    borderWidth:     1,
    borderColor:     kit.color.line,
    paddingVertical: kit.sp(4),
    ...kit.shadow.raised,
  },
  statBlock: { flex: 1, alignItems: "center", gap: 2 },
  statValue: {
    fontFamily: theme.fonts.black,
    fontSize: 20, lineHeight: 28,
    color: kit.color.ink,
    includeFontPadding: false,
  },
  statLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 11, lineHeight: 16,
    color: kit.color.inkFaint,
    includeFontPadding: false,
  },
  statDivider: {
    width:           StyleSheet.hairlineWidth,
    alignSelf:       "stretch",
    backgroundColor: kit.color.lineStrong,
  },

  grid: {
    flexDirection:  flexRow(IS_RTL),
    flexWrap:       "wrap",
    justifyContent: "space-between",
    rowGap:         12,
  },

  card: {
    backgroundColor: kit.color.surface,
    borderRadius:    kit.radius.card,
    borderWidth:     1,
    borderColor:     kit.color.line,
    padding:         10,
    gap:             8,
    ...kit.shadow.raised,
  },
  cardStage: {
    width:           "100%",
    aspectRatio:     1.05,
    borderRadius:    kit.radius.control,
    backgroundColor: kit.color.well,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
  },
  cardImage:      { width: "100%", height: "100%" },
  cardImageMuted: { opacity: 0.35 },
  pointsChip: {
    position:          "absolute",
    top:               8,
    start:             8,
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    gap:               4,
    backgroundColor:   kit.color.ink,
    borderRadius:      kit.radius.pill,
    paddingHorizontal: 9,
    paddingVertical:   4,
  },
  pointsChipText: {
    fontFamily: theme.fonts.black,
    fontSize: 10, lineHeight: 14,
    color: kit.color.onInk,
    includeFontPadding: false,
  },
  statusRow: {
    flexDirection: flexRow(IS_RTL),
    alignItems:    "center",
    gap:           6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10, lineHeight: 15,
    includeFontPadding: false,
  },
  cardName: {
    fontFamily: theme.fonts.black,
    fontSize: 13, lineHeight: 19,
    color: kit.color.ink,
    textAlign: TEXT_START,
    minHeight: 38,
    includeFontPadding: false,
  },

  // Skeleton
  skeletonCard:  {},
  skeletonBlock: { backgroundColor: kit.color.well },
  skeletonLine: {
    height:          12,
    borderRadius:    6,
    backgroundColor: kit.color.well,
  },

  // Empty / error
  emptyWrap: {
    alignItems:      "center",
    paddingVertical: kit.sp(14),
    gap:             kit.sp(3),
  },
  emptyIcon: {
    width: 68, height: 68, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    backgroundColor: kit.color.well,
  },
  emptyText: {
    fontFamily: theme.fonts.bold,
    fontSize: 13, lineHeight: 20,
    color: kit.color.inkSoft,
    textAlign: "center",
  },
  errorPanel: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: kit.sp(8),
    gap:               kit.sp(2),
  },
  errorTitle: {
    fontFamily: theme.fonts.black,
    fontSize: 16, lineHeight: 24,
    color: kit.color.ink,
    textAlign: "center",
  },
  errorBody: {
    fontFamily: theme.fonts.regular,
    fontSize: 13, lineHeight: 20,
    color: kit.color.inkSoft,
    textAlign: "center",
  },
});

export default GiftCatalogScreen;
