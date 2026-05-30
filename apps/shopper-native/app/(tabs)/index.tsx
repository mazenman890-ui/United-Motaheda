/**
 * Home Screen — Redesigned Premium Edition
 *
 * A dramatic, editorial homepage with:
 *   • Deep navy hero with glowing beacon dots
 *   • Full-bleed promo carousel with large glass icon tiles
 *   • Gradient quick-action chips
 *   • Neon countdown timer for flash sale
 *   • Premium pharmacist support card
 */

import React, { useCallback, useEffect, useRef, useState, memo } from "react";
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  fetchCategories,
  fetchFeaturedProducts,
  fetchProductsPage,
  type NativeProduct,
  type NativeCategory,
} from "@/features/products";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton, CategoryCardSkeleton } from "@/components/ui/Skeleton";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";
import { useAuth } from "@/features/auth";
import { AppLogo } from "@/shared/components/AppLogo";
import { useMountTiming } from "@/lib/devTiming";
import { useTranslation } from "react-i18next";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Promo Slides ─────────────────────────────────────────────────────────────

const PROMO_SLIDES = [
  {
    id:       "1",
    gradient: ["#021D2E", "#053348", "#0A4A65"] as [string, string, string],
    tagKey:   "home.heroTag1",
    titleKey: "home.heroTitle1",
    subKey:   "home.heroSub1",
    icon:     "ticket"  as IoniconsName,
    accent:   "#0DB8A8",
    glowColor:"rgba(13,184,168,0.18)",
    route:    "/(tabs)/products",
  },
  {
    id:       "2",
    gradient: ["#064E3B", "#065C54", "#0A9A8C"] as [string, string, string],
    tagKey:   "home.heroTag2",
    titleKey: "home.heroTitle2",
    subKey:   "home.heroSub2",
    icon:     "bicycle" as IoniconsName,
    accent:   "#34D399",
    glowColor:"rgba(52,211,153,0.18)",
    route:    "/(tabs)/products",
  },
  {
    id:       "3",
    gradient: ["#3B0764", "#5B21B6", "#6D28D9"] as [string, string, string],
    tagKey:   "home.heroTag3",
    titleKey: "home.heroTitle3",
    subKey:   "home.heroSub3",
    icon:     "diamond" as IoniconsName,
    accent:   "#C084FC",
    glowColor:"rgba(192,132,252,0.18)",
    route:    "/loyalty",
  },
];

// ─── Promo Carousel ───────────────────────────────────────────────────────────

const PromoCarousel = memo(function PromoCarousel({
  onSlidePress,
}: { onSlidePress: (route: string) => void }) {
  const { width: screenW } = useWindowDimensions();
  const { t }              = useTranslation();
  const listRef    = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentRef.current + 1) % PROMO_SLIDES.length;
      listRef.current?.scrollToOffset({ offset: next * screenW, animated: true });
      currentRef.current = next;
      setCurrent(next);
    }, 4200);
    return () => clearInterval(timer);
  }, [screenW]);

  const SLIDE_H = 160;

  return (
    <View>
      <FlatList
        ref={listRef}
        data={PROMO_SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / screenW);
          currentRef.current = idx;
          setCurrent(idx);
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSlidePress(item.route)}
            style={({ pressed }) => ({ opacity: pressed ? 0.93 : 1, width: screenW })}>
            <View style={{ paddingHorizontal: 20 }}>
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[promoStyles.slide, { height: SLIDE_H }]}>

                {/* Glow orb — top right */}
                <View style={[promoStyles.glowOrb, { backgroundColor: item.glowColor }]} />
                {/* Glow orb — bottom left */}
                <View style={[promoStyles.glowOrb2, { backgroundColor: item.glowColor }]} />

                {/* Grid lines — very faint */}
                <View style={[promoStyles.gridLine, { left: "33%" }]} />
                <View style={[promoStyles.gridLine, { left: "66%" }]} />

                <View style={promoStyles.slideRow}>
                  {/* Copy */}
                  <View style={promoStyles.copy}>
                    <View style={promoStyles.tagRow}>
                      <View style={[promoStyles.tagPill, { backgroundColor: item.accent + "28", borderColor: item.accent + "50" }]}>
                        <UIText variant="eyebrow" style={{ color: item.accent, letterSpacing: 0.5 }}>
                          {t(item.tagKey)}
                        </UIText>
                      </View>
                    </View>
                    <UIText
                      variant="sheet-title"
                      color="inverse"
                      align="right"
                      style={[promoStyles.title, { letterSpacing: -0.6 }]}>
                      {t(item.titleKey)}
                    </UIText>
                    <UIText
                      variant="body-sm"
                      color="inverse-muted"
                      align="right"
                      style={promoStyles.sub}>
                      {t(item.subKey)}
                    </UIText>
                  </View>

                  {/* Icon tile — glass with glow border */}
                  <View style={[promoStyles.iconTile, { borderColor: item.accent + "40" }]}>
                    <LinearGradient
                      colors={[item.accent + "22", item.accent + "0A"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name={item.icon} size={28} color={item.accent} />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Pressable>
        )}
      />

      {/* Active dot indicators */}
      <View style={promoStyles.dotsRow}>
        {PROMO_SLIDES.map((slide, i) => (
          <View
            key={i}
            style={[
              promoStyles.dot,
              i === current && [promoStyles.dotActive, { backgroundColor: PROMO_SLIDES[current].accent }],
            ]}
          />
        ))}
      </View>
    </View>
  );
});

