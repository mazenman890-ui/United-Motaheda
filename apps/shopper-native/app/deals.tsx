/**
 * Deals — Today's Deals & Flash Offers
 *
 * Full-screen, infinite-scroll grid of the best-priced products.
 * Each card carries a red "% Off" badge. Header has a live countdown to midnight.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts, type NativeProduct } from "@/features/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/theme";

// ─── Countdown ────────────────────────────────────────────────────────────────

function useCountdown() {
  const getMs = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    return Math.max(0, end.getTime() - now.getTime());
  };
  const [ms, setMs] = useState(getMs);
  useEffect(() => {
    const id = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    h: pad(Math.floor(ms / 3_600_000)),
    m: pad(Math.floor((ms % 3_600_000) / 60_000)),
    s: pad(Math.floor((ms % 60_000) / 1_000)),
  };
}

const DISCOUNTS = [30, 20, 25, 15, 35, 20, 25, 30, 15, 20];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DealsScreen() {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { h, m, s } = useCountdown();

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
  } = useInfiniteProducts({ sortBy: "price_asc", inStock: true, pageSize: 20 });

  const handleProductPress = useCallback(
    (p: NativeProduct) => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      router.push({ pathname: "/product/[id]", params: { id: p.id } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: NativeProduct; index: number }) => (
      <View style={styles.cell}>
        <ProductCard
          product={item}
          lang={lang}
          badge="sale"
          discountPercent={DISCOUNTS[index % DISCOUNTS.length]}
          onPress={() => handleProductPress(item)}
        />
      </View>
    ),
    [lang, handleProductPress],
  );

  const Header = useMemo(() => (
    <LinearGradient
      colors={["#7C0000", "#DC2626", "#EF4444"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerGlow1} />
      <View style={styles.headerGlow2} />

      {/* Top row */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.eyebrowRow}>
            <View style={styles.liveDot} />
            <Text style={styles.eyebrow}>{t("home.flashEnds").toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>{t("home.flashTitle")}</Text>
          {totalCount > 0 && (
            <Text style={styles.metaText}>{totalCount.toLocaleString()} {t("products.allProducts").toLowerCase()}</Text>
          )}
        </View>
      </View>

      {/* Countdown */}
      <View style={styles.timerRow}>
        <Text style={styles.timerLabel}>{t("home.flashEnds")}</Text>
        <View style={styles.timerUnits}>
          {[{ v: h, l: t("home.flashHrs") }, { v: m, l: t("home.flashMin") }, { v: s, l: t("home.flashSec") }].map((u, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Text style={styles.colon}>:</Text>}
              <View style={styles.timerUnit}>
                <View style={styles.timerCell}>
                  <Text style={styles.timerValue}>{u.v}</Text>
                </View>
                <Text style={styles.timerUnitLabel}>{u.l}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>
    </LinearGradient>
  ), [insets.top, h, m, s, totalCount, t, router]);

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
            tintColor="#EF4444"
            colors={["#EF4444"]}
          />
        }
        ListFooterComponent={
          isFetchingNextPage
            ? <View style={styles.footerLoader}><ActivityIndicator color="#EF4444" /></View>
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
    gap:               16,
    overflow:          "hidden",
  },
  headerGlow1: {
    position: "absolute", right: -40, top: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  headerGlow2: {
    position: "absolute", left: -30, bottom: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  topRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  eyebrowRow: {
    flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 2,
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: "#FCA5A5",
  },
  eyebrow: {
    fontFamily: theme.fonts.bold, fontSize: 10,
    color: "rgba(255,255,255,0.65)", letterSpacing: 0.6,
  },
  title: {
    fontFamily: theme.fonts.black, fontSize: 24,
    color: "#fff", letterSpacing: -0.5, textAlign: "right",
  },
  metaText: {
    fontFamily: theme.fonts.regular, fontSize: 12,
    color: "rgba(255,255,255,0.55)", textAlign: "right", marginTop: 2,
  },
  timerRow: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
  },
  timerLabel: {
    fontFamily: theme.fonts.semibold, fontSize: 11, color: "rgba(255,255,255,0.55)",
  },
  timerUnits: {
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  timerUnit: {
    alignItems: "center", gap: 3,
  },
  timerCell: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, minWidth: 38,
    alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)",
  },
  timerValue: {
    fontFamily: theme.fonts.black, fontSize: 17, color: "#fff", letterSpacing: 0.5,
  },
  timerUnitLabel: {
    fontFamily: theme.fonts.regular, fontSize: 9, color: "rgba(255,255,255,0.50)",
  },
  colon: {
    fontFamily: theme.fonts.black, fontSize: 18,
    color: "rgba(255,255,255,0.55)", marginBottom: 10,
  },

  list: {
    paddingHorizontal: 12,
    paddingTop:        16,
  },
  row: {
    gap:            12,
    flexDirection:  "row-reverse",
    marginBottom:   12,
  },
  cell: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection:  "row-reverse",
    flexWrap:       "wrap",
    padding:        12,
    gap:            12,
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
    borderRadius: 12, backgroundColor: "#EF4444", marginTop: 4,
  },
  retryText: {
    fontFamily: theme.fonts.black, fontSize: 13, color: "#fff",
  },
});
