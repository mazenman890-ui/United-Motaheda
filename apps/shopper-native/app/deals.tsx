/**
 * Deals — Today's Best Prices
 *
 * Curated selection of the most affordable in-stock products.
 * Capped at 12 items — feels intentional, not a catalog dump.
 *
 * List rendering:  ProductGrid (FlashList on native / FlatList on web)
 * Header:          Full-bleed crimson gradient with live countdown
 * Hero card:       First product, enlarged with sale badge
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useInfiniteProducts, ProductGrid, type NativeProduct } from "@/features/products";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/shared/theme";

// ─── Glass / dark overlay palette ────────────────────────────────────────────
// White glass values on the dark crimson hero gradient — no theme token exists.
const DG = {
  w04:  "rgba(255,255,255,0.04)",
  w05:  "rgba(255,255,255,0.05)",
  w06:  "rgba(255,255,255,0.06)",
  w10:  "rgba(255,255,255,0.10)",
  w12:  "rgba(255,255,255,0.12)",
  w15:  "rgba(255,255,255,0.15)",
  w18:  "rgba(255,255,255,0.18)",
  w22:  "rgba(255,255,255,0.22)",
  w45:  "rgba(255,255,255,0.45)",
  w55:  "rgba(255,255,255,0.55)",
  w60:  "rgba(255,255,255,0.60)",
} as const;

// Crimson design accents — no theme token (flash-sale palette)
const DR = {
  glow:   "rgba(239,68,68,0.20)",  // hero glow orb
  rose45: "rgba(255,80,80,0.45)",  // placeholder icon on dark bg
  rose300:"#FCA5A5",               // price text / savings icons / live dot
} as const;

// Intentional dark-red header gradients — editorial "flash sale" palette
const HEADER_GRAD: [string, string, string] = ["#4A0000", "#800000", theme.colors.red[700]];
const HERO_BG_GRAD: [string, string]         = ["#1A0000", "#3D0000"];

// ─── Countdown ────────────────────────────────────────────────────────────────

function useCountdown() {
  const getMs = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    return Math.max(0, end.getTime() - now.getTime());
  };
  const [ms, setMs] = useState(getMs);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    const id = setInterval(() => { if (isMounted.current) setMs(getMs()); }, 1000);
    return () => { isMounted.current = false; clearInterval(id); };
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    h: pad(Math.floor(ms / 3_600_000)),
    m: pad(Math.floor((ms % 3_600_000) / 60_000)),
    s: pad(Math.floor((ms % 60_000) / 1_000)),
  };
}

// ─── Digit block ──────────────────────────────────────────────────────────────

function DigitBlock({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.digitWrap}>
      <LinearGradient colors={[DG.w22, DG.w10]} style={s.digitBox}>
        <UIText style={s.digitValue}>{value}</UIText>
      </LinearGradient>
      <UIText style={s.digitLabel}>{label}</UIText>
    </View>
  );
}

// ─── Hero product ─────────────────────────────────────────────────────────────

const HeroDeal = React.memo(function HeroDeal({
  product, lang, onPress,
}: { product: NativeProduct; lang: "ar" | "en"; onPress: () => void }) {
  const { t } = useTranslation();
  const name     = lang === "en" ? (product.nameEn ?? product.name) : product.name;
  const discount = product.discountPercent ?? null;
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInDown.duration(380).delay(100)} style={s.heroWrap}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.976, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1.0,   { damping: 18, stiffness: 380 }); }}
        style={s.heroPressable}>
        <Animated.View style={[s.heroCard, anim]}>
          <LinearGradient colors={HERO_BG_GRAD} style={s.heroBg}>
            <View style={s.heroGlow} />
            <View style={s.heroInner}>
              <View style={s.heroImg}>
                {product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={s.heroImgFill} contentFit="contain" transition={180} />
                ) : (
                  <View style={s.heroImgFallback}>
                    <Ionicons name="medkit-outline" size={52} color={DR.rose45} />
                  </View>
                )}
              </View>
              <View style={s.heroInfo}>
                {discount != null && (
                  <LinearGradient colors={[theme.colors.red[500], theme.colors.red[600]]} style={s.heroBadge}>
                    <Ionicons name="flash" size={11} color={theme.colors.surface} />
                    <UIText style={s.heroBadgeText}>{t("products.badgeSale", { n: Math.round(discount) })}</UIText>
                  </LinearGradient>
                )}
                <UIText style={s.heroName} numberOfLines={2}>{name}</UIText>
                <View style={s.heroPriceRow}>
                  <UIText style={s.heroPrice}>{product.price.toFixed(2)}</UIText>
                  <UIText style={s.heroCurrency}>{t("common.currency")}</UIText>
                </View>
                <View style={s.heroSavings}>
                  <Ionicons name="flash" size={11} color={DR.rose300} />
                  <UIText style={s.heroSavingsText}>{t("home.flashSale")}</UIText>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DealsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { h, m, s: sec } = useCountdown();

  const {
    products,
    isLoading,
    isError,
    isRefreshing,
    refetch,
  } = useInfiniteProducts({
    sortBy:   "price_asc",
    inStock:  true,
    pageSize: 12,
    maxPages: 1,
  });

  const curated   = useMemo(() => products.slice(0, 12), [products]);
  const heroProd  = curated[0];
  const gridProds = useMemo(() => curated.slice(1), [curated]);

  const handlePress = useCallback(
    (p: NativeProduct) => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      router.push({ pathname: "/product/[id]", params: { id: p.id } });
    },
    [router],
  );

  const dotOp = useSharedValue(1);
  useEffect(() => {
    dotOp.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1, true,
    );
  }, [dotOp]);
  const dotAnim = useAnimatedStyle(() => ({ opacity: dotOp.value }));

  const Header = useMemo(() => (
    <>
      <LinearGradient
        colors={HEADER_GRAD}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={[s.orb, { top: -50, right: -50, width: 180, height: 180 }]} />
        <View style={[s.orb, { bottom: -30, left: -30, width: 100, height: 100, backgroundColor: DG.w04 }]} />

        <View style={s.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.surface} />
          </Pressable>
          <View style={s.flex1}>
            <View style={s.eyebrowRow}>
              <Animated.View style={[s.liveDot, dotAnim]} />
              <UIText style={s.eyebrow}>{t("home.flashEnds").toUpperCase()}</UIText>
            </View>
            <UIText style={s.headerTitle}>{t("home.flashTitle")}</UIText>
          </View>
          <View style={s.flameWrap}>
            <Ionicons name="flame" size={28} color={DR.rose300} />
          </View>
        </View>

        <View style={s.timerRow}>
          <UIText style={s.timerLabel}>{t("home.timeLeft")}</UIText>
          <View style={s.timerUnits}>
            <DigitBlock value={h} label={t("home.flashHrs")} />
            <UIText style={s.colon}>:</UIText>
            <DigitBlock value={m} label={t("home.flashMin")} />
            <UIText style={s.colon}>:</UIText>
            <DigitBlock value={sec} label={t("home.flashSec")} />
          </View>
        </View>
      </LinearGradient>

      {heroProd && (
        <HeroDeal product={heroProd} lang={lang} onPress={() => handlePress(heroProd)} />
      )}

      {gridProds.length > 0 && (
        <View style={s.sectionHeader}>
          <Ionicons name="grid-outline" size={14} color={theme.colors.red[500]} />
          <UIText style={s.sectionTitle}>{t("home.flashSale")}</UIText>
        </View>
      )}
    </>
  ), [insets.top, h, m, sec, t, router, dotAnim, heroProd, lang, handlePress, gridProds.length]);

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
          <UIText style={s.errorTitle}>{t("common.error")}</UIText>
          <Pressable onPress={() => void refetch()} style={s.retryBtn}>
            <UIText style={s.retryText}>{t("common.retry")}</UIText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ProductGrid
        products={gridProds}
        lang={lang}
        onProductPress={handlePress}
        ListHeaderComponent={Header}
        ListFooterComponent={<View style={{ height: insets.bottom + 36 }} />}
        refreshing={isRefreshing}
        onRefresh={refetch}
        contentContainerStyle={{ padding: theme.spacing.md }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  flex1:  { flex: 1 },

  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom:     22,
    gap:               18,
    overflow:          "hidden",
  },
  orb: {
    position:        "absolute",
    borderRadius:    90,
    backgroundColor: DG.w06,
  },
  topRow:    { flexDirection: "row-reverse", alignItems: "center", gap: theme.spacing.md },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: DG.w15,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     DG.w22,
  },
  eyebrowRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginBottom: 3 },
  liveDot:    { width: 7, height: 7, borderRadius: 4, backgroundColor: DR.rose300 },
  eyebrow:    { fontFamily: theme.fonts.bold, fontSize: 9.5, color: DG.w60, letterSpacing: 0.8 },
  headerTitle:{ fontFamily: theme.fonts.black, fontSize: 26, color: theme.colors.surface, letterSpacing: -0.5, textAlign: "right", lineHeight: 32 },
  flameWrap: {
    width:           44,
    height:          44,
    borderRadius:    14,
    backgroundColor: DG.w12,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     DG.w18,
  },

  timerRow:   { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  timerLabel: { fontFamily: theme.fonts.semibold, fontSize: 11, color: DG.w55 },
  timerUnits: { flexDirection: "row", alignItems: "center", gap: 6 },
  digitWrap:  { alignItems: "center", gap: theme.spacing.xs },
  digitBox: {
    borderRadius:      10,
    paddingHorizontal: 11,
    paddingVertical:   7,
    minWidth:          40,
    alignItems:        "center",
    borderWidth:       1,
    borderColor:       DG.w18,
  },
  digitValue: { fontFamily: theme.fonts.black, fontSize: 18, color: theme.colors.surface, letterSpacing: 1 },
  digitLabel: { fontFamily: theme.fonts.regular, fontSize: 9, color: DG.w45 },
  colon:      { fontFamily: theme.fonts.black, fontSize: 20, color: DG.w45, marginBottom: theme.spacing.md },

  // Hero
  heroWrap:      { marginHorizontal: theme.spacing.md, marginTop: theme.spacing.lg },
  heroCard:      { borderRadius: 22, overflow: "hidden" },
  heroBg:        { borderRadius: 22, overflow: "hidden" },
  heroPressable: { borderRadius: 22, overflow: "hidden" },
  heroGlow: {
    position:        "absolute",
    top:             -40,
    right:           -40,
    width:           160,
    height:          160,
    borderRadius:    80,
    backgroundColor: DR.glow,
  },
  heroInner:       { flexDirection: "row-reverse", alignItems: "center", padding: 18, gap: 16 },
  heroImg: {
    width:           120,
    height:          120,
    borderRadius:    16,
    overflow:        "hidden",
    backgroundColor: DG.w05,
  },
  heroImgFill:     { flex: 1 },
  heroImgFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroInfo:        { flex: 1, gap: 10 },
  heroBadge: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing.xs,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
    alignSelf:         "flex-end",
    overflow:          "hidden",
  },
  heroBadgeText:  { fontFamily: theme.fonts.black, fontSize: 10, color: theme.colors.surface, letterSpacing: 0.4 },
  heroName:       { fontFamily: theme.fonts.black, fontSize: 15, color: theme.colors.surface, textAlign: "right", lineHeight: 22, letterSpacing: -0.2 },
  heroPriceRow:   { flexDirection: "row-reverse", alignItems: "baseline", gap: theme.spacing.xs },
  heroPrice:      { fontFamily: theme.fonts.black, fontSize: 24, color: DR.rose300, letterSpacing: -0.5 },
  heroCurrency:   { fontFamily: theme.fonts.bold,  fontSize: 13, color: DR.rose300 },
  heroSavings: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   DG.w10,
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   5,
    alignSelf:         "flex-end",
  },
  heroSavingsText: { fontFamily: theme.fonts.semibold, fontSize: 11, color: DR.rose300 },

  sectionHeader: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop:        theme.spacing[2.5],
    paddingBottom:     theme.spacing.xs,
  },
  sectionTitle: { fontFamily: theme.fonts.black, fontSize: 14, color: theme.colors.text.primary, letterSpacing: -0.2 },

  skeletonGrid: { flexDirection: "row-reverse", flexWrap: "wrap", padding: theme.spacing.md, gap: theme.spacing.md },
  cell:         { flex: 1 },

  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: theme.spacing.md, padding: theme.spacing[4] },
  errorTitle: { fontFamily: theme.fonts.black, fontSize: 16, color: theme.colors.text.primary, textAlign: "center" },
  retryBtn:   { paddingHorizontal: theme.spacing[3], paddingVertical: 11, borderRadius: 14, backgroundColor: theme.colors.red[500], marginTop: theme.spacing.xs },
  retryText:  { fontFamily: theme.fonts.black, fontSize: 13, color: theme.colors.surface },
});
