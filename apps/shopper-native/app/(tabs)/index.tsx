/**
 * HomeScreen — thin orchestrator.
 *
 * Data:  three TanStack Query calls (categories, featured, flash-sale).
 * Nav:   stable useCallback refs — memo'd children never re-render on nav.
 * UI:    all major sections live in src/features/home/components/.
 *
 * Removed: Animated.ScrollView → ScrollView (no scroll-event JS bridge overhead).
 * Removed: 5 × Animated.View entering={FadeInDown} section wrappers — these were
 *          staggering 5 simultaneous entrance animations on every home mount,
 *          choking the JS thread at the worst possible moment (cold start).
 *
 * Protected performance wins (NOT modified):
 *   FlashSaleSection  → FlashList + CountdownDisplay isolation
 *   FeaturedProductItem → stable per-item onPress
 */

import React, { useCallback, memo } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import {
  fetchCategories,
  fetchFeaturedProducts,
  fetchProductsPage,
  type NativeProduct,
} from "@/features/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/shared/theme";
import { useCartStore, selectItemCount } from "@/stores/cart";
import { useAuth } from "@/features/auth";
import { useMountTiming } from "@/lib/devTiming";

// ─── Feature components ───────────────────────────────────────────────────────
import { DeliveryHeader }         from "@/features/home/components/DeliveryHeader";
import { QuickActions }           from "@/features/home/components/QuickActions";
import { CategoryStrip }          from "@/features/home/components/CategoryStrip";
import { RecentlyViewedCarousel } from "@/features/home/components/RecentlyViewedCarousel";
import { FlashSaleSection }       from "@/features/home/components/FlashSaleSection";
import { PharmacistCard }         from "@/features/home/components/PharmacistCard";
import { HomeSectionHeader }      from "@/features/home/components/HomeSectionHeader";
import { sectionStyles } from "@/features/home/components/home.styles";

// ─── Constants ────────────────────────────────────────────────────────────────
const FEAT_CARD_W = 162;  // fixed-width card for horizontal FlatList
const FEAT_GAP    = 12;

