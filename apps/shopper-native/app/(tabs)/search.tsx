import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchProducts } from "@/services/productsApi";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/theme";
import { useDebounce } from "@/hooks/useDebounce";

const QUICK_SEARCHES = [
  "بنادول", "فيتامين C", "اسبرين", "كلاريتين",
  "مضاد حيوي", "مسكن ألم", "مرهم", "قطرة عين",
  "أوميجا 3", "زنك",
];

export default function SearchScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 380);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debounced],
    queryFn:  () => fetchProducts({ search: debounced, pageSize: 30 }),
    enabled:  debounced.trim().length >= 2,
  });

  const results = data?.products ?? [];
  const active  = query.trim().length >= 2;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop:        insets.top + 14,
        paddingHorizontal: 16,
        paddingBottom:     14,
        backgroundColor:   "#fff",
        gap:               12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.slate[100],
        ...theme.shadow.sm,
      }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.slate[900], textAlign: "right" }}>البحث</Text>

        {/* Search input */}
        <View style={{
          flexDirection:     "row-reverse",
          alignItems:        "center",
          backgroundColor:   theme.colors.slate[50],
          borderRadius:      theme.radius.xl,
          paddingHorizontal: 14,
          paddingVertical:   2,
          gap:               8,
          borderWidth:       1.5,
          borderColor:       theme.colors.slate[200],
        }}>
          <Ionicons name="search-outline" size={17} color={theme.colors.slate[400]} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن دواء أو منتج…"
            placeholderTextColor={theme.colors.slate[400]}
            autoFocus
            returnKeyType="search"
            style={{ flex: 1, fontSize: 14, color: theme.colors.slate[900], paddingVertical: 12, textAlign: "right", fontWeight: "500" }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.slate[300]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Body */}
      {!active ? (
        <View style={{ padding: 20, gap: 20 }}>
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.slate[500], textAlign: "right", letterSpacing: 0.5 }}>
              بحث سريع
            </Text>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
              {QUICK_SEARCHES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setQuery(s)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 14,
                    paddingVertical:   8,
                    borderRadius:      theme.radius.full,
                    backgroundColor:   pressed ? theme.colors.brand[50] : "#fff",
                    borderWidth:       1.5,
                    borderColor:       theme.colors.brand[200],
                    ...theme.shadow.xs,
                  })}>
                  <Text style={{ color: theme.colors.brand[700], fontSize: 13, fontWeight: "700" }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ alignItems: "center", gap: 12, paddingTop: 24 }}>
            <View style={{ width: 84, height: 84, borderRadius: 26, backgroundColor: theme.colors.brand[50], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.brand[100] }}>
              <Ionicons name="search-outline" size={42} color={theme.colors.brand[400]} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.colors.slate[700] }}>ابحث عن دوائك</Text>
            <Text style={{ fontSize: 13, color: theme.colors.slate[400], textAlign: "center", lineHeight: 20, paddingHorizontal: 40 }}>
              يمكنك البحث بالاسم العربي أو الإنجليزي أو الكود
            </Text>
          </View>
        </View>
      ) : isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <ActivityIndicator size="large" color={theme.colors.brand[500]} />
          <Text style={{ color: theme.colors.slate[400], fontSize: 13 }}>جاري البحث…</Text>
        </View>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="search-outline" size={44} color={theme.colors.brand[400]} />}
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
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 16 }}
          columnWrapperStyle={{ gap: 10, marginBottom: 10, flexDirection: "row-reverse" }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={{ textAlign: "right", fontSize: 12, color: theme.colors.slate[400], fontWeight: "600", marginBottom: 12 }}>
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
