/**
 * Deals — Today's Best Prices
 *
 * A full-bleed commerce screen with:
 *   • Deep crimson gradient header with live countdown
 *   • "Deal of the Hour" hero card (first product, enlarged)
 *   • Paginated 2-column grid of sale products with % badges
 *   • Micro-interaction on add-to-cart (haptic + spring)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts, type NativeProduct } from "@/features/products";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/theme";

// ─── Countdown to midnight ────────────────────────────────────────────────────

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

// ─── Countdown digit block ────────────────────────────────────────────────────

function DigitBlock({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.digitWrap}>
      <LinearGradient
        colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.10)"]}
        style={s.digitBox}>
        <Text style={s.digitValue}>{value}</Text>
      </LinearGradient>
      <Text style={s.digitLabel}>{label}</Text>
    </View>
  );
}

// ─── Discount list ────────────────────────────────────────────────────────────

const DISCOUNTS = [35, 20, 25, 30, 15, 20, 25, 30, 18, 22, 28, 15];

// ─── Hero product card ────────────────────────────────────────────────────────

function HeroDeal({
  product,
  discount,
  lang,
  onPress,
}: {
  product:  NativeProduct;
  discount: number;
  lang:     "ar" | "en";
  onPress:  () => void;
}) {
  const { t }    = useTranslation();
  const origPrice = product.price / (1 - discount / 100);
  const name      = lang === "en" ? (product.nameEn ?? product.name) : product.name;
  const scale     = useSharedValue(1);
  const anim      = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(120)} style={s.heroWrap}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.975, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1.0,   { damping: 18, stiffness: 380 }); }}
        style={{ borderRadius: 22, overflow: "hidden" }}>
        <Animated.View style={[s.heroCard, anim]}>
          <LinearGradient colors={["#1A0000", "#3D0000"]} style={s.heroBg}>
            {/* Glow */}
            <View style={s.heroGlow} />

            <View style={s.heroInner}>
              {/* Image */}
              <View style={s.heroImg}>
                {product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={{ flex: 1 }} contentFit="contain" transition={200} />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="medkit-outline" size={60} color="rgba(255,100,100,0.5)" />
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={s.heroInfo}>
                {/* Badge */}
                <LinearGradient colors={["#EF4444", "#DC2626"]} style={s.heroBadge}>
                  <Ionicons name="flash" size={11} color="#fff" />
                  <Text style={s.heroBadgeText}>{t("products.badgeSale", { n: discount })}</Text>
                </LinearGradient>

                <Text style={s.heroName} numberOfLines={2}>{name}</Text>

                <View style={s.heroPriceRow}>
                  <Text style={s.heroPrice}>{product.price.toFixed(2)}</Text>
                  <Text style={s.heroCurrency}>{t("common.currency")}</Text>
                  <Text style={s.heroOrig}>{origPrice.toFixed(0)} {t("common.currency")}</Text>
                </View>

                <View style={s.heroSavings}>
                  <Text style={s.heroSavingsText}>
                    {t("home.flashTitle")} — {(origPrice - product.price).toFixed(0)} {t("common.currency")} {lang === "en" ? "off" : "خصم"}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Grid item ────────────────────────────────────────────────────────────────

const GridItem = React.memo(function GridItem({
  item, index, lang, onPress,
}: {
  item:    NativeProduct;
  index:   number;
  lang:    "ar" | "en";
  onPress: () => void;
}) {
  return (
    <Animated.View
      style={s.cell}
      entering={FadeInDown.duration(300).delay((index % 6) * 45)}>
      <ProductCard product={item} lang={lang} badge="sale" discountPercent={DISCOUNTS[index % DISCOUNTS.length]} onPress={onPress} />
    </Animated.View>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DealsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { h, m, s: sec } = useCountdown();

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

  const heroProd   = products[0];
  const gridProds  = products.slice(1);

  const handlePress = useCallback(
    (p: NativeProduct) => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      router.push({ pathname: "/product/[id]", params: { id: p.id } });
    },
    [router],
  );

  // Pulsing "LIVE" dot
  const dotOp = useSharedValue(1);
  useEffect(() => {
    dotOp.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, true,
    );
  }, [dotOp]);
  const dotAnim = useAnimatedStyle(() => ({ opacity: dotOp.value }));

  const Header = useMemo(() => (
    <LinearGradient
      colors={["#4A0000", "#800000", "#B91C1C"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.header, { paddingTop: insets.top + 12 }]}>

      {/* Decorative orbs */}
      <View style={[s.orb, { top: -50, right: -50, width: 180, height: 180 }]} />
      <View style={[s.orb, { bottom: -30, left: -30, width: 100, height: 100, backgroundColor: "rgba(255,255,255,0.04)" }]} />

      {/* Top row */}
      <View style={s.topRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={s.backBtn}>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <View style={s.eyebrowRow}>
            <Animated.View style={[s.liveDot, dotAnim]} />
            <Text style={s.eyebrow}>{t("home.flashEnds").toUpperCase()}</Text>
          </View>
          <Text style={s.headerTitle}>{t("home.flashTitle")}</Text>
          {totalCount > 0 && (
            <Text style={s.headerMeta}>{totalCount.toLocaleString()} {t("products.allProducts").toLowerCase()}</Text>
          )}
        </View>

        {/* Flame icon */}
        <View style={s.flameWrap}>
          <Ionicons name="flame" size={28} color="#FCA5A5" />
        </View>
      </View>

      {/* Countdown */}
      <View style={s.timerRow}>
        <Text style={s.timerLabel}>{t("home.timeLeft")}</Text>
        <View style={s.timerUnits}>
          <DigitBlock value={h} label={t("home.flashHrs")} />
          <Text style={s.colon}>:</Text>
          <DigitBlock value={m} label={t("home.flashMin")} />
          <Text style={s.colon}>:</Text>
          <DigitBlock value={sec} label={t("home.flashSec")} />
        </View>
      </View>
    </LinearGradient>
  ), [insets.top, h, m, sec, totalCount, t, router, dotAnim]);

  if (isLoading) {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={s.cell}><ProductCardSkeleton /></View>
          ))}
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={s.screen}>
        {Header}
        <View style={s.center}>
          <Ionicons name="wifi-outline" size={44} color={theme.colors.slate[300]} />
          <Text style={s.errorTitle}>{t("common.error")}</Text>
          <Pressable onPress={() => void refetch()} style={s.retryBtn}>
            <Text style={s.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <FlatList
        data={gridProds}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
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
        ListHeaderComponent={
          <>
            {Header}
            {heroProd && (
              <HeroDeal
                product={heroProd}
                discount={DISCOUNTS[0]}
                lang={lang}
                onPress={() => handlePress(heroProd)}
              />
            )}
            {gridProds.length > 0 && (
              <View style={s.sectionHeader}>
                <Ionicons name="grid-outline" size={14} color="#EF4444" />
                <Text style={s.sectionTitle}>{t("home.flashSale")}</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <GridItem item={item} index={index} lang={lang} onPress={() => handlePress(item)} />
        )}
        ListFooterComponent={
          isFetchingNextPage
            ? <View style={s.footer}><ActivityIndicator color="#EF4444" /></View>
            : null
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: "#F4F7FA",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom:     22,
    gap:               18,
    overflow:          "hidden",
  },
  orb: {
    position:        "absolute",
    borderRadius:    90,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  topRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.22)",
  },
  eyebrowRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    gap:            6,
    marginBottom:   3,
  },
  liveDot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: "#FCA5A5",
  },
  eyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      9.5,
    color:         "rgba(255,255,255,0.60)",
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         "#fff",
    letterSpacing: -0.5,
    textAlign:     "right",
    lineHeight:    32,
  },
  headerMeta: {
    fontFamily: theme.fonts.regular,
    fontSize:   11.5,
    color:      "rgba(255,255,255,0.50)",
    textAlign:  "right",
    marginTop:  2,
  },
  flameWrap: {
    width:           44,
    height:          44,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.18)",
  },
  timerRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  timerLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize:   11,
    color:      "rgba(255,255,255,0.55)",
  },
  timerUnits: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           6,
  },
  digitWrap: {
    alignItems: "center",
    gap:        4,
  },
  digitBox: {
    borderRadius:      10,
    paddingHorizontal: 11,
    paddingVertical:   7,
    minWidth:          40,
    alignItems:        "center",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.18)",
  },
  digitValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      18,
    color:         "#fff",
    letterSpacing: 1,
  },
  digitLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   9,
    color:      "rgba(255,255,255,0.45)",
  },
  colon: {
    fontFamily:   theme.fonts.black,
    fontSize:     20,
    color:        "rgba(255,255,255,0.45)",
    marginBottom: 12,
  },

  // Hero deal
  heroWrap: {
    marginHorizontal: 12,
    marginTop:        16,
  },
  heroCard: {
    borderRadius: 22,
    overflow:     "hidden",
  },
  heroBg: {
    borderRadius: 22,
    overflow:     "hidden",
  },
  heroGlow: {
    position:        "absolute",
    top:             -40,
    right:           -40,
    width:           160,
    height:          160,
    borderRadius:    80,
    backgroundColor: "rgba(239,68,68,0.20)",
  },
  heroInner: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    padding:         18,
    gap:             16,
  },
  heroImg: {
    width:           120,
    height:          120,
    borderRadius:    16,
    overflow:        "hidden",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroInfo: {
    flex: 1,
    gap:  10,
  },
  heroBadge: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               4,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
    alignSelf:         "flex-end",
    overflow:          "hidden",
  },
  heroBadgeText: {
    fontFamily:    theme.fonts.black,
    fontSize:      10,
    color:         "#fff",
    letterSpacing: 0.4,
  },
  heroName: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         "#fff",
    textAlign:     "right",
    lineHeight:    22,
    letterSpacing: -0.2,
  },
  heroPriceRow: {
    flexDirection: "row-reverse",
    alignItems:    "baseline",
    gap:           4,
  },
  heroPrice: {
    fontFamily:    theme.fonts.black,
    fontSize:      24,
    color:         "#FCA5A5",
    letterSpacing: -0.5,
  },
  heroCurrency: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      "#FCA5A5",
  },
  heroOrig: {
    fontFamily:         theme.fonts.regular,
    fontSize:           12,
    color:              "rgba(255,255,255,0.40)",
    textDecorationLine: "line-through",
    marginRight:        6,
  },
  heroSavings: {
    backgroundColor:   "rgba(255,255,255,0.10)",
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   5,
    alignSelf:         "flex-end",
  },
  heroSavingsText: {
    fontFamily: theme.fonts.semibold,
    fontSize:   11,
    color:      "#FCA5A5",
  },

  // Section header
  sectionHeader: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 12,
    paddingTop:        20,
    paddingBottom:     8,
  },
  sectionTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.text.primary,
    letterSpacing: -0.2,
  },

  // Grid
  list: {
    paddingHorizontal: 12,
    paddingTop:        0,
  },
  row: {
    gap:           12,
    flexDirection: "row-reverse",
    marginBottom:  12,
  },
  cell: {
    flex: 1,
  },

  // Skeleton
  skeletonGrid: {
    flexDirection:  "row-reverse",
    flexWrap:       "wrap",
    padding:        12,
    gap:            12,
  },

  // States
  footer: {
    paddingVertical: 22,
    alignItems:      "center",
  },
  center: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    gap:            12,
    padding:        32,
  },
  errorTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
    color:      theme.colors.text.primary,
    textAlign:  "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical:   11,
    borderRadius:      14,
    backgroundColor:   "#EF4444",
    marginTop:         4,
  },
  retryText: {
    fontFamily: theme.fonts.black,
    fontSize:   13,
    color:      "#fff",
  },
});