// ─── FeaturedProductItem — memo'd cell, fixed width for horizontal scroll ─────
const FeaturedProductItem = memo(function FeaturedProductItem({
  item, index, lang, onPress,
}: {
  item:    NativeProduct;
  index:   number;
  lang:    "ar" | "en";
  onPress: (id: string) => void;
}) {
  const handlePress = useCallback(() => onPress(item.id), [item.id, onPress]);
  return (
    <View style={{ width: FEAT_CARD_W }}>
      <ProductCard
        product={item}
        lang={lang}
        badge={index === 0 ? "hot" : index === 2 ? "new" : undefined}
        onPress={handlePress}
      />
    </View>
  );
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  useMountTiming("HomeScreen");
  const { t, i18n } = useTranslation();
  const lang         = i18n.language === "en" ? "en" as const : "ar" as const;
  const router       = useRouter();
  const insets       = useSafeAreaInsets();

  // Granular selector — re-renders only when item count changes
  const cartCount = useCartStore(selectItemCount);
  const { user }  = useAuth();

  // ── Parallel queries (all fire on mount simultaneously) ─────────────────────
  const { data: categories = [], refetch: refCats, isLoading: catsLoading } =
    useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: featured = [], refetch: refFeat, isLoading: featLoading, isRefetching } =
    useQuery({ queryKey: ["featured"], queryFn: () => fetchFeaturedProducts(12) });

  const { data: flashPage, refetch: refFlash, isLoading: flashLoading } =
    useQuery({
      queryKey: ["flash-sale"],
      queryFn:  () => fetchProductsPage({ sortBy: "price_asc", pageSize: 12, inStock: true }),
    });

  const flashProducts = flashPage?.products ?? [];

  // Only show categories that have products
  const visibleCategories = categories.some((c) => c.count > 0)
    ? categories.filter((c) => c.count > 0)
    : categories;

  // ── Stable navigation callbacks ──────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    await Promise.all([refCats(), refFeat(), refFlash()]);
  }, [refCats, refFeat, refFlash]);

  const handleProductPress = useCallback(
    (id: string) => router.push({ pathname: "/product/[id]", params: { id } }),
    [router],
  );
  const handleDealsPress = useCallback(
    () => router.push({ pathname: "/deals" }),
    [router],
  );
  const handleCategoryPress = useCallback(
    (id: string, name: string, nameEn: string) =>
      router.push({ pathname: "/category/[id]", params: { id, nameEn, name } }),
    [router],
  );
  const handleNavigate = useCallback(
    (route: string) => router.push(route as Parameters<typeof router.push>[0]),
    [router],
  );

  const renderFeatured = useCallback(
    ({ item, index }: { item: NativeProduct; index: number }) => (
      <FeaturedProductItem item={item} index={index} lang={lang} onPress={handleProductPress} />
    ),
    [lang, handleProductPress],
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        scrollEventThrottle={32}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[500]}
            colors={[theme.colors.brand[600]]}
          />
        }>

        {/* 1 — Hero with search */}
        <DeliveryHeader
          insets={insets}
          user={user}
          cartCount={cartCount}
          onCartPress={() => router.push("/(tabs)/cart")}
          onSearchPress={() => router.push("/(tabs)/search")}
        />

        {/* 2 — Premium inline navigation row */}
        <QuickActions onNavigate={handleNavigate} />

        {/* 4 — Category pill rail */}
        <View>
          <CategoryStrip
            categories={visibleCategories}
            isLoading={catsLoading}
            lang={lang}
            onCategoryPress={handleCategoryPress}
            onViewAll={() => router.push("/(tabs)/products")}
          />
        </View>

        {/* 5 — Recently viewed (null when empty — zero render cost) */}
        <RecentlyViewedCarousel lang={lang} onProductPress={handleProductPress} />

        {/* 6 — Flash sale  ⚠️ protected: FlashList + isolated CountdownDisplay */}
        {!flashLoading && flashProducts.length > 0 && (
          <View style={sectionStyles.wrapTall}>
            <FlashSaleSection
              products={flashProducts}
              onProductPress={handleProductPress}
              onViewAll={handleDealsPress}
            />
          </View>
        )}

        {/* 7 — Featured products — premium horizontal rail
             NOTE: `inverted` deliberately removed — it double-reverses in Arabic
             RTL on Android, collapsing FlatList height to 0. RTL scroll direction
             is handled by the OS I18nManager layer, so no prop needed.              */}
        <View style={sectionStyles.wrap}>
          <HomeSectionHeader
            eyebrow={t("home.featuredEyebrow")}
            title={t("home.featuredTitle")}
            icon="star-outline"
            accent={theme.colors.amber[700]}
            onMore={() => router.push({ pathname: "/featured" })}
          />
          {featLoading ? (
            <FlatList
              data={SKELETON_KEYS}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={false}
              keyExtractor={(k) => String(k)}
              contentContainerStyle={s.hListContent}
              renderItem={renderFeaturedSkeleton}
            />
          ) : featured.length > 0 ? (
            /* Products available — horizontal snap rail */
            <FlatList
              data={featured.slice(0, 8)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(p) => p.id}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              snapToInterval={FEAT_CARD_W + FEAT_GAP}
              decelerationRate="fast"
              contentContainerStyle={s.hListContent}
              renderItem={renderFeatured}
            />
          ) : (
            /* Empty state OUTSIDE the FlatList — ListEmptyComponent inside a
               horizontal FlatList renders at 0-height, creating ghost gaps.      */
            <View style={s.emptyWrap}>
              <EmptyState
                icon="star-outline"
                title={t("home.featuredTitle")}
                description={t("errors.network")}
                actionLabel={t("common.retry")}
                onAction={() => void refFeat()}
              />
            </View>
          )}
        </View>

        {/* 8 — Pharmacist support card */}
        <View>
          <PharmacistCard />
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Skeleton helpers (module-level — zero re-allocation per render) ──────────
const SKELETON_KEYS = [1, 2, 3, 4];
const renderFeaturedSkeleton = () => (
  <View style={{ width: FEAT_CARD_W }}><ProductCardSkeleton /></View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: theme.colors.bg },
  hListContent: {
    paddingHorizontal: theme.layout.pagePaddingH,
    gap:               FEAT_GAP,
  },
  // Empty state wrapper — gives the EmptyState reasonable height and centering
  emptyWrap: {
    minHeight:   260,
    paddingTop:  20,
  },
});
