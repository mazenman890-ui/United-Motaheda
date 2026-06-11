/**
 * Search — flagship premium discovery experience.
 *
 * Architectural decisions:
 *   - Dark navy LinearGradient header with glassmorphic command bar.
 *   - Language badge (AR/MIX) inside the search bar for bilingual input.
 *   - Submit button renders as teal LinearGradient when query.length >= 2.
 *   - Filter button scales to 40×40 with teal glow when active.
 *   - Discovery sections use a colored left-border bullet + bold title.
 *   - Recent chips: square-ish borderRadius 14 with teal start-border accent.
 *   - Trending rows: taller (minHeight 60), rank badge at row top-right.
 *   - Category tiles: taller, 52×52 icon, count badge pill below name.
 *   - Suggestion card: borderRadius 24, hairline border, sunken header band.
 *   - GroupChips and filter chips: borderRadius 12, height 36.
 *   - Empty state: 80×80 teal-tinted search icon box + improved chips.
 *   - Translation hint: animated pulsing dot, warm background.
 *
 * Search-fix invariant (DO NOT TOUCH):
 *   - resolvedDebouncedQ → useProductSearch({ query: resolvedDebouncedQ })
 *   - resolvedSubmitted  → useInfiniteProducts({ search: resolvedSubmitted })
 *   - <Hl qAlt={resolvedDebouncedQ} />
 *   - <SuggRow queryResolved={resolvedDebouncedQ} />
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDebounce } from "@/hooks/useDebounce";
import { fetchCategories } from "@/services/productsApi";
import { ProductGrid, useInfiniteProducts, useProductSearch } from "@/features/products";
import { resolveSmartQuery, detectSearchLang } from "@/utils/searchUtils";
import { useScreenTrace } from "@/features/observability";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { formatPrice } from "@/utils/format";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";
import type { NativeProduct, NativeCategory } from "@/services/productsApi";

const IS_RTL      = isRtl();
const INPUT_ALIGN = textAlignStart(IS_RTL) as "left" | "right" | "center";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

type SortKey = "newest" | "price_asc" | "price_desc" | "name_asc";

const SORT_KEYS: Record<SortKey, string> = {
  newest:     "search.sortNewest",
  price_asc:  "search.sortPriceAsc",
  price_desc: "search.sortPriceDesc",
  name_asc:   "search.sortNameAsc",
};

const TRENDING_META: { termKey: string; icon: IoniconsName; color: string; bg: string }[] = [
  { termKey: "search.trending0", icon: "medkit",         color: theme.colors.brand[700],   bg: theme.colors.brand.lighter   },
  { termKey: "search.trending1", icon: "medical",        color: theme.colors.purple[700],  bg: theme.colors.purple[50]      },
  { termKey: "search.trending2", icon: "sunny-outline",  color: theme.colors.amber[700],   bg: theme.colors.amber[50]       },
  { termKey: "search.trending3", icon: "fitness",        color: theme.colors.rose[600],    bg: theme.colors.rose[50]        },
  { termKey: "search.trending4", icon: "thermometer",    color: theme.colors.info.strong,  bg: theme.colors.info.bg         },
  { termKey: "search.trending5", icon: "water-outline",  color: theme.colors.brand[700],   bg: theme.colors.brand.lighter   },
];

// ─── Highlight match — premium subtle background ───────────────────────────

function Hl({
  text, q, qAlt, style, lines,
}: {
  text:   string;
  q:      string;
  /** Alternate (translated/resolved) query — tried when the primary q has no match. */
  qAlt?:  string;
  style?: StyleProp<TextStyle>;
  lines?: number;
}) {
  const render = (matchQ: string) => {
    const lower = text.toLowerCase();
    const ql    = matchQ.toLowerCase().trim();
    const idx   = lower.indexOf(ql);
    if (idx < 0) return null;
    return (
      <UIText style={style} numberOfLines={lines}>
        {text.slice(0, idx)}
        <UIText style={s.hlMatch}>{text.slice(idx, idx + ql.length)}</UIText>
        {text.slice(idx + ql.length)}
      </UIText>
    );
  };
  if (!q || q.length < 2) return <UIText style={style} numberOfLines={lines}>{text}</UIText>;
  return render(q) ?? (qAlt && qAlt.length >= 2 ? render(qAlt) : null) ?? (
    <UIText style={style} numberOfLines={lines}>{text}</UIText>
  );
}

// ─── Suggestion row — elevated, premium ─────────────────────────────────────

const SuggRow = React.memo(function SuggRow({
  product, query, queryResolved, onPress, index, selected,
}: {
  product:       NativeProduct;
  query:         string;
  queryResolved: string;
  onPress:       (p: NativeProduct) => void;
  index:         number;
  selected:      boolean;
}) {
  const { t } = useTranslation();
  const name = product.nameAr ?? product.name;
  const handlePress = useCallback(() => onPress(product), [onPress, product]);
  return (
    <Animated.View entering={FadeInRight.delay(index * 25).duration(220)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          s.suggRow,
          (pressed || selected) && { backgroundColor: theme.colors.surfaceSunken },
        ]}>
        <View style={s.suggThumb}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={80} />
          ) : (
            <Ionicons name="medkit-outline" size={14} color={theme.colors.slate[400]} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          {/* Try to highlight with the raw (possibly Arabic) input first.
              Fall back to the resolved (translated) query when the product
              only has an English name — e.g. user typed "بنادول" but the
              product displays "Panadol Extra".                              */}
          <Hl text={name} q={query} qAlt={queryResolved} style={s.suggName} lines={1} />
          <UIText variant="eyebrow" color="tertiary" align="right" numberOfLines={1} style={s.suggCat}>
            {product.categoryName}
          </UIText>
        </View>
        <UIText variant="caption" weight="black" style={s.suggPrice}>
          {formatPrice(product.price)}
        </UIText>
        {!product.inStock && (
          <View style={s.suggOos}>
            <UIText variant="eyebrow" style={{ color: theme.colors.error.strong }}>{t("common.outOfStock")}</UIText>
          </View>
        )}
        <Ionicons name="arrow-back" size={12} color={theme.colors.slate[300]} />
      </Pressable>
    </Animated.View>
  );
});

