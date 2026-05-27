/**
 * GiftCatalogScreen — browse and redeem inventory-backed gifts.
 *
 * Each row shows: thumbnail (or placeholder), name, points cost, and a
 * redeem button. Inventory state drives an availability badge so users see
 * "low stock" / "out of stock" inline; the server-side reserve_inventory
 * is the source of truth.
 *
 * Redemption flow:
 *   1. Tap "استبدل" على هدية.
 *   2. Sheet يطلب عنوان توصيل كامل (اختيار عنوان محفوظ أو إدخال عنوان جديد).
 *   3. يتم إرسال الطلب (أو إضافته لقائمة الإرسال عند عدم توفر اتصال).
 *
 * Follows the same skeleton / empty / error / accessibility patterns as
 * LoyaltyWalletScreen.
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { theme } from "@/theme";
import { useScreenTrace } from "@/features/observability";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { useGiftCatalog } from "../hooks/useGiftCatalog";
import { useLoyaltyBalance } from "../hooks/useLoyaltyBalance";
import { useQueuedRedeemGift } from "../hooks/useQueuedRedeemGift";
import { GiftAddressSheet } from "../components/GiftAddressSheet";
import type { GiftCatalogItem, GiftInventory, RedemptionAddress } from "../types";

interface CatalogEntry extends GiftCatalogItem {
  inventory?: GiftInventory;
}

export function GiftCatalogScreen() {
  useScreenTrace("loyalty-gifts");
  const insets = useSafeAreaInsets();

  const balance = useLoyaltyBalance();
  const gifts   = useGiftCatalog();
  const redeem  = useQueuedRedeemGift();

  const [redeemingGiftId, setRedeemingGiftId] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeGift, setActiveGift] = useState<CatalogEntry | null>(null);

  const refreshing =
    (balance.isFetching && !balance.isLoading) ||
    (gifts.isFetching && !gifts.isLoading);

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void balance.refetch();
    void gifts.refetch();
  }, [balance, gifts]);

  const handleRedeem = useCallback(
    (gift: CatalogEntry) => {
      const currentBalance = balance.data?.balance ?? 0;
      if (currentBalance < gift.points_cost) {
        Alert.alert(
          "نقاط غير كافية",
          `تحتاج ${gift.points_cost.toLocaleString("ar-EG")} نقطة لاستبدال "${gift.name}". رصيدك الحالي ${currentBalance.toLocaleString("ar-EG")}.`,
        );
        return;
      }
      setActiveGift(gift);
      setSheetVisible(true);
    },
    [balance.data],
  );

  // Clear in-flight flag + show error alert on settle.
  React.useEffect(() => {
    if (!redeem.isPending && redeemingGiftId !== null) {
      setRedeemingGiftId(null);
      if (redeem.isError && redeem.error) {
        Alert.alert("تعذر الاستبدال", decodeRedeemError(redeem.error));
        redeem.reset();
      } else if (redeem.isSuccess && redeem.data) {
        Alert.alert(
          "تم الاستبدال",
          `تم حجز هديتك. سيتم التواصل معك خلال 14 يوماً.\nرصيدك الجديد: ${redeem.data.balance.toLocaleString("ar-EG")} نقطة.`,
        );
        redeem.reset();
        setSheetVisible(false);
        setActiveGift(null);
      }
    }
  }, [redeem.isPending, redeem.isError, redeem.error, redeem.isSuccess, redeem.data, redeemingGiftId, redeem.reset]);

  const closeSheet = useCallback(() => {
    if (redeem.isPending) return; // prevent mid-flight cancellation
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
      Alert.alert(
        "تمت إضافة الطلب",
        "لا يوجد اتصال بالإنترنت حالياً. تم حفظ طلب الاستبدال وسيتم إرساله تلقائياً عند عودة الاتصال.",
      );
    }
  }, [activeGift, redeem]);

  if (gifts.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title="كتالوج الهدايا" subtitle="استبدل نقاطك بهدايا مميزة" />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <ListSkeleton rows={3} />
        </ScrollView>
      </View>
    );
  }

  if (gifts.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title="كتالوج الهدايا" subtitle="استبدل نقاطك بهدايا مميزة" />
        <ErrorPanel onRetry={() => void gifts.refetch()} />
      </View>
    );
  }

  const list = gifts.data ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <SubScreenHeader title="كتالوج الهدايا" subtitle="استبدل نقاطك بهدايا مميزة" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            accessibilityLabel="تحديث الكتالوج"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {balance.data && (
          <View style={styles.balanceChip} accessibilityRole="text"
                accessibilityLabel={`رصيد النقاط ${balance.data.balance} نقطة`}>
            <Ionicons name="star" size={14} color={theme.colors.brand[700]} />
            <Text style={styles.balanceText} maxFontSizeMultiplier={1.3}>
              رصيدك: {balance.data.balance.toLocaleString("ar-EG")} نقطة
            </Text>
          </View>
        )}

        {list.length === 0 ? (
          <View style={{ paddingTop: 60 }}>
            <EmptyRow
              icon="gift-outline"
              message="لا توجد هدايا متاحة حالياً. تحقق مرة أخرى قريباً."
            />
          </View>
        ) : (
          list.map((gift) => (
            <GiftRow
              key={gift.id}
              gift={gift}
              currentBalance={balance.data?.balance ?? 0}
              isRedeeming={redeemingGiftId === gift.id && redeem.isPending}
              onRedeem={() => handleRedeem(gift)}
            />
          ))
        )}
      </ScrollView>

      <GiftAddressSheet
        visible={sheetVisible}
        giftName={activeGift?.name ?? ""}
        pointsCost={activeGift?.points_cost ?? 0}
        submitting={redeem.isPending && redeemingGiftId === activeGift?.id}
        onConfirm={handleConfirmAddress}
        onClose={closeSheet}
      />
    </View>
  );
}

// ─── Gift row ───────────────────────────────────────────────────────────────

interface GiftRowProps {
  gift:           CatalogEntry;
  currentBalance: number;
  isRedeeming:    boolean;
  onRedeem:       () => void;
}

function GiftRow({ gift, currentBalance, isRedeeming, onRedeem }: GiftRowProps) {
  const available =
    gift.inventory
      ? Math.max(gift.inventory.total_stock - gift.inventory.reserved - gift.inventory.fulfilled, 0)
      : null;
  const soldOut  = available !== null && available <= 0;
  const lowStock = available !== null && available > 0 && available <= 3;
  const canAfford = currentBalance >= gift.points_cost;
  const disabled  = isRedeeming || soldOut;

  return (
    <View style={styles.giftCard} accessibilityRole="text"
          accessibilityLabel={`${gift.name}, ${gift.points_cost} نقطة`}>
      <View style={styles.giftThumb}>
        {gift.image_url ? (
          <Image
            source={{ uri: gift.image_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            transition={180}
          />
        ) : (
          <Ionicons name="gift" size={28} color={theme.colors.brand[400]} />
        )}
        {lowStock && (
          <View style={styles.stockPill}>
            <Text style={styles.stockPillText} maxFontSizeMultiplier={1.2}>
              متبقي {available}
            </Text>
          </View>
        )}
        {soldOut && (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText} maxFontSizeMultiplier={1.2}>نفذ</Text>
          </View>
        )}
      </View>

      <View style={styles.giftBody}>
        <Text style={styles.giftName} numberOfLines={2} maxFontSizeMultiplier={1.3}>
          {gift.name}
        </Text>
        {gift.description && (
          <Text style={styles.giftDesc} numberOfLines={2} maxFontSizeMultiplier={1.4}>
            {gift.description}
          </Text>
        )}
        <View style={styles.giftFoot}>
          <View style={styles.costWrap}>
            <Ionicons name="star" size={14} color={theme.colors.amber[600]} />
            <Text style={styles.costText} maxFontSizeMultiplier={1.3}>
              {gift.points_cost.toLocaleString("ar-EG")}
            </Text>
          </View>
          <Pressable
            onPress={onRedeem}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`استبدال ${gift.name} بـ ${gift.points_cost} نقطة`}
            accessibilityState={{ disabled, busy: isRedeeming }}
            style={({ pressed }) => [
              styles.redeemBtn,
              !canAfford && !disabled && styles.redeemBtnInsufficient,
              disabled && styles.redeemBtnDisabled,
              pressed && !disabled && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                styles.redeemBtnText,
                !canAfford && !disabled && styles.redeemBtnTextInsufficient,
                disabled && styles.redeemBtnTextDisabled,
              ]}
              maxFontSizeMultiplier={1.2}
            >
              {isRedeeming ? "جارٍ…" : soldOut ? "نفذ" : !canAfford ? "غير كافٍ" : "استبدل"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Shared sub-views ───────────────────────────────────────────────────────

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.giftCard, styles.skeletonRow]} accessibilityLabel="جارٍ التحميل" />
      ))}
    </View>
  );
}

function EmptyRow({ icon, message }: { icon: React.ComponentProps<typeof Ionicons>["name"]; message: string }) {
  return (
    <View style={styles.emptyRow} accessibilityRole="text" accessibilityLabel={message}>
      <Ionicons name={icon} size={20} color={theme.colors.slate[400]} />
      <Text style={styles.emptyText} maxFontSizeMultiplier={1.5}>{message}</Text>
    </View>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorPanel}>
      <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.slate[400]} />
      <Text style={styles.errorTitle} maxFontSizeMultiplier={1.4}>تعذر تحميل الكتالوج</Text>
      <Text style={styles.errorBody} maxFontSizeMultiplier={1.5}>
        تحقق من اتصالك وحاول مرة أخرى.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="إعادة المحاولة"
        style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="refresh" size={14} color="#fff" />
        <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

function decodeRedeemError(error: Error): string {
  const m = error.message ?? "";
  if (m.includes("insufficient_balance")) return "نقاط غير كافية لاستبدال هذه الهدية.";
  if (m.includes("out_of_stock"))         return "نفذت الكمية من هذه الهدية.";
  if (m.includes("gift_not_available"))   return "هذه الهدية غير متاحة الآن.";
  if (m.includes("account_frozen"))       return "حسابك مجمَّد مؤقتاً — تواصل مع الدعم.";
  if (m.includes("not_authenticated"))    return "يرجى تسجيل الدخول أولاً.";
  return "تعذر إتمام الاستبدال. حاول مرة أخرى.";
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },

  balanceChip: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              6,
    alignSelf:        "flex-end",
    backgroundColor:  theme.colors.brand.lighter,
    borderWidth:      1,
    borderColor:      theme.colors.border.brandSoft,
    borderRadius:     999,
    paddingHorizontal: 12,
    paddingVertical:   6,
    marginBottom:     14,
  },
  balanceText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.brand[700],
  },

  // Gift card
  giftCard: {
    flexDirection:   "row-reverse",
    alignItems:      "stretch",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         12,
    marginBottom:    10,
    ...theme.shadow.card,
  },
  giftThumb: {
    width:           88,
    height:          88,
    borderRadius:    12,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
    position:        "relative",
  },
  stockPill: {
    position:          "absolute",
    bottom:            4,
    insetInlineStart:  4,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      6,
    backgroundColor:   theme.colors.amber[50],
    borderWidth:       1,
    borderColor:       theme.colors.amber[100],
  },
  stockPillText: {
    fontFamily: theme.fonts.bold,
    fontSize:   9,
    color:      theme.colors.amber[700],
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
  },
  giftName: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      theme.colors.text.primary,
    textAlign:  "right",
    lineHeight: 19,
  },
  giftDesc: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
    marginTop:  3,
    lineHeight: 15,
  },
  giftFoot: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      8,
  },
  costWrap: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           5,
  },
  costText: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      theme.colors.text.primary,
  },
  redeemBtn: {
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      10,
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
    flexDirection:     "row-reverse",
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
    textAlign:  "right",
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
    flexDirection:     "row-reverse",
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
