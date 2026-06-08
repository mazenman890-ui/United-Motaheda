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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";
import { useAuth } from "@/features/auth";
import type { Order } from "@/stores/orders";
import { useOrders } from "../hooks/useOrders";
import { UnauthenticatedState } from "../components/UnauthenticatedState";
import { EmptyOrdersState }     from "../components/EmptyOrdersState";
import { OrderCard, SkeletonCard } from "../components/OrderCard";
import { listS, HERO_GRAD, INDIGO_GRAD, EMERALD_GRAD } from "../components/orders.styles";

// ─── OrdersHeader — premium gradient header with embedded stats ───────────────

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
    <LinearGradient
      colors={HERO_GRAD}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[h.header, { paddingTop: insetsTop + 14 }]}>

      {/* Decorative orb */}
      <View style={h.orb} />

      {/* Top row — back + title + icon */}
      <View style={h.topRow}>
        {showBack ? (
          <Pressable onPress={onBack} style={h.backBtn} accessibilityRole="button">
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.80)" />
          </Pressable>
        ) : (
          <View style={h.backBtnSpacer} />
        )}
        <View style={{ flex: 1 }}>
          <UIText style={h.eyebrow}>{t("orders.eyebrow")}</UIText>
          <UIText style={h.title}>{t("orders.title")}</UIText>
        </View>
        <View style={h.iconTile}>
          <Ionicons name="bag-handle-outline" size={18} color="rgba(255,255,255,0.80)" />
        </View>
      </View>

      {/* Inline stat pills */}
      <Animated.View entering={FadeIn.duration(340)} style={h.statsRow}>
        {/* Total */}
        <View style={[h.statPill, h.statPillBorder]}>
          <LinearGradient
            colors={[theme.colors.teal[500], theme.colors.brand[600]]}
            style={h.statDot}
          />
          <UIText style={h.statVal}>{total}</UIText>
          <UIText style={h.statLbl}>{t("orders.countOrders", { count: total })}</UIText>
        </View>

        {/* Active */}
        <View style={[h.statPill, h.statPillBorder]}>
          <LinearGradient colors={INDIGO_GRAD} style={h.statDot} />
          <UIText style={h.statVal}>{active}</UIText>
          <UIText style={h.statLbl}>{t("orders.processing")}</UIText>
        </View>

        {/* Delivered */}
        <View style={h.statPill}>
          <LinearGradient colors={EMERALD_GRAD} style={h.statDot} />
          <UIText style={h.statVal}>{delivered}</UIText>
          <UIText style={h.statLbl}>{t("orders.delivered")}</UIText>
        </View>
      </Animated.View>
    </LinearGradient>
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
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
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
            tintColor={theme.colors.brand[600]}
            colors={[theme.colors.brand[600]]}
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
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
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
    paddingBottom:     20,
    gap:               14,
    overflow:          "hidden",
  },
  orb: {
    position:        "absolute",
    right:           -40,
    top:             -40,
    width:           130,
    height:          130,
    borderRadius:    65,
    backgroundColor: "rgba(13,184,168,0.10)",
  },

  // Top row
  topRow: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    gap:            12,
  },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
  },
  backBtnSpacer: { width: 38, height: 38 },
  eyebrow: {
    fontSize:           10,
    fontFamily:         theme.fonts.bold,
    color:              "rgba(255,255,255,0.50)",
    textAlign:          textAlignStart(isRtl()),
    letterSpacing:      0.4,
    includeFontPadding: false,
    lineHeight:         14,
    textAlignVertical:  "center",
  },
  title: {
    fontSize:           24,
    fontFamily:         theme.fonts.black,
    color:              theme.colors.surface,
    textAlign:          textAlignStart(isRtl()),
    letterSpacing:      -0.5,
    marginTop:          2,
    includeFontPadding: false,
    lineHeight:         30,
    textAlignVertical:  "center",
  },
  iconTile: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.10)",
  },

  // Stat pills — inline in header, no separate floating card
  statsRow: {
    flexDirection:   flexRow(isRtl()),
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.10)",
    overflow:        "hidden",
  },
  statPill: {
    flex:            1,
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    paddingVertical: 12,
  },
  statPillBorder: {
    borderRightWidth:  StyleSheet.hairlineWidth,
    borderRightColor:  "rgba(255,255,255,0.15)",
  },
  statDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
    flexShrink:   0,
  },
  statVal: {
    fontFamily:         theme.fonts.black,
    fontSize:           18,
    color:              theme.colors.surface,
    letterSpacing:      -0.4,
    includeFontPadding: false,
    lineHeight:         24,
  },
  statLbl: {
    fontFamily:         theme.fonts.regular,
    fontSize:           9,
    color:              "rgba(255,255,255,0.50)",
    textAlign:          "center",
    lineHeight:         13,
    includeFontPadding: false,
  },
});
