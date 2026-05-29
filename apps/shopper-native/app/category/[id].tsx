import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";
import {
  ProductGrid,
  useInfiniteProducts,
  type NativeProduct,
  type ProductSortMode,
} from "@/features/products";

const SORT_OPTIONS: { id: ProductSortMode; labelKey: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "newest",     labelKey: "category.sortNewest",    icon: "time-outline" },
  { id: "price_asc",  labelKey: "category.sortPriceAsc",  icon: "arrow-down-outline" },
  { id: "price_desc", labelKey: "category.sortPriceDesc", icon: "arrow-up-outline" },
  { id: "name_asc",   labelKey: "category.sortNameAsc",   icon: "text-outline" },
];

export default function CategoryScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[]; nameEn?: string | string[] }>();
  const rawId    = Array.isArray(params.id)     ? params.id[0]     : params.id;
  const rawNameEn= Array.isArray(params.nameEn) ? params.nameEn[0] : params.nameEn;
  const id       = typeof rawId === "string" && rawId.length > 0 ? decodeURIComponent(rawId) : undefined;
  const nameEn   = typeof rawNameEn === "string" && rawNameEn.length > 0 ? decodeURIComponent(rawNameEn) : undefined;
  // Display title respects current language
  const displayTitle = i18n.language === "en" && nameEn ? nameEn : (id ?? t("category.defaultName"));
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
    pageSize:   20,
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
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* ── Gradient header ──────────────────────────────────── */}
      <LinearGradient
        colors={[g1, g2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop:        insets.top + 8,
          paddingBottom:     20,
          paddingHorizontal: 16,
        }}>
        <View style={{ position: "absolute", right: -24, top: -24, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.06)" }} />

        {/* Top row */}
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{
              width:           38,
              height:          38,
              borderRadius:    12,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems:      "center",
              justifyContent:  "center",
              borderWidth:     1,
              borderColor:     "rgba(255,255,255,0.25)",
            }}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <UIText variant="eyebrow" align="right" style={{ color: "rgba(255,255,255,0.55)" }}>
              {t("category.browse")}
            </UIText>
            <UIText variant="sheet-title" color="inverse" align="right" numberOfLines={1} style={{ letterSpacing: -0.3, marginTop: 2 }}>
              {displayTitle}
            </UIText>
            {totalCount > 0 && (
              <UIText variant="body-sm" color="inverse-muted" align="right" style={{ marginTop: 2 }}>
                {t("category.productCount", { count: totalCount.toLocaleString() })}
              </UIText>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={{
              width:           38,
              height:          38,
              borderRadius:    12,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems:      "center",
              justifyContent:  "center",
              borderWidth:     1,
              borderColor:     "rgba(255,255,255,0.25)",
            }}>
            <Ionicons name="bag-outline" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Sort & filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 2 }}>
          {/* In stock toggle */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setInStockOnly((v) => !v);
            }}
            style={{
              flexDirection:    "row-reverse",
              alignItems:       "center",
              gap:              5,
              paddingHorizontal: 12,
              paddingVertical:   7,
              borderRadius:     12,
              backgroundColor:  inStockOnly ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
              borderWidth:      1,
              borderColor:      inStockOnly ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.15)",
            }}>
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
                style={{
                  flexDirection:    "row-reverse",
                  alignItems:       "center",
                  gap:              5,
                  paddingHorizontal: 12,
                  paddingVertical:   7,
                  borderRadius:     12,
                  backgroundColor:  active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
                  borderWidth:      1,
                  borderColor:      active ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.15)",
                }}>
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

      {/* ── Content ──────────────────────────────────────────── */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          keyExtractor={(k) => String(k)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10, flexDirection: "row-reverse" }}
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
