/**
 * Featured — Editor's Picks
 *
 * A premium editorial-style browsing screen with:
 *   • Warm amber gradient header with "Editor's Pick" framing
 *   • Sticky category filter pill rail
 *   • Staggered 2-column grid with new/hot/sale badges
 *   • Smooth category-switch animation (FadeInDown per row)
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts, type NativeProduct } from "@/features/products";
import { fetchCategories } from "@/services/productsApi";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/theme";

// ─── Badge logic ──────────────────────────────────────────────────────────────

type Badge = "hot" | "new" | "sale" | undefined;
function pickBadge(index: number): Badge {
  if (index % 11 === 0) return "hot";
  if (index % 7  === 0) return "new";
  if (index % 13 === 0) return "sale";
  return undefined;
}

// ─── Category chip ────────────────────────────────────────────────────────────

function CatChip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={anim}>
      <Pressable
        onPress={() => {
          scale.value = withSpring(0.92, { damping: 16, stiffness: 400 });
          setTimeout(() => { scale.value = withSpring(1.0, { damping: 14, stiffness: 350 }); }, 80);
          if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        style={[fc.chip, active && fc.chipActive]}>
        {active && (
          <LinearGradient colors={["#B45309", "#D97706"]} style={fc.chipGrad} />
        )}
        <Text style={[fc.chipText, active && fc.chipTextActive]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Grid item ────────────────────────────────────────────────────────────────

const GridItem = React.memo(function GridItem({
  item, index, lang, onPress,
}: {
  item:    NativeProduct;
  index:   number;
  lang:    "ar" | "en";
  onPress: () => void;
}) {
  return (
    <Animated.View
      style={fc.cell}
      entering={FadeInDown.duration(300).delay((index % 6) * 45)}>
      <ProductCard
        product={item}
        lang={lang}
        badge={pickBadge(index)}
        discountPercent={pickBadge(index) === "sale" ? 15 : undefined}
        onPress={onPress}
      />
    </Animated.View>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function FeaturedScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const router      = useRouter();
  const insets      = useSafeAreaInsets();

  const [selectedCat, setSelectedCat] = useState<string | undefined>(undefined);

  const { data: categories = [] } = useQuery({
    queryKey:  ["categories"],
    queryFn:   fetchCategories,
    staleTime: 5 * 60_000,
  });

  const {
    products,
    totalCount,
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

  // Pill rail
  const CatRail = useMemo(() => (
    <View style={fc.railWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={fc.railContent}>
        <CatChip
          label={t("products.allProducts")}
          active={!selectedCat}
          onPress={() => setSelectedCat(undefined)}
        />
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
        colors={["#3B1500", "#6B2800", "#B45309"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[fc.header, { paddingTop: insets.top + 12 }]}>

        {/* Decorative orbs */}
        <View style={[fc.orb, { top: -50, right: -50, width: 180, height: 180 }]} />
        <View style={[fc.orb, { bottom: -20, left: -20, width: 80, height: 80, backgroundColor: "rgba(255,255,255,0.04)" }]} />

        {/* Top row */}
        <View style={fc.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={fc.backBtn}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={fc.eyebrow}>{t("home.featuredEyebrow").toUpperCase()}</Text>
            <Text style={fc.headerTitle}>{t("home.featuredTitle")}</Text>
          </View>

          {/* Star decoration */}
          <View style={fc.starWrap}>
            <Ionicons name="star" size={24} color="#FCD34D" />
          </View>
        </View>

        {/* Stat pills */}
        <View style={fc.statsRow}>
          {[
            { icon: "cube-outline"            as const, label: t("products.badgeNew"),        color: "#FCD34D" },
            { icon: "trending-up-outline"     as const, label: t("products.badgeBestSeller"), color: "#FCD34D" },
            { icon: "checkmark-circle-outline"as const, label: t("product.trustOriginal"),    color: "#FCD34D" },
          ].map((pill) => (
            <View key={pill.label} style={fc.statPill}>
              <Ionicons name={pill.icon} size={12} color={pill.color} />
              <Text style={[fc.statText, { color: pill.color }]}>{pill.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {CatRail}
    </>
  ), [insets.top, totalCount, t, router, CatRail]);

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
          <Text style={fc.errorTitle}>{t("common.error")}</Text>
          <Pressable onPress={() => void refetch()} style={fc.retryBtn}>
            <Text style={fc.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={fc.screen}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={fc.row}
        contentContainerStyle={[fc.list, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refetch()}
            tintColor={theme.colors.amber[600]}
            colors={[theme.colors.amber[600]]}
          />
        }
        ListHeaderComponent={Header}
        renderItem={({ item, index }) => (
          <GridItem item={item} index={index} lang={lang} onPress={() => handlePress(item)} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={fc.emptyWrap}>
              <Ionicons name="search-outline" size={44} color={theme.colors.slate[300]} />
              <Text style={fc.emptyTitle}>{t("products.noProducts")}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          isFetchingNextPage
            ? <View style={fc.footer}><ActivityIndicator color={theme.colors.amber[600]} /></View>
            : null
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fc = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: "#F4F7FA",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom:     20,
    gap:               16,
    overflow:          "hidden",
  },
  orb: {
    position:        "absolute",
    borderRadius:    90,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  topRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.22)",
  },
  eyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      9.5,
    color:         "rgba(255,255,255,0.55)",
    letterSpacing: 0.8,
    marginBottom:  3,
  },
  headerTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         "#fff",
    letterSpacing: -0.5,
    textAlign:     "right",
    lineHeight:    32,
  },
  headerMeta: {
    fontFamily: theme.fonts.regular,
    fontSize:   11.5,
    color:      "rgba(255,255,255,0.50)",
    textAlign:  "right",
    marginTop:  2,
  },
  starWrap: {
    width:           44,
    height:          44,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.18)",
  },
  statsRow: {
    flexDirection: "row",
    gap:           8,
    justifyContent: "flex-end",
  },
  statPill: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   "rgba(255,255,255,0.10)",
    borderRadius:      999,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.16)",
  },
  statText: {
    fontFamily: theme.fonts.semibold,
    fontSize:   10,
    letterSpacing: 0.2,
  },

  // Category rail
  railWrap: {
    backgroundColor:   "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(15,23,42,0.07)",
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.04,
    shadowRadius:      4,
    elevation:         2,
  },
  railContent: {
    paddingHorizontal: 14,
    paddingVertical:   11,
    gap:               8,
    flexDirection:     "row-reverse",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    backgroundColor:   "#F1F5F9",
    borderWidth:       1,
    borderColor:       "rgba(15,23,42,0.08)",
    overflow:          "hidden",
  },
  chipActive: {
    borderColor: "transparent",
  },
  chipGrad: {
    ...StyleSheet.absoluteFillObject,
  },
  chipText: {
    fontFamily: theme.fonts.semibold,
    fontSize:   12.5,
    color:      theme.colors.text.secondary,
  },
  chipTextActive: {
    color:      "#fff",
    fontFamily: theme.fonts.black,
  },

  // Grid
  list: {
    paddingHorizontal: 12,
    paddingTop:        16,
  },
  row: {
    gap:           12,
    flexDirection: "row-reverse",
    marginBottom:  12,
  },
  cell: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection: "row-reverse",
    flexWrap:      "wrap",
    padding:       12,
    gap:           12,
  },

  // States
  footer: {
    paddingVertical: 22,
    alignItems:      "center",
  },
  center: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            12,
    padding:        32,
  },
  errorTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
    color:      theme.colors.text.primary,
    textAlign:  "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical:   11,
    borderRadius:      14,
    backgroundColor:   theme.colors.amber[600],
    marginTop:         4,
  },
  retryText: {
    fontFamily: theme.fonts.black,
    fontSize:   13,
    color:      "#fff",
  },
  emptyWrap: {
    alignItems:     "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap:            14,
  },
  emptyTitle: {
    fontFamily: theme.fonts.bold,
    fontSize:   15,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
  },
});
