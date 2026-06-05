/**
 * Search — light-mode-first premium discovery experience.
 *
 * Architectural decisions:
 *   - Light-mode foundation: every surface is `surface` or `surfaceSunken`;
 *     elevation comes from `shadow.card` / `shadow.brandGlow`, never from
 *     dark contrast. Dropped the cinematic dark gradient header entirely.
 *   - Editorial information rhythm: eyebrow → card-title → body-sm →
 *     caption tiers cascade across discovery sections, suggestions, and
 *     filter panel.
 *   - One typography primitive (`UIText`) across the file. Zero raw <UIText>
 *     for content; only `<TextInput>` and highlight slices remain.
 *   - Suggestions overlay rebuilt as elevated white Card with hairline
 *     dividers — reads as predictive helper, not a dropdown menu.
 *   - Discovery cards use `interactive`-style press (scale 0.985 on press)
 *     for premium tactility.
 *   - Result grid leverages the already-refined ProductCard rather than a
 *     bespoke local variant — ensures consistency across Home / Categories /
 *     Search / Wishlist surfaces.
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
import type { NativeProduct, NativeCategory } from "@/services/productsApi";

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

function Hl({ text, q, style, lines }: { text: string; q: string; style?: any; lines?: number }) {
  if (!q || q.length < 2) return <UIText style={style} numberOfLines={lines}>{text}</UIText>;
  const lower = text.toLowerCase();
  const ql    = q.toLowerCase().trim();
  const idx   = lower.indexOf(ql);
  if (idx < 0) return <UIText style={style} numberOfLines={lines}>{text}</UIText>;
  return (
    <UIText style={style} numberOfLines={lines}>
      {text.slice(0, idx)}
      <UIText style={s.hlMatch}>{text.slice(idx, idx + ql.length)}</UIText>
      {text.slice(idx + ql.length)}
    </UIText>
  );
}

// ─── Suggestion row — light, refined ────────────────────────────────────────

const SuggRow = React.memo(function SuggRow({
  product, query, onPress, index, selected,
}: { product: NativeProduct; query: string; onPress: (p: NativeProduct) => void; index: number; selected: boolean }) {
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
          <Hl text={name} q={query} style={s.suggName} lines={1} />
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
  const inputLang = useMemo(
    () => (query.trim().length > 0 ? detectSearchLang(query.trim()) : null),
    [query],
  );

  const translationHintText = useMemo(() => {
    const raw = searchResolution?.displayHint;
    if (!raw) return null;
    if (raw.includes(':')) return raw.split(':').slice(1).join(':').trim();
    return raw;
  }, [searchResolution]);

  const showSugg   = focused && debouncedQ.length >= 2 && debouncedQ !== submitted;
  const hasResults = submitted.length >= 2;

  // Reset suggestion selection when suggestions change
  useEffect(() => { setSelectedIdx(-1); }, [debouncedQ]);

  // ── Animation — refined focus glow ──
  const barGlow  = useSharedValue(0);
  const barScale = useSharedValue(1);
  const barAnim  = useAnimatedStyle(() => ({ transform: [{ scale: barScale.value }] }));
  const glowAnim = useAnimatedStyle(() => ({ opacity: barGlow.value }));

  // ── Data ──
  const { data: categories } = useQuery({
    queryKey: ["searchCategories"],
    queryFn:  fetchCategories,
    staleTime: 10 * 60_000,
  });

  // Popular searches from analytics — falls back to hardcoded TRENDING if unavailable
  const { data: popularData } = useQuery({
    queryKey: ["popularSearches"],
    queryFn:  () => supabase.rpc("get_popular_searches", { p_limit: 6, p_days: 7 }),
    staleTime: 10 * 60_000,
    gcTime:    30 * 60_000,
  });
  const popularSearches: string[] = (popularData?.data as Array<{ query: string }> | null)
    ?.map((r) => r.query)
    .filter(Boolean) ?? [];

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
  const {
    products:  suggestions,
    isLoading: suggFetching,
  } = useProductSearch({ query: debouncedQ, enabled: showSugg });

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
    search:     submitted || undefined,
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
      supabase
        .rpc("log_search_event", {
          p_query:        submitted,
          p_result_count: totalCount,
          p_source:       "native",
        })
        .then(({ error }) => {
          if (error && __DEV__) console.warn("[search] analytics:", error.message);
        })
        .catch(() => {});
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
    // Analytics: log search term (fire-and-forget, never throws)
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

  // Grid rendering is delegated to ProductGrid (FlashList v2). Per-card
  // memoisation + stable callbacks live in ProductCard itself.

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

      {/* ─── Premium dark-gradient header — consistent with app design language ── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}>

        {/* Decorative orb */}
        <View style={s.headerOrb} />

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

        {/* ─── Command bar — glassmorphic on dark header ── */}
        <View style={s.barContainer}>
          <Animated.View style={[s.barGlow, glowAnim, { pointerEvents: "none" }]} />

          <Animated.View style={[s.bar, barAnim, focused && s.barFocused]}>
            <View style={s.barIconWrap}>
              {suggFetching || isSearching ? (
                <ActivityIndicator size="small" color={theme.colors.brand[700]} />
              ) : (
                <Ionicons name="search" size={17} color={focused ? theme.colors.brand[700] : theme.colors.slate[400]} />
              )}
            </View>

            {/* Language badge removed to save space */}

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
              textAlign="right"
              selectionColor={theme.colors.brand[600]}
            />

            {query.length > 0 && (
              <Pressable onPress={clear} hitSlop={10} style={s.barClear}>
                <Ionicons name="close" size={13} color={theme.colors.slate[500]} />
              </Pressable>
            )}

            <View style={s.barDivider} />

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

            {query.length >= 2 && (
              <Pressable
                onPress={() => submit()}
                accessibilityRole="button"
                accessibilityLabel={t("search.searchBtn")}
                style={({ pressed }) => [s.barSubmit, pressed && { opacity: 0.85 }]}>
                <Ionicons name="return-down-back" size={14} color={theme.colors.surface} />
              </Pressable>
            )}
          </Animated.View>
        </View>

        {/* Translation / typo-fix hint strip */}
        {translationHintText && debouncedQ.length >= 2 && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOut.duration(140)}
            style={s.translationHint}>
            <Ionicons name="language-outline" size={11} color={theme.colors.brand[600]} />
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

        {/* Filter panel — light, refined */}
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

            <Pressable
              onPress={() => { setInStockOnly((v) => !v); if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); }}
              style={s.toggleRow}>
              <View style={s.toggleLeft}>
                <Ionicons name="cube-outline" size={14} color={theme.colors.slate[600]} />
                <UIText variant="body-sm" weight="bold" color="secondary">{t("search.inStockOnly")}</UIText>
              </View>
              <View style={[s.sw, inStockOnly && s.swOn]}>
                <View style={[s.swThumb, inStockOnly && s.swThumbOn]} />
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
          /* ── Discovery (light, editorial) ── */
          <ScrollView
            contentContainerStyle={[s.discovery, { paddingBottom: theme.layout.tabBarHeight + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* Recent searches */}
            {recents.length > 0 && (
              <Animated.View entering={FadeInDown.delay(40).duration(280)} style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionTitleWrap}>
                    <View style={[s.sectionIcon, { backgroundColor: theme.colors.slate[100] }]}>
                      <Ionicons name="time-outline" size={13} color={theme.colors.slate[600]} />
                    </View>
                    <View>
                      <UIText variant="eyebrow" color="tertiary" align="right">{t("search.recentEyebrow")}</UIText>
                      <UIText variant="card-title" align="right" style={s.sectionTitleNew}>
                        {t("search.recentTitle")}
                      </UIText>
                    </View>
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

            {/* Trending */}
            <Animated.View entering={FadeInDown.delay(80).duration(280)} style={s.section}>
              <View style={s.sectionTitleWrap}>
                <View style={[s.sectionIcon, { backgroundColor: theme.colors.brand.lighter, borderColor: theme.colors.border.brandSoft }]}>
                  <Ionicons name="trending-up" size={14} color={theme.colors.brand[700]} />
                </View>
                <View>
                  <UIText variant="eyebrow" color="tertiary" align="right">{t("search.trendingEyebrow")}</UIText>
                  <UIText variant="card-title" align="right" style={s.sectionTitleNew}>
                    {t("search.trendingTitle")}
                  </UIText>
                </View>
              </View>
              <View style={s.trendGrid}>
                {(popularSearches.length > 0 ? popularSearches : TRENDING_META.map((m) => t(m.termKey))).map((term, i) => {
                  const meta = TRENDING_META.find((m) => t(m.termKey) === term) ?? TRENDING_META[i % TRENDING_META.length];
                  return (
                    <Pressable
                      key={term}
                      onPress={() => quickSearch(term)}
                      style={({ pressed }) => [s.trendItem, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}>
                      <View style={[s.trendIcon, { backgroundColor: meta.bg, borderColor: `${meta.color}28` }]}>
                        <Ionicons name={meta.icon} size={16} color={meta.color} />
                      </View>
                      <UIText variant="body-sm" weight="bold" align="right" style={s.trendLabel}>
                        {term}
                      </UIText>
                      <View style={s.trendIdxWrap}>
                        <UIText variant="eyebrow" color="tertiary">#{i + 1}</UIText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            {/* Categories */}
            {categories && categories.length > 0 && (
              <Animated.View entering={FadeInDown.delay(120).duration(280)} style={s.section}>
                <View style={s.sectionTitleWrap}>
                  <View style={[s.sectionIcon, { backgroundColor: theme.colors.brand.lighter, borderColor: theme.colors.border.brandSoft }]}>
                    <Ionicons name="grid-outline" size={14} color={theme.colors.brand[700]} />
                  </View>
                  <View>
                    <UIText variant="eyebrow" color="tertiary" align="right">{t("search.categoriesEyebrow")}</UIText>
                    <UIText variant="card-title" align="right" style={s.sectionTitleNew}>
                      {t("search.categoriesTitle")}
                    </UIText>
                  </View>
                </View>
                <View style={s.catList}>
                  {categories.slice(0, 6).map((cat, i, arr) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => router.push({ pathname: "/category/[id]", params: { id: cat.id } })}
                      style={({ pressed }) => [
                        s.catRow,
                        i < arr.length - 1 && s.catRowDivider,
                        pressed && { backgroundColor: theme.colors.surfaceSunken },
                      ]}>
                      <View style={s.catIcon}>
                        <Ionicons name="grid" size={14} color={theme.colors.brand[700]} />
                      </View>
                      <UIText variant="body-sm" weight="bold" align="right" numberOfLines={1} style={{ flex: 1 }}>
                        {cat.name}
                      </UIText>
                      {cat.count > 0 && (
                        <View style={s.catCountChip}>
                          <UIText variant="eyebrow" color="secondary">{cat.count}</UIText>
                        </View>
                      )}
                      <Ionicons name="chevron-back" size={14} color={theme.colors.slate[400]} />
                    </Pressable>
                  ))}
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
                  <UIText variant="eyebrow" color="tertiary" align="right" style={s.groupEyebrow}>
                    {t("search.groupFilter")}
                  </UIText>
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

        {/* ─── Suggestions overlay — elevated white card ──────────── */}
        {/* bottom: tabBarHeight keeps the card above the floating nav bar  */}
        {showSugg && (
          <Animated.View
            entering={FadeInDown.springify().damping(22).stiffness(300)}
            exiting={FadeOut.duration(120)}
            style={s.suggOverlay}>
            <View style={s.suggCard}>
              {/* Header */}
              <View style={s.suggHeader}>
                <View style={s.suggHeaderLeft}>
                  <Ionicons name="sparkles" size={12} color={theme.colors.brand[700]} />
                  <UIText variant="eyebrow" color="tertiary">{t("search.suggestions")}</UIText>
                </View>
                {suggFetching && <ActivityIndicator size="small" color={theme.colors.brand[600]} />}
              </View>

              {/* Scrollable rows — clipped to never overlap the tab bar */}
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
                    onPress={tapSugg}
                    index={i}
                    selected={selectedIdx === i}
                  />
                ))}
              </ScrollView>

              {suggestions.length > 0 && (
                <Pressable
                  onPress={() => submit()}
                  style={({ pressed }) => [s.suggShowAll, pressed && { opacity: 0.88 }]}>
                  <Ionicons name="search" size={14} color={theme.colors.brand[700]} />
                  <UIText variant="caption" weight="bold" color="brand">
                    {t("search.showAll", { query: debouncedQ })}
                  </UIText>
                  <Ionicons name="return-down-back" size={13} color={theme.colors.brand[700]} />
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
// ═══  STYLES — light-mode-first  ═══════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════

// Glass/overlay constants — no theme token for these intentional design values
const SEARCH_OVERLAY = {
  teal10:  "rgba(13,184,168,0.10)", // barGlow aura behind search bar
  white20: "rgba(255,255,255,0.20)", // active chip count badge on brand bg
} as const;

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: theme.colors.bg },
  content: { flex: 1, position: "relative" },

  // ── Header — dark gradient, consistent with Home/Profile/Orders
  header: {
    paddingHorizontal: 20,
    paddingBottom:     18,
    gap:               14,
    overflow:          "hidden",
  },
  headerOrb: {
    position:        "absolute",
    right:           -40,
    top:             -40,
    width:           130,
    height:          130,
    borderRadius:    65,
    backgroundColor: "rgba(13,184,168,0.10)",
  },
  topRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  topLeft: {
    flexDirection: "row-reverse",
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
    textAlign:     "right",
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontSize:      24,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.surface,
    textAlign:     "right",
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

  // ── Command bar — glassmorphic on dark gradient header
  barContainer: { position: "relative" },
  barGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius:    20,
    opacity:         0,
    backgroundColor: "rgba(13,184,168,0.20)",
    transform:       [{ scale: 1.04 }],
  },
  bar: {
    flexDirection:     "row",
    alignItems:        "center",
    backgroundColor:   "rgba(255,255,255,0.94)",
    borderRadius:      20,
    paddingHorizontal: 6,
    height:            54,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.60)",
    gap:               2,
    ...theme.shadow.lg,
    shadowOpacity:     0.18,
  },
  barFocused: {
    backgroundColor: theme.colors.surface,
    borderColor:     theme.colors.brand[400],
  },
  barIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
  },
  barInput: {
    flex:              1,
    fontSize:          14.5,
    fontFamily:        theme.fonts.semibold,
    color:             theme.colors.text.primary,
    textAlign:         "right",
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
    width:           StyleSheet.hairlineWidth,
    height:          24,
    backgroundColor: theme.colors.border.default,
    marginHorizontal: theme.spacing.xs,
  },
  barFilterBtn: {
    width:           38,
    height:          38,
    borderRadius:    11,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
    position:        "relative",
  },
  barFilterBtnActive: {
    backgroundColor: theme.colors.brand[700],
  },
  filterBadge: {
    position:        "absolute",
    top:             -3,
    right:           -3,
    minWidth:        16,
    height:          16,
    borderRadius:    8,
    backgroundColor: theme.colors.amber[600],
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 3,
    borderWidth:     1.5,
    borderColor:     theme.colors.surface,
  },
  barSubmit: {
    width:           38,
    height:          38,
    borderRadius:    11,
    backgroundColor: theme.colors.brand[700],
    alignItems:      "center",
    justifyContent:  "center",
    marginLeft:      2,
    ...theme.shadow.brand,
    shadowOpacity:   0.24,
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

  // ── Suggestions overlay — elevated white card
  // bottom: tabBarHeight ensures the card never extends behind the floating nav
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
    borderRadius:    18,
    overflow:        "hidden",
    flexShrink:      1,
    ...theme.shadow.lg,
    shadowOpacity:   0.10,
  },
  suggHeader: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical:   theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  suggHeaderLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           6,
  },
  suggRow: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical:   theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  suggThumb: {
    width:           42,
    height:          42,
    borderRadius:    12,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
  },
  suggName: {
    fontSize:   13,
    fontFamily: theme.fonts.bold,
    color:      theme.colors.text.primary,
    textAlign:  "right",
  },
  suggCat: {
    marginTop: 2,
  },
  suggPrice: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.2,
  },
  suggOos: {
    backgroundColor: theme.colors.error.bg,
    borderRadius:    999,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
  },
  suggEmpty: {
    alignItems:      "center",
    paddingVertical: theme.spacing[3.5],
    gap:             theme.spacing.sm,
  },
  suggShowAll: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             theme.spacing.sm,
    paddingVertical: 14,
    backgroundColor:  theme.colors.brand.lighter,
  },

  // ── Filter panel — light, refined
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
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  chipsRow: {
    flexDirection: "row-reverse",
    flexWrap:      "wrap",
    gap:           7,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical:   theme.spacing.sm,
    borderRadius:      999,
    backgroundColor:   theme.colors.surfaceSunken,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  chipOn: {
    backgroundColor: theme.colors.brand[700],
    borderColor:     theme.colors.brand[700],
  },

  toggleRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  toggleLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           theme.spacing.sm,
  },
  sw: {
    width:           38,
    height:          22,
    borderRadius:    11,
    backgroundColor: theme.colors.slate[200],
    padding:         2,
    justifyContent:  "center",
  },
  swOn: { backgroundColor: theme.colors.brand[600] },
  swThumb: {
    width:           18,
    height:          18,
    borderRadius:    9,
    backgroundColor: theme.colors.surface,
    alignSelf:       "flex-end",
    ...theme.shadow.hairline,
  },
  swThumbOn: { alignSelf: "flex-start" },

  // ── Discovery sections — editorial light rhythm
  discovery: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop:        theme.spacing[2.5],
    gap:               theme.spacing[3.5],
  },
  section: { gap: 14 },
  sectionHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  sectionTitleWrap: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  sectionIcon: {
    width:           34,
    height:          34,
    borderRadius:    11,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
  },
  // Section titles — 18px black, matching the app's HomeSectionHeader hierarchy
  sectionTitleNew: {
    fontSize:      18,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.text.primary,
    letterSpacing: -0.3,
    marginTop:     2,
  },

  // Recent searches — refined chips
  recentWrap: {
    flexDirection: "row-reverse",
    flexWrap:      "wrap",
    gap:           theme.spacing.sm,
  },
  recentChip: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              7,
    paddingHorizontal: 13,
    paddingVertical:   9,
    borderRadius:     999,
    backgroundColor:  theme.colors.surface,
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
    ...theme.shadow.hairline,
  },

  // Trending — premium tile rows
  trendGrid: { gap: theme.spacing.sm },
  trendItem: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing.md,
    backgroundColor:   theme.colors.surface,
    borderRadius:      14,
    paddingHorizontal: 14,
    paddingVertical:   theme.spacing.md,
    ...theme.shadow.card,
  },
  trendIcon: {
    width:           38,
    height:          38,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
  },
  trendLabel: {
    flex: 1,
  },
  trendIdxWrap: {
    width:           28,
    height:          24,
    borderRadius:    8,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
  },

  // Category browse list — one unified card with hairline rows
  catList: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    overflow:        "hidden",
    ...theme.shadow.card,
  },
  catRow: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical:   14,
  },
  catRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  catIcon: {
    width:           36,
    height:          36,
    borderRadius:    11,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  catCountChip: {
    minWidth:        28,
    height:          22,
    borderRadius:    7,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 7,
  },

  // ── Results grid
  grid:    { paddingHorizontal: theme.spacing.lg, paddingTop: 14 },
  gridRow: { gap: theme.spacing.md, marginBottom: theme.spacing.md },

  groupHeader: {
    marginBottom: 14,
    gap:          theme.spacing.sm,
  },
  groupEyebrow: {
    paddingHorizontal: 2,
  },
  groupChipsRow: {
    gap:              7,
    paddingHorizontal: 2,
  },
  groupChip: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              7,
    backgroundColor:  theme.colors.surface,
    borderRadius:     999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   7,
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
  },
  groupChipActive: {
    backgroundColor: theme.colors.brand[700],
    borderColor:     theme.colors.brand[700],
  },
  groupChipCount: {
    minWidth:        20,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    999,
    paddingHorizontal: 6,
    paddingVertical:   1,
    alignItems:      "center",
  },
  groupChipCountActive: {
    backgroundColor: SEARCH_OVERLAY.white20,
  },

  searchingWrap: {
    paddingTop: 60,
    alignItems: "center",
    gap:        theme.spacing.md,
  },
  footerLoader: {
    paddingVertical: theme.spacing[3],
    alignItems:      "center",
  },

  // Skeleton grid — 2 columns matching the product grid geometry
  skeletonGrid: {
    flexDirection:   "row-reverse",
    flexWrap:        "wrap",
    padding:         theme.spacing.md,
    gap:             10,
  },
  skeletonCell: {
    width: "47%" as any,
  },

  // ── Language badge — tiny script indicator inside the search bar ──────────
  langBadge: {
    height:          20,
    borderRadius:    6,
    paddingHorizontal: 6,
    alignItems:      "center",
    justifyContent:  "center",
    marginLeft:      2,
    borderWidth:     1,
  },
  langBadgeAr: {
    backgroundColor: theme.colors.brand.lighter,
    borderColor:     theme.colors.border.brandSoft,
  },
  langBadgeMix: {
    backgroundColor: theme.colors.amber[50],
    borderColor:     `${theme.colors.amber[600]}30`,
  },
  langBadgeCode: {
    backgroundColor: theme.colors.purple[50],
    borderColor:     `${theme.colors.purple[600]}30`,
  },

  // ── Translation hint strip ────────────────────────────────────────────────
  translationHint: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              6,
    paddingHorizontal: 6,
    paddingVertical:   theme.spacing.xs,
  },
  translationHintText: {
    color:    theme.colors.brand[700],
    fontSize: 11,
  },

  // ── Empty-state quick suggestions ────────────────────────────────────────
  emptyTrendWrap:  { paddingHorizontal: theme.spacing.xs },
  emptyTrendChips: {
    flexDirection: "row-reverse",
    flexWrap:      "wrap",
    gap:           theme.spacing.sm,
  },
  emptyTrendChip: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               7,
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   9,
    borderRadius:     999,
    backgroundColor:  theme.colors.surface,
    borderWidth:      1,
    ...theme.shadow.hairline,
  },
  emptyTrendIcon: {
    width:        22,
    height:       22,
    borderRadius: 7,
    alignItems:   "center",
    justifyContent: "center",
  },
});
