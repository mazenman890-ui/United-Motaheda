import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchProducts } from "@/services/productsApi";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Header } from "@/components/Header";
import { theme } from "@/theme";

export default function CategoryScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ["category", id],
      queryFn:  ({ pageParam = 1 }) => fetchProducts({ categoryId: id, page: pageParam, pageSize: 24 }),
      initialPageParam: 1,
      getNextPageParam: (last) => last.hasNextPage ? last.currentPage + 1 : undefined,
      enabled: !!id,
    });

  const products = data?.pages.flatMap((p) => p.products) ?? [];
  const total    = data?.pages[0]?.totalCount ?? 0;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.slate[50] }}>
      <Header
        title={id ?? "القسم"}
        showBack
        showCart
        rtl
      />

      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          numColumns={2}
          keyExtractor={(k) => String(k)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10, flexDirection: "row-reverse" }}
          renderItem={() => <View style={{ flex: 1 }}><ProductCardSkeleton /></View>}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="لا توجد منتجات"
          description="لا توجد منتجات في هذا القسم حالياً"
          actionLabel="العودة للرئيسية"
          onAction={() => router.back()}
        />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 16 }}
          columnWrapperStyle={{ gap: 10, marginBottom: 10, flexDirection: "row-reverse" }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            total > 0 ? (
              <Text style={{ textAlign: "right", fontSize: 12, color: theme.colors.slate[400], fontWeight: "600", marginBottom: 10 }}>
                {total.toLocaleString()} منتج
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard
                product={item}
                lang="ar"
                onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
              />
            </View>
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator color={theme.colors.brand[500]} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
