import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchProducts, type ProductFilters } from "@/services/productsApi";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/SearchBar";
import { theme } from "@/theme";
import { useDebounce } from "@/hooks/useDebounce";

type SortOption = "newest" | "price_asc" | "price_desc";

const SORT_LABELS: Record<SortOption, string> = {
  newest:     "الأحدث",
  price_asc:  "سعر ↑",
  price_desc: "سعر ↓",
};

export default function ProductsScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const [search, setSearch]   = useState("");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort]       = useState<SortOption>("newest");
  const debouncedSearch       = useDebounce(search, 350);

  const filters: ProductFilters = {
    search:  debouncedSearch,
    inStock: inStock || undefined,
    sortBy:  sort,
    pageSize: 24,
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ["products", filters],
      queryFn:  ({ pageParam = 1 }) => fetchProducts({ ...filters, page: pageParam }),
      initialPageParam: 1,
      getNextPageParam: (last) => last.hasNextPage ? last.currentPage + 1 : undefined,
    });

  const products = data?.pages.flatMap((p) => p.products) ?? [];
  const total    = data?.pages[0]?.totalCount ?? 0;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.slate[50] }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: "#fff",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.slate[100],
        ...theme.shadow.sm,
      }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.slate[950] }}>المنتجات</Text>
          {total > 0 && (
            <Text style={{ fontSize: 12, color: theme.colors.slate[400], fontWeight: "600" }}>
              {total.toLocaleString()} منتج
            </Text>
          )}
        </View>
        <SearchBar
          lang="ar"
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch("")}
        />
        {/* Filter chips */}
        <View style={{ flexDirection: "row-reverse", gap: 8, flexWrap: "wrap" }}>
          <FilterChip
            label={inStock ? "✓ متاح فقط" : "متاح فقط"}
            active={inStock}
            onPress={() => setInStock((v) => !v)}
          />
          {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
            <FilterChip
              key={k}
              label={SORT_LABELS[k]}
              active={sort === k}
              onPress={() => setSort(k)}
            />
          ))}
        </View>
      </View>

      {/* Grid */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          keyExtractor={(k) => String(k)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10, flexDirection: "row-reverse" }}
          renderItem={() => (
            <View style={{ flex: 1 }}>
              <ProductCardSkeleton />
            </View>
          )}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="لم يتم العثور على نتائج"
          description={search ? `لا توجد منتجات تطابق "${search}"` : "لا توجد منتجات حالياً"}
          actionLabel="مسح البحث"
          onAction={() => setSearch("")}
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

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical:   6,
        borderRadius:      20,
        backgroundColor:   active ? theme.colors.brand[600] : theme.colors.slate[100],
        borderWidth:       1,
        borderColor:       active ? theme.colors.brand[600] : theme.colors.slate[200],
      }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: active ? "#fff" : theme.colors.slate[600] }}>
        {label}
      </Text>
    </Pressable>
  );
}
