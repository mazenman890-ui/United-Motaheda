/**
 * GiftCatalogScreen — browse and redeem inventory-backed gifts.
 *
 * Each row shows: thumbnail (or placeholder), name, points cost, and a
 * redeem button. Inventory state drives an availability badge so users see
 * "low stock" / "out of stock" inline; the server-side reserve_inventory
 * is the source of truth.
 *
 * Redemption flow:
 *   1. Tap redeem on a gift.
 *   2. Sheet requests full delivery address (saved or new).
 *   3. Request is sent (or queued when offline).
 */

import React, { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";
import { useScreenTrace } from "@/features/observability";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { useGiftCatalog } from "../hooks/useGiftCatalog";
import { useLoyaltyBalance } from "../hooks/useLoyaltyBalance";
import { useQueuedRedeemGift } from "../hooks/useQueuedRedeemGift";
import { GiftAddressSheet } from "../components/GiftAddressSheet";
import type { GiftCatalogItem, GiftInventory, RedemptionAddress } from "../types";
import { showErrorSheet, showSuccessSheet } from "@/shared/store/appSheetStore";

type TFunc = ReturnType<typeof useTranslation>["t"];

interface CatalogEntry extends GiftCatalogItem {
  inventory?: GiftInventory;
}

/**
 * Safe number formatter. `Number.prototype.toLocaleString(locale)` can throw or
 * return garbage in some Hermes builds depending on which Intl ICU subsets
 * shipped. We coerce to a number first, fall back to the default formatter on
 * any error, and never let a number render path throw.
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
  const cardWidth = Math.max(150, Math.floor((width - 44) / 2));

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

  // Clear in-flight flag + show error/success alert on settle.
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

  if (gifts.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title={t("loyalty.giftCatalogTitle")} subtitle={t("loyalty.giftCatalogSubtitle")} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <ListSkeleton rows={3} />
        </ScrollView>
      </View>
    );
  }

  if (gifts.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title={t("loyalty.giftCatalogTitle")} subtitle={t("loyalty.giftCatalogSubtitle")} />
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
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <SubScreenHeader title={t("loyalty.giftCatalogTitle")} subtitle={t("loyalty.giftCatalogSubtitle")} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            accessibilityLabel={t("loyalty.giftCatalogRefreshA11y")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#071C37", "#0A315A", "#115E75"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroOrbLarge} />
          <View style={styles.heroOrbSmall} />
          <View style={styles.heroHeader}>
            <View style={styles.heroText}>
              <UIText style={styles.heroEyebrow}>هدايا مختارة بعناية</UIText>
              <UIText style={styles.heroTitle}>{t("loyalty.giftCatalogTitle")}</UIText>
              <UIText style={styles.heroSub}>{t("loyalty.giftCatalogSubtitle")}</UIText>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="gift-outline" size={24} color="#FDE68A" />
            </View>
          </View>

          {balance.data && (
            <View style={styles.heroBalanceCard} accessibilityRole="text"
                  accessibilityLabel={t("loyalty.balanceA11y", { n: balance.data.balance })}>
              <UIText style={styles.heroBalanceLabel}>رصيد الاستبدال</UIText>
              <View style={styles.heroBalanceRow}>
                <UIText style={styles.heroBalanceValue}>
                  {fmtN(balance.data.balance)}
                </UIText>
                <UIText style={styles.heroBalanceUnit}>نقطة</UIText>
              </View>
            </View>
          )}

          <View style={styles.heroStats}>
            <StatChip icon="sparkles-outline" label="هدايا متاحة" value={fmtN(availableCount)} />
            <StatChip
              icon="pricetag-outline"
              label="تبدأ من"
              value={lowestCostValid !== null ? `${fmtN(lowestCostValid)} نقطة` : "—"}
            />
          </View>
        </LinearGradient>

        {list.length === 0 ? (
          <View style={{ paddingTop: 60 }}>
            <EmptyRow
              icon="gift-outline"
              message={t("loyalty.giftCatalogEmpty")}
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {list.map((gift) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                width={cardWidth}
                currentBalance={balance.data?.balance ?? 0}
                isRedeeming={redeemingGiftId === gift.id && redeem.isPending}
                onRedeem={() => handleRedeem(gift)}
              />
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

// ─── Gift row ───────────────────────────────────────────────────────────────

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
  const soldOut  = available !== null && available <= 0;
  const lowStock = available !== null && available > 0 && available <= 3;
  const canAfford = currentBalance >= gift.points_cost;
  const disabled  = isRedeeming || soldOut;
  const statusTone = soldOut
    ? styles.stockToneSoldOut
    : lowStock
    ? styles.stockToneLow
    : styles.stockToneAvailable;
  const statusLabel = soldOut
    ? t("loyalty.giftSoldOutPill")
    : lowStock
    ? t("loyalty.giftStockRemaining", { n: available })
    : "متاح الآن";

  return (
    <View style={[styles.giftCard, { width }]} accessibilityRole="text"
          accessibilityLabel={t("loyalty.giftA11y", { name: gift.name, points: fmtN(gift.points_cost) })}>
      <View style={styles.giftThumb}>
        {(() => {
          const uri = safeUri(gift.image_url);
          return uri ? (
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              transition={180}
            />
          ) : (
            <Ionicons name="gift" size={28} color={theme.colors.brand[400]} />
          );
        })()}
        <View style={[styles.stockPill, statusTone]}>
          <UIText style={[styles.stockPillText, soldOut && styles.stockPillTextLight]} maxFontSizeMultiplier={1.2}>
            {statusLabel}
          </UIText>
        </View>
        {soldOut && (
          <View style={styles.oosOverlay}>
            <UIText style={styles.oosText} maxFontSizeMultiplier={1.2}>{t("loyalty.giftSoldOutPill")}</UIText>
          </View>
        )}
      </View>

      <View style={styles.giftBody}>
        <UIText style={styles.giftName} numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {gift.name}
        </UIText>
        {gift.description && (
          <UIText style={styles.giftDesc} numberOfLines={2} maxFontSizeMultiplier={1.4}>
            {gift.description}
          </UIText>
        )}
        <View style={styles.giftMeta}>
          <View style={styles.costWrap}>
            <Ionicons name="star" size={14} color={theme.colors.amber[600]} />
            <UIText style={styles.costText} maxFontSizeMultiplier={1.3}>
              {fmtN(gift.points_cost)}
            </UIText>
            <UIText style={styles.costUnit}>نقطة</UIText>
          </View>
          {!soldOut && available !== null && (
            <UIText style={styles.stockInlineText} maxFontSizeMultiplier={1.2}>
              {fmtN(available)} متاحة
            </UIText>
          )}
        </View>
        <View style={styles.giftFoot}>
          <Pressable
            onPress={onRedeem}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t("loyalty.redeemBtnA11y", { name: gift.name, cost: fmtN(gift.points_cost) })}
            accessibilityState={{ disabled, busy: isRedeeming }}
            style={({ pressed }) => [
              styles.redeemBtn,
              !canAfford && !disabled && styles.redeemBtnInsufficient,
              disabled && styles.redeemBtnDisabled,
              pressed && !disabled && { opacity: 0.85 },
            ]}
          >
            <UIText
              style={[
                styles.redeemBtnText,
                !canAfford && !disabled && styles.redeemBtnTextInsufficient,
                disabled && styles.redeemBtnTextDisabled,
              ]}
              maxFontSizeMultiplier={1.2}
            >
              {isRedeeming
                ? t("loyalty.redeemLoading")
                : soldOut
                ? t("loyalty.giftRedeemSoldOut")
                : !canAfford
                ? t("loyalty.giftRedeemInsufficient")
                : t("loyalty.giftRedeem")}
            </UIText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StatChip({ icon, label, value }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statChip}>
      <View style={styles.statChipIcon}>
        <Ionicons name={icon} size={14} color="#D1FAE5" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <UIText style={styles.statChipLabel}>{label}</UIText>
        <UIText style={styles.statChipValue}>{value}</UIText>
      </View>
    </View>
  );
}

// ─── Shared sub-views ───────────────────────────────────────────────────────

function ListSkeleton({ rows }: { rows: number }) {
  const { t } = useTranslation();
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.giftCard, styles.skeletonRow]} accessibilityLabel={t("common.loading")} />
      ))}
    </View>
  );
}

function EmptyRow({ icon, message }: { icon: React.ComponentProps<typeof Ionicons>["name"]; message: string }) {
  return (
    <View style={styles.emptyRow} accessibilityRole="text" accessibilityLabel={message}>
      <Ionicons name={icon} size={20} color={theme.colors.slate[400]} />
      <UIText style={styles.emptyText} maxFontSizeMultiplier={1.5}>{message}</UIText>
    </View>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.errorPanel}>
      <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.slate[400]} />
      <UIText style={styles.errorTitle} maxFontSizeMultiplier={1.4}>{t("loyalty.giftCatalogErrorTitle")}</UIText>
      <UIText style={styles.errorBody} maxFontSizeMultiplier={1.5}>
        {t("loyalty.giftCatalogErrorBody")}
      </UIText>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t("common.retry")}
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="refresh" size={14} color="#fff" />
        <UIText style={styles.primaryBtnText}>{t("common.retry")}</UIText>
      </Pressable>
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

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  heroCard: {
    borderRadius:    24,
    padding:         18,
    marginBottom:    18,
    overflow:        "hidden",
    gap:             14,
    ...theme.shadow.lg,
  },
  heroOrbLarge: {
    position:        "absolute",
    top:             -70,
    right:           -40,
    width:           190,
    height:          190,
    borderRadius:    95,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroOrbSmall: {
    position:        "absolute",
    bottom:          -36,
    left:            -24,
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: "rgba(45,212,191,0.12)",
  },
  heroHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    gap:            16,
  },
  heroText: {
    flex: 1,
    gap:  4,
  },
  heroEyebrow: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "#A7F3D0",
    textAlign:  textAlignStart(isRtl()),
    letterSpacing: 0.4,
  },
  heroTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   24,
    color:      "#FFFFFF",
    textAlign:  textAlignStart(isRtl()),
    letterSpacing: -0.6,
  },
  heroSub: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      "rgba(255,255,255,0.72)",
    lineHeight: 20,
    textAlign:  textAlignStart(isRtl()),
  },
  heroBadge: {
    width:           52,
    height:          52,
    borderRadius:    16,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
  },
  heroBalanceCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius:    18,
    padding:         14,
    gap:             4,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.10)",
  },
  heroBalanceLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.62)",
    textAlign:  textAlignStart(isRtl()),
  },
  heroBalanceRow: {
    flexDirection: "row",
    alignItems:    "baseline",
    gap:           6,
  },
  heroBalanceValue: {
    fontFamily: theme.fonts.black,
    fontSize:   30,
    color:      "#FFFFFF",
    letterSpacing: -1,
  },
  heroBalanceUnit: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      "rgba(255,255,255,0.74)",
  },
  heroStats: {
    flexDirection: "row",
    gap:           10,
  },
  statChip: {
    flex:            1,
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             10,
    padding:         12,
    borderRadius:    16,
    backgroundColor: "rgba(2,6,23,0.22)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.08)",
  },
  statChipIcon: {
    width:           34,
    height:          34,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statChipLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize:   10,
    color:      "rgba(255,255,255,0.62)",
    textAlign:  textAlignStart(isRtl()),
  },
  statChipValue: {
    fontFamily: theme.fonts.black,
    fontSize:   13,
    color:      "#FFFFFF",
    textAlign:  textAlignStart(isRtl()),
  },

  grid: {
    flexDirection:   "row",
    flexWrap:        "wrap",
    justifyContent:  "space-between",
    rowGap:          12,
  },

  // Gift card
  giftCard: {
    alignItems:      "stretch",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    20,
    padding:         12,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.card,
  },
  giftThumb: {
    width:           "100%",
    aspectRatio:     1.08,
    borderRadius:    18,
    backgroundColor: "#F3F7FB",
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
    position:        "relative",
  },
  stockPill: {
    position:          "absolute",
    top:               8,
    insetInlineStart:  8,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderRadius:      999,
  },
  stockPillText: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      theme.colors.amber[700],
  },
  stockPillTextLight: {
    color: "#FFFFFF",
  },
  stockToneAvailable: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth:     1,
    borderColor:     "rgba(34,197,94,0.16)",
  },
  stockToneLow: {
    backgroundColor: theme.colors.amber[50],
    borderWidth:     1,
    borderColor:     theme.colors.amber[100],
  },
  stockToneSoldOut: {
    backgroundColor: "rgba(15,23,42,0.68)",
  },
  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.55)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  oosText: {
    fontFamily: theme.fonts.black,
    fontSize:   11,
    color:      "#fff",
    letterSpacing: 0.5,
  },
  giftBody: {
    flex: 1,
    justifyContent: "space-between",
    gap: 8,
  },
  giftName: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
    color:      theme.colors.text.primary,
    textAlign:  textAlignStart(isRtl()),
    lineHeight: 19,
  },
  giftDesc: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  textAlignStart(isRtl()),
    marginTop:  3,
    lineHeight: 15,
  },
  giftMeta: {
    gap: 4,
  },
  giftFoot: {
    marginTop: 2,
  },
  costWrap: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           5,
  },
  costText: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      theme.colors.text.primary,
  },
  costUnit: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
  },
  stockInlineText: {
    fontFamily: theme.fonts.semibold,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  textAlignStart(isRtl()),
  },
  redeemBtn: {
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 14,
    paddingVertical:   11,
    borderRadius:      14,
    backgroundColor:   theme.colors.brand[600],
  },
  redeemBtnInsufficient: {
    backgroundColor: theme.colors.surfaceSunken,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
  },
  redeemBtnDisabled: {
    backgroundColor: theme.colors.subtle,
  },
  redeemBtnText: {
    fontFamily: theme.fonts.black,
    fontSize:   12,
    color:      "#fff",
  },
  redeemBtnTextInsufficient: {
    color: theme.colors.text.secondary,
  },
  redeemBtnTextDisabled: {
    color: theme.colors.text.disabled,
  },

  // Empty/error/skeleton
  skeletonRow: {
    backgroundColor: theme.colors.surfaceSunken,
    minHeight:       112,
  },
  emptyRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               10,
    paddingVertical:   18,
    paddingHorizontal: 14,
    backgroundColor:   theme.colors.surfaceSunken,
    borderRadius:      14,
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    flex:       1,
    textAlign:  textAlignStart(isRtl()),
  },
  errorPanel: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               10,
  },
  errorTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
    color:      theme.colors.text.primary,
    marginTop:  8,
  },
  errorBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               8,
    backgroundColor:   theme.colors.brand[600],
    borderRadius:      12,
    paddingHorizontal: 18,
    paddingVertical:   11,
    marginTop:         8,
    ...theme.shadow.brand,
  },
  primaryBtnText: {
    fontFamily: theme.fonts.black,
    fontSize:   13,
    color:      "#fff",
  },
});

export default GiftCatalogScreen;
