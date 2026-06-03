/**
 * Featured — Editor's Picks
 *
 * Infinite-scroll grid of featured products with category filter rail.
 * List rendering:  ProductGrid (FlashList on native / FlatList on web)
 *                  — shared with CategoryScreen for identical perf characteristics.
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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts, ProductGrid, type NativeProduct } from "@/features/products";
import { fetchCategories } from "@/services/productsApi";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/shared/theme";

// ─── Glass / dark overlay palette ────────────────────────────────────────────
// White glass values on the dark amber hero gradient — no theme token exists.
const FG = {
  w04:  "rgba(255,255,255,0.04)",
  w06:  "rgba(255,255,255,0.06)",
  w10:  "rgba(255,255,255,0.10)",
  w12:  "rgba(255,255,255,0.12)",
  w15:  "rgba(255,255,255,0.15)",
  w16:  "rgba(255,255,255,0.16)",
  w18:  "rgba(255,255,255,0.18)",
  w22:  "rgba(255,255,255,0.22)",
  w55:  "rgba(255,255,255,0.55)",
} as const;

// Dark slate overlays on light surfaces
const FD = {
  d07: "rgba(15,23,42,0.07)",
  d08: "rgba(15,23,42,0.08)",
} as const;

// Intentional dark-amber editorial gradient — flash/featured palette
const HEADER_GRAD: [string, string, string] = ["#3B1500", "#6B2800", theme.colors.amber[700]];

// ─── Category chip ────────────────────────────────────────────────────────────

function CatChip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 16, stiffness: 400 });
    setTimeout(() => { scale.value = withSpring(1.0, { damping: 14, stiffness: 350 }); }, 80);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View style={anim}>
      <Pressable onPress={handlePress} style={[fc.chip, active && fc.chipActive]}>
        {active && <LinearGradient colors={[theme.colors.amber[700], theme.colors.amber[600]]} style={fc.chipGrad} />}
        <UIText style={[fc.chipText, active && fc.chipTextActive]} numberOfLines={1}>{label}</UIText>
      </Pressable>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FeaturedScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const router      = useRouter();
  const insets      = useSafeAreaInsets();

  const [selectedCat, setSelectedCat] = useState<string | undefined>(undefined);

  const { data: categories = [] } = useQuery({
    queryKey:  ["categories"],
    queryFn:   fetchCategories,
    staleTime: 10 * 60_000,
  });

  const {
    products,
    isLoading,
    isError,
    isFetchingNextPage,
    isRefreshing,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteProducts({
    sortBy:     "newest",
    categoryId: selectedCat,
    pageSize:   20,
  });

  const handlePress = useCallback(
    (p: NativeProduct) => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      router.push({ pathname: "/product/[id]", params: { id: p.id } });
    },
    [router],
  );

  const CatRail = useMemo(() => (
    <View style={fc.railWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={fc.railContent}>
        <CatChip label={t("products.allProducts")} active={!selectedCat} onPress={() => setSelectedCat(undefined)} />
        {categories.map((c) => {
          const display = lang === "en" ? (c.nameEn ?? c.name) : c.name;
          return (
            <CatChip
              key={c.id}
              label={display}
              active={selectedCat === c.id}
              onPress={() => setSelectedCat((prev) => prev === c.id ? undefined : c.id)}
            />
          );
        })}
      </ScrollView>
    </View>
  ), [categories, selectedCat, lang, t]);

  const Header = useMemo(() => (
    <>
      <LinearGradient
        colors={HEADER_GRAD}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[fc.header, { paddingTop: insets.top + 12 }]}>
        <View style={[fc.orb, { top: -50, right: -50, width: 180, height: 180 }]} />
        <View style={[fc.orb, { bottom: -20, left: -20, width: 80, height: 80, backgroundColor: FG.w04 }]} />

        <View style={fc.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={fc.backBtn}>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.surface} />
          </Pressable>
          <View style={fc.flex1}>
            <UIText style={fc.eyebrow}>{t("home.featuredEyebrow").toUpperCase()}</UIText>
            <UIText style={fc.headerTitle}>{t("home.featuredTitle")}</UIText>
          </View>
          <View style={fc.starWrap}>
            <Ionicons name="star" size={24} color={theme.colors.amber[300]} />
          </View>
        </View>

        <View style={fc.statsRow}>
          {[
            { icon: "cube-outline"             as const, label: t("products.badgeNew") },
            { icon: "trending-up-outline"      as const, label: t("products.badgeBestSeller") },
            { icon: "checkmark-circle-outline" as const, label: t("product.trustOriginal") },
          ].map((pill) => (
            <View key={pill.label} style={fc.statPill}>
              <Ionicons name={pill.icon} size={12} color={theme.colors.amber[300]} />
              <UIText style={fc.statText}>{pill.label}</UIText>
            </View>
          ))}
        </View>
      </LinearGradient>

      {CatRail}
    </>
  ), [insets.top, t, router, CatRail]);

  if (isLoading) {
    return (
      <View style={fc.screen}>
        {Header}
        <View style={fc.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={fc.cell}><ProductCardSkeleton /></View>
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={fc.screen}>
        {Header}
        <View style={fc.center}>
          <Ionicons name="wifi-outline" size={44} color={theme.colors.slate[300]} />
          <UIText style={fc.errorTitle}>{t("common.error")}</UIText>
          <Pressable onPress={() => void refetch()} style={fc.retryBtn}>
            <UIText style={fc.retryText}>{t("common.retry")}</UIText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={fc.screen}>
      <ProductGrid
        products={products}
        lang={lang}
        onProductPress={handlePress}
        onEndReached={hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined}
        ListHeaderComponent={Header}
        ListFooterComponent={<View style={{ height: insets.bottom + 36 }} />}
        ListEmptyComponent={
          <View style={fc.emptyWrap}>
            <Ionicons name="search-outline" size={44} color={theme.colors.slate[300]} />
            <UIText style={fc.emptyTitle}>{t("products.noProducts")}</UIText>
          </View>
        }
        refreshing={isRefreshing}
        onRefresh={refetch}
        contentContainerStyle={{ padding: theme.spacing.md }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fc = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  flex1:  { flex: 1 },

  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom:     20,
    gap:               theme.spacing.lg,
    overflow:          "hidden",
  },
  orb: {
    position:        "absolute",
    borderRadius:    90,
    backgroundColor: FG.w06,
  },
  topRow:  { flexDirection: "row-reverse", alignItems: "center", gap: theme.spacing.md },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: FG.w15,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     FG.w22,
  },
  eyebrow:     { fontFamily: theme.fonts.bold, fontSize: 9.5, color: FG.w55, letterSpacing: 0.8, marginBottom: 3 },
  headerTitle: { fontFamily: theme.fonts.black, fontSize: 26, color: theme.colors.surface, letterSpacing: -0.5, textAlign: "right", lineHeight: 32 },
  starWrap: {
    width:           44,
    height:          44,
    borderRadius:    14,
    backgroundColor: FG.w12,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     FG.w18,
  },
  statsRow: { flexDirection: "row", gap: theme.spacing.sm, justifyContent: "flex-end" },
  statPill: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   FG.w10,
    borderRadius:      999,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       FG.w16,
  },
  statText: { fontFamily: theme.fonts.semibold, fontSize: 10, color: theme.colors.amber[300], letterSpacing: 0.2 },

  // Category rail
  railWrap: {
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FD.d07,
    shadowColor:       theme.colors.slate[900],
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.04,
    shadowRadius:      4,
    elevation:         2,
  },
  railContent: { paddingHorizontal: 14, paddingVertical: 11, gap: theme.spacing.sm, flexDirection: "row-reverse" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    backgroundColor:   theme.colors.slate[100],
    borderWidth:       1,
    borderColor:       FD.d08,
    overflow:          "hidden",
  },
  chipActive:     { borderColor: "transparent" },
  chipGrad:       StyleSheet.absoluteFillObject,
  chipText:       { fontFamily: theme.fonts.semibold, fontSize: 12.5, color: theme.colors.text.secondary },
  chipTextActive: { color: theme.colors.surface, fontFamily: theme.fonts.black },

  // Skeleton
  skeletonGrid: { flexDirection: "row-reverse", flexWrap: "wrap", padding: theme.spacing.md, gap: theme.spacing.md },
  cell:         { flex: 1 },

  // Error / empty
  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing[4] },
  errorTitle: { fontFamily: theme.fonts.black, fontSize: 16, color: theme.colors.text.primary, textAlign: "center" },
  retryBtn:   { paddingHorizontal: theme.spacing[3], paddingVertical: 11, borderRadius: 14, backgroundColor: theme.colors.amber[600], marginTop: theme.spacing.xs },
  retryText:  { fontFamily: theme.fonts.black, fontSize: 13, color: theme.colors.surface },
  emptyWrap:  { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 14 },
  emptyTitle: { fontFamily: theme.fonts.bold, fontSize: 15, color: theme.colors.text.secondary, textAlign: "center" },
});
