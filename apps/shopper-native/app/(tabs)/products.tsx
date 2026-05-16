import React from "react";
import { FlatList, Platform, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { fetchCategories, fetchFeaturedProducts } from "@/services/productsApi";
import { CategoryCard } from "@/components/CategoryCard";
import { CategoryStatsDock } from "@/components/CategoryStatsDock";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCardSkeleton, ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/theme";

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: categories = [], isLoading: catsLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: featured = [], isLoading: featLoading } = useQuery({
    queryKey: ["featured"],
    queryFn: () => fetchFeaturedProducts(12),
  });

  const totalProducts = categories.reduce((sum, c) => sum + c.count, 0);
  const hasRealCounts = totalProducts > 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <FlatList
        data={[]}
        renderItem={null}
        keyExtractor={() => ""}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.layout.tabBarHeight + 24 }}
        ListHeaderComponent={
          <>
            {/* ── Gradient header ────────────────────────────────── */}
            <LinearGradient
              colors={["#021D2E", "#053348", "#0A4A65"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingTop: insets.top + 12,
                paddingBottom: 28,
                paddingHorizontal: 20,
              }}>
              <View style={{ position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.04)" }} />

              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 24, fontFamily: theme.fonts.black, color: "#fff", textAlign: "right" }}>
                    الأقسام
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.50)", textAlign: "right" }}>
                    {catsLoading ? "جاري التحميل…" : `${categories.length} قسم${hasRealCounts ? ` • ${totalProducts.toLocaleString()} منتج` : ""}`}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                      router.push("/(tabs)/search");
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 13,
                      backgroundColor: "rgba(255,255,255,0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.20)",
                    }}>
                    <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.85)" />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                      router.push("/(tabs)/cart");
                    }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 13,
                      backgroundColor: "rgba(255,255,255,0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.20)",
                    }}>
                    <Ionicons name="bag-outline" size={18} color="rgba(255,255,255,0.85)" />
                  </Pressable>
                </View>
              </View>

              {/* Search bar */}
              <Pressable
                onPress={() => router.push("/(tabs)/search")}
                style={{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                }}>
                <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.60)" />
                <Text style={{ flex: 1, color: "rgba(255,255,255,0.40)", fontSize: 13, fontFamily: theme.fonts.regular, textAlign: "right" }}>
                  ابحث في الأقسام والمنتجات…
                </Text>
              </Pressable>
            </LinearGradient>

            {/* ── Stats dock (dynamic, animated, robust) ─────── */}
            <CategoryStatsDock categoriesCount={hasRealCounts ? categories.length : undefined} />

            {/* ── Section title ──────────────────────────────────── */}
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.brand[50], alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="grid" size={13} color={theme.colors.brand[600]} />
                </View>
                <Text style={{ fontSize: 16, fontFamily: theme.fonts.black, color: theme.colors.text.primary }}>
                  تسوق حسب القسم
                </Text>
              </View>
            </View>

            {/* ── Categories grid ────────────────────────────────── */}
            {catsLoading ? (
              <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, paddingHorizontal: 20 }}>
                {Array(8).fill(null).map((_, i) => (
                  <View key={i} style={{ width: "47%" as any }}><CategoryCardSkeleton /></View>
                ))}
              </View>
            ) : isError ? (
              <EmptyState
                icon="wifi-outline"
                title="تعذر التحميل"
                description="تحقق من اتصالك بالإنترنت"
                actionLabel="إعادة المحاولة"
                onAction={() => refetch()}
              />
            ) : categories.length === 0 ? (
              <EmptyState icon="grid-outline" title="لا توجد أقسام" description="لا توجد أقسام متاحة حالياً" />
            ) : (
              <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, paddingHorizontal: 20 }}>
                {categories.map((item, index) => (
                  <Animated.View
                    key={item.id}
                    entering={FadeInDown.duration(300).delay(index * 35)}
                    style={{ width: "47%" as any }}>
                    <CategoryCard
                      category={item}
                      gradientIdx={index}
                      lang="ar"
                      variant="tile"
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                        router.push({ pathname: "/category/[id]", params: { id: item.id } });
                      }}
                    />
                  </Animated.View>
                ))}
              </View>
            )}

            {/* ── Featured products section ──────────────────────── */}
            {!featLoading && featured.length > 0 && (
              <Animated.View entering={FadeInDown.duration(350).delay(200)} style={{ marginTop: 28, gap: 12 }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 }}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.amber[50], alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="star" size={13} color={theme.colors.amber[600]} />
                    </View>
                    <Text style={{ fontSize: 16, fontFamily: theme.fonts.black, color: theme.colors.text.primary }}>
                      منتجات مميزة
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push("/(tabs)/search")}
                    style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                    <Ionicons name="chevron-back" size={13} color={theme.colors.brand[600]} />
                    <Text style={{ fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.brand[600] }}>عرض الكل</Text>
                  </Pressable>
                </View>

                <FlatList
                  data={featured.slice(0, 8)}
                  horizontal
                  inverted
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                  keyExtractor={(p) => p.id}
                  renderItem={({ item }) => (
                    <View style={{ width: 160 }}>
                      <ProductCard
                        product={item}
                        lang="ar"
                        onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
                      />
                    </View>
                  )}
                />
              </Animated.View>
            )}
          </>
        }
      />
    </View>
  );
}