// ─── Flash Sale countdown ─────────────────────────────────────────────────────

function useEndOfDayCountdown() {
  const getMs = () => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 0);
    return Math.max(0, end.getTime() - now.getTime());
  };
  const [ms, setMs] = useState(getMs);
  useEffect(() => {
    const t = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h   = Math.floor(ms / 3_600_000);
  const m   = Math.floor((ms % 3_600_000) / 60_000);
  const s   = Math.floor((ms % 60_000) / 1_000);
  return { h: pad(h), m: pad(m), s: pad(s) };
}

const CountdownUnit = memo(function CountdownUnit({
  value, label, grad,
}: { value: string; label: string; grad: [string, string] }) {
  return (
    <View style={cntStyles.unit}>
      <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cntStyles.cell}>
        <Text style={cntStyles.value}>{value}</Text>
      </LinearGradient>
      <UIText variant="eyebrow" color="tertiary" style={cntStyles.label}>{label}</UIText>
    </View>
  );
});

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS: {
  icon:     IoniconsName;
  labelKey: string;
  grad:     [string, string];
  route:    string;
}[] = [
  { icon: "scan-outline",         labelKey: "home.qaRx",       grad: ["#6D28D9", "#7C3AED"], route: "/(tabs)/search"   },
  { icon: "leaf-outline",         labelKey: "home.qaVitamins", grad: ["#065F46", "#059669"], route: "/(tabs)/products" },
  { icon: "heart-circle-outline", labelKey: "home.qaMomBaby",  grad: ["#9D174D", "#DB2777"], route: "/(tabs)/products" },
  { icon: "pricetag-outline",     labelKey: "home.qaOffers",   grad: ["#B45309", "#D97706"], route: "/(tabs)/search"   },
];

const QuickAction = memo(function QuickAction({
  icon, label, grad, onPress,
}: { icon: IoniconsName; label: string; grad: [string, string]; onPress: () => void }) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleIn  = () => { scale.value = withTiming(0.93, { duration: 90 }); };
  const handleOut = () => { scale.value = withTiming(1.0,  { duration: 160 }); };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={{ flex: 1, alignItems: "center", gap: 8 }}>
      {/* Shadow wrapper is separate from clip so Android elevation doesn't
          hide font-based icons inside an overflow:hidden view */}
      <Animated.View style={[quickStyles.shadow, anim]}>
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={quickStyles.tile}>
          <View style={quickStyles.shine} />
          <Ionicons name={icon} size={22} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </Animated.View>
      <UIText variant="caption" weight="bold" align="center" style={quickStyles.label}>
        {label}
      </UIText>
    </Pressable>
  );
});

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({
  eyebrow, title, icon, accent = theme.colors.brand[700], onMore, rightSlot,
}: {
  eyebrow?: string;
  title:    string;
  icon:     IoniconsName;
  accent?:  string;
  onMore?:  () => void;
  rightSlot?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View style={shStyles.row}>
      <View style={shStyles.left}>
        <LinearGradient
          colors={[accent + "28", accent + "12"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[shStyles.icon, { borderColor: accent + "30" }]}>
          <Ionicons name={icon} size={14} color={accent} />
        </LinearGradient>
        <View>
          {eyebrow && (
            <UIText variant="eyebrow" color="tertiary" align="right" style={{ letterSpacing: 0.3 }}>
              {eyebrow}
            </UIText>
          )}
          <UIText variant="section-head" align="right" style={shStyles.title}>
            {title}
          </UIText>
        </View>
      </View>
      {rightSlot ?? (onMore && (
        <Pressable onPress={onMore} style={shStyles.moreBtn} hitSlop={6}>
          <UIText variant="caption" weight="bold" color="brand">{t("home.viewAll")}</UIText>
          <Ionicons name="chevron-back" size={12} color={theme.colors.brand[700]} />
        </Pressable>
      ))}
    </View>
  );
});

