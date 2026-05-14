import React, { useCallback, useRef, useState, memo } from "react";
import {
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
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/theme";
import { useDebounce } from "@/hooks/useDebounce";

const QUICK_SEARCHES = [
  "بنادول", "فيتامين C", "اسبرين", "كلاريتين",
  "مضاد حيوي", "مسكن ألم", "أوميجا 3", "زنك",
  "مرهم", "قطرة عين", "ميلاتونين", "كالسيوم",
];

const QuickPill = memo(function QuickPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical:   9,
        borderRadius:      theme.radius.full,
        backgroundColor:   pressed ? theme.colors.brand[50] : "#fff",
        borderWidth:       1.5,
        borderColor:       theme.colors.brand[200],
        ...theme.shadow.xs,
      })}>
      <Text style={{ color: theme.colors.brand[700], fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
});

export default function SearchScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const inputRef  = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 360);

  const { data, isLoading } = useQuery({
    queryKey: ["search", debounced],
    queryFn:  () => fetchProducts({ search: debounced, pageSize: 40 }),
    enabled:  debounced.trim().length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  const results = data?.products ?? [];
  const active  = query.trim().length >= 2;

  const renderItem = useCallback(({ item }: { item: typeof results[0] }) => (
    <View style={{ flex: 1 }}>
      <ProductCard
        product={item}
        lang="ar"
        onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
      />
    </View>
  ), [router]);

  const keyExtractor = useCallback((item: typeof results[0]) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>

      {/* Header */}
      <View
        style={{
          paddingTop:        insets.top + 16,
          paddingHorizontal: 16,
          paddingBottom:     14,
          backgroundColor:   "#fff",
          gap:               12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.slate[100],
          ...theme.shadow.sm,
        }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.slate[900], textAlign: "right" }}>
          البحث
        </Text>

        <View
          style={{
            flexDirection:     "row-reverse",
            alignItems:        "center",
            backgroundColor:   theme.colors.slate[50],
            borderRadius:      theme.radius["2xl"],
            paddingHorizontal: 4,
            paddingVertical:   4,
            gap:               6,
            borderWidth:       1.5,
            borderColor:       active ? theme.colors.brand[400] : theme.colors.slate[200],
          }}>
          <View
            style={{
              width:           38,
              height:          38,
              borderRadius:    theme.radius.xl,
              backgroundColor: active ? theme.colors.brand[600] : theme.colors.slate[200],
              alignItems:      "center",
              justifyContent:  "center",
            }}>
            <Ionicons name="search-outline" size={17} color={active ? "#fff" : theme.colors.slate[400]} />
          </View>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="ابحث عن دواء، منتج، أو كود…"
            placeholderTextColor={theme.colors.slate[400]}
            autoFocus
            returnKeyType="search"
            style={{
              flex:            1,
              fontSize:        14,
              color:           theme.colors.slate[900],
              paddingVertical: 8,
              textAlign:       "right",
              fontWeight:      "500",
            }}
          />
          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={10}
              style={{
                width:           32,
                height:          32,
                borderRadius:    9,
                backgroundColor: theme.colors.slate[100],
                alignItems:      "center",
                justifyContent:  "center",
                marginRight:     2,
              }}>
              <Ionicons name="close" size={16} color={theme.colors.slate[500]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Body */}
      {!active ? (
        <View style={{ padding: 20, gap: 24 }}>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
              <Ionicons name="time-outline" size={14} color={theme.colors.slate[400]} />
              <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.slate[400], letterSpacing: 0.8 }}>
                بحث سريع
              </Text>
            </View>
            <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 }}>
              {QUICK_SEARCHES.map((s) => (
                <QuickPill key={s} label={s} onPress={() => setQuery(s)} />
              ))}
            </View>
          </View>

          <View style={{ alignItems: "center", gap: 14, paddingTop: 16 }}>
            <View
              style={{
                width:           88,
                height:          88,
                borderRadius:    28,
                backgroundColor: theme.colors.brand[50],
                alignItems:      "center",
                justifyContent:  "center",
                borderWidth:     1,
                borderColor:     theme.colors.brand[100],
              }}>
              <Ionicons name="search-outline" size={40} color={theme.colors.brand[400]} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: theme.colors.slate[700] }}>
              ابحث عن دوائك
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.slate[400], textAlign: "center", lineHeight: 20 }}>
              يمكنك البحث بالاسم العربي أو الإنجليزي أو الكود
            </Text>
          </View>
        </View>
      ) : isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          numColumns={2}
          keyExtractor={(k) => String(k)}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          columnWrapperStyle={{ gap: 10, flexDirection: "row-reverse" }}
          showsVerticalScrollIndicator={false}
          renderItem={() => <View style={{ flex: 1 }}><ProductCardSkeleton /></View>}
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="search-outline" size={42} color={theme.colors.brand[400]} />}
          title="لا توجد نتائج"
          description={`لم يتم العثور على منتجات تطابق "${query}"`}
          actionLabel="مسح البحث"
          onAction={() => setQuery("")}
        />
      ) : (
        <FlatList
          data={results}
          numColumns={2}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 90 }}
          columnWrapperStyle={{ gap: 10, marginBottom: 10, flexDirection: "row-reverse" }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          windowSize={5}
          ListHeaderComponent={
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 14 }}>
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
                  {data?.totalCount ?? 0} نتيجة
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.colors.slate[400], fontWeight: "500" }}>
                لـ «{query}»
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
