import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

const SORT_OPTIONS: { id: ProductSortMode; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "newest",     label: "الأحدث",      icon: "time-outline" },
  { id: "price_asc",  label: "الأقل سعراً",  icon: "arrow-down-outline" },
  { id: "price_desc", label: "الأعلى سعراً", icon: "arrow-up-outline" },
  { id: "name_asc",   label: "الاسم",       icon: "text-outline" },
];

export default function CategoryScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof rawId === "string" && rawId.length > 0 ? decodeURIComponent(rawId) : undefined;
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
              تصفح القسم
            </UIText>
            <UIText variant="sheet-title" color="inverse" align="right" numberOfLines={1} style={{ letterSpacing: -0.3, marginTop: 2 }}>
              {id ?? "القسم"}
            </UIText>
            {totalCount > 0 && (
              <UIText variant="body-sm" color="inverse-muted" align="right" style={{ marginTop: 2 }}>
                {totalCount.toLocaleString()} منتج
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
            <UIText variant="caption" weight="bold" color="inverse">متوفر فقط</UIText>
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
                  {opt.label}
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
          title="تعذر التحميل"
          description="تحقق من اتصالك بالإنترنت وحاول مرة أخرى"
          actionLabel="إعادة المحاولة"
          onAction={refetch}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="لا توجد منتجات"
          description={inStockOnly ? "لا توجد منتجات متوفرة في هذا القسم حالياً" : "لا توجد منتجات في هذا القسم حالياً"}
          actionLabel={inStockOnly ? "عرض الكل" : "العودة"}
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
