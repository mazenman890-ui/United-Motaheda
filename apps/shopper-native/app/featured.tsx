/**
 * FeaturedScreen — Editor's Picks, real data only.
 *
 * Data source: `get_featured_products` RPC → products flagged
 * `is_new=true OR is_bestseller=true OR is_sale=true` in the database.
 * NEVER dumps all products — if nothing is marked featured the page
 * shows a proper empty state.
 *
 * Search: client-side (200-product cap) — fast, no extra round-trips.
 * Tabs:   All · New · Bestseller · Sale
 * Filter: category rail derived from the actual featured set.
 */

import React, {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { fetchFeaturedProducts } from "@/features/products";
import { ProductGrid } from "@/features/products";
import type { NativeProduct } from "@/features/products";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";

// ─── Glass palette ─────────────────────────────────────────────────────────────
const G = {
  w06: "rgba(255,255,255,0.06)",
  w10: "rgba(255,255,255,0.10)",
  w13: "rgba(255,255,255,0.13)",
  w15: "rgba(255,255,255,0.15)",
  w20: "rgba(255,255,255,0.20)",
  w45: "rgba(255,255,255,0.45)",
  w60: "rgba(255,255,255,0.60)",
  w80: "rgba(255,255,255,0.80)",
} as const;

// Dark amber editorial gradient (featured = gold / curated = warm tone)
const HEADER_GRAD: [string, string, string] = [
  "#2D1000", "#6B3000", theme.colors.amber[700],
];

type Tab = "all" | "new" | "bestseller" | "sale";

const TABS: { key: Tab; labelKey: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "all",        labelKey: "products.allProducts",    icon: "apps-outline"          },
  { key: "new",        labelKey: "products.badgeNew",       icon: "sparkles-outline"      },
  { key: "bestseller", labelKey: "products.badgeBestSeller",icon: "trending-up-outline"   },
  { key: "sale",       labelKey: "products.badgeSale",      icon: "pricetag-outline"      },
];

// ─── TabPill ───────────────────────────────────────────────────────────────────

