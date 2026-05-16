import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
import { useDebounce } from "@/hooks/useDebounce";
import { fetchProducts, fetchCategories } from "@/services/productsApi";
import { useCartStore } from "@/stores/cart";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";
import type { NativeProduct, NativeCategory } from "@/services/productsApi";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_W = (SCREEN_WIDTH - 40 - 10) / 2;

type SortKey = "newest" | "price_asc" | "price_desc" | "name_asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest",     label: "الأحدث" },
  { key: "price_asc",  label: "الأرخص" },
  { key: "price_desc", label: "الأغلى" },
  { key: "name_asc",   label: "أ-ي" },
];

const TRENDING: { term: string; icon: IoniconsName; color: string }[] = [
  { term: "باراسيتامول", icon: "medkit",         color: theme.colors.brand[600] },
  { term: "بانادول",      icon: "medical",        color: "#7C3AED" },
  { term: "فيتامين C",   icon: "sunny-outline",  color: theme.colors.amber[600] },
  { term: "بروفين",       icon: "fitness",        color: theme.colors.rose[500] },
  { term: "كونجستال",     icon: "thermometer",    color: theme.colors.brand[600] },
  { term: "كريم مرطب",   icon: "water-outline",  color: "#0891B2" },
];

// ─── Highlight match ──────────────────────────────────────────────────────

function Hl({ text, q, style, lines }: { text: string; q: string; style?: any; lines?: number }) {
  if (!q || q.length < 2) return <Text style={style} numberOfLines={lines}>{text}</Text>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase().trim();
  const idx = lower.indexOf(ql);
  if (idx < 0) return <Text style={style} numberOfLines={lines}>{text}</Text>;
  return (
    <Text style={style} numberOfLines={lines}>
      {text.slice(0, idx)}
      <Text style={s.hlMatch}>{text.slice(idx, idx + ql.length)}</Text>
      {text.slice(idx + ql.length)}
    </Text>
  );
}

// ─── Suggestion row ───────────────────────────────────────────────────────

const SuggRow = React.memo(function SuggRow({
  product, query, onPress, index,
}: { product: NativeProduct; query: string; onPress: () => void; index: number }) {
  const name = product.nameAr ?? product.name;
  return (
    <Animated.View entering={FadeInRight.delay(index * 25).duration(180)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [s.suggRow, pressed && { backgroundColor: "rgba(255,255,255,0.06)" }]}>
        <View style={s.suggThumb}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={80} />
          ) : (
            <Ionicons name="medkit-outline" size={14} color={theme.colors.slate[400]} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Hl text={name} q={query} style={s.suggName} lines={1} />
          <Text style={s.suggCat} numberOfLines={1}>{product.categoryName}</Text>
        </View>
        <Text style={s.suggPrice}>{formatPrice(product.price)}</Text>
        {!product.inStock && (
          <View style={s.suggOos}><Text style={s.suggOosText}>نفذ</Text></View>
        )}
        <Ionicons name="arrow-back" size={12} color="rgba(255,255,255,0.25)" />
      </Pressable>
    </Animated.View>
  );
});

// ─── Result card ──────────────────────────────────────────────────────────