// ─── Pulsing dot — live translation indicator ─────────────────────────────

function PulseDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 700 }),
        withTiming(1,    { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [opacity]);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[s.pulseDot, animStyle]} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══  SCREEN  ═════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════

export default function SearchScreen() {
  useScreenTrace("search");
  const { t, i18n } = useTranslation();
  const router      = useRouter();
  const insets   = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  // ── State ──
  const [query, setQuery]             = useState("");
  const [submitted, setSubmitted]     = useState("");
  const [focused, setFocused]         = useState(false);
  const [sortBy, setSortBy]           = useState<SortKey>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [catFilter, setCatFilter]     = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recents, setRecents]         = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);

  const debouncedQ = useDebounce(query.trim(), 200);

  const RECENTS_KEY = "um_search_recents_v1";

  // Smart bilingual resolution — used for the lang badge + translation hint
  const searchResolution = useMemo(
    () => (debouncedQ.length >= 2 ? resolveSmartQuery(debouncedQ) : null),
    [debouncedQ],
  );
  const translationHintText = useMemo(() => {
    const raw = searchResolution?.displayHint;
    if (!raw) return null;
    if (raw.includes(':')) return raw.split(':').slice(1).join(':').trim();
    return raw;
  }, [searchResolution]);

  /**
   * Resolved debounced query — the term we actually send to Supabase.
   *
   * When the user types Arabic (e.g. "بنادول"), resolveSmartQuery maps it to
   * the English equivalent ("panadol") so the RPC can match product names in
   * the database. The raw `debouncedQ` is kept for display / highlight only.
   */
  const resolvedDebouncedQ = useMemo(() => {
    if (debouncedQ.length < 2) return debouncedQ;
    const term = searchResolution?.term;
    return term && term.length > 0 ? term : debouncedQ;
  }, [debouncedQ, searchResolution]);

  /**
   * Resolved submitted query — same translation applied to the committed
   * search term that drives the full results grid.
   */
  const resolvedSubmitted = useMemo(() => {
    if (!submitted || submitted.length < 2) return submitted;
    const { term } = resolveSmartQuery(submitted);
    return term && term.length > 0 ? term : submitted;
  }, [submitted]);

  const showSugg   = focused && debouncedQ.length >= 2 && debouncedQ !== submitted;
  const hasResults = submitted.length >= 2;

  // Reset suggestion selection when suggestions change
  useEffect(() => { setSelectedIdx(-1); }, [debouncedQ]);

  // ── Animation — refined focus glow ──
  const barGlow  = useSharedValue(0);
  const barScale = useSharedValue(1);
  const barAnim  = useAnimatedStyle(() => ({ transform: [{ scale: barScale.value }] }));
  const glowAnim = useAnimatedStyle(() => ({ opacity: barGlow.value }));

  // Toggle switch animation
  const swThumbX = useSharedValue(inStockOnly ? 1 : 0);
  useEffect(() => {
    swThumbX.value = withSpring(inStockOnly ? 1 : 0, { damping: 22, stiffness: 420, mass: 0.7 });
  }, [inStockOnly, swThumbX]);
  const swThumbAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: swThumbX.value * 16 }],
  }));

  // ── Data ──
  const { data: categories } = useQuery({
    queryKey: ["searchCategories"],
    queryFn:  fetchCategories,
    staleTime: 10 * 60_000,
  });

  // Popular searches from analytics — falls back to hardcoded TRENDING if unavailable
  const { data: popularData } = useQuery({
    queryKey: ["popularSearches"],
    queryFn:  async () => {
      const { data, error } = await supabase.rpc("get_popular_searches", { p_limit: 6, p_days: 7 });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60_000,
    gcTime:    30 * 60_000,
  });
  const popularSearches: string[] = Array.isArray(popularData)
    ? (popularData as Array<{ query: string }>).map((r) => r.query).filter(Boolean)
    : [];

  // Load persisted recents on mount
  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) setRecents(parsed as string[]);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // suggestions — use dedicated hook (sorts by relevance, not newest)
  // Pass the resolved (translated) query so Arabic input finds English product names.
  const {
    products:  suggestions,
    isLoading: suggFetching,
  } = useProductSearch({ query: resolvedDebouncedQ, enabled: showSugg });

  const {
    products: results,
    totalCount,
    isLoading: resultsLoading,
    isFetching: resultsFetching,
    isFetchingNextPage,
    isRefreshing: resultsRefreshing,
    hasNextPage,
    fetchNextPage,
    refetch: refetchResults,
  } = useInfiniteProducts({
    // Use the smart-resolved query so "بنادول" → "panadol" reaches the DB correctly.
    // Filters/sort are unchanged; only the free-text search term is translated.
    search:     resolvedSubmitted || undefined,
    sortBy,
    inStock:    inStockOnly || undefined,
    categoryId: catFilter ?? undefined,
    pageSize:   20,
    enabled:    hasResults,
  });

  const isSearching = hasResults && (resultsLoading || (resultsFetching && !results.length));

  // Persist recents + log analytics whenever a search yields results
  useEffect(() => {
    if (submitted.length > 1 && results.length > 0) {
      setRecents((prev) => {
        const next = [submitted, ...prev.filter((x) => x !== submitted)].slice(0, 8);
        AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
      // Fire-and-forget analytics event; never throws to caller
      void (async () => {
        try {
          const { error } = await supabase.rpc("log_search_event", {
            p_query:        submitted,
            p_result_count: totalCount,
            p_source:       "native",
          });
          if (error && __DEV__) console.warn("[search] analytics:", error.message);
        } catch {
          // Best-effort analytics only.
        }
      })();
    }
  }, [submitted, results.length, totalCount]);

  // ── Handlers ──
  const submit = useCallback((text?: string) => {
    const q = (text ?? query).trim();
    if (!q) return;
    setSubmitted(q);
    setQuery(q);
    setSelectedIdx(-1);
    Keyboard.dismiss();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (__DEV__) console.log("[search] submitted:", q);
  }, [query]);

  const tapSugg = useCallback((p: NativeProduct) => {
    submit(p.nameAr ?? p.name);
  }, [submit]);

  const clear = useCallback(() => {
    setQuery("");
    setSubmitted("");
    inputRef.current?.focus();
  }, []);

  const quickSearch = useCallback((term: string) => {
    setQuery(term);
    setSubmitted(term);
    Keyboard.dismiss();
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  const goProduct = useCallback((id: string) => {
    router.push({ pathname: "/product/[id]", params: { id } });
  }, [router]);

  const resetFilters = useCallback(() => {
    setSortBy("newest");
    setInStockOnly(false);
    setCatFilter(null);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const filterCount = [inStockOnly, catFilter !== null, sortBy !== "newest"].filter(Boolean).length;

  // ── Grouped results by category — for the in-results filter chips ──
  const grouped = useMemo(() => {
    if (!results.length) return [];
    const map = new Map<string, NativeProduct[]>();
    for (const p of results) {
      const key = p.categoryName || t("common.other");
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  }, [results, t]);

  return (
    <View style={s.screen}>

      {/* ─── Premium dark-gradient header ── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}>

        {/* Layered decorative geometry */}
        <View style={s.headerOrb1} />
        <View style={s.headerOrb2} />
        <View style={s.headerOrbAccent} />

        {/* Top row — title + result count badge */}
        <View style={s.topRow}>
          <View style={s.topLeft}>
            <View style={s.headerIcon}>
              <Ionicons name="search" size={15} color={theme.colors.teal[400]} />
            </View>
            <View>
              <UIText style={s.headerEyebrow}>{t("search.eyebrow")}</UIText>
              <UIText style={s.headerTitle}>{t("search.title")}</UIText>
            </View>
          </View>
          {hasResults && totalCount > 0 && !isSearching && (
            <Animated.View entering={FadeIn.duration(200)} style={s.countPill}>
              <UIText style={s.countPillText}>
                {t("search.resultCount", { count: totalCount.toLocaleString() })}
              </UIText>
            </Animated.View>
          )}
        </View>

        {/* ─── Command bar — glassmorphic, taller, more prominent ── */}
        <View style={s.barContainer}>
          <Animated.View style={[s.barGlow, glowAnim, { pointerEvents: "none" }]} />

          <Animated.View style={[s.bar, barAnim, focused && s.barFocused]}>
            {/* Search icon / spinner */}
            <View style={s.barIconWrap}>
              {suggFetching || isSearching ? (
                <ActivityIndicator size="small" color={theme.colors.brand[700]} />
              ) : (
                <Ionicons name="search" size={17} color={focused ? theme.colors.brand[700] : theme.colors.slate[400]} />
              )}
            </View>

            <View style={s.barInputShell}>
              <TextInput
                ref={inputRef}
                style={s.barInput}
                placeholder={t("search.placeholder")}
                placeholderTextColor={theme.colors.text.tertiary}
                value={query}
                onChangeText={(v) => { setQuery(v); setSelectedIdx(-1); }}
                onFocus={() => {
                  setFocused(true);
                  barGlow.value  = withTiming(1, { duration: 280 });
                  barScale.value = withSpring(1.008, { damping: 20, stiffness: 400 });
                }}
                onBlur={() => {
                  setTimeout(() => setFocused(false), 160);
                  barGlow.value  = withTiming(0, { duration: 240 });
                  barScale.value = withSpring(1, { damping: 20, stiffness: 400 });
                }}
                onSubmitEditing={() => {
                  if (selectedIdx >= 0 && suggestions[selectedIdx]) {
                    tapSugg(suggestions[selectedIdx]);
                  } else {
                    submit();
                  }
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (!showSugg || suggestions.length === 0) return;
                  if (nativeEvent.key === "ArrowDown") {
                    setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
                  } else if (nativeEvent.key === "ArrowUp") {
                    setSelectedIdx((i) => Math.max(i - 1, -1));
                  } else if (nativeEvent.key === "Escape") {
                    setFocused(false);
                    setSelectedIdx(-1);
                    Keyboard.dismiss();
                  }
                }}
                returnKeyType="search"
                autoCorrect={false}
                textAlign={INPUT_ALIGN}
                selectionColor={theme.colors.brand[600]}
              />

              {query.length > 0 && (
                <Pressable onPress={clear} hitSlop={10} style={s.barClear}>
                  <Ionicons name="close" size={13} color={theme.colors.slate[500]} />
                </Pressable>
              )}
            </View>

            <View style={s.barActions}>
              {/* Filter button — 40×40, teal glow when active */}
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  setShowFilters((v) => !v);
                }}
                accessibilityRole="button"
                accessibilityLabel={t("search.filterLabel")}
                style={[s.barFilterBtn, (showFilters || filterCount > 0) && s.barFilterBtnActive]}>
                <Ionicons
                  name="options-outline"
                  size={15}
                  color={(showFilters || filterCount > 0) ? theme.colors.surface : theme.colors.slate[500]}
                />
                {filterCount > 0 && !showFilters && (
                  <View style={s.filterBadge}>
                    <UIText variant="eyebrow" color="inverse">{filterCount}</UIText>
                  </View>
                )}
              </Pressable>

              {/* Submit button — reserved slot so the bar never overflows */}
              <Pressable
                onPress={() => submit()}
                accessibilityRole="button"
                accessibilityLabel={t("search.searchBtn")}
                disabled={query.length < 2}
                style={({ pressed }) => [
                  s.barSubmitWrap,
                  query.length < 2 && s.barSubmitWrapDisabled,
                  pressed && query.length >= 2 && { opacity: 0.85 },
                ]}>
                <LinearGradient
                  colors={query.length >= 2
                    ? [theme.colors.teal[500], theme.colors.teal[400]]
                    : [theme.colors.slate[200], theme.colors.slate[200]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.barSubmitGrad}>
                  <Ionicons
                    name="return-down-back"
                    size={14}
                    color={query.length >= 2 ? theme.colors.surface : theme.colors.slate[400]}
                  />
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </View>

        {/* Translation / typo-fix hint strip — animated warm band */}
        {translationHintText && debouncedQ.length >= 2 && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOut.duration(140)}
            style={s.translationHint}>
            <PulseDot />
            <Ionicons name="language-outline" size={13} color={theme.colors.brand[600]} />
            <UIText variant="eyebrow" style={s.translationHintText}>
              {translationHintText}
            </UIText>
          </Animated.View>
        )}

        {/* Quiet keyboard hint */}
        {focused && !hasResults && debouncedQ.length < 2 && (
          <Animated.View entering={FadeIn.duration(180)} style={s.hint}>
            <UIText style={s.hintText}>{t("search.hint")}</UIText>
          </Animated.View>
        )}
      </LinearGradient>

      {/* ─── Content area ──────────────────────────────────────────── */}
      <View style={s.content}>

        {/* Filter panel — refined, square-ish chips */}
        {showFilters && (
          <Animated.View entering={FadeInDown.duration(220)} style={s.filterPanel}>
            <View style={s.filterHeader}>
              <UIText variant="eyebrow" color="tertiary">{t("search.filterTitle")}</UIText>
              {filterCount > 0 && (
                <Pressable onPress={resetFilters} hitSlop={6}>
                  <UIText variant="caption" weight="bold" color="brand">{t("search.reset")}</UIText>
                </Pressable>
              )}
            </View>

            <View style={s.chipsRow}>
              {(Object.keys(SORT_KEYS) as SortKey[]).map((key) => {
                const on = sortBy === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => { setSortBy(key); if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); }}
                    style={[s.chip, on && s.chipOn]}>
                    <UIText
                      variant="caption"
                      weight={on ? "black" : "bold"}
                      style={{ color: on ? theme.colors.surface : theme.colors.text.secondary }}>
                      {t(SORT_KEYS[key])}
                    </UIText>
                  </Pressable>
                );
              })}
            </View>

            {/* In-stock toggle — spring animated */}
            <Pressable
              onPress={() => { setInStockOnly((v) => !v); if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); }}
              style={s.toggleRow}>
              <View style={s.toggleLeft}>
                <Ionicons name="cube-outline" size={14} color={theme.colors.slate[600]} />
                <UIText variant="body-sm" weight="bold" color="secondary">{t("search.inStockOnly")}</UIText>
              </View>
              <View style={[s.sw, inStockOnly && s.swOn]}>
                <Animated.View style={[s.swThumb, swThumbAnim]} />
              </View>
            </Pressable>

            {categories && categories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[s.chipsRow, { paddingBottom: 2, flexWrap: "nowrap" }]}>
                <Pressable onPress={() => setCatFilter(null)} style={[s.chip, !catFilter && s.chipOn]}>
                  <UIText
                    variant="caption"
                    weight={!catFilter ? "black" : "bold"}
                    style={{ color: !catFilter ? theme.colors.surface : theme.colors.text.secondary }}>
                    {t("search.all")}
                  </UIText>
                </Pressable>
                {categories.slice(0, 12).map((cat: NativeCategory) => {
                  const on = catFilter === cat.id;
                  return (
                    <Pressable key={cat.id} onPress={() => setCatFilter(on ? null : cat.id)} style={[s.chip, on && s.chipOn]}>
                      <UIText
                        variant="caption"
                        weight={on ? "black" : "bold"}
                        numberOfLines={1}
                        style={{ color: on ? theme.colors.surface : theme.colors.text.secondary }}>
                        {cat.name}
                      </UIText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        )}

        {/* ─── Body ── */}
        {!hasResults ? (
          /* ── Discovery (editorial sections) ── */
          <ScrollView
            contentContainerStyle={[s.discovery, { paddingBottom: theme.layout.tabBarHeight + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* Recent searches — compact chips with teal start-border */}
            {recents.length > 0 && (
              <Animated.View entering={FadeInDown.delay(40).duration(280)} style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionTitleRow}>
                    <View style={s.sectionBullet} />
                    <UIText style={s.sectionTitle}>{t("search.recentTitle")}</UIText>
                  </View>
                  <Pressable onPress={() => {
                    setRecents([]);
                    AsyncStorage.removeItem(RECENTS_KEY).catch(() => {});
                  }} hitSlop={6}>
                    <UIText variant="caption" weight="bold" style={{ color: theme.colors.error.base }}>
                      {t("search.clearRecents")}
                    </UIText>
                  </Pressable>
                </View>
                <View style={s.recentWrap}>
                  {recents.map((term) => (
                    <Pressable
                      key={term}
                      onPress={() => quickSearch(term)}
                      style={({ pressed }) => [s.recentChip, pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 }]}>
                      <Ionicons name="time-outline" size={11} color={theme.colors.slate[500]} />
                      <UIText variant="caption" weight="bold" color="secondary">{term}</UIText>
                      <Ionicons name="arrow-back" size={10} color={theme.colors.slate[400]} />
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Trending — taller rows with top-right rank badge */}
            <Animated.View entering={FadeInDown.delay(80).duration(280)} style={s.section}>
              <View style={s.sectionTitleRow}>
                <View style={s.sectionBullet} />
                <UIText style={s.sectionTitle}>{t("search.trendingTitle")}</UIText>
              </View>
              <View style={s.trendGrid}>
                {(popularSearches.length > 0 ? popularSearches : TRENDING_META.map((m) => t(m.termKey))).map((term, i) => {
                  const meta  = TRENDING_META.find((m) => t(m.termKey) === term) ?? TRENDING_META[i % TRENDING_META.length];
                  const isTop = i < 3;
                  return (
                    <Pressable
                      key={term}
                      onPress={() => quickSearch(term)}
                      style={({ pressed }) => [
                        s.trendItem,
                        isTop && s.trendItemTop,
                        pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 },
                      ]}>
                      {/* Start-edge accent border — amber for top-3, hairline for rest */}
                      <View style={[s.trendStartBorder, isTop ? s.trendStartBorderTop : s.trendStartBorderDefault]} />
                      <View style={[s.trendIcon, { backgroundColor: meta.bg, borderColor: `${meta.color}30` }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                      <UIText variant="body-sm" weight="bold" align="right" style={s.trendLabel}>
                        {term}
                      </UIText>
                      {/* Rank badge at top-right corner */}
                      <View style={[s.trendRankBadge, isTop ? s.trendRankBadgeTop : s.trendRankBadgeDefault]}>
                        <UIText
                          variant="eyebrow"
                          style={isTop ? s.trendRankTextTop : s.trendRankTextDefault}>
                          #{i + 1}
                        </UIText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Categories — 2-col grid, taller tiles, count badge pill */}
            {categories && categories.length > 0 && (
              <Animated.View entering={FadeInDown.delay(120).duration(280)} style={s.section}>
                <View style={s.sectionTitleRow}>
                  <View style={s.sectionBullet} />
                  <UIText style={s.sectionTitle}>{t("search.categoriesTitle")}</UIText>
                </View>
                <View style={s.catGrid}>
                  {categories.slice(0, 6).map((cat, i) => {
                    const grad = theme.gradients.categories[i % theme.gradients.categories.length] as [string, string];
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => router.push({ pathname: "/category/[id]", params: { id: cat.id } })}
                        style={({ pressed }) => [s.catTile, pressed && { opacity: 0.87, transform: [{ scale: 0.975 }] }]}>
                        <LinearGradient
                          colors={grad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={s.catTileGrad}>
                          <Ionicons name="grid" size={22} color="rgba(255,255,255,0.92)" />
                        </LinearGradient>
                        <UIText variant="body-sm" weight="bold" numberOfLines={2} style={s.catTileName}>
                          {cat.name}
                        </UIText>
                        {cat.count > 0 && (
                          <View style={s.catCountBadge}>
                            <UIText style={s.catCountBadgeText}>{cat.count}+ items</UIText>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            )}
          </ScrollView>
        ) : (
          /* ── Results grid — FlashList v2 via ProductGrid ── */
          <View style={{ flex: 1 }}>
          <ProductGrid
            products={results}
            onProductPress={(p) => goProduct(p.id)}
            onEndReached={hasNextPage && !isFetchingNextPage ? loadMore : undefined}
            refreshing={resultsRefreshing}
            onRefresh={refetchResults}
            contentContainerStyle={{ paddingBottom: theme.layout.tabBarHeight + 24 }}
            lang={i18n.language === "en" ? "en" : "ar"}
            ListHeaderComponent={
              hasResults && grouped.length > 1 ? (
                <Animated.View entering={FadeInDown.duration(220)} style={s.groupHeader}>
                  {/* Section title treatment for results filter */}
                  <View style={s.sectionTitleRow}>
                    <View style={s.sectionBullet} />
                    <UIText style={s.sectionTitleSm}>{t("search.groupFilter")}</UIText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.groupChipsRow}>
                    {grouped.map((g) => {
                      const catObj = categories?.find((c) => c.name === g.cat);
                      const active = catObj && catFilter === catObj.id;
                      return (
                        <Pressable
                          key={g.cat}
                          onPress={() => {
                            if (catObj) setCatFilter(catFilter === catObj.id ? null : catObj.id);
                          }}
                          style={[s.groupChip, active && s.groupChipActive]}>
                          <UIText
                            variant="caption"
                            weight={active ? "black" : "bold"}
                            style={{ color: active ? theme.colors.surface : theme.colors.text.secondary }}>
                            {g.cat}
                          </UIText>
                          <View style={[s.groupChipCount, active && s.groupChipCountActive]}>
                            <UIText variant="eyebrow" style={{ color: active ? theme.colors.surface : theme.colors.text.tertiary }}>
                              {g.items.length}
                            </UIText>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </Animated.View>
              ) : null
            }
            ListEmptyComponent={
              isSearching ? (
                /* Skeleton grid — shows exact card geometry while data loads */
                <View style={s.skeletonGrid}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={s.skeletonCell}>
                      <ProductCardSkeleton />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ paddingTop: 60, paddingHorizontal: theme.spacing[2.5], gap: theme.spacing[2.5] }}>
                  {/* Large illustrated icon treatment */}
                  <View style={s.emptyIconBox}>
                    <Ionicons name="search-outline" size={36} color={theme.colors.teal[500]} />
                  </View>
                  <EmptyState
                    icon="search-outline"
                    title={t("search.noResults")}
                    description={
                      detectSearchLang(submitted) === "arabic"
                        ? t("search.noResultsDescAr", { query: submitted })
                        : t("search.noResultsDescEn", { query: submitted })
                    }
                  />
                  {/* Quick-search suggestions for empty state */}
                  <View style={s.emptyTrendWrap}>
                    <UIText variant="eyebrow" color="tertiary" align="right" style={{ marginBottom: 10 }}>
                      {t("search.tryPopular")}
                    </UIText>
                    <View style={s.emptyTrendChips}>
                      {TRENDING_META.slice(0, 4).map((m) => {
                        const term = t(m.termKey);
                        return (
                          <Pressable
                            key={m.termKey}
                            onPress={() => quickSearch(term)}
                            style={({ pressed }) => [
                              s.emptyTrendChip,
                              { borderColor: `${m.color}40` },
                              pressed && { opacity: 0.8 },
                            ]}>
                            <View style={[s.emptyTrendIcon, { backgroundColor: m.bg }]}>
                              <Ionicons name={m.icon} size={12} color={m.color} />
                            </View>
                            <UIText variant="caption" weight="bold" style={{ color: m.color }}>
                              {term}
                            </UIText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={s.footerLoader}>
                  <ActivityIndicator size="small" color={theme.colors.brand[600]} />
                </View>
              ) : null
            }
          />
          </View>
        )}

        {/* ─── Suggestions overlay — premium elevated card ──────────── */}
        {showSugg && (
          <Animated.View
            entering={FadeInDown.springify().damping(22).stiffness(300)}
            exiting={FadeOut.duration(120)}
            style={s.suggOverlay}>
            <View style={s.suggCard}>
              {/* Sunken header band */}
              <View style={s.suggHeader}>
                <View style={s.suggHeaderLeft}>
                  <Ionicons name="sparkles" size={12} color={theme.colors.brand[700]} />
                  <UIText variant="eyebrow" color="tertiary">{t("search.suggestions")}</UIText>
                </View>
                {suggFetching && <ActivityIndicator size="small" color={theme.colors.brand[600]} />}
              </View>
              {/* Separator under header */}
              <View style={s.suggSeparator} />

              {/* Scrollable rows */}
              <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
                {!suggFetching && suggestions.length === 0 && (
                  <View style={s.suggEmpty}>
                    <Ionicons name="search-outline" size={22} color={theme.colors.slate[300]} />
                    <UIText variant="caption" color="tertiary">
                      {t("search.noSuggestions", { query: debouncedQ })}
                    </UIText>
                  </View>
                )}
                {suggestions.map((p, i) => (
                  <SuggRow
                    key={p.id}
                    product={p}
                    query={debouncedQ}
                    queryResolved={resolvedDebouncedQ}
                    onPress={tapSugg}
                    index={i}
                    selected={selectedIdx === i}
                  />
                ))}
              </ScrollView>

              {/* Show-all footer — warm LinearGradient */}
              {suggestions.length > 0 && (
                <Pressable
                  onPress={() => submit()}
                  style={({ pressed }) => [pressed && { opacity: 0.88 }]}>
                  <LinearGradient
                    colors={[theme.colors.brand.lighter, theme.colors.teal[25]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.suggShowAll}>
                    <Ionicons name="search" size={14} color={theme.colors.brand[700]} />
                    <UIText variant="caption" weight="bold" color="brand">
                      {t("search.showAll", { query: debouncedQ })}
                    </UIText>
                    <Ionicons name="return-down-back" size={13} color={theme.colors.brand[700]} />
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ═══  STYLES — flagship premium  ═══════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════

// Glass/overlay constants — no theme token for these intentional design values
const SEARCH_OVERLAY = {
  teal10:  "rgba(13,184,168,0.10)",
  teal20:  "rgba(13,184,168,0.20)",
  white20: "rgba(255,255,255,0.20)",
} as const;

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, position: "relative" },

  // ── Header — dark gradient
  header: {
    paddingHorizontal: 20,
    paddingBottom:     18,
    gap:               14,
    overflow:          "hidden",
  },
  headerOrb1: {
    position:        "absolute",
    right:           -55,
    top:             -55,
    width:           170,
    height:          170,
    borderRadius:    85,
    backgroundColor: "rgba(13,184,168,0.10)",
  },
  headerOrb2: {
    position:        "absolute",
    left:            -50,
    bottom:          -20,
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  headerOrbAccent: {
    position:        "absolute",
    right:           50,
    top:             55,
    width:           54,
    height:          54,
    borderRadius:    27,
    backgroundColor: "rgba(13,184,168,0.08)",
  },
  topRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  topLeft: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  headerIcon: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: "rgba(13,184,168,0.18)",
    borderWidth:     1,
    borderColor:     "rgba(13,184,168,0.30)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  headerEyebrow: {
    fontSize:      10,
    fontFamily:    theme.fonts.bold,
    color:         "rgba(255,255,255,0.50)",
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize:      24,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.surface,
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: -0.5,
    marginTop:     2,
  },
  countPill: {
    backgroundColor:   "rgba(255,255,255,0.12)",
    borderRadius:      999,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.18)",
  },
  countPillText: {
    fontSize:   11,
    fontFamily: theme.fonts.black,
    color:      theme.colors.teal[300],
  },

  // ── Command bar — taller (58), more prominent (borderRadius 22)
  barContainer: { position: "relative" },
  barGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius:    22,
    opacity:         0,
    backgroundColor: SEARCH_OVERLAY.teal20,
    transform:       [{ scale: 1.04 }],
  },
  bar: {
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    backgroundColor:   "rgba(255,255,255,0.94)",
    borderRadius:      22,
    paddingHorizontal: 6,
    height:            58,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.60)",
    // Subtle inner shadow at the top
    borderTopColor:    "rgba(0,0,0,0.04)",
    borderTopWidth:    1,
    gap:               8,
    ...theme.shadow.lg,
  },
  barFocused: {
    backgroundColor: theme.colors.surface,
    borderColor:     theme.colors.brand[400],
    borderTopColor:  "rgba(0,0,0,0.04)",
  },
  barIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
  },
  barInputShell: {
    flex:            1,
    minWidth:        0,
    flexDirection:   "row",
    alignItems:      "center",
  },
  barInput: {
    flex:              1,
    minWidth:          0,
    paddingRight:      6,
    fontSize:          14.5,
    fontFamily:        theme.fonts.semibold,
    color:             theme.colors.text.primary,
    textAlign:         textAlignStart(IS_RTL),
    paddingHorizontal: 10,
  },
  barClear: {
    width:           26,
    height:          26,
    borderRadius:    8,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
  },
  barDivider: {
    width:            StyleSheet.hairlineWidth,
    height:           24,
    backgroundColor:  theme.colors.border.default,
    marginHorizontal: theme.spacing.xs,
  },
  barActions: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
    flexShrink:    0,
  },
  // Filter button — 40×40, borderRadius 13, teal glow when active
  barFilterBtn: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
    position:        "relative",
  },
  barFilterBtnActive: {
    backgroundColor: theme.colors.teal[600],
    ...theme.shadow.teal,
  },
  filterBadge: {
    position:          "absolute",
    top:               -3,
    right:             -3,
    minWidth:          16,
    height:            16,
    borderRadius:      8,
    backgroundColor:   theme.colors.amber[600],
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 3,
    borderWidth:       1.5,
    borderColor:       theme.colors.surface,
  },
  // Submit button — 40×40 rounded square wrapping a LinearGradient
  barSubmitWrap: {
    width:        40,
    height:       40,
    borderRadius: 13,
    overflow:     "hidden",
    marginStart:  2,
    ...theme.shadow.teal,
  },
  barSubmitWrapDisabled: {
    shadowOpacity: 0,
    elevation:     0,
  },
  barSubmitGrad: {
    flex:            1,
    alignItems:      "center",
    justifyContent:  "center",
  },

  hint: {
    alignItems: "center",
    paddingTop: 2,
  },
  hintText: {
    fontSize:   11,
    fontFamily: theme.fonts.semibold,
    color:      "rgba(255,255,255,0.45)",
    textAlign:  "center",
  },

  // ── Highlight match
  hlMatch: {
    color:           theme.colors.brand[700],
    fontFamily:      theme.fonts.black,
    backgroundColor: theme.colors.brand.lighter,
  },

  // ── Translation hint strip — warm animated band
  translationHint: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   theme.colors.brand.lighter,
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   6,
  },
  translationHintText: {
    color:    theme.colors.brand[700],
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
  },

  // ── Pulsing live indicator dot
  pulseDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: theme.colors.teal[500],
  },

  // ── Suggestions overlay
  suggOverlay: {
    position: "absolute",
    top:      theme.spacing.sm,
    left:     theme.spacing.md,
    right:    theme.spacing.md,
    bottom:   theme.layout.tabBarHeight,
    zIndex:   100,
    overflow: "hidden",
  },
  suggCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    24,
    overflow:        "hidden",
    flexShrink:      1,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.lg,
  },
  // Sunken header band
  suggHeader: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical:   theme.spacing.md,
    backgroundColor:   theme.colors.surfaceSunken,
  },
  suggSeparator: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
  },
  suggHeaderLeft: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           6,
  },
  suggRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical:   theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  // Thumbnail 44×44, borderRadius 14
  suggThumb: {
    width:           44,
    height:          44,
    borderRadius:    14,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
  },
  suggName: {
    fontSize:   13,
    fontFamily: theme.fonts.bold,
    color:      theme.colors.text.primary,
    textAlign:  textAlignStart(isRtl()),
  },
  suggCat:   { marginTop: 2 },
  suggPrice: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.2,
  },
  suggOos: {
    backgroundColor:   theme.colors.error.bg,
    borderRadius:      999,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       theme.colors.error.light,
  },
  suggEmpty: {
    alignItems:      "center",
    paddingVertical: theme.spacing[3.5],
    gap:             theme.spacing.sm,
  },
  // Show-all — warm LinearGradient strip
  suggShowAll: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    justifyContent:  "center",
    gap:             theme.spacing.sm,
    paddingVertical: 14,
  },

  // ── Filter panel
  filterPanel: {
    backgroundColor:   theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop:        14,
    paddingBottom:     14,
    gap:               theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  filterHeader: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  chipsRow: {
    flexDirection: flexRow(isRtl()),
    flexWrap:      "wrap",
    gap:           7,
  },
  // Chips — borderRadius 12, height 36
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   9,
    borderRadius:      12,
    height:            36,
    justifyContent:    "center",
    backgroundColor:   theme.colors.surfaceSunken,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  chipOn: {
    backgroundColor: theme.colors.brand[700],
    borderColor:     theme.colors.brand[700],
  },

  toggleRow: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    justifyContent:  "space-between",
    paddingVertical: 6,
  },
  toggleLeft: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           theme.spacing.sm,
  },
  // Spring-animated toggle
  sw: {
    width:           40,
    height:          24,
    borderRadius:    12,
    backgroundColor: theme.colors.slate[200],
    padding:         3,
    justifyContent:  "center",
  },
  swOn: { backgroundColor: theme.colors.brand[600] },
  swThumb: {
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.xs,
  },

  // ── Discovery sections
  discovery: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop:        theme.spacing[2.5],
    gap:               theme.spacing[3.5],
  },
  section: { gap: 14 },
  sectionHeader: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  // New: colored left-border bullet + bold title treatment
  sectionTitleRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           10,
  },
  // 3×20 teal rounded left-border accent
  sectionBullet: {
    width:           3,
    height:          20,
    borderRadius:    2,
    backgroundColor: theme.colors.teal[500],
  },
  sectionTitle: {
    fontSize:      20,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.text.primary,
    letterSpacing: -0.4,
  },
  // Smaller variant used in results header
  sectionTitleSm: {
    fontSize:      16,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.text.primary,
    letterSpacing: -0.3,
  },

  // Recent chips — borderRadius 14, start-border teal accent
  recentWrap: {
    flexDirection: flexRow(isRtl()),
    flexWrap:      "wrap",
    gap:           theme.spacing.sm,
  },
  recentChip: {
    flexDirection:      flexRow(isRtl()),
    alignItems:         "center",
    gap:                7,
    paddingHorizontal:  14,
    paddingVertical:    10,
    borderRadius:       14,
    backgroundColor:    theme.colors.surface,
    borderWidth:        1,
    borderColor:        theme.colors.border.hairline,
    // Teal start-edge accent
    borderStartWidth:   2,
    borderStartColor:   theme.colors.teal[300],
    ...theme.shadow.hairline,
  },

  // Trending rows — taller (minHeight 60), rank badge at top-right
  trendGrid: { gap: theme.spacing.sm },
  trendItem: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               theme.spacing.md,
    backgroundColor:   theme.colors.surface,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   theme.spacing.md,
    minHeight:         60,
    position:          "relative",
    overflow:          "hidden",
    ...theme.shadow.card,
  },
  // Top-3 items get slightly sunken background
  trendItemTop: {
    backgroundColor: theme.colors.surfaceSunken,
  },
  // Start-edge accent border — RTL-safe via borderStartWidth
  trendStartBorder: {
    position:     "absolute",
    top:          0,
    bottom:       0,
    start:        0,
    width:        3,
    borderRadius: 2,
  },
  trendStartBorderTop: {
    backgroundColor: theme.colors.amber[400],
  },
  trendStartBorderDefault: {
    backgroundColor: theme.colors.border.hairline,
  },
  // Icon container — 44×44, borderRadius 14
  trendIcon: {
    width:          44,
    height:         44,
    borderRadius:   14,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    flexShrink:     0,
    marginStart:    8,
  },
  trendLabel: {
    flex:      1,
    textAlign: textAlignStart(isRtl()),
  },
  // Rank badge positioned at top-right corner
  trendRankBadge: {
    position:          "absolute",
    top:               6,
    end:               8,
    minWidth:          28,
    height:            20,
    borderRadius:      6,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 5,
    borderWidth:       1,
  },
  trendRankBadgeTop: {
    backgroundColor: theme.colors.amber[50],
    borderColor:     `${theme.colors.amber[400]}38`,
  },
  trendRankBadgeDefault: {
    backgroundColor: theme.colors.surfaceSunken,
    borderColor:     theme.colors.border.hairline,
  },
  trendRankTextTop: {
    fontFamily: theme.fonts.black,
    fontSize:   10,
    color:      theme.colors.amber[700],
  },
  trendRankTextDefault: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      theme.colors.text.tertiary,
  },

  // Category grid — taller tiles, 52×52 icon
  catGrid: {
    flexDirection: flexRow(isRtl()),
    flexWrap:      "wrap",
    gap:           10,
  },
  catTile: {
    width:            "48%" as any,
    backgroundColor:  theme.colors.surface,
    borderRadius:     20,
    padding:          14,
    paddingVertical:  18,
    alignItems:       "flex-start",
    gap:              8,
    ...theme.shadow.card,
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
  },
  // 52×52, borderRadius 16
  catTileGrad: {
    width:          52,
    height:         52,
    borderRadius:   16,
    alignItems:     "center",
    justifyContent: "center",
  },
  catTileName: {
    color:      theme.colors.text.primary,
    lineHeight: 19,
  },
  // Count badge pill chip
  catCountBadge: {
    backgroundColor:   theme.colors.teal[50],
    borderRadius:      999,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
  },
  catCountBadgeText: {
    fontSize:   10,
    fontFamily: theme.fonts.bold,
    color:      theme.colors.teal[700],
  },

  // ── Results grid header
  groupHeader: {
    marginBottom: 14,
    gap:          theme.spacing.sm,
  },
  groupChipsRow: {
    gap:               7,
    paddingHorizontal: 2,
  },
  // Group chips — borderRadius 12, height 36
  groupChip: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               7,
    backgroundColor:   theme.colors.surface,
    borderRadius:      12,
    height:            36,
    paddingHorizontal: theme.spacing.md,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  groupChipActive: {
    backgroundColor: theme.colors.brand[700],
    borderColor:     theme.colors.brand[700],
  },
  groupChipCount: {
    minWidth:          20,
    backgroundColor:   theme.colors.surfaceSunken,
    borderRadius:      999,
    paddingHorizontal: 6,
    paddingVertical:   1,
    alignItems:        "center",
  },
  groupChipCountActive: {
    backgroundColor: SEARCH_OVERLAY.white20,
  },

  footerLoader: {
    paddingVertical: theme.spacing[3],
    alignItems:      "center",
  },

  // Skeleton grid
  skeletonGrid: {
    flexDirection: flexRow(isRtl()),
    flexWrap:        "wrap",
    padding:         theme.spacing.md,
    gap:             10,
  },
  skeletonCell: {
    width: "47%" as any,
  },

  // ── Empty state — large illustrated icon
  emptyIconBox: {
    width:           80,
    height:          80,
    borderRadius:    24,
    backgroundColor: theme.colors.teal[50],
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
    alignSelf:       "center",
    marginBottom:    4,
  },
  emptyTrendWrap:  { paddingHorizontal: theme.spacing.xs },
  emptyTrendChips: {
    flexDirection: flexRow(isRtl()),
    flexWrap:      "wrap",
    gap:           theme.spacing.sm,
  },
  // Empty-state chips — borderRadius 14, more padding
  emptyTrendChip: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               7,
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   10,
    borderRadius:      14,
    backgroundColor:   theme.colors.surface,
    borderWidth:       1,
    ...theme.shadow.hairline,
  },
  emptyTrendIcon: {
    width:          22,
    height:         22,
    borderRadius:   7,
    alignItems:     "center",
    justifyContent: "center",
  },
});
