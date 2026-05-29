/**
 * Featured — Best Sellers & Staff Picks
 *
 * Full-screen infinite-scroll grid of featured / hand-picked products.
 * Star badges on cards, category filter rail, elegant gradient header.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts, type NativeProduct } from "@/features/products";
import { fetchCategories } from "@/services/productsApi";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/theme";

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function FeaturedScreen() {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const router      = useRouter();
  const insets      = useSafeAreaInsets();

  const [selectedCat, setSelectedCat] = useState<string | undefined>(undefined);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn:  fetchCategories,
    staleTime: 5 * 60_000,
  });

  const {
    products,
    totalCount,
    isLoading,
    isError,
    isFetchingNextPage,
    isRefreshing,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteProducts({
    sortBy:     "name_asc",
    categoryId: selectedCat,
    pageSize:   20,
  });

  const handleProductPress = useCallback(
    (p: NativeProduct) => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      router.push({ pathname: "/product/[id]", params: { id: p.id } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: NativeProduct; index: number }) => (
      <Animated.View
        style={styles.cell}
        entering={FadeInDown.duration(280).delay((index % 6) * 40)}>
        <ProductCard
          product={item}
          lang={lang}
          badge={index % 5 === 0 ? "hot" : index % 7 === 0 ? "new" : undefined}
          onPress={() => handleProductPress(item)}
        />
      </Animated.View>
    ),
    [lang, handleProductPress],
  );

  // Category rail: "All" + categories
  const CategoryRail = useMemo(() => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.catRailContent}
      style={styles.catRail}>
      {/* All */}
      <Pressable
        onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); setSelectedCat(undefined); }}
        style={[styles.catChip, !selectedCat && styles.catChipActive]}>
        <Text style={[styles.catChipText, !selectedCat && styles.catChipTextActive]}>
          {t("products.allProducts")}
        </Text>
      </Pressable>
      {categories.map((c) => {
        const active = selectedCat === c.id;
        const display = lang === "en" ? (c.nameEn ?? c.name) : c.name;
        return (
          <Pressable
            key={c.id}
            onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); setSelectedCat(c.id); }}
            style={[styles.catChip, active && styles.catChipActive]}>
            <Text style={[styles.catChipText, active && styles.catChipTextActive]} numberOfLines={1}>
              {display}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  ), [categories, selectedCat, lang, t]);

  const Header = useMemo(() => (
    <>
      <LinearGradient
        colors={["#451A03", "#78350F", "#F59E0B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerGlow1} />
        <View style={styles.headerGlow2} />

        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>{t("home.featuredEyebrow").toUpperCase()}</Text>
            <Text style={styles.title}>{t("home.featuredTitle")}</Text>
            {totalCount > 0 && (
              <Text style={styles.metaText}>{totalCount.toLocaleString()} {t("products.allProducts").toLowerCase()}</Text>
            )}
          </View>
          {/* Star decoration */}
          <View style={styles.starBadge}>
            <Ionicons name="star" size={22} color="#FCD34D" />
          </View>
        </View>
      </LinearGradient>
      {CategoryRail}
    </>
  ), [insets.top, totalCount, t, router, CategoryRail]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        {Header}
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.cell}><ProductCardSkeleton /></View>
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        {Header}
        <View style={styles.centeredPanel}>
          <Ionicons name="wifi-outline" size={44} color={theme.colors.slate[300]} />
          <Text style={styles.panelTitle}>{t("common.error")}</Text>
          <Pressable onPress={() => void refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={Header}
        renderItem={renderItem}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refetch()}
            tintColor={theme.colors.amber[600]}
            colors={[theme.colors.amber[600]]}
          />
        }
        ListFooterComponent={
          isFetchingNextPage
            ? <View style={styles.footerLoader}><ActivityIndicator color={theme.colors.amber[600]} /></View>
            : null
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom:     20,
    gap:               14,
    overflow:          "hidden",
  },
  headerGlow1: {
    position: "absolute", right: -40, top: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerGlow2: {
    position: "absolute", left: -30, bottom: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  topRow: {
    flexDirection: "row-reverse", alignItems: "center", gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  eyebrow: {
    fontFamily: theme.fonts.bold, fontSize: 10,
    color: "rgba(255,255,255,0.65)", letterSpacing: 0.6, marginBottom: 2,
  },
  title: {
    fontFamily: theme.fonts.black, fontSize: 24,
    color: "#fff", letterSpacing: -0.5, textAlign: "right",
  },
  metaText: {
    fontFamily: theme.fonts.regular, fontSize: 12,
    color: "rgba(255,255,255,0.55)", textAlign: "right", marginTop: 2,
  },
  starBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },

  // Category rail
  catRail: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  catRailContent: {
    paddingHorizontal: 14,
    paddingVertical:   10,
    gap:               8,
    flexDirection:     "row-reverse",
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    backgroundColor:   theme.colors.surfaceSunken,
    borderWidth:       1,
    borderColor:       theme.colors.border.default,
  },
  catChipActive: {
    backgroundColor: theme.colors.amber[50],
    borderColor:     theme.colors.amber[400],
  },
  catChipText: {
    fontFamily: theme.fonts.semibold,
    fontSize:   12,
    color:      theme.colors.text.secondary,
  },
  catChipTextActive: {
    color:      theme.colors.amber[700],
    fontFamily: theme.fonts.black,
  },

  list: {
    paddingHorizontal: 12,
    paddingTop:        16,
  },
  row: {
    gap:           12,
    flexDirection: "row-reverse",
    marginBottom:  12,
  },
  cell: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection: "row-reverse",
    flexWrap:      "wrap",
    padding:       12,
    gap:           12,
  },
  footerLoader: {
    paddingVertical: 20, alignItems: "center",
  },
  centeredPanel: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32,
  },
  panelTitle: {
    fontFamily: theme.fonts.black, fontSize: 16,
    color: theme.colors.text.primary, textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, backgroundColor: theme.colors.amber[600], marginTop: 4,
  },
  retryText: {
    fontFamily: theme.fonts.black, fontSize: 13, color: "#fff",
  },
});