// ─── Flash Sale Section ───────────────────────────────────────────────────────

const SALE_DISCOUNTS = [25, 15, 20, 30, 10, 20];

const FlashSaleSection = memo(function FlashSaleSection({
  products,
  onProductPress,
  onViewAll,
}: { products: NativeProduct[]; onProductPress: (id: string) => void; onViewAll?: () => void }) {
  const { t, i18n } = useTranslation();
  const lang        = i18n.language === "en" ? "en" as const : "ar" as const;
  const { h, m, s } = useEndOfDayCountdown();
  const items       = products.slice(0, 6);
  if (items.length === 0) return null;

  return (
    <View style={{ gap: 16 }}>
      <SectionHeader
        eyebrow={t("home.flashEnds")}
        title={t("home.flashTitle")}
        icon="flash"
        accent="#EF4444"
        onMore={onViewAll}
        rightSlot={
          <View style={cntStyles.timerRow}>
            <CountdownUnit value={s} label={t("home.flashSec")} grad={["#DC2626", "#EF4444"]} />
            <Text style={cntStyles.colon}>:</Text>
            <CountdownUnit value={m} label={t("home.flashMin")} grad={["#D97706", "#F59E0B"]} />
            <Text style={cntStyles.colon}>:</Text>
            <CountdownUnit value={h} label={t("home.flashHrs")} grad={["#0891B2", "#0DB8A8"]} />
          </View>
        }
      />

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, gap: 12 }}
        renderItem={({ item, index }) => (
          <View style={{ width: 162 }}>
            <ProductCard
              product={item}
              lang={lang}
              badge="sale"
              discountPercent={SALE_DISCOUNTS[index % SALE_DISCOUNTS.length]}
              onPress={() => onProductPress(item.id)}
            />
          </View>
        )}
      />
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  useMountTiming("HomeScreen");
  const { t, i18n } = useTranslation();
  const lang         = i18n.language === "en" ? "en" as const : "ar" as const;
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.itemCount());
  const { user }  = useAuth();

  const { data: categories = [], refetch: refCats, isLoading: catsLoading } =
    useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  // Featured products — curated selection via dedicated RPC
  const { data: featured = [], refetch: refFeat, isLoading: featLoading, isRefetching } =
    useQuery({ queryKey: ["featured"], queryFn: () => fetchFeaturedProducts(12) });

  // Flash-sale rail — cheapest in-stock products (distinct from featured)
  const { data: flashPage, refetch: refFlash, isLoading: flashLoading } =
    useQuery({
      queryKey: ["flash-sale"],
      queryFn:  () => fetchProductsPage({ sortBy: "price_asc", pageSize: 12, inStock: true }),
    });
  const flashProducts = flashPage?.products ?? [];

  // Only show categories that actually have products (DB-driven counts)
  const visibleCategories = categories.some(c => c.count > 0)
    ? categories.filter(c => c.count > 0)
    : categories; // seeds fallback — show all even if counts are 0

  const onRefresh = useCallback(async () => {
    await Promise.all([refCats(), refFeat(), refFlash()]);
  }, [refCats, refFeat, refFlash]);

  const renderCategory = useCallback(
    ({ item, index }: { item: NativeCategory; index: number }) => (
      <CategoryCard
        category={item}
        gradientIdx={index}
        lang={lang}
        variant="pill"
        onPress={() => router.push({ pathname: "/category/[id]", params: { id: item.id, nameEn: item.nameEn ?? "", name: item.name ?? "" } })}
      />
    ),
    [router, lang],
  );

  const renderFeatured = useCallback(
    ({ item, index }: { item: NativeProduct; index: number }) => (
      <View style={{ flex: 1 }}>
        <ProductCard
          product={item}
          lang={lang}
          badge={index === 0 ? "hot" : index === 2 ? "new" : undefined}
          onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
        />
      </View>
    ),
    [router, lang],
  );

  const greeting = user?.name
    ? t("home.greeting",      { name: user.name.split(" ")[0] })
    : t("home.greetingGuest");

  // Pulsing beacon for hero
  const beaconScale = useSharedValue(1);
  const beaconOp    = useSharedValue(0.6);
  useEffect(() => {
    beaconScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1400 }),
        withTiming(1.0, { duration: 1000 }),
      ),
      -1,
      false,
    );
    beaconOp.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1400 }),
        withTiming(0.6, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, [beaconScale, beaconOp]);

  const beaconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: beaconScale.value }],
    opacity:   beaconOp.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7FA" }}>
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[500]}
            colors={[theme.colors.brand[600]]}
          />
        }>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#021D2E", "#032840", "#053C5A"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[hStyles.hero, { paddingTop: insets.top + 18 }]}>

          {/* Decorative beacon dots */}
          <Animated.View style={[hStyles.beacon, { right: 60, top: insets.top + 30 }, beaconAnim]} />
          <Animated.View style={[hStyles.beacon, { right: 80, top: insets.top + 50, width: 60, height: 60, borderRadius: 30 }, beaconAnim]} />

          {/* Subtle vertical rules */}
          {[0.25, 0.55, 0.80].map((pos, i) => (
            <View key={i} style={[hStyles.vRule, { left: `${pos * 100}%` as unknown as number }]} />
          ))}

          {/* Top bar */}
          <View style={hStyles.topBar}>
            <View style={hStyles.logoWrap}>
              <AppLogo size="sm" />
            </View>
            <View style={{ flexDirection: "row-reverse", gap: 10 }}>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  router.push("/(tabs)/cart");
                }}
                style={hStyles.headerBtn}>
                <Ionicons name="bag-outline" size={18} color="rgba(255,255,255,0.90)" />
                {cartCount > 0 && (
                  <View style={hStyles.cartBadge}>
                    <Text style={hStyles.cartBadgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          {/* Headline */}
          <Animated.View entering={FadeInUp.duration(440).delay(80)} style={hStyles.headingStack}>
            <UIText variant="eyebrow" align="right" style={hStyles.greetingText}>
              {greeting}
            </UIText>
            <Text style={hStyles.heroTitle}>
              {t("home.heroTaglineTitle")}
            </Text>
            <Text style={hStyles.heroSub}>
              {t("home.heroTaglineSub")}
            </Text>
          </Animated.View>

          {/* Search bar */}
          <Animated.View entering={FadeInUp.duration(440).delay(160)}>
            <Pressable
              onPress={() => router.push("/(tabs)/search")}
              style={hStyles.searchBar}>
              <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.65)" />
              <Text style={hStyles.searchPlaceholder}>{t("search.placeholder")}</Text>
              <LinearGradient
                colors={["rgba(13,184,168,0.5)", "rgba(8,145,178,0.5)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={hStyles.searchKbd}>
                <Text style={hStyles.searchKbdText}>{t("tabs.search")}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </LinearGradient>

        {/* ── Trust strip (overlaps hero) ──────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(120)}
          style={hStyles.trustWrap}>
          <View style={hStyles.trustCard}>
            {([
              { icon: "flash-outline"           as IoniconsName, label: t("cart.fastDelivery"),    grad: ["#D97706", "#F59E0B"] as [string, string] },
              { icon: "shield-checkmark-outline" as IoniconsName, label: t("home.origMedicines"),         grad: ["#059669", "#10B981"] as [string, string] },
              { icon: "wallet-outline"           as IoniconsName, label: t("checkout.methodCodTitle"),     grad: ["#0891B2", "#0DB8A8"] as [string, string] },
              { icon: "refresh-outline"          as IoniconsName, label: t("cart.guaranteedReturns"), grad: ["#6D28D9", "#7C3AED"] as [string, string] },
            ]).map((b, i, arr) => (
              <View
                key={b.icon}
                style={[
                  hStyles.trustCell,
                  i < arr.length - 1 && hStyles.trustDivider,
                ]}>
                <LinearGradient
                  colors={b.grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={hStyles.trustIcon}>
                  <Ionicons name={b.icon} size={13} color="#fff" />
                </LinearGradient>
                <UIText variant="eyebrow" align="center" style={hStyles.trustLabel}>{b.label}</UIText>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Promo Carousel ───────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(380).delay(110)}
          style={{ paddingTop: 24, paddingBottom: 4 }}>
          <PromoCarousel
            onSlidePress={(route) => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              router.push(route as Parameters<typeof router.push>[0]);
            }}
          />
        </Animated.View>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(420).delay(190)}
          style={hStyles.section}>
          <SectionHeader
            eyebrow={t("home.catalogEyebrow")}
            title={t("home.quickSearch")}
            icon="apps-outline"
          />
          <View style={hStyles.quickRow}>
            {QUICK_ACTIONS.map((qa) => (
              <QuickAction
                key={qa.labelKey}
                icon={qa.icon}
                label={t(qa.labelKey)}
                grad={qa.grad}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  router.push(qa.route as Parameters<typeof router.push>[0]);
                }}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── Categories ───────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(420).delay(230)}
          style={hStyles.section}>
          <SectionHeader
            eyebrow={t("products.allProducts")}
            title={t("search.categoriesTitle")}
            icon="grid-outline"
            onMore={() => router.push("/(tabs)/products")}
          />
          {catsLoading ? (
            <FlatList
              data={[1, 2, 3, 4]}
              horizontal inverted
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, gap: 10, paddingTop: 4 }}
              keyExtractor={(k) => String(k)}
              renderItem={() => <CategoryCardSkeleton />}
            />
          ) : (
            <FlatList
              data={visibleCategories}
              keyExtractor={(c) => c.id}
              horizontal inverted
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, paddingTop: 4, gap: 10 }}
              removeClippedSubviews
              initialNumToRender={6}
              renderItem={renderCategory}
            />
          )}
        </Animated.View>

        {/* ── Flash Sale — cheapest in-stock products (distinct from featured) */}
        {!flashLoading && flashProducts.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(420).delay(270)}
            style={hStyles.sectionTall}>
            <FlashSaleSection
              products={flashProducts}
              onProductPress={(id) => router.push({ pathname: "/product/[id]", params: { id } })}
              onViewAll={() => router.push({ pathname: "/deals" })}
            />
          </Animated.View>
        )}

        {/* ── Featured Products ─────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(420).delay(310)}
          style={hStyles.section}>
          <SectionHeader
            eyebrow={t("home.featuredEyebrow")}
            title={t("home.featuredTitle")}
            icon="star-outline"
            accent={theme.colors.amber[700]}
            onMore={() => router.push({ pathname: "/featured" })}
          />
          {featLoading ? (
            <FlatList
              data={[1, 2, 3, 4]}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(k) => String(k)}
              columnWrapperStyle={{ gap: 10, flexDirection: "row-reverse" }}
              contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, gap: 10 }}
              renderItem={() => <View style={{ flex: 1 }}><ProductCardSkeleton /></View>}
            />
          ) : (
            <FlatList
              data={featured.slice(0, 8)}
              numColumns={2}
              scrollEnabled={false}
              keyExtractor={(p) => p.id}
              columnWrapperStyle={{ gap: 12, flexDirection: "row-reverse" }}
              contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, gap: 12 }}
              renderItem={renderFeatured}
            />
          )}
        </Animated.View>

        {/* ── Pharmacist Support Card ─────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.duration(420).delay(360)}
          style={hStyles.supportWrap}>
          <LinearGradient
            colors={["#021D2E", "#032840", "#053C5A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={hStyles.supportCard}>
            {/* Glow accent */}
            <View style={hStyles.supportGlow} />
            {/* Decorative ring */}
            <View style={hStyles.supportRing} />

            <View style={hStyles.supportRow}>
              <LinearGradient
                colors={["#0DB8A8", "#0891B2"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={hStyles.supportIconTile}>
                <Ionicons name="medkit-outline" size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <UIText variant="eyebrow" align="right" style={{ color: "#5EEAD4", letterSpacing: 0.5 }}>
                  {t("home.pharmacistCard")}
                </UIText>
                <Text style={hStyles.supportTitle}>
                  {t("home.needAdvice")}
                </Text>
                <Text style={hStyles.supportSub}>
                  {t("home.pharmacistReply")}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() =>
                Linking.openURL("https://wa.me/201112343212?text=مرحباً،%20أود%20الاستفسار").catch(() => {})
              }
              style={({ pressed }) => [hStyles.supportCTA, { opacity: pressed ? 0.92 : 1 }]}>
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={hStyles.supportCTAText}>
                {t("home.chatWhatsapp")}
              </Text>
              <View style={hStyles.supportArrow}>
                <Ionicons name="chevron-back" size={12} color="#64748B" />
              </View>
            </Pressable>
          </LinearGradient>
        </Animated.View>

      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const hStyles = StyleSheet.create({
  hero: {
    paddingBottom:     52,
    paddingHorizontal: 20,
    overflow:          "hidden",
  },
  beacon: {
    position:        "absolute",
    width:           90,
    height:          90,
    borderRadius:    45,
    borderWidth:     1.5,
    borderColor:     "rgba(13,184,168,0.28)",
    backgroundColor: "transparent",
  },
  vRule: {
    position:        "absolute",
    top:             0,
    bottom:          0,
    width:           1,
    backgroundColor: "rgba(255,255,255,0.025)",
  },

  topBar: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   28,
  },
  logoWrap: {
    width:           54,
    height:          54,
    borderRadius:    16,
    backgroundColor: "#fff",
    alignItems:      "center",
    justifyContent:  "center",
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.20,
    shadowRadius:    10,
    elevation:       6,
  },
  headerBtn: {
    position:        "relative",
    width:           42,
    height:          42,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.16)",
  },
  cartBadge: {
    position:          "absolute",
    top:               -5,
    left:              -5,
    backgroundColor:   "#EF4444",
    borderRadius:      9,
    minWidth:          18,
    height:            18,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 4,
    borderWidth:       1.5,
    borderColor:       "#021D2E",
  },
  cartBadgeText: {
    color:      "#fff",
    fontSize:   9,
    fontFamily: theme.fonts.black,
  },

  headingStack: {
    gap:          8,
    marginBottom: 22,
  },
  greetingText: {
    color:         "#5EEAD4",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color:         "#FFFFFF",
    fontSize:      34,
    fontFamily:    theme.fonts.black,
    lineHeight:    42,
    letterSpacing: -1.0,
    textAlign:     "right",
  },
  heroSub: {
    color:      "rgba(255,255,255,0.55)",
    fontSize:   12.5,
    fontFamily: theme.fonts.regular,
    lineHeight: 18,
    textAlign:  "right",
  },

  searchBar: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               12,
    backgroundColor:   "rgba(255,255,255,0.08)",
    borderRadius:      20,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.14)",
  },
  searchPlaceholder: {
    flex:       1,
    color:      "rgba(255,255,255,0.45)",
    fontSize:   13,
    fontFamily: theme.fonts.regular,
    textAlign:  "right",
  },
  searchKbd: {
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   7,
    overflow:          "hidden",
  },
  searchKbdText: {
    color:      "#fff",
    fontSize:   11,
    fontFamily: theme.fonts.bold,
  },

  // Trust strip
  trustWrap: {
    marginTop:         -28,
    marginHorizontal:  16,
    marginBottom:      8,
  },
  trustCard: {
    backgroundColor:   "#fff",
    borderRadius:      22,
    paddingVertical:   14,
    paddingHorizontal: 4,
    flexDirection:     "row-reverse",
    shadowColor:       "#0C2240",
    shadowOffset:      { width: 0, height: 6 },
    shadowOpacity:     0.12,
    shadowRadius:      18,
    elevation:         8,
  },
  trustCell: {
    flex:           1,
    alignItems:     "center",
    gap:            7,
    paddingHorizontal: 4,
  },
  trustDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(15,23,42,0.08)",
  },
  trustIcon: {
    width:          32,
    height:         32,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  trustLabel: {
    color:      "#475569",
    fontSize:   9.5,
    fontFamily: theme.fonts.bold,
    lineHeight: 13,
  },

  // Sections
  section: {
    paddingTop: 32,
    gap:        16,
  },
  sectionTall: {
    paddingTop: 36,
  },
  quickRow: {
    flexDirection:     "row-reverse",
    gap:               10,
    paddingHorizontal: 20,
  },

  // Support card
  supportWrap: {
    paddingHorizontal: 16,
    paddingTop:        36,
  },
  supportCard: {
    borderRadius: 24,
    padding:      20,
    gap:          18,
    overflow:     "hidden",
    shadowColor:  "#021D2E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius:  20,
    elevation:    10,
  },
  supportGlow: {
    position:        "absolute",
    right:           -50,
    top:             -50,
    width:           140,
    height:          140,
    borderRadius:    70,
    backgroundColor: "rgba(13,184,168,0.12)",
  },
  supportRing: {
    position:     "absolute",
    right:        -10,
    top:          -10,
    width:        80,
    height:       80,
    borderRadius: 40,
    borderWidth:  1,
    borderColor:  "rgba(13,184,168,0.20)",
  },
  supportRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           14,
  },
  supportIconTile: {
    width:          52,
    height:         52,
    borderRadius:   16,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  supportTitle: {
    color:         "#FFFFFF",
    fontSize:      18,
    fontFamily:    theme.fonts.black,
    letterSpacing: -0.3,
    textAlign:     "right",
    marginTop:     2,
  },
  supportSub: {
    color:      "rgba(255,255,255,0.55)",
    fontSize:   12,
    fontFamily: theme.fonts.regular,
    lineHeight: 18,
    textAlign:  "right",
    marginTop:  2,
  },
  supportCTA: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               10,
    backgroundColor:   "#fff",
    borderRadius:      14,
    paddingHorizontal: 18,
    paddingVertical:   13,
    shadowColor:       "#000",
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.08,
    shadowRadius:      6,
    elevation:         3,
  },
  supportCTAText: {
    color:      "#0F172A",
    fontSize:   14,
    fontFamily: theme.fonts.extrabold,
    textAlign:  "center",
  },
  supportArrow: {
    marginStart: "auto",
  },
});

