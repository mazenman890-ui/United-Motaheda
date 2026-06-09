/**
 * CouponsScreen — production-grade.
 *
 * Two stacked sections:
 *   1. "My Coupons"        — issued, not yet consumed; sorted by expiry.
 *   2. "Available to Redeem" — active coupon_batches with points_cost.
 *
 * Uses the loyalty feature hooks for data + mutations. Follows the same
 * skeleton / empty / error / accessibility patterns as LoyaltyWalletScreen.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";
import { useScreenTrace } from "@/features/observability";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { useCouponBatches } from "../hooks/useCouponBatches";
import { useUserCoupons } from "../hooks/useUserCoupons";
import { useLoyaltyBalance } from "../hooks/useLoyaltyBalance";
import { useRedeemCoupon } from "../hooks/useRedeemCoupon";
import type { Coupon, CouponBatch, CouponDiscountKind } from "../types";
import { showErrorSheet, showConfirmSheet } from "@/shared/store/appSheetStore";

type TFunc = ReturnType<typeof useTranslation>["t"];

export function CouponsScreen() {
  useScreenTrace("loyalty-coupons");
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const balance = useLoyaltyBalance();
  const batches = useCouponBatches();
  const coupons = useUserCoupons();
  const redeem  = useRedeemCoupon();

  const [redeemingBatchId, setRedeemingBatchId] = useState<string | null>(null);

  const refreshing =
    (balance.isFetching && !balance.isLoading) ||
    (batches.isFetching && !batches.isLoading) ||
    (coupons.isFetching && !coupons.isLoading);

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void balance.refetch();
    void batches.refetch();
    void coupons.refetch();
  }, [balance, batches, coupons]);

  const handleRedeem = useCallback(
    (batch: CouponBatch) => {
      const currentBalance = balance.data?.balance ?? 0;
      if (currentBalance < batch.points_cost) {
        showErrorSheet(
          t("loyalty.insufficientPointsTitle"),
          t("loyalty.insufficientPointsBody", {
            cost:    batch.points_cost.toLocaleString("ar-EG"),
            balance: currentBalance.toLocaleString("ar-EG"),
          }),
        );
        return;
      }
      showConfirmSheet(
        t("loyalty.redeemConfirmTitle"),
        t("loyalty.redeemConfirmBody", {
          cost: batch.points_cost.toLocaleString("ar-EG"),
          name: batch.name,
        }),
        () => {
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setRedeemingBatchId(batch.id);
          redeem.redeem({ batchId: batch.id });
        },
        { confirmLabel: t("loyalty.redeemConfirmLabel") },
      );
    },
    [balance.data, redeem, t],
  );

  // Clear the in-flight flag when the mutation settles.
  React.useEffect(() => {
    if (!redeem.isPending && redeemingBatchId !== null) {
      setRedeemingBatchId(null);
      if (redeem.isError && redeem.error) {
        showErrorSheet(t("loyalty.redeemErrorTitle"), decodeRedeemError(redeem.error, t));
      }
    }
  }, [redeem.isPending, redeem.isError, redeem.error, redeemingBatchId, t]);

  const issuedCoupons = useMemo(
    () => (coupons.data ?? []).filter((c) => c.state === "issued"),
    [coupons.data],
  );

  // ── Top-level loading: nothing in cache ────────────────────────────────
  if (coupons.isLoading && batches.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title={t("loyalty.couponsTitle")} subtitle={t("loyalty.couponsSubtitle")} />
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <ListSkeleton rows={3} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <SubScreenHeader title={t("loyalty.couponsTitle")} subtitle={t("loyalty.couponsSubtitle")} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: theme.spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            accessibilityLabel={t("loyalty.couponsRefreshA11y")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Balance chip */}
        {balance.data && (
          <View style={styles.balanceChip} accessibilityRole="text"
                accessibilityLabel={t("loyalty.balanceA11y", { n: balance.data.balance })}>
            <Ionicons name="star" size={14} color={theme.colors.brand[700]} />
            <UIText style={styles.balanceText} maxFontSizeMultiplier={1.3}>
              {t("loyalty.balanceChipText", { n: balance.data.balance.toLocaleString("ar-EG") })}
            </UIText>
          </View>
        )}

        <SectionHeader title={t("loyalty.myCoupons")} />
        {coupons.isError ? (
          <ErrorRow onRetry={() => void coupons.refetch()} />
        ) : issuedCoupons.length === 0 ? (
          <EmptyRow
            icon="pricetag-outline"
            message={t("loyalty.couponsIssuedEmpty")}
          />
        ) : (
          issuedCoupons.map((c) => <IssuedCouponRow key={c.id} coupon={c} />)
        )}

        <SectionHeader title={t("loyalty.redeemNew")} />
        {batches.isError ? (
          <ErrorRow onRetry={() => void batches.refetch()} />
        ) : (batches.data ?? []).length === 0 ? (
          <EmptyRow
            icon="storefront-outline"
            message={t("loyalty.couponsBatchesEmpty")}
          />
        ) : (
          (batches.data ?? []).map((b) => (
            <BatchRow
              key={b.id}
              batch={b}
              currentBalance={balance.data?.balance ?? 0}
              isRedeeming={redeemingBatchId === b.id}
              onRedeem={() => handleRedeem(b)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <UIText style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {title}
      </UIText>
    </View>
  );
}

function IssuedCouponRow({ coupon }: { coupon: Coupon }) {
  const { t } = useTranslation();
  const expiry = coupon.expires_at
    ? new Date(coupon.expires_at).toLocaleDateString("ar-EG")
    : null;
  return (
    <View
      style={styles.couponRow}
      accessibilityRole="text"
      accessibilityLabel={t("loyalty.couponA11y", {
        code:   coupon.code,
        expiry: expiry ? t("loyalty.couponExpiryA11y", { date: expiry }) : "",
      })}
    >
      <View style={styles.codeBox}>
        <UIText style={styles.codeText} selectable maxFontSizeMultiplier={1.2}>
          {coupon.code}
        </UIText>
      </View>
      <View style={{ flex: 1 }}>
        <UIText style={styles.couponLabel} maxFontSizeMultiplier={1.4}>{t("loyalty.couponLabel")}</UIText>
        {expiry && (
          <UIText style={styles.couponMeta} maxFontSizeMultiplier={1.4}>
            {t("loyalty.validUntil", { date: expiry })}
          </UIText>
        )}
      </View>
      <View style={styles.statusPill}>
        <UIText style={styles.statusPillText}>{t("loyalty.couponAvailable")}</UIText>
      </View>
    </View>
  );
}

interface BatchRowProps {
  batch:           CouponBatch;
  currentBalance:  number;
  isRedeeming:     boolean;
  onRedeem:        () => void;
}

function BatchRow({ batch, currentBalance, isRedeeming, onRedeem }: BatchRowProps) {
  const { t } = useTranslation();
  const canAfford = currentBalance >= batch.points_cost;
  const remaining = batch.total_supply
    ? Math.max(batch.total_supply - batch.issued_count, 0)
    : null;
  const lowStock = remaining !== null && remaining > 0 && remaining < 20;
  const soldOut  = remaining !== null && remaining <= 0;
  const disabled = isRedeeming || soldOut;

  return (
    <View style={styles.batchCard} accessibilityRole="text"
          accessibilityLabel={t("loyalty.batchA11y", { name: batch.name, cost: batch.points_cost.toLocaleString("ar-EG") })}>
      <View style={styles.batchHead}>
        <View style={styles.discountBadge}>
          <UIText style={styles.discountText} maxFontSizeMultiplier={1.2}>
            {formatDiscount(batch.discount_kind, batch.discount_value, t)}
          </UIText>
        </View>
        <View style={{ flex: 1, marginEnd: theme.spacing.md }}>
          <UIText style={styles.batchTitle} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {batch.name}
          </UIText>
          {batch.min_spend_cents != null && batch.min_spend_cents > 0 && (
            <UIText style={styles.batchMeta} maxFontSizeMultiplier={1.4}>
              {t("loyalty.minSpendBatch", { amount: (batch.min_spend_cents / 100).toLocaleString("ar-EG") })}
            </UIText>
          )}
          {lowStock && (
            <UIText style={styles.lowStockText} maxFontSizeMultiplier={1.4}>
              {t("loyalty.lowStock", { n: remaining })}
            </UIText>
          )}
          {soldOut && (
            <UIText style={styles.soldOutText} maxFontSizeMultiplier={1.4}>
              {t("loyalty.soldOut")}
            </UIText>
          )}
        </View>
      </View>

      <View style={styles.batchFoot}>
        <View style={styles.costWrap}>
          <Ionicons name="star" size={14} color={theme.colors.amber[600]} />
          <UIText style={styles.costText} maxFontSizeMultiplier={1.3}>
            {t("loyalty.costLabel", { n: batch.points_cost.toLocaleString("ar-EG") })}
          </UIText>
        </View>
        <Pressable
          onPress={onRedeem}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={t("loyalty.redeemBtnA11y", { name: batch.name, cost: batch.points_cost.toLocaleString("ar-EG") })}
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
              ? t("loyalty.redeemSoldOutLabel")
              : !canAfford
              ? t("loyalty.redeemInsufficientLabel")
              : t("loyalty.redeemLabel")}
          </UIText>
        </Pressable>
      </View>
    </View>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  const { t } = useTranslation();
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.batchCard, styles.skeletonRow]} accessibilityLabel={t("common.loading")} />
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

function ErrorRow({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.errorRow}>
      <UIText style={styles.errorText} maxFontSizeMultiplier={1.4}>{t("loyalty.recentLoadError")}</UIText>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t("common.retry")}
        style={({ pressed }) => [styles.errorBtn, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="refresh" size={13} color={theme.colors.brand[700]} />
        <UIText style={styles.errorBtnText}>{t("common.retry")}</UIText>
      </Pressable>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDiscount(kind: CouponDiscountKind, value: number, t: TFunc): string {
  switch (kind) {
    case "percent":       return `${value}%-`;
    case "flat":          return `${(value / 100).toLocaleString("ar-EG")} ج.م`;
    case "free_shipping": return t("loyalty.freeShipping");
    default:              return "";
  }
}

function decodeRedeemError(error: Error, t: TFunc): string {
  const m = error.message ?? "";
  if (m.includes("insufficient_balance")) return t("loyalty.redeemErrorInsufficientBalance");
  if (m.includes("batch_exhausted"))      return t("loyalty.redeemErrorBatchExhausted");
  if (m.includes("batch_expired"))        return t("loyalty.redeemErrorBatchExpired");
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

  balanceChip: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    alignSelf:         "flex-end",
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    borderRadius:      999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   6,
    marginBottom:      theme.spacing.md,
  },
  balanceText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.brand[700],
  },

  sectionHeader: {
    marginTop:    18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.text.primary,
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: -0.2,
  },

  // ── Issued coupon row ──
  couponRow: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius:    14,
    padding:         theme.spacing.md,
    marginBottom:    theme.spacing.sm,
    ...theme.shadow.card,
  },
  codeBox: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   theme.spacing.sm,
    borderRadius:      10,
    backgroundColor:   theme.colors.brand.lighter,
    borderStyle:       "dashed",
    borderWidth:       1,
    borderColor:       theme.colors.brand[600],
  },
  codeText: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.brand[700],
    letterSpacing: 1,
  },
  couponLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    textAlign:  textAlignStart(isRtl()),
  },
  couponMeta: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  textAlignStart(isRtl()),
    marginTop:  2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical:   theme.spacing.xs,
    borderRadius:      8,
    backgroundColor:   theme.colors.surfaceSunken,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  statusPillText: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      theme.colors.text.secondary,
  },

  // ── Batch (redeemable) card ──
  batchCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    marginBottom:    10,
    gap:             theme.spacing.md,
    ...theme.shadow.card,
  },
  batchHead: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "flex-start",
  },
  discountBadge: {
    minWidth:          56,
    paddingHorizontal: 10,
    paddingVertical:   theme.spacing.sm,
    borderRadius:      12,
    backgroundColor:   theme.colors.brand[700],
    alignItems:        "center",
    justifyContent:    "center",
  },
  discountText: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      theme.colors.surface,
  },
  batchTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      theme.colors.text.primary,
    textAlign:  textAlignStart(isRtl()),
    lineHeight: 20,
  },
  batchMeta: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  textAlignStart(isRtl()),
    marginTop:  4,
  },
  lowStockText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.amber[700],
    textAlign:  textAlignStart(isRtl()),
    marginTop:  4,
  },
  soldOutText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.slate[500],
    textAlign:  textAlignStart(isRtl()),
    marginTop:  4,
  },
  batchFoot: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
    paddingTop:     theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.hairline,
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
  redeemBtn: {
    paddingHorizontal: 18,
    paddingVertical:   10,
    borderRadius:      12,
    backgroundColor:   theme.colors.brand[600],
    ...theme.shadow.brand,
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
    fontSize:   13,
    color:      theme.colors.surface,
  },
  redeemBtnTextInsufficient: {
    color: theme.colors.text.secondary,
  },
  redeemBtnTextDisabled: {
    color: theme.colors.text.disabled,
  },

  // ── Empty/error/skeleton ──
  skeletonRow: {
    backgroundColor: theme.colors.surfaceSunken,
    minHeight:       120,
  },
  emptyRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               10,
    paddingVertical:   18,
    paddingHorizontal: 14,
    backgroundColor:   theme.colors.surfaceSunken,
    borderRadius:      14,
    marginBottom:      theme.spacing.sm,
  },
  emptyText: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    flex:       1,
    textAlign:  textAlignStart(isRtl()),
    lineHeight: 18,
  },
  errorRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingVertical:   14,
    paddingHorizontal: 14,
    backgroundColor:   theme.colors.surfaceSunken,
    borderRadius:      14,
    marginBottom:      theme.spacing.sm,
  },
  errorText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.text.secondary,
  },
  errorBtn: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   6,
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    backgroundColor:   theme.colors.surface,
  },
  errorBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.brand[700],
  },
});

export default CouponsScreen;
