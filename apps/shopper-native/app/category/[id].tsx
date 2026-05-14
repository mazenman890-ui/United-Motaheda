import React, { useCallback } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchProducts } from "@/services/productsApi";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "@/components/Header";
import { theme } from "@/theme";
import type { NativeProduct } from "@/services/productsApi";

export default function CategoryScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey:         ["category", id],
      queryFn:          ({ pageParam = 1 }) =>
        fetchProducts({ categoryId: id, page: pageParam, pageSize: 24 }),
      initialPageParam: 1,
      getNextPageParam: (last) => last.hasNextPage ? last.currentPage + 1 : undefined,
      enabled:          !!id,
      staleTime:        5 * 60 * 1000,
    });

  const products   = data?.pages.flatMap((p) => p.products) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item }: { item: NativeProduct }) => (
    <View style={{ flex: 1 }}>
      <ProductCard
        product={item}
        lang="ar"
        onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
      />
    </View>
  ), [router]);

  const keyExtractor = useCallback((p: NativeProduct) => p.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <Header title={id ?? "القسم"} showBack showCart rtl />

      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          keyExtractor={(k) => String(k)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10, flexDirection: "row-reverse" }}
          showsVerticalScrollIndicator={false}
          renderItem={() => <View style={{ flex: 1 }}><ProductCardSkeleton /></View>}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="cube-outline" size={42} color={theme.colors.brand[400]} />}
          title="لا توجد منتجات"
          description="لا توجد منتجات في هذا القسم حالياً"
          actionLabel="العودة"
          onAction={() => router.back()}
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
          ListHeaderComponent={
            totalCount > 0 ? (
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <View
                  style={{
                    backgroundColor:   theme.colors.brand[50],
                    borderRadius:      theme.radius.full,
                    paddingHorizontal: 10,
                    paddingVertical:   4,
                    borderWidth:       1,
                    borderColor:       theme.colors.brand[100],
                  }}>
                  <Text style={{ fontSize: 11, color: theme.colors.brand[700], fontWeight: "800" }}>
                    {totalCount.toLocaleString()} منتج
                  </Text>
                </View>
              </View>
            ) : null
          }
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