// ── Promo carousel ────────────────────────────────────────────────────────────
const promoStyles = StyleSheet.create({
  slide: {
    borderRadius: 24,
    padding:      22,
    overflow:     "hidden",
    shadowColor:  "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius:  16,
    elevation:    8,
  },
  glowOrb: {
    position:     "absolute",
    top:          -60,
    right:        -60,
    width:        140,
    height:       140,
    borderRadius: 70,
  },
  glowOrb2: {
    position:     "absolute",
    bottom:       -50,
    left:         -40,
    width:        110,
    height:       110,
    borderRadius: 55,
  },
  gridLine: {
    position:        "absolute",
    top:             0,
    bottom:          0,
    width:           1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  slideRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  copy: {
    flex: 1,
    gap:  6,
  },
  tagRow: {
    flexDirection: "row-reverse",
  },
  tagPill: {
    borderRadius:      999,
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderWidth:       1,
  },
  title: {
    letterSpacing: -0.5,
    lineHeight:    30,
  },
  sub: {
    lineHeight: 17,
    fontSize:   12,
  },
  iconTile: {
    width:          66,
    height:         66,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1.5,
    marginStart:    16,
    overflow:       "hidden",
  },
  dotsRow: {
    flexDirection:  "row",
    justifyContent: "center",
    gap:            5,
    marginTop:      14,
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    width:        24,
    borderRadius: 3,
  },
});

// ── Countdown ─────────────────────────────────────────────────────────────────
const cntStyles = StyleSheet.create({
  timerRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  colon: {
    color:         "#94A3B8",
    fontSize:      16,
    fontFamily:    theme.fonts.black,
    marginBottom:  12,
  },
  unit: {
    alignItems: "center",
    gap:        3,
  },
  cell: {
    borderRadius:      10,
    paddingHorizontal: 9,
    paddingVertical:   6,
    minWidth:          36,
    alignItems:        "center",
    overflow:          "hidden",
  },
  value: {
    color:         "#fff",
    fontSize:      15,
    fontFamily:    theme.fonts.black,
    letterSpacing: 0.4,
  },
  label: {
    color:    "#94A3B8",
    fontSize: 9.5,
  },
});

// ── Section header ────────────────────────────────────────────────────────────
const shStyles = StyleSheet.create({
  row: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 20,
  },
  left: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  icon: {
    width:          34,
    height:         34,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    overflow:       "hidden",
  },
  title: {
    letterSpacing: -0.3,
  },
  moreBtn: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           4,
    paddingHorizontal: 4,
  },
});

// ── Quick actions ─────────────────────────────────────────────────────────────
const quickStyles = StyleSheet.create({
  // Outer animated wrapper — carries the shadow/elevation only (no overflow clip)
  shadow: {
    borderRadius:  20,
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius:  10,
    elevation:     5,
  },
  // Inner gradient container — clips to rounded corners
  tile: {
    width:          62,
    height:         62,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  shine: {
    position:        "absolute",
    top:             0,
    left:            0,
    right:           0,
    height:          "50%",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
  },
  label: {
    color:      "#334155",
    fontSize:   11,
    fontFamily: theme.fonts.bold,
    lineHeight: 14,
  },
});
