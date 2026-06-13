/**
 * OrdersScreen — premium ground-up redesign.
 *
 * Replaces generic AppHeader + floating stats row with a unified dark-gradient
 * header that contains the page title + eyebrow + inline stat pills.
 * Consistent with Home / Profile / Search / Payment visual language.
 */

import React, { useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { kit } from "@/shared/kit";
import { flexRow, isRtl, textAlignStart, BACK_CHEVRON } from "@/utils/layout";
import { useAuth } from "@/features/auth";
import type { Order } from "@/stores/orders";
import { useOrders } from "../hooks/useOrders";
import { UnauthenticatedState } from "../components/UnauthenticatedState";
import { EmptyOrdersState }     from "../components/EmptyOrdersState";
import { OrderCard, SkeletonCard } from "../components/OrderCard";
import { listS } from "../components/orders.styles";

// ─── OrdersHeader — light editorial header with embedded stats (kit) ──────────

function OrdersHeader({
  t, insetsTop, orders, showBack, onBack,
}: {
  t:         (key: string, opts?: Record<string, unknown>) => string;
  insetsTop: number;
  orders:    Order[];
  showBack:  boolean;
  onBack:    () => void;
}) {
  const total     = orders.length;
  const active    = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const delivered = orders.filter((o) => o.status === "delivered").length;

  return (
    <View style={[h.header, { paddingTop: insetsTop + 14 }]}>
      {/* Top row — back + title + icon */}
      <View style={h.topRow}>
        {showBack ? (
          <Pressable onPress={onBack} style={h.backBtn} accessibilityRole="button">
            <Ionicons name={BACK_CHEVRON} size={18} color={kit.color.inkSoft} />
          </Pressable>
        ) : (
          <View style={h.backBtnSpacer} />
        )}
        <View style={{ flex: 1 }}>
          <UIText style={h.eyebrow}>{t("orders.eyebrow")}</UIText>
          <UIText style={h.title}>{t("orders.title")}</UIText>
        </View>
        <View style={h.iconTile}>
          <Ionicons name="bag-handle-outline" size={18} color={kit.color.accentDeep} />
        </View>
      </View>

      {/* Inline stat band */}
      <Animated.View entering={FadeIn.duration(300)} style={h.statsRow}>
        <View style={[h.statPill, h.statPillBorder]}>
          <View style={[h.statDot, { backgroundColor: kit.color.accent }]} />
          <UIText style={h.statVal}>{total}</UIText>
          <UIText style={h.statLbl}>{t("orders.countOrders", { count: total })}</UIText>
        </View>

        <View style={[h.statPill, h.statPillBorder]}>
          <View style={[h.statDot, { backgroundColor: kit.color.warn }]} />
          <UIText style={h.statVal}>{active}</UIText>
          <UIText style={h.statLbl}>{t("orders.processing")}</UIText>
        </View>

        <View style={h.statPill}>
          <View style={[h.statDot, { backgroundColor: kit.color.success }]} />
          <UIText style={h.statVal}>{delivered}</UIText>
          <UIText style={h.statLbl}>{t("orders.delivered")}</UIText>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── OrdersList — virtualized populated list ──────────────────────────────────

function OrdersList({
  orders, isRefetching, onRefresh, onOrderPress, showBack,
}: {
  orders:       Order[];
  isRefetching: boolean;
  onRefresh:    () => void;
  onOrderPress: (id: string) => void;
  showBack:     boolean;
}): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const renderItem = useCallback(
    ({ item, index }: { item: Order; index: number }) => (
      <OrderCard order={item} index={index} onPress={onOrderPress} />
    ),
    [onOrderPress],
  );

  return (
    <View style={{ flex: 1, backgroundColor: kit.color.canvas }}>
      <OrdersHeader
        t={t}
        insetsTop={insets.top}
        orders={orders}
        showBack={showBack}
        onBack={() => router.back()}
      />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[listS.listContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={kit.color.accent}
            colors={[kit.color.accent]}
          />
        }
        renderItem={renderItem}
      />
    </View>
  );
}

// ─── OrdersScreen — root ──────────────────────────────────────────────────────

export interface OrdersScreenProps {
  showBack?: boolean;
}

export function OrdersScreen({ showBack = true }: OrdersScreenProps): React.ReactElement {
  const router   = useRouter();
  const { t }    = useTranslation();
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();

  const {
    data:        orders        = [],
    isLoading,
    isRefetching,
    refetch,
    isSuccess,
  } = useOrders(user?.id);

  const handleOrderPress = useCallback(
    (orderId: string) => router.push(`/order/${orderId}`),
    [router],
  );
  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!user) return <UnauthenticatedState showBack={showBack} />;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: kit.color.canvas }}>
        {/* Gradient header with empty stats while loading */}
        <OrdersHeader
          t={t}
          insetsTop={insets.top}
          orders={[]}
          showBack={showBack}
          onBack={() => router.back()}
        />
        <View style={listS.skeletonContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (isSuccess && orders.length === 0) return <EmptyOrdersState showBack={showBack} />;

  // ── Populated ────────────────────────────────────────────────────────────────
  return (
    <OrdersList
      orders={orders}
      isRefetching={isRefetching}
      onRefresh={handleRefresh}
      onOrderPress={handleOrderPress}
      showBack={showBack}
    />
  );
}

// ─── Header styles ────────────────────────────────────────────────────────────

const h = StyleSheet.create({
  header: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingBottom:     16,
    gap:               14,
    backgroundColor:   kit.color.canvas,
  },

  // Top row
  topRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           12,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: kit.color.surface,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     kit.color.line,
  },
  backBtnSpacer: { width: 40, height: 40 },
  eyebrow: {
    fontSize: 10, lineHeight: 15,
    fontFamily: theme.fonts.bold,
    color: kit.color.inkFaint,
    textAlign: textAlignStart(isRtl()),
    includeFontPadding: false,
  },
  title: {
    fontSize: 24, lineHeight: 32,
    fontFamily: theme.fonts.black,
    color: kit.color.ink,
    textAlign: textAlignStart(isRtl()),
    marginTop: 1,
    includeFontPadding: false,
  },
  iconTile: {
    width:           40,
    height:          40,
    borderRadius:    14,
    backgroundColor: kit.color.accentTint,
    alignItems:      "center",
    justifyContent:  "center",
  },

  // Stat band — white kit card
  statsRow: {
    flexDirection:   flexRow(isRtl()),
    backgroundColor: kit.color.surface,
    borderRadius:    kit.radius.card,
    borderWidth:     1,
    borderColor:     kit.color.line,
    overflow:        "hidden",
    ...kit.shadow.raised,
  },
  statPill: {
    flex:            1,
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    paddingVertical: 13,
  },
  statPillBorder: {
    borderEndWidth: StyleSheet.hairlineWidth,
    borderEndColor: kit.color.lineStrong,
  },
  statDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    flexShrink:   0,
  },
  statVal: {
    fontFamily: theme.fonts.black,
    fontSize: 17, lineHeight: 24,
    color: kit.color.ink,
    includeFontPadding: false,
  },
  statLbl: {
    fontFamily: theme.fonts.regular,
    fontSize: 9, lineHeight: 13,
    color: kit.color.inkFaint,
    textAlign: "center",
    includeFontPadding: false,
  },
});
