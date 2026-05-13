import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchProducts } from "@/services/productsApi";
import { ProductCard } from "@/components/ProductCard";
import { SearchBar } from "@/components/SearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/theme";
import { useDebounce } from "@/hooks/useDebounce";

const QUICK_SEARCHES = ["بنادول", "فيتامين C", "اسبرين", "كلاريتين", "مضاد حيوي", "مسكن", "مرهم", "قطرة"];

export default function SearchScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 380);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debounced],
    queryFn:  () => fetchProducts({ search: debounced, pageSize: 30 }),
    enabled:  debounced.trim().length >= 2,
  });

  const results = data?.products ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.slate[50] }}>
      {/* Search header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 14,
        backgroundColor: "#fff",
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.slate[100],
        ...theme.shadow.sm,
      }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.slate[950], textAlign: "right" }}>البحث</Text>
        <SearchBar
          lang="ar"
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery("")}
          autoFocus
        />
      </View>

      {/* Body */}
      {query.trim().length < 2 ? (
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.slate[500], textAlign: "right" }}>
            بحث سريع
          </Text>
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
            {QUICK_SEARCHES.map((s) => (
              <Pressable
                key={s}
                onPress={() => setQuery(s)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical:   8,
                  borderRadius:      20,
                  backgroundColor:   theme.colors.brand[50],
                  borderWidth:       1,
                  borderColor:       theme.colors.brand[200],
                }}>
                <Text style={{ color: theme.colors.brand[700], fontSize: 13, fontWeight: "700" }}>{s}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ marginTop: 16, alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.slate[700] }}>ابحث عن دوائك</Text>
            <Text style={{ fontSize: 13, color: theme.colors.slate[400], textAlign: "center", paddingHorizontal: 32 }}>
              يمكنك البحث بالاسم العربي أو الإنجليزي أو الكود
            </Text>
          </View>
        </View>
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.brand[500]} />
          <Text style={{ marginTop: 12, color: theme.colors.slate[400], fontSize: 13 }}>جاري البحث…</Text>
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          icon="😕"
          title="لا توجد نتائج"
          description={`لم يتم العثور على منتجات تطابق "${query}"`}
          actionLabel="مسح البحث"
          onAction={() => setQuery("")}
        />
      ) : (
        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 16 }}
          columnWrapperStyle={{ gap: 10, marginBottom: 10, flexDirection: "row-reverse" }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={{ textAlign: "right", fontSize: 12, color: theme.colors.slate[400], fontWeight: "600", marginBottom: 10 }}>
              {data?.totalCount ?? 0} نتيجة لـ «{query}»
            </Text>
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
        />
      )}
    </View>
  );
}