const TabPill = React.memo(function TabPill({
  label, icon, active, onPress,
}: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; active: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePress = useCallback(() => {
    scale.value = withSpring(0.93, theme.animation.spring.press);
    setTimeout(() => { scale.value = withSpring(1, theme.animation.spring.press); }, 80);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress();
  }, [onPress, scale]);

  return (
    <Animated.View style={anim}>
      <Pressable onPress={handlePress} style={[f.tab, active && f.tabActive]}>
        {active && (
          <LinearGradient
            colors={[theme.colors.amber[600], theme.colors.amber[700]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <Ionicons
          name={icon}
          size={13}
          color={active ? theme.colors.surface : theme.colors.text.secondary}
        />
        <UIText style={[f.tabText, active && f.tabTextActive]} numberOfLines={1}>
          {label}
        </UIText>
      </Pressable>
    </Animated.View>
  );
});

// ─── CatChip ───────────────────────────────────────────────────────────────────

const CatChip = React.memo(function CatChip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[f.catChip, active && f.catChipActive]}>
      <UIText style={[f.catChipText, active && f.catChipTextActive]} numberOfLines={1}>
        {label}
      </UIText>
    </Pressable>
  );
});

// ─── StatBadge ─────────────────────────────────────────────────────────────────

function StatBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <View style={[f.stat, { borderColor: color + "30", backgroundColor: color + "15" }]}>
      <UIText style={[f.statNum, { color }]}>{count}</UIText>
      <UIText style={[f.statLbl, { color: color + "CC" }]}>{label}</UIText>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function FeaturedScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const router      = useRouter();
  const insets      = useSafeAreaInsets();

  const [query,       setQuery]       = useState("");
  const [activeTab,   setActiveTab]   = useState<Tab>("all");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  // Defer the query for smoother typing — expensive filter runs off the render path
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  // ── Real featured products from the DB ────────────────────────────────────
  const {
    data: allFeatured = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey:  ["featured-all"],
    queryFn:   () => fetchFeaturedProducts(200),
    staleTime: 5 * 60_000,
  });

  // ── Stats from the full set ───────────────────────────────────────────────
  const stats = useMemo(() => ({
    newCount:        allFeatured.filter((p) => p.isNew).length,
    bestsellerCount: allFeatured.filter((p) => p.isBestseller).length,
    saleCount:       allFeatured.filter((p) => p.isSale).length,
  }), [allFeatured]);

  // ── Filtered product list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allFeatured;

    // Tab filter
    if (activeTab === "new")        list = list.filter((p) => p.isNew);
    if (activeTab === "bestseller") list = list.filter((p) => p.isBestseller);
    if (activeTab === "sale")       list = list.filter((p) => p.isSale);

    // Category filter
    if (selectedCat) {
      list = list.filter(
        (p) => p.categoryName === selectedCat || p.categoryNameEn === selectedCat,
      );
    }

    // Text search — Arabic + English name
    if (deferredQuery.length >= 2) {
      list = list.filter(
        (p) =>
          p.nameAr?.toLowerCase().includes(deferredQuery) ||
          p.nameEn?.toLowerCase().includes(deferredQuery) ||
          p.name?.toLowerCase().includes(deferredQuery)  ||
          p.categoryName?.toLowerCase().includes(deferredQuery),
      );
    }

    return list;
  }, [allFeatured, activeTab, selectedCat, deferredQuery]);

  // ── Category chips derived from the current filtered base ────────────────
  const categories = useMemo(() => {
    const base = activeTab === "all" ? allFeatured
      : activeTab === "new"         ? allFeatured.filter((p) => p.isNew)
      : activeTab === "bestseller"  ? allFeatured.filter((p) => p.isBestseller)
      :                               allFeatured.filter((p) => p.isSale);

    const seen = new Set<string>();
    const cats: string[] = [];
    for (const p of base) {
      const name = lang === "en" ? (p.categoryNameEn ?? p.categoryName) : p.categoryName;
      if (name && !seen.has(p.categoryName)) {
        seen.add(p.categoryName);
        cats.push(name);
      }
    }
    return cats;
  }, [allFeatured, activeTab, lang]);

  const handleProductPress = useCallback(
    (p: NativeProduct) => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      router.push({ pathname: "/product/[id]", params: { id: p.id } });
    },
    [router],
  );

  // ── Header + search + tabs (memoised — heavy subview) ────────────────────
  const ListHeader = useMemo(() => (
    <>
      {/* ── Gradient hero ── */}
      <LinearGradient
        colors={HEADER_GRAD}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[f.hero, { paddingTop: insets.top + 14 }]}>

        <View style={f.glowOrb} />
        <View style={f.glowOrb2} />

        {/* Top bar */}
        <View style={f.topBar}>
          <Pressable onPress={() => router.back()} style={f.backBtn} accessibilityRole="button">
            <Ionicons name="arrow-forward" size={16} color={G.w80} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <UIText style={f.eyebrow}>{t("home.featuredEyebrow")}</UIText>
            <UIText style={f.heroTitle}>{t("home.featuredTitle")}</UIText>
          </View>
          <View style={f.starTile}>
            <Ionicons name="star" size={22} color={theme.colors.amber[300]} />
          </View>
        </View>

        {/* Stats row */}
        <View style={f.statsRow}>
          <StatBadge count={stats.newCount}        label={t("products.badgeNew")}        color={theme.colors.brand[400]} />
          <StatBadge count={stats.bestsellerCount} label={t("products.badgeBestSeller")} color={theme.colors.amber[400]} />
          <StatBadge count={stats.saleCount}       label={t("products.badgeSale", { n: "" }).replace("%", "").trim()} color={theme.colors.red[400]} />
        </View>
      </LinearGradient>

      {/* ── Search bar ── */}
      <View style={f.searchWrap}>
        <View style={f.searchBar}>
          <Ionicons name="search" size={16} color={theme.colors.slate[400]} />
          <TextInput
            style={f.searchInput}
            placeholder={t("search.placeholder")}
            placeholderTextColor={theme.colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            textAlign="right"
            selectionColor={theme.colors.brand[600]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8} style={f.searchClear}>
              <Ionicons name="close-circle" size={16} color={theme.colors.slate[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={f.tabsContent}>
        {TABS.map((tab) => (
          <TabPill
            key={tab.key}
            label={tab.key === "sale"
              ? t("products.badgeSale", { n: "" }).replace("%", "").trim()
              : t(tab.labelKey)}
            icon={tab.icon}
            active={activeTab === tab.key}
            onPress={() => { setActiveTab(tab.key); setSelectedCat(null); }}
          />
        ))}
      </ScrollView>

      {/* ── Category chips ── */}
      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={f.catsContent}>
          <CatChip
            label={t("products.allProducts")}
            active={selectedCat === null}
            onPress={() => setSelectedCat(null)}
          />
          {categories.map((cat) => (
            <CatChip
              key={cat}
              label={cat}
              active={selectedCat === cat}
              onPress={() => setSelectedCat((p) => p === cat ? null : cat)}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Result count ── */}
      <View style={f.countRow}>
        <UIText variant="eyebrow" color="tertiary" align="right">
          {t("search.resultCount", { count: filtered.length })}
        </UIText>
      </View>
    </>
  ), [
    insets.top, t, router, query, activeTab, selectedCat,
    stats, categories, filtered.length,
  ]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={f.screen}>
        <LinearGradient
          colors={HEADER_GRAD}
          style={[f.hero, { paddingTop: insets.top + 14 }]}>
          <View style={f.glowOrb} />
          <View style={f.topBar}>
            <Pressable onPress={() => router.back()} style={f.backBtn}>
              <Ionicons name="arrow-forward" size={16} color={G.w80} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <UIText style={f.eyebrow}>{t("home.featuredEyebrow")}</UIText>
              <UIText style={f.heroTitle}>{t("home.featuredTitle")}</UIText>
            </View>
            <View style={f.starTile}>
              <Ionicons name="star" size={22} color={theme.colors.amber[300]} />
            </View>
          </View>
        </LinearGradient>
        <View style={f.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={f.skeletonCell}><ProductCardSkeleton /></View>
          ))}
        </View>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <View style={f.screen}>
        <View style={f.center}>
          <Ionicons name="wifi-outline" size={48} color={theme.colors.slate[300]} />
          <UIText style={f.emptyTitle}>{t("errors.network")}</UIText>
          <Pressable onPress={() => void refetch()} style={f.retryBtn}>
            <UIText style={f.retryText}>{t("common.retry")}</UIText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={f.screen}>
      {/* Explicit flex:1 bridge — ensures FlashList receives a measured height
          from its containing View and never collapses to zero on Android.      */}
      <View style={f.listWrap}>
        <ProductGrid
          products={filtered}
          lang={lang}
          onProductPress={handleProductPress}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={<View style={{ height: insets.bottom + 40 }} />}
          ListEmptyComponent={
            <View style={f.center}>
              <Ionicons
                name={allFeatured.length === 0 ? "star-outline" : "search-outline"}
                size={48}
                color={theme.colors.slate[300]}
              />
              <UIText style={f.emptyTitle}>
                {allFeatured.length === 0
                  ? t("home.featuredTitle")
                  : t("search.noResults")}
              </UIText>
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} style={f.retryBtn}>
                  <UIText style={f.retryText}>{t("search.clearRecents")}</UIText>
                </Pressable>
              )}
            </View>
          }
          refreshing={false}
          onRefresh={() => void refetch()}
          contentContainerStyle={{ padding: theme.spacing.md }}
        />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const f = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: theme.colors.bg },
  listWrap: { flex: 1 },  // explicit bridge so FlashList gets a measured height

  // Hero
  hero: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingBottom:     20,
    gap:               14,
    overflow:          "hidden",
  },
  glowOrb: {
    position:        "absolute",
    top:             -50,
    right:           -50,
    width:           180,
    height:          180,
    borderRadius:    90,
    backgroundColor: G.w06,
  },
  glowOrb2: {
    position:        "absolute",
    bottom:          -30,
    left:            -20,
    width:           100,
    height:          100,
    borderRadius:    50,
    backgroundColor: "rgba(251,191,36,0.08)",
  },
  topBar: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: G.w13,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     G.w20,
  },
  eyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      10,
    color:         G.w45,
    letterSpacing: 0.6,
    textAlign:     "right",
    marginBottom:  2,
  },
  heroTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         theme.colors.surface,
    letterSpacing: -0.5,
    textAlign:     "right",
    lineHeight:    32,
  },
  starTile: {
    width:           44,
    height:          44,
    borderRadius:    14,
    backgroundColor: G.w10,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     G.w15,
  },

  statsRow: {
    flexDirection:  "row",
    gap:            10,
    justifyContent: "flex-end",
  },
  stat: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
    borderWidth:       1,
  },
  statNum: {
    fontFamily:    theme.fonts.black,
    fontSize:      13,
    letterSpacing: -0.3,
  },
  statLbl: {
    fontFamily: theme.fonts.semibold,
    fontSize:   10,
  },

  // Search
  searchWrap: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   12,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  searchBar: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               10,
    backgroundColor:   theme.colors.surfaceSunken,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   11,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  searchInput: {
    flex:       1,
    fontSize:   14,
    fontFamily: theme.fonts.semibold,
    color:      theme.colors.text.primary,
    textAlign:  "right",
    paddingVertical: 0,
  },
  searchClear: {
    padding: 2,
  },

  // Tabs
  tabsContent: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   10,
    gap:               8,
    flexDirection:     "row-reverse",
    backgroundColor:   theme.colors.surface,
  },
  tab: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      20,
    backgroundColor:   theme.colors.slate[100],
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
    overflow:          "hidden",
  },
  tabActive:        { borderColor: "transparent" },
  tabText:          { fontFamily: theme.fonts.semibold, fontSize: 12.5, color: theme.colors.text.secondary },
  tabTextActive:    { color: theme.colors.surface, fontFamily: theme.fonts.black },

  // Categories
  catsContent: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   10,
    gap:               8,
    flexDirection:     "row-reverse",
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderRadius:      16,
    backgroundColor:   theme.colors.surfaceSunken,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  catChipActive: {
    backgroundColor: theme.colors.amber[600],
    borderColor:     theme.colors.amber[700],
  },
  catChipText:       { fontFamily: theme.fonts.semibold, fontSize: 12, color: theme.colors.text.secondary },
  catChipTextActive: { color: theme.colors.surface, fontFamily: theme.fonts.black },

  // Count
  countRow: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   8,
  },

  // Skeleton
  skeletonGrid: {
    flexDirection: "row-reverse",
    flexWrap:      "wrap",
    padding:       theme.spacing.md,
    gap:           theme.spacing.md,
  },
  skeletonCell: { width: "47%" as any },

  // Empty / error
  center: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
    gap:             14,
    padding:         theme.spacing[4],
    paddingTop:      60,
  },
  emptyTitle: {
    fontFamily: theme.fonts.bold,
    fontSize:   15,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
  },
  retryBtn: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical:   11,
    borderRadius:      14,
    backgroundColor:   theme.colors.amber[600],
    marginTop:         theme.spacing.xs,
  },
  retryText: { fontFamily: theme.fonts.black, fontSize: 13, color: theme.colors.surface },
});
