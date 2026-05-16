import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { fetchProducts } from "@/services/productsApi";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/theme";
import type { NativeProduct, ProductFilters } from "@/services/productsApi";

type SortOption = ProductFilters["sortBy"];

const SORT_OPTIONS: { id: SortOption; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { id: "newest",     label: "الأحدث",      icon: "time-outline" },
  { id: "price_asc",  label: "الأقل سعراً",  icon: "arrow-down-outline" },
  { id: "price_desc", label: "الأعلى سعراً", icon: "arrow-up-outline" },
  { id: "name_asc",   label: "الاسم",       icon: "text-outline" },
];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [inStockOnly, setInStockOnly] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery({
      queryKey: ["category", id, sortBy, inStockOnly],
      queryFn: ({ pageParam = 1 }) =>
        fetchProducts({
          categoryId: id,
          page: pageParam,
          pageSize: 24,
          sortBy,
          inStock: inStockOnly || undefined,
        }),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasNextPage ? last.currentPage + 1 : undefined),
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    });

  const products = data?.pages.flatMap((p) => p.products) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: NativeProduct }) => (
      <View style={{ flex: 1 }}>
        <ProductCard
          product={item}
          lang="ar"
          onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
        />
      </View>
    ),
    [router],
  );

  const keyExtractor = useCallback((p: NativeProduct) => p.id, []);

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
          paddingTop: insets.top + 8,
          paddingBottom: 20,
          paddingHorizontal: 16,
        }}>
        <View style={{ position: "absolute", right: -24, top: -24, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.06)" }} />

        {/* Top row */}
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.25)",
            }}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontFamily: theme.fonts.black, color: "#fff", textAlign: "right" }} numberOfLines={1}>
              {id ?? "القسم"}
            </Text>
            {totalCount > 0 && (
              <Text style={{ fontSize: 11, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.55)", textAlign: "right" }}>
                {totalCount.toLocaleString()} منتج
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.25)",
            }}>
            <Ionicons name="bag-outline" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Sort & filter chips */}
        <ScrollView
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 2 }}>
          {/* In stock toggle */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setInStockOnly((v) => !v);
            }}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 12,
              backgroundColor: inStockOnly ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
              borderWidth: 1,
              borderColor: inStockOnly ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.15)",
            }}>
            <Ionicons name={inStockOnly ? "checkmark-circle" : "cube-outline"} size={14} color="#fff" />
            <Text style={{ fontSize: 11, fontFamily: theme.fonts.bold, color: "#fff" }}>
              متوفر فقط
            </Text>
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
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 12,
                  backgroundColor: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.10)",
                  borderWidth: 1,
                  borderColor: active ? "rgba(255,255,255,0.40)" : "rgba(255,255,255,0.15)",
                }}>
                <Ionicons name={opt.icon} size={13} color="#fff" />
                <Text style={{ fontSize: 11, fontFamily: active ? theme.fonts.black : theme.fonts.semibold, color: "#fff" }}>
                  {opt.label}
                </Text>
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
          onAction={() => refetch()}
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
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 90 }}
          columnWrapperStyle={{ gap: 10, marginBottom: 10, flexDirection: "row-reverse" }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          windowSize={5}
          renderItem={renderItem}
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