const ResultCard = React.memo(function ResultCard({
  product, onPress, onAdd,
}: { product: NativeProduct; onPress: () => void; onAdd: () => void }) {
  const name = product.nameAr ?? product.name;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}>
      <View style={s.cardImgWrap}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={s.cardImg} contentFit="contain" transition={120} />
        ) : (
          <View style={s.cardImgEmpty}>
            <Ionicons name="medkit-outline" size={26} color={theme.colors.slate[200]} />
          </View>
        )}
        {!product.inStock && (
          <View style={s.cardOos}><Text style={s.cardOosText}>نفذ</Text></View>
        )}
        {product.inStock && <View style={s.cardLive} />}
      </View>
      <View style={s.cardBody}>
        {product.categoryName ? (
          <Text style={s.cardCatLabel} numberOfLines={1}>{product.categoryName}</Text>
        ) : null}
        <Text style={s.cardName} numberOfLines={2}>{name}</Text>
        <View style={s.cardFooter}>
          <Text style={s.cardPrice}>{formatPrice(product.price)}</Text>
          <Pressable
            onPress={(e) => { e.stopPropagation(); onAdd(); }}
            disabled={!product.inStock}
            style={[s.cardAddBtn, !product.inStock && s.cardAddBtnOff]}>
            <Ionicons name="add" size={15} color={product.inStock ? "#fff" : theme.colors.slate[400]} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ═══  SCREEN  ═════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const addItem = useCartStore((s) => s.addItem);

  // ── State ──
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [focused, setFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  const debouncedQ = useDebounce(query.trim(), 200);

  const showSugg = focused && debouncedQ.length >= 2 && debouncedQ !== submitted;
  const hasResults = submitted.length >= 2;

  // ── Animation ──
  const barGlow = useSharedValue(0);
  const barScale = useSharedValue(1);
  const barAnim = useAnimatedStyle(() => ({
    transform: [{ scale: barScale.value }],
  }));
  const glowAnim = useAnimatedStyle(() => ({
    opacity: barGlow.value,
  }));

  // ── Data ──
  const { data: categories } = useQuery({
    queryKey: ["searchCategories"],
    queryFn: fetchCategories,
    staleTime: 10 * 60_000,
  });

  const { data: suggData, isFetching: suggFetching } = useQuery({
    queryKey: ["cmd-sugg", debouncedQ],
    queryFn: () => fetchProducts({ search: debouncedQ, page: 1, pageSize: 7 }),
    enabled: showSugg,
    staleTime: 30_000,
  });
  const suggestions = suggData?.products ?? [];

  const {
    data, isLoading: resultsLoading, isFetchingNextPage,
    hasNextPage, fetchNextPage, isFetching: resultsFetching,
  } = useInfiniteQuery({
    queryKey: ["cmd-results", submitted, sortBy, inStockOnly, catFilter],
    queryFn: ({ pageParam = 1 }) =>
      fetchProducts({
        search: submitted, sortBy,
        inStock: inStockOnly || undefined,
        categoryId: catFilter ?? undefined,
        page: pageParam, pageSize: 20,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.currentPage + 1 : undefined),
    enabled: hasResults,
    staleTime: 60_000,
  });

  const results = data?.pages.flatMap((p) => p.products) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;
  const isSearching = hasResults && (resultsLoading || (resultsFetching && !results.length));

  // Save recents
  useEffect(() => {
    if (submitted.length > 1 && results.length > 0) {
      setRecents((p) => [submitted, ...p.filter((x) => x !== submitted)].slice(0, 8));
    }
  }, [submitted, results.length]);

  // ── Handlers ──
  const submit = useCallback((text?: string) => {
    const q = (text ?? query).trim();
    if (!q) return;
    setSubmitted(q);
    setQuery(q);
    Keyboard.dismiss();
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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

  const addToCart = useCallback((p: NativeProduct) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addItem(p, 1);
  }, [addItem]);

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

  const renderCard = useCallback(({ item }: { item: NativeProduct }) => (
    <ResultCard product={item} onPress={() => goProduct(item.id)} onAdd={() => addToCart(item)} />
  ), [goProduct, addToCart]);

  const keyEx = useCallback((item: NativeProduct) => item.id, []);

  // ── Grouped results by category ──
  const grouped = useMemo(() => {
    if (!results.length) return [];
    const map = new Map<string, NativeProduct[]>();
    for (const p of results) {
      const key = p.categoryName || "أخرى";
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([cat, items]) => ({ cat, items }));
  }, [results]);

  return (
    <View style={s.screen}>

      {/* ─── Cinematic header ──────────────────────────────────────── */}
      <LinearGradient
        colors={["#010D16", "#021D2E", "#053348"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 8 }]}>

        {/* Decorative */}
        <View style={s.decor1} />
        <View style={s.decor2} />

        {/* Top row */}
        <View style={s.topRow}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <View style={s.cmdIcon}>
              <Ionicons name="search" size={13} color={theme.colors.brand[400]} />
            </View>
            <Text style={s.headerLabel}>البحث</Text>
          </View>
          {hasResults && totalCount > 0 && !isSearching && (
            <Animated.View entering={FadeIn.duration(200)} style={s.countPill}>
              <Text style={s.countText}>{totalCount.toLocaleString()}</Text>
              <Text style={s.countUnit}>نتيجة</Text>
            </Animated.View>
          )}
        </View>

        {/* ─── Command bar ── */}
        <View style={s.barContainer}>
          {/* Glow effect behind bar */}
          <Animated.View style={[s.barGlow, glowAnim]} />

          <Animated.View style={[s.bar, barAnim]}>
            <View style={s.barIconWrap}>
              {suggFetching || isSearching ? (
                <ActivityIndicator size="small" color={theme.colors.brand[400]} />
              ) : (
                <Ionicons name="search" size={16} color={theme.colors.brand[400]} />
              )}
            </View>

            <TextInput
              ref={inputRef}
              style={s.barInput}
              placeholder="ابحث عن دواء، مستحضر، أو كود..."
              placeholderTextColor="rgba(255,255,255,0.28)"
              value={query}
              onChangeText={setQuery}
              onFocus={() => {
                setFocused(true);
                barGlow.value = withTiming(1, { duration: 300 });
                barScale.value = withSpring(1.012, { damping: 20, stiffness: 400 });
              }}
              onBlur={() => {
                setTimeout(() => setFocused(false), 160);
                barGlow.value = withTiming(0, { duration: 250 });
                barScale.value = withSpring(1, { damping: 20, stiffness: 400 });
              }}
              onSubmitEditing={() => submit()}
              returnKeyType="search"
              autoCorrect={false}
              textAlign="right"
              selectionColor={theme.colors.brand[400]}
            />

            {query.length > 0 && (
              <Pressable onPress={clear} hitSlop={10} style={s.barClear}>
                <Ionicons name="close" size={12} color="rgba(255,255,255,0.5)" />
              </Pressable>
            )}

            <View style={s.barDivider} />

            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                setShowFilters((v) => !v);
              }}
              style={[s.barFilterBtn, (showFilters || filterCount > 0) && s.barFilterBtnActive]}>
              <Ionicons
                name="options-outline"
                size={14}
                color={showFilters || filterCount > 0 ? "#fff" : "rgba(255,255,255,0.5)"}
              />
              {filterCount > 0 && !showFilters && (
                <View style={s.filterBadge}>
                  <Text style={s.filterBadgeText}>{filterCount}</Text>
                </View>
              )}
            </Pressable>

            {query.length >= 2 && (
              <Pressable
                onPress={() => submit()}
                style={({ pressed }) => [s.barSubmit, pressed && { opacity: 0.7 }]}>
                <Ionicons name="return-down-back" size={13} color="#fff" />
              </Pressable>
            )}
          </Animated.View>
        </View>

        {/* Keyboard hint */}
        {focused && !hasResults && debouncedQ.length < 2 && (
          <Animated.View entering={FadeIn.duration(150)} style={s.hint}>
            <Text style={s.hintText}>اكتب للبحث أو اضغط Enter</Text>
          </Animated.View>
        )}
      </LinearGradient>

      {/* ─── Content area ──────────────────────────────────────────── */}
      <View style={s.content}>

        {/* Filter panel */}
        {showFilters && (
          <Animated.View entering={FadeInDown.duration(200)} style={s.filterPanel}>
            <View style={s.filterHeader}>
              <Text style={s.filterTitle}>تصفية</Text>
              {filterCount > 0 && (
                <Pressable onPress={resetFilters} hitSlop={6}>
                  <Text style={s.filterReset}>إعادة الضبط</Text>
                </Pressable>
              )}
            </View>

            <View style={s.chipsRow}>
              {SORT_OPTIONS.map((o) => {
                const on = sortBy === o.key;
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => { setSortBy(o.key); if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); }}
                    style={[s.chip, on && s.chipOn]}>
                    <Text style={[s.chipText, on && s.chipTextOn]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => { setInStockOnly((v) => !v); if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); }}
              style={s.toggleRow}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 7 }}>
                <Ionicons name="cube-outline" size={13} color={theme.colors.slate[500]} />
                <Text style={s.toggleLabel}>المتاح فقط</Text>
              </View>
              <View style={[s.sw, inStockOnly && s.swOn]}>
                <View style={[s.swThumb, inStockOnly && s.swThumbOn]} />
              </View>
            </Pressable>

            {categories && categories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[s.chipsRow, { paddingBottom: 2 }]}>
                <Pressable onPress={() => setCatFilter(null)} style={[s.chip, !catFilter && s.chipOn]}>
                  <Text style={[s.chipText, !catFilter && s.chipTextOn]}>الكل</Text>
                </Pressable>
                {categories.slice(0, 12).map((cat: NativeCategory) => {
                  const on = catFilter === cat.id;
                  return (
                    <Pressable key={cat.id} onPress={() => setCatFilter(on ? null : cat.id)} style={[s.chip, on && s.chipOn]}>
                      <Text style={[s.chipText, on && s.chipTextOn]} numberOfLines={1}>{cat.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </Animated.View>
        )}

        {/* ─── Body ── */}
        {!hasResults ? (
          /* Discovery */
          <ScrollView
            contentContainerStyle={[s.discovery, { paddingBottom: theme.layout.tabBarHeight + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* Recent */}
            {recents.length > 0 && (
              <Animated.View entering={FadeInDown.delay(40).duration(260)} style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                    <Ionicons name="time-outline" size={13} color={theme.colors.slate[400]} />
                    <Text style={s.sectionTitle}>سابق</Text>
                  </View>
                  <Pressable onPress={() => setRecents([])} hitSlop={6}>
                    <Text style={s.sectionAction}>مسح</Text>
                  </Pressable>
                </View>
                <View style={s.recentWrap}>
                  {recents.map((term) => (
                    <Pressable
                      key={term}
                      onPress={() => quickSearch(term)}
                      style={({ pressed }) => [s.recentChip, pressed && { opacity: 0.7 }]}>
                      <Text style={s.recentText}>{term}</Text>
                      <Ionicons name="arrow-back" size={10} color={theme.colors.slate[400]} />
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Trending */}
            <Animated.View entering={FadeInDown.delay(80).duration(260)} style={s.section}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Ionicons name="trending-up" size={14} color={theme.colors.brand[400]} />
                <Text style={s.sectionTitle}>الأكثر بحثاً</Text>
              </View>
              <View style={s.trendGrid}>
                {TRENDING.map((t, i) => (
                  <Pressable
                    key={t.term}
                    onPress={() => quickSearch(t.term)}
                    style={({ pressed }) => [s.trendItem, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}>
                    <View style={[s.trendIcon, { backgroundColor: `${t.color}15` }]}>
                      <Ionicons name={t.icon} size={15} color={t.color} />
                    </View>
                    <Text style={s.trendLabel}>{t.term}</Text>
                    <Text style={s.trendIdx}>{i + 1}</Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>

            {/* Categories */}
            {categories && categories.length > 0 && (
              <Animated.View entering={FadeInDown.delay(120).duration(260)} style={s.section}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Ionicons name="grid-outline" size={13} color={theme.colors.slate[400]} />
                  <Text style={s.sectionTitle}>الأقسام</Text>
                </View>
                {categories.slice(0, 6).map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => router.push({ pathname: "/category/[id]", params: { id: cat.id } })}
                    style={({ pressed }) => [s.catRow, pressed && { backgroundColor: theme.colors.slate[50] }]}>
                    <View style={s.catIcon}>
                      <Ionicons name="grid" size={13} color={theme.colors.brand[600]} />
                    </View>
                    <Text style={s.catName} numberOfLines={1}>{cat.name}</Text>
                    {cat.count > 0 && <Text style={s.catCount}>{cat.count}</Text>}
                    <Ionicons name="chevron-back" size={13} color={theme.colors.slate[300]} />
                  </Pressable>
                ))}
              </Animated.View>
            )}
          </ScrollView>
        ) : (
          /* Results grid */
          <FlatList
            data={results}
            keyExtractor={keyEx}
            renderItem={renderCard}
            numColumns={2}
            columnWrapperStyle={s.gridRow}
            contentContainerStyle={[s.grid, { paddingBottom: theme.layout.tabBarHeight + 24 }]}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={12}
            windowSize={5}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              hasResults && grouped.length > 1 ? (
                <Animated.View entering={FadeInDown.duration(200)} style={s.groupHeader}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 4 }}>
                    {grouped.map((g) => (
                      <Pressable
                        key={g.cat}
                        onPress={() => {
                          const catObj = categories?.find((c) => c.name === g.cat);
                          if (catObj) setCatFilter(catFilter === catObj.id ? null : catObj.id);
                        }}
                        style={s.groupChip}>
                        <Text style={s.groupChipText}>{g.cat}</Text>
                        <View style={s.groupChipCount}>
                          <Text style={s.groupChipCountText}>{g.items.length}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </Animated.View>
              ) : null
            }
            ListEmptyComponent={
              !isSearching ? (
                <View style={{ paddingTop: 60, paddingHorizontal: 20 }}>
                  <EmptyState
                    icon="search-outline"
                    title="لا توجد نتائج"
                    description="جرّب كلمة مختلفة أو تحقق من الإملاء"
                  />
                </View>
              ) : (
                <View style={{ paddingTop: 60, alignItems: "center", gap: 10 }}>
                  <ActivityIndicator color={theme.colors.brand[500]} />
                  <Text style={s.searchingText}>جاري البحث...</Text>
                </View>
              )
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={s.footerLoader}>
                  <ActivityIndicator size="small" color={theme.colors.brand[500]} />
                </View>
              ) : null
            }
          />
        )}

        {/* ─── Suggestions overlay ─────────────────────────────────── */}
        {showSugg && (
          <Animated.View
            entering={FadeInDown.springify().damping(22).stiffness(300)}
            exiting={FadeOut.duration(100)}
            style={s.suggOverlay}>

            <View style={s.suggCard}>
              <View style={s.suggHandle} />

              {/* Header */}
              <View style={s.suggHeader}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 5 }}>
                  <Ionicons name="sparkles" size={11} color={theme.colors.brand[400]} />
                  <Text style={s.suggHeaderText}>اقتراحات</Text>
                </View>
                {suggFetching && <ActivityIndicator size="small" color={theme.colors.brand[400]} />}
              </View>

              {!suggFetching && suggestions.length === 0 && (
                <View style={s.suggEmpty}>
                  <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.15)" />
                  <Text style={s.suggEmptyText}>لا توجد اقتراحات</Text>
                </View>
              )}

              {suggestions.map((p, i) => (
                <SuggRow key={p.id} product={p} query={debouncedQ} onPress={() => tapSugg(p)} index={i} />
              ))}

              {suggestions.length > 0 && (
                <Pressable
                  onPress={() => submit()}
                  style={({ pressed }) => [s.suggShowAll, pressed && { opacity: 0.8 }]}>
                  <Ionicons name="search" size={13} color={theme.colors.brand[400]} />
                  <Text style={s.suggShowAllText}>عرض كل نتائج "{debouncedQ}"</Text>
                  <Ionicons name="return-down-back" size={12} color="rgba(255,255,255,0.3)" />
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
// ═══  STYLES  ═════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0A0F14" },
  content: { flex: 1, position: "relative" },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 16, gap: 10, overflow: "hidden" },
  decor1: { position: "absolute", right: -50, top: -50, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(8,145,178,0.06)" },
  decor2: { position: "absolute", left: -30, bottom: -40, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.02)" },

  topRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  cmdIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: "rgba(8,145,178,0.15)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(8,145,178,0.20)",
  },
  headerLabel: { fontSize: 11, fontFamily: theme.fonts.extrabold, color: "rgba(255,255,255,0.35)", letterSpacing: 2 },
  countPill: {
    flexDirection: "row-reverse", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  countText: { fontSize: 12, fontFamily: theme.fonts.black, color: "#fff" },
  countUnit: { fontSize: 9, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.4)" },

  // Command bar
  barContainer: { position: "relative" },
  barGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20, opacity: 0,
    backgroundColor: "rgba(8,145,178,0.08)",
    transform: [{ scale: 1.04 }],
  },
  bar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18, paddingHorizontal: 5, height: 52,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
    gap: 2,
  },
  barIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  barInput: {
    flex: 1, fontSize: 14, fontFamily: theme.fonts.semibold,
    color: "#fff", textAlign: "right", paddingHorizontal: 8,
  },
  barClear: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  barDivider: { width: 1, height: 22, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 4 },
  barFilterBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  barFilterBtnActive: { backgroundColor: theme.colors.brand[600] },
  filterBadge: {
    position: "absolute", top: -3, right: -3,
    minWidth: 14, height: 14, borderRadius: 7,
    backgroundColor: theme.colors.amber[500],
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: "#0A0F14",
  },
  filterBadgeText: { fontSize: 7.5, fontFamily: theme.fonts.black, color: "#fff" },
  barSubmit: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: theme.colors.brand[600],
    alignItems: "center", justifyContent: "center",
    marginLeft: 2,
  },
  hint: { alignItems: "center", paddingTop: 6 },
  hintText: { fontSize: 10, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.20)" },

  // Highlight
  hlMatch: {
    color: theme.colors.brand[400], fontFamily: theme.fonts.black,
    backgroundColor: "rgba(8,145,178,0.15)",
  },

  // Suggestions overlay
  suggOverlay: {
    position: "absolute", top: 0, left: 10, right: 10, zIndex: 100,
  },
  suggCard: {
    backgroundColor: "#141B22",
    borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    ...theme.shadow.xl,
  },
  suggHandle: { width: 32, height: 3, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,0.10)", alignSelf: "center", marginTop: 8, marginBottom: 4 },
  suggHeader: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  suggHeaderText: { fontSize: 10, fontFamily: theme.fonts.extrabold, color: "rgba(255,255,255,0.30)", letterSpacing: 0.8 },
  suggRow: {
    flexDirection: "row-reverse", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  suggThumb: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  suggName: { fontSize: 13, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.85)", textAlign: "right" },
  suggCat: { fontSize: 10, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.30)", textAlign: "right", marginTop: 1 },
  suggPrice: { fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.brand[400] },
  suggOos: { backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  suggOosText: { fontSize: 8, fontFamily: theme.fonts.black, color: theme.colors.error.base },
  suggEmpty: { alignItems: "center", paddingVertical: 24, gap: 6 },
  suggEmptyText: { fontSize: 11, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.2)" },
  suggShowAll: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(8,145,178,0.06)",
  },
  suggShowAllText: { fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.brand[400] },

  // Filter panel
  filterPanel: {
    backgroundColor: "#111820", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  filterHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  filterTitle: { fontSize: 12, fontFamily: theme.fonts.black, color: "rgba(255,255,255,0.6)" },
  filterReset: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.brand[400] },
  chipsRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  chipOn: { backgroundColor: theme.colors.brand[600], borderColor: theme.colors.brand[500] },
  chipText: { fontSize: 11, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.50)" },
  chipTextOn: { color: "#fff", fontFamily: theme.fonts.black },
  toggleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  toggleLabel: { fontSize: 11, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.50)" },
  sw: { width: 36, height: 20, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.10)", padding: 2, justifyContent: "center" },
  swOn: { backgroundColor: theme.colors.brand[500] },
  swThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff", alignSelf: "flex-end" },
  swThumbOn: { alignSelf: "flex-start" },

  // Discovery
  discovery: { paddingHorizontal: 16, paddingTop: 16, gap: 24 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 12, fontFamily: theme.fonts.black, color: "rgba(255,255,255,0.45)" },
  sectionAction: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.brand[400] },

  recentWrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6 },
  recentChip: {
    flexDirection: "row-reverse", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  recentText: { fontSize: 11, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.55)" },

  trendGrid: { gap: 6 },
  trendItem: {
    flexDirection: "row-reverse", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
  },
  trendIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  trendLabel: { flex: 1, fontSize: 13, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.70)", textAlign: "right" },
  trendIdx: {
    fontSize: 10, fontFamily: theme.fonts.black, color: "rgba(255,255,255,0.12)",
    width: 20, textAlign: "center",
  },

  catRow: {
    flexDirection: "row-reverse", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.035)", borderRadius: 13,
    paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.04)",
  },
  catIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: "rgba(8,145,178,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  catName: { flex: 1, fontSize: 13, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.65)", textAlign: "right" },
  catCount: { fontSize: 10, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.20)" },

  // Results grid
  grid: { paddingHorizontal: 16, paddingTop: 12 },
  gridRow: { gap: 10, marginBottom: 10 },

  groupHeader: { marginBottom: 10 },
  groupChip: {
    flexDirection: "row-reverse", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  groupChipText: { fontSize: 10, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.50)" },
  groupChipCount: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 999,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  groupChipCountText: { fontSize: 8, fontFamily: theme.fonts.black, color: "rgba(255,255,255,0.35)" },

  card: {
    width: CARD_W, backgroundColor: "#141B22",
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  cardImgWrap: {
    width: "100%", height: 120,
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  cardImg: { width: "75%", height: "75%" },
  cardImgEmpty: { alignItems: "center", justifyContent: "center" },
  cardOos: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.50)", alignItems: "center", justifyContent: "center",
  },
  cardOosText: {
    fontSize: 10, fontFamily: theme.fonts.black, color: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, overflow: "hidden",
  },
  cardLive: {
    position: "absolute", top: 8, left: 8,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#22c55e",
    borderWidth: 1, borderColor: "rgba(0,0,0,0.2)",
  },
  cardBody: { paddingHorizontal: 10, paddingVertical: 10, gap: 3 },
  cardCatLabel: {
    fontSize: 9, fontFamily: theme.fonts.semibold,
    color: theme.colors.brand[400], textAlign: "right", letterSpacing: 0.3,
  },
  cardName: {
    fontSize: 12, fontFamily: theme.fonts.bold,
    color: "rgba(255,255,255,0.80)", textAlign: "right", lineHeight: 17,
  },
  cardFooter: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  cardPrice: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.brand[400] },
  cardAddBtn: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: theme.colors.brand[600],
    alignItems: "center", justifyContent: "center",
  },
  cardAddBtnOff: { backgroundColor: "rgba(255,255,255,0.06)" },

  searchingText: { fontSize: 12, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.3)" },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
});
