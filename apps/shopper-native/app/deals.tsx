/**
 * DealsScreen — Today's Best Prices, warrior edition.
 *
 * Data: useInfiniteProducts({ sortBy: "price_asc", inStock: true })
 *       — lowest-priced, in-stock products; server-side paginated.
 *       Search + category filter forwarded to the search_products RPC.
 *
 * Features:
 *   • Live end-of-day countdown in the header
 *   • Search bar with debounce
 *   • Category filter chips (horizontal rail)
 *   • Sort toggle: Price ↑ | Newest
 *   • Infinite scroll via ProductGrid (FlashList on native)
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts, ProductGrid, type NativeProduct } from "@/features/products";
import { fetchCategories } from "@/services/productsApi";
import { useDebounce } from "@/hooks/useDebounce";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

// ─── Glass palette ─────────────────────────────────────────────────────────────
const G = {
  w05: "rgba(255,255,255,0.05)",
  w08: "rgba(255,255,255,0.08)",
  w10: "rgba(255,255,255,0.10)",
  w13: "rgba(255,255,255,0.13)",
  w15: "rgba(255,255,255,0.15)",
  w20: "rgba(255,255,255,0.20)",
  w45: "rgba(255,255,255,0.45)",
  w55: "rgba(255,255,255,0.55)",
  w60: "rgba(255,255,255,0.60)",
  w80: "rgba(255,255,255,0.80)",
} as const;

const R = {
  rose300: "#FCA5A5",
  glow:    "rgba(239,68,68,0.22)",
} as const;

// Crimson deals gradient
const HEADER_GRAD: [string, string, string] = [
  "#3D0000", "#7A0000", theme.colors.red[700],
];

type SortMode = "price_asc" | "newest";

// ─── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown() {
  const getMs = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    return Math.max(0, end.getTime() - now.getTime());
  };
  const [ms, setMs]   = useState(getMs);
  const mounted       = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const id = setInterval(() => { if (mounted.current) setMs(getMs()); }, 1_000);
    return () => { mounted.current = false; clearInterval(id); };
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    h:   pad(Math.floor(ms / 3_600_000)),
    m:   pad(Math.floor((ms % 3_600_000) / 60_000)),
    s:   pad(Math.floor((ms % 60_000) / 1_000)),
  };
}

// ─── DigitBlock ────────────────────────────────────────────────────────────────

function DigitBlock({ value, label }: { value: string; label: string }) {
  return (
    <View style={d.digitUnit}>
      <LinearGradient colors={[G.w20, G.w08]} style={d.digitBox}>
        <UIText style={d.digitValue}>{value}</UIText>
      </LinearGradient>
      <UIText style={d.digitLabel}>{label}</UIText>
    </View>
  );
}

// ─── CatChip ───────────────────────────────────────────────────────────────────

const CatChip = React.memo(function CatChip({
  label, active, onPress,
}: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[d.chip, active && d.chipActive]}>
      {active && (
        <LinearGradient
          colors={[theme.colors.red[600], theme.colors.red[500]]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      <UIText style={[d.chipText, active && d.chipTextActive]} numberOfLines={1}>
        {label}
      </UIText>
    </Pressable>
  );
});

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function DealsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { h, m, s } = useCountdown();

  const [query,       setQuery]       = useState("");
  const [sortBy,      setSortBy]      = useState<SortMode>("price_asc");
  const [selectedCat, setSelectedCat] = useState<string | undefined>(undefined);

  const debouncedQuery = useDebounce(query.trim(), 250);

  // Live-dot pulse
  const dotOp = useSharedValue(1);
  useEffect(() => {
    dotOp.value = withRepeat(
      withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, true,
    );
  }, [dotOp]);
  const dotAnim = useAnimatedStyle(() => ({ opacity: dotOp.value }));

  // ── Categories for filter rail ───────────────────────────────────────────
  const { data: allCats = [] } = useQuery({
    queryKey:  ["categories"],
    queryFn:   fetchCategories,
    staleTime: 10 * 60_000,
  });
  const visibleCats = useMemo(
    () => allCats.filter((c) => c.count > 0).slice(0, 12),
    [allCats],
  );

  // ── Real sale / discount products (server-side infinite) ─────────────────
  // isSale=true → bypasses the search_products RPC (which has no p_is_sale
  // param) and goes directly to:
  //   SELECT ... WHERE is_sale = true OR discount_percent > 0
  // This guarantees ONLY genuinely discounted products appear — never a
  // random "cheapest products" dump.
  const {
    products,
    totalCount,
    isLoading,
    isError,
    isRefreshing,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteProducts({
    isSale:     true,
    inStock:    true,
    sortBy,
    search:     debouncedQuery || undefined,
    categoryId: selectedCat,
    pageSize:   20,
  });

  const handleProductPress = useCallback(
    (p: NativeProduct) => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      router.push({ pathname: "/product/[id]", params: { id: p.id } });
    },
    [router],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Header ───────────────────────────────────────────────────────────────
  const ListHeader = useMemo(() => (
    <>
      {/* ── Hero gradient ── */}
      <LinearGradient
        colors={HEADER_GRAD}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[d.hero, { paddingTop: insets.top + 14 }]}>

        <View style={[d.glow, { top: -50, right: -50, width: 180, height: 180 }]} />
        <View style={[d.glow, { bottom: -30, left: -20, width: 90, height: 90, backgroundColor: R.glow }]} />

        {/* Top bar */}
        <View style={d.topBar}>
          <Pressable onPress={() => router.back()} style={d.backBtn} accessibilityRole="button">
            <Ionicons name="arrow-forward" size={16} color={G.w80} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={d.eyebrowRow}>
              <Animated.View style={[d.liveDot, dotAnim]} />
              <UIText style={d.eyebrow}>{t("home.flashEnds")}</UIText>
            </View>
            <UIText style={d.heroTitle}>{t("home.flashTitle")}</UIText>
          </View>
          <View style={d.flameTile}>
            <Ionicons name="flame" size={24} color={R.rose300} />
          </View>
        </View>

        {/* Countdown */}
        <View style={d.timerRow}>
          <UIText style={d.timerLabel}>{t("home.timeLeft")}</UIText>
          <View style={d.timerUnits}>
            <DigitBlock value={h}  label={t("home.flashHrs")} />
            <UIText style={d.colon}>:</UIText>
            <DigitBlock value={m}  label={t("home.flashMin")} />
            <UIText style={d.colon}>:</UIText>
            <DigitBlock value={s}  label={t("home.flashSec")} />
          </View>
        </View>

        {/* Count badge */}
        {totalCount > 0 && (
          <View style={d.countBadge}>
            <Ionicons name="pricetag-outline" size={11} color={R.rose300} />
            <UIText style={d.countBadgeText}>
              {totalCount.toLocaleString()} {t("search.resultCount", { count: totalCount }).replace(/\d[\d,]*/g, "").trim()}
            </UIText>
          </View>
        )}
      </LinearGradient>

      {/* ── Search bar ── */}
      <View style={d.searchWrap}>
        <View style={d.searchBar}>
          <Ionicons name="search" size={16} color={theme.colors.slate[400]} />
          <TextInput
            style={d.searchInput}
            placeholder={t("search.placeholder")}
            placeholderTextColor={theme.colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            textAlign={textAlignStart(isRtl()) as "left" | "right"}
            selectionColor={theme.colors.red[500]}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={theme.colors.slate[400]} />
            </Pressable>
          )}
        </View>

        {/* Sort toggle */}
        <Pressable
          onPress={() => setSortBy((s) => s === "price_asc" ? "newest" : "price_asc")}
          style={d.sortBtn}
          accessibilityRole="button">
          <Ionicons
            name={sortBy === "price_asc" ? "trending-down-outline" : "time-outline"}
            size={15}
            color={theme.colors.red[600]}
          />
        </Pressable>
      </View>

      {/* ── Category chips ── */}
      {visibleCats.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={d.catsContent}>
          <CatChip
            label={t("products.allProducts")}
            active={selectedCat === undefined}
            onPress={() => setSelectedCat(undefined)}
          />
          {visibleCats.map((cat) => {
            const label = lang === "en" ? (cat.nameEn ?? cat.name) : cat.name;
            return (
              <CatChip
                key={cat.id}
                label={label}
                active={selectedCat === cat.id}
                onPress={() => setSelectedCat((p) => p === cat.id ? undefined : cat.id)}
              />
            );
          })}
        </ScrollView>
      )}

      {/* ── Section label ── */}
      <View style={d.sectionRow}>
        <Ionicons name="grid-outline" size={13} color={theme.colors.red[500]} />
        <UIText style={d.sectionLabel}>{t("home.flashSale")}</UIText>
      </View>
    </>
  ), [
    insets.top, h, m, s, t, router, dotAnim, query, sortBy,
    selectedCat, visibleCats, lang, totalCount,
  ]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading && products.length === 0) {
    return (
      <View style={d.screen}>
        <LinearGradient
          colors={HEADER_GRAD}
          style={[d.hero, { paddingTop: insets.top + 14 }]}>
          <View style={d.topBar}>
            <Pressable onPress={() => router.back()} style={d.backBtn}>
              <Ionicons name="arrow-forward" size={16} color={G.w80} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <UIText style={d.eyebrow}>{t("home.flashEnds")}</UIText>
              <UIText style={d.heroTitle}>{t("home.flashTitle")}</UIText>
            </View>
            <View style={d.flameTile}>
              <Ionicons name="flame" size={24} color={R.rose300} />
            </View>
          </View>
        </LinearGradient>
        <View style={d.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={d.skeletonCell}><ProductCardSkeleton /></View>
          ))}
        </View>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError && products.length === 0) {
    return (
      <View style={d.screen}>
        <View style={d.center}>
          <Ionicons name="wifi-outline" size={48} color={theme.colors.slate[300]} />
          <UIText style={d.emptyTitle}>{t("errors.network")}</UIText>
          <Pressable onPress={() => void refetch()} style={d.retryBtn}>
            <UIText style={d.retryText}>{t("common.retry")}</UIText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={d.screen}>
      <ProductGrid
        products={products}
        lang={lang}
        onProductPress={handleProductPress}
        onEndReached={loadMore}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={d.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.red[500]} />
            </View>
          ) : (
            <View style={{ height: insets.bottom + 40 }} />
          )
        }
        ListEmptyComponent={
          <View style={d.center}>
            <Ionicons name="pricetag-outline" size={48} color={theme.colors.slate[300]} />
            <UIText style={d.emptyTitle}>{t("search.noResults")}</UIText>
            {(query.length > 0 || selectedCat) && (
              <Pressable
                onPress={() => { setQuery(""); setSelectedCat(undefined); }}
                style={d.retryBtn}>
                <UIText style={d.retryText}>{t("search.reset")}</UIText>
              </Pressable>
            )}
          </View>
        }
        refreshing={isRefreshing}
        onRefresh={() => void refetch()}
        contentContainerStyle={{ padding: theme.spacing.md }}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // Hero
  hero: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingBottom:     20,
    gap:               16,
    overflow:          "hidden",
  },
  glow: {
    position:        "absolute",
    borderRadius:    90,
    backgroundColor: G.w05,
  },
  topBar: {
    flexDirection: flexRow(isRtl()),
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
  eyebrowRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:     "center",
    gap:            6,
    marginBottom:   3,
  },
  liveDot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: R.rose300,
  },
  eyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      10,
    color:         G.w60,
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         theme.colors.surface,
    letterSpacing: -0.5,
    textAlign: textAlignStart(isRtl()),
    lineHeight:    32,
  },
  flameTile: {
    width:           44,
    height:          44,
    borderRadius:    14,
    backgroundColor: G.w10,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     G.w15,
  },

  timerRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  timerLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize:   11,
    color:      G.w55,
  },
  timerUnits: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  digitUnit:  { alignItems: "center", gap: 3 },
  digitBox: {
    borderRadius:      10,
    paddingHorizontal: 10,
    paddingVertical:   6,
    minWidth:          38,
    alignItems:        "center",
    borderWidth:       1,
    borderColor:       G.w15,
  },
  digitValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      17,
    color:         theme.colors.surface,
    letterSpacing: 1,
  },
  digitLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   9,
    color:      G.w45,
  },
  colon: {
    fontFamily: theme.fonts.black,
    fontSize:   18,
    color:      G.w45,
    marginBottom: theme.spacing.md,
  },

  countBadge: {
    flexDirection: flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    alignSelf:         "flex-end",
    backgroundColor:   G.w10,
    borderRadius:      999,
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       G.w15,
  },
  countBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      R.rose300,
  },

  // Search
  searchWrap: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   12,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  searchBar: {
    flex:              1,
    flexDirection: flexRow(isRtl()),
    alignItems:        "center",
    gap:               10,
    backgroundColor:   theme.colors.surfaceSunken,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  searchInput: {
    flex:       1,
    fontSize:   14,
    fontFamily: theme.fonts.semibold,
    color:      theme.colors.text.primary,
    textAlign: textAlignStart(isRtl()),
    paddingVertical: 0,
  },
  sortBtn: {
    width:           42,
    height:          42,
    borderRadius:    13,
    backgroundColor: theme.colors.red[50],
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     `${theme.colors.red[500]}28`,
  },

  // Categories
  catsContent: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   10,
    gap:               8,
    flexDirection: flexRow(isRtl()),
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    backgroundColor:   theme.colors.slate[100],
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
    overflow:          "hidden",
  },
  chipActive:        { borderColor: "transparent" },
  chipText:          { fontFamily: theme.fonts.semibold, fontSize: 12.5, color: theme.colors.text.secondary },
  chipTextActive:    { color: theme.colors.surface, fontFamily: theme.fonts.black },

  sectionRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop:        theme.spacing[2.5],
    paddingBottom:     theme.spacing.xs,
  },
  sectionLabel: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.text.primary,
    letterSpacing: -0.2,
  },

  footerLoader: {
    paddingVertical: 20,
    alignItems:      "center",
  },

  skeletonGrid: {
    flexDirection: flexRow(isRtl()),
    flexWrap:      "wrap",
    padding:       theme.spacing.md,
    gap:           theme.spacing.md,
  },
  skeletonCell: { width: "47%" as any },

  center: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            14,
    padding:        theme.spacing[4],
    paddingTop:     60,
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
    backgroundColor:   theme.colors.red[500],
    marginTop:         theme.spacing.xs,
  },
  retryText: { fontFamily: theme.fonts.black, fontSize: 13, color: theme.colors.surface },
});
