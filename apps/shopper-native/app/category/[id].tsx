import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import {
  ProductGrid,
  useInfiniteProducts,
  type NativeProduct,
  type ProductSortMode,
} from "@/features/products";
import { flexRow, isRtl } from "@/utils/layout";

const SORT_OPTIONS: { id: ProductSortMode; labelKey: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "newest",     labelKey: "category.sortNewest",    icon: "time-outline" },
  { id: "price_asc",  labelKey: "category.sortPriceAsc",  icon: "arrow-down-outline" },
  { id: "price_desc", labelKey: "category.sortPriceDesc", icon: "arrow-up-outline" },
  { id: "name_asc",   labelKey: "category.sortNameAsc",   icon: "text-outline" },
];

export default function CategoryScreen() {
  const { t, i18n } = useTranslation();
  const params    = useLocalSearchParams<{ id?: string | string[]; nameEn?: string | string[]; name?: string | string[] }>();
  const rawId     = Array.isArray(params.id)     ? params.id[0]     : params.id;
  const rawNameEn = Array.isArray(params.nameEn) ? params.nameEn[0] : params.nameEn;
  const rawName   = Array.isArray(params.name)   ? params.name[0]   : params.name;
  const id        = typeof rawId     === "string" && rawId.length     > 0 ? decodeURIComponent(rawId)     : undefined;
  const nameEn    = typeof rawNameEn === "string" && rawNameEn.length > 0 ? decodeURIComponent(rawNameEn) : undefined;
  const catName   = typeof rawName   === "string" && rawName.length   > 0 ? decodeURIComponent(rawName)   : undefined;
  // Respect language: prefer nameEn in English, Arabic name otherwise
  const displayTitle = i18n.language === "en" && nameEn
    ? nameEn
    : (catName ?? id ?? t("category.defaultName"));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy]           = useState<ProductSortMode>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

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
    categoryId: id,
    sortBy,
    inStock:    inStockOnly || undefined,
    enabled:    Boolean(id),
  });

  const handleProductPress = useCallback(
    (p: NativeProduct) => {
      router.push({ pathname: "/product/[id]", params: { id: p.id } });
    },
    [router],
  );

  const gradientIdx = (id?.length ?? 0) % theme.catGradients.length;
  const [g1, g2] = theme.catGradients[gradientIdx];

  return (
    <View style={s.root}>
      {/* ── Gradient header ──────────────────────────────────── */}
      <LinearGradient
        colors={[g1, g2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 8 }]}>

        {/* Decorative orbs */}
        <View style={s.orb1} />
        <View style={s.orb2} />
        <View style={s.orb3} />
        <View style={s.orb4} />

        {/* Top row */}
        <View style={s.topRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={s.iconBtn}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>

          <View style={s.titleBlock}>
            <View style={s.eyebrowRow}>
              <UIText variant="eyebrow" align="right" style={s.eyebrowText}>
                {t("category.browse")}
              </UIText>
              {totalCount > 0 && (
                <View style={s.countChip}>
                  <UIText style={s.countChipText}>{totalCount} منتج</UIText>
                </View>
              )}
            </View>
            <UIText variant="sheet-title" color="inverse" align="right" numberOfLines={1} style={s.titleText}>
              {displayTitle}
            </UIText>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={s.iconBtn}>
            <Ionicons name="bag-outline" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Sort & filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsScrollContent}>
          {/* In stock toggle */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setInStockOnly((v) => !v);
            }}
            style={[s.chip, inStockOnly ? s.chipActive : s.chipInactive]}>
            <Ionicons name={inStockOnly ? "checkmark-circle" : "cube-outline"} size={14} color="#fff" />
            <UIText variant="caption" weight="bold" color="inverse">{t("category.inStockOnly")}</UIText>
          </Pressable>

          {/* Sort options */}
          {SORT_OPTIONS.map((opt) => {
            const active = sortBy === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  setSortBy(opt.id);
                }}
                style={[s.chip, active ? s.chipActive : s.chipInactive]}>
                <Ionicons name={opt.icon} size={13} color="#fff" />
                <UIText
                  variant="caption"
                  weight={active ? "black" : "semibold"}
                  color="inverse">
                  {t(opt.labelKey)}
                </UIText>
              </Pressable>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* ── Results count bar ────────────────────────────────── */}
      {products.length > 0 && !isLoading && (
        <View style={s.resultsBar}>
          <UIText style={s.resultsText}>
            {products.length} منتج
          </UIText>
          {inStockOnly && (
            <View style={s.activeFilterChip}>
              <Ionicons name="checkmark-circle" size={11} color={theme.colors.teal[600]} />
              <UIText style={s.activeFilterText}>{t("category.inStockOnly")}</UIText>
            </View>
          )}
        </View>
      )}

      {/* ── Content ──────────────────────────────────────────── */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          keyExtractor={(k) => String(k)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10, flexDirection: flexRow(isRtl()) }}
          showsVerticalScrollIndicator={false}
          renderItem={() => (
            <View style={{ flex: 1 }}>
              <ProductCardSkeleton />
            </View>
          )}
        />
      ) : isError ? (
        <EmptyState
          icon="wifi-outline"
          title={t("category.loadError")}
          description={t("category.loadErrorDesc")}
          actionLabel={t("category.tryAgain")}
          onAction={refetch}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title={t("category.noProducts")}
          description={inStockOnly ? t("category.noInStockProducts") : t("category.noProductsInCat")}
          actionLabel={inStockOnly ? t("category.showAll") : t("common.back")}
          onAction={() => (inStockOnly ? setInStockOnly(false) : router.back())}
        />
      ) : (
        <ProductGrid
          products={products}
          onProductPress={handleProductPress}
          onEndReached={hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined}
          refreshing={isRefreshing}
          onRefresh={refetch}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 90 }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator color={theme.colors.brand[500]} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingBottom:     20,
    paddingHorizontal: 16,
    overflow:          "hidden",
  },
  // ── Decorative orbs
  orb1: {
    position:        "absolute",
    right:           -24,
    top:             -24,
    width:           100,
    height:          100,
    borderRadius:    50,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  orb2: {
    position:        "absolute",
    right:           -30,
    top:             -30,
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  orb3: {
    position:        "absolute",
    left:            -50,
    bottom:          -30,
    width:           160,
    height:          160,
    borderRadius:    80,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  orb4: {
    position:        "absolute",
    right:           60,
    bottom:          10,
    width:           70,
    height:          70,
    borderRadius:    35,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  // ── Top row
  topRow: {
    flexDirection: flexRow(isRtl()) as "row" | "row-reverse",
    alignItems:    "center",
    gap:           12,
    marginBottom:  12,
  },
  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.22)",
  },
  titleBlock: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: flexRow(isRtl()) as "row" | "row-reverse",
    alignItems:    "center",
    justifyContent:"flex-end",
    gap:           8,
  },
  eyebrowText: {
    color: "rgba(255,255,255,0.55)",
  },
  countChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius:    999,
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.18)",
  },
  countChipText: {
    fontSize:    10,
    fontFamily:  theme.fonts.bold,
    color:       "rgba(255,255,255,0.85)",
  },
  titleText: {
    letterSpacing: -0.3,
    marginTop:     2,
  },
  // ── Chips
  chipsScrollContent: {
    gap:         8,
    paddingRight: 2,
  },
  chip: {
    flexDirection:     flexRow(isRtl()) as "row" | "row-reverse",
    alignItems:        "center",
    gap:               5,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      14,
    borderWidth:       1,
  },
  chipActive: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderColor:     "rgba(255,255,255,0.45)",
  },
  chipInactive: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor:     "rgba(255,255,255,0.12)",
  },
  // ── Results bar
  resultsBar: {
    flexDirection:     flexRow(isRtl()) as "row" | "row-reverse",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 16,
    paddingVertical:   10,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  resultsText: {
    fontSize:   12,
    fontFamily: theme.fonts.semibold,
    color:      theme.colors.text.tertiary,
  },
  activeFilterChip: {
    flexDirection:     flexRow(isRtl()) as "row" | "row-reverse",
    alignItems:        "center",
    gap:               4,
    backgroundColor:   theme.colors.teal[50],
    borderRadius:      999,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       theme.colors.teal[100],
  },
  activeFilterText: {
    fontSize:   10,
    fontFamily: theme.fonts.bold,
    color:      theme.colors.teal[600],
  },
});
