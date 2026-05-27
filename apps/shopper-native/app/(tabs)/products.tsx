import React from "react";
import { FlatList, Platform, Pressable, StyleSheet, View, type DimensionValue } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { fetchCategories, fetchFeaturedProducts } from "@/services/productsApi";
import { CategoryCard } from "@/components/CategoryCard";
import { CategoryStatsDock } from "@/components/CategoryStatsDock";
import { ProductCard } from "@/components/ProductCard";
import { CategoryCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Text as UIText } from "@/shared/ui";
import { useCartStore } from "@/stores/cart";
import { useMountTiming } from "@/lib/devTiming";
import { theme } from "@/theme";

export default function ProductsScreen() {
  useMountTiming("ProductsScreen");
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.itemCount());

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
  // Always show the category count if any categories are loaded — the seed
  // fallback has the correct category count even when product_count = 0.
  const categoriesCount = categories.length > 0 ? categories.length : undefined;

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
            {/* ── Light header ───────────────────────────────────── */}
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <Ionicons name="grid" size={15} color={theme.colors.brand[700]} />
                  </View>
                  <View>
                    <UIText variant="eyebrow" color="tertiary" align="right">
                      تصفح حسب القسم
                    </UIText>
                    <UIText variant="sheet-title" align="right" style={styles.headerTitle}>
                      الأقسام
                    </UIText>
                    <UIText variant="caption" color="muted" align="right" style={styles.headerMeta}>
                      {catsLoading
                        ? "جاري التحميل…"
                        : `${categories.length} قسم${totalProducts > 0 ? `  •  ${totalProducts.toLocaleString()} منتج` : ""}`}
                    </UIText>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                      router.push("/(tabs)/cart");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={cartCount > 0 ? `السلة، ${cartCount} عنصر` : "السلة"}
                    style={styles.headerActionBtn}>
                    <Ionicons name="bag-outline" size={18} color={theme.colors.slate[700]} />
                    {cartCount > 0 && (
                      <View style={styles.cartBadge}>
                        <UIText variant="eyebrow" color="inverse" style={styles.cartBadgeText}>
                          {cartCount > 9 ? "9+" : cartCount}
                        </UIText>
                      </View>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Search prompt — light surface, links to /search */}
              <Pressable
                onPress={() => router.push("/(tabs)/search")}
                accessibilityRole="button"
                accessibilityLabel="ابحث في الأقسام والمنتجات"
                style={styles.searchPrompt}>
                <View style={styles.searchPromptIcon}>
                  <Ionicons name="search" size={17} color={theme.colors.slate[500]} />
                </View>
                <UIText variant="body-sm" color="tertiary" align="right" style={{ flex: 1 }}>
                  ابحث في الأقسام والمنتجات…
                </UIText>
                <View style={styles.searchPromptKbd}>
                  <UIText variant="eyebrow" color="secondary">بحث</UIText>
                </View>
              </Pressable>
            </View>

            {/* ── Stats dock (dynamic, animated, robust) ─────── */}
            <CategoryStatsDock categoriesCount={categoriesCount} />

            {/* ── Section title — editorial 2-tier ─────────────── */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleWrap}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="grid" size={14} color={theme.colors.brand[700]} />
                </View>
                <View>
                  <UIText variant="eyebrow" color="tertiary" align="right">جميع الأقسام</UIText>
                  <UIText variant="card-title" align="right" style={styles.sectionTitle}>
                    تسوق حسب القسم
                  </UIText>
                </View>
              </View>
            </View>

            {/* ── Categories grid ────────────────────────────────── */}
            {catsLoading ? (
              <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10, paddingHorizontal: 20 }}>
                {Array(8).fill(null).map((_, i) => (
                  <View key={i} style={{ width: "47%" as DimensionValue }}><CategoryCardSkeleton /></View>
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
                    style={{ width: "47%" as DimensionValue }}>
                    <CategoryCard
                      category={item}
                      gradientIdx={index}
                      lang="ar"
                      variant="tile"
                      onPress={() => {
                        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                        router.push(`/category/${encodeURIComponent(item.id)}`);
                      }}
                    />
                  </Animated.View>
                ))}
              </View>
            )}

            {/* ── Featured products section ──────────────────────── */}
            {!featLoading && featured.length > 0 && (
              <Animated.View entering={FadeInDown.duration(380).delay(200)} style={styles.featuredBlock}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleWrap}>
                    <View style={[styles.sectionIcon, { backgroundColor: theme.colors.amber[50], borderColor: `${theme.colors.amber[600]}28` }]}>
                      <Ionicons name="star" size={14} color={theme.colors.amber[700]} />
                    </View>
                    <View>
                      <UIText variant="eyebrow" color="tertiary" align="right">موصى به</UIText>
                      <UIText variant="card-title" align="right" style={styles.sectionTitle}>
                        منتجات مميزة
                      </UIText>
                    </View>
                  </View>
                  <Pressable onPress={() => router.push("/(tabs)/search")} style={styles.moreBtn} hitSlop={6}>
                    <UIText variant="caption" weight="bold" color="brand">عرض الكل</UIText>
                    <Ionicons name="chevron-back" size={13} color={theme.colors.brand[700]} />
                  </Pressable>
                </View>

                <FlatList
                  data={featured.slice(0, 8)}
                  horizontal
                  inverted
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                  keyExtractor={(p) => p.id}
                  renderItem={({ item }) => (
                    <View style={{ width: 162 }}>
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

const styles = StyleSheet.create({
  // ── Header — light elevated strip
  header: {
    backgroundColor:   theme.colors.surface,
    paddingHorizontal: 20,
    paddingBottom:     16,
    gap:               14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  headerRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
    flex:          1,
  },
  headerIcon: {
    width:           36,
    height:          36,
    borderRadius:    11,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  headerTitle: {
    letterSpacing: -0.3,
    marginTop:     2,
  },
  headerMeta: {
    marginTop:     2,
    textTransform: "none",
    letterSpacing: 0,
  },
  headerActions: {
    flexDirection: "row",
    gap:           8,
  },
  headerActionBtn: {
    position:        "relative",
    width:           42,
    height:          42,
    borderRadius:    13,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
  },
  cartBadge: {
    position:        "absolute",
    top:             -5,
    left:            -5,
    minWidth:        20,
    height:          20,
    paddingHorizontal: 5,
    borderRadius:    10,
    backgroundColor: theme.colors.error.base,
    borderWidth:     2,
    borderColor:     theme.colors.surface,
    alignItems:      "center",
    justifyContent:  "center",
  },
  cartBadgeText: {
    fontSize: 9,
  },

  // ── Search prompt — light field
  searchPrompt: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              12,
    backgroundColor:  theme.colors.surfaceSunken,
    borderRadius:     16,
    paddingHorizontal: 14,
    paddingVertical:   13,
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
  },
  searchPromptIcon: {
    width:           28,
    height:          28,
    borderRadius:    9,
    backgroundColor: theme.colors.surface,
    alignItems:      "center",
    justifyContent:  "center",
  },
  searchPromptKbd: {
    backgroundColor:  theme.colors.surface,
    borderRadius:     8,
    paddingHorizontal: 9,
    paddingVertical:   5,
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
  },

  // ── Section header (unified)
  sectionHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom:    14,
    marginTop:       20,
  },
  sectionTitleWrap: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  sectionIcon: {
    width:           34,
    height:          34,
    borderRadius:    11,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  sectionTitle: {
    letterSpacing: -0.2,
    marginTop:     1,
  },
  moreBtn: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           4,
  },

  // ── Featured block
  featuredBlock: {
    marginTop: 12,
    gap:       14,
  },
});
