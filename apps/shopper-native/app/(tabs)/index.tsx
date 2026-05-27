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
} from "react-native-reanimated";
import {
  fetchCategories,
  fetchFeaturedProducts,
  type NativeProduct,
  type NativeCategory,
} from "@/services/productsApi";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton, CategoryCardSkeleton } from "@/components/ui/Skeleton";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";
import { useAuth } from "@/features/auth";
import { AppLogo } from "@/shared/components/AppLogo";
import { useMountTiming } from "@/lib/devTiming";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Promo Carousel ───────────────────────────────────────────────────────────

const PROMO_SLIDES = [
  {
    id: "1",
    gradient: ["#021D2E", "#053348", "#0D6080"] as [string, string, string],
    tag: "كود UNITED10",
    title: "خصم 10%\nعلى طلبك الأول",
    sub: "استخدم الكود عند إتمام الطلب",
    icon: "ticket" as IoniconsName,
    accent: "#0DB8A8",
    route: "/(tabs)/products",
  },
  {
    id: "2",
    gradient: ["#064E3B", "#065C54", "#0A9A8C"] as [string, string, string],
    tag: "توصيل سريع",
    title: "خلال 15-30\nدقيقة",
    sub: "توصيل مجاني فوق 200 ج.م داخل القاهرة",
    icon: "bicycle" as IoniconsName,
    accent: "#34D399",
    route: "/(tabs)/products",
  },
  {
    id: "3",
    gradient: ["#4C1D95", "#6D28D9", "#7C3AED"] as [string, string, string],
    tag: "برنامج الولاء",
    title: "اجمع نقاطك\nواستبدلها",
    sub: "1 نقطة عن كل 10 ج.م تنفقها",
    icon: "diamond" as IoniconsName,
    accent: "#C084FC",
    route: "/loyalty",
  },
];

const PromoCarousel = memo(function PromoCarousel({
  onSlidePress,
}: { onSlidePress: (route: string) => void }) {
  const { width: screenW } = useWindowDimensions();
  const listRef  = useRef<FlatList>(null);
  const [current, setCurrent] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (currentRef.current + 1) % PROMO_SLIDES.length;
      listRef.current?.scrollToOffset({ offset: next * screenW, animated: true });
      currentRef.current = next;
      setCurrent(next);
    }, 3800);
    return () => clearInterval(timer);
  }, [screenW]);

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
            style={({ pressed }) => ({ opacity: pressed ? 0.94 : 1, width: screenW })}>
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={promoStyles.slide}>
              {/* Single subtle "lens-flare" — clinical premium, NOT marketing template */}
              <View style={[promoStyles.flare, { backgroundColor: `${item.accent}1F` }]} />

              <View style={promoStyles.row}>
                <View style={promoStyles.copy}>
                  <View style={promoStyles.tagRow}>
                    <View style={[promoStyles.tag, { backgroundColor: `${item.accent}28`, borderColor: `${item.accent}48` }]}>
                      <UIText variant="eyebrow" style={{ color: item.accent }}>{item.tag}</UIText>
                    </View>
                  </View>
                  <UIText
                    variant="sheet-title"
                    color="inverse"
                    align="right"
                    style={promoStyles.title}>
                    {item.title}
                  </UIText>
                  <UIText
                    variant="body-sm"
                    color="inverse-muted"
                    align="right"
                    style={promoStyles.sub}>
                    {item.sub}
                  </UIText>
                </View>

                {/* Icon pill — refined glass tile */}
                <View style={promoStyles.iconPill}>
                  <Ionicons name={item.icon} size={26} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        )}
      />

      {/* Dot indicators — refined "page" pills */}
      <View style={promoStyles.dotsRow}>
        {PROMO_SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              promoStyles.dot,
              i === current && promoStyles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
});

// ─── Flash Sale Countdown ─────────────────────────────────────────────────────

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

const CountdownUnit = memo(function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <View style={countdownStyles.unit}>
      <View style={countdownStyles.cell}>
        <UIText variant="card-title" weight="black" style={countdownStyles.value}>{value}</UIText>
      </View>
      <UIText variant="eyebrow" color="tertiary" style={countdownStyles.label}>{label}</UIText>
    </View>
  );
});

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS: { icon: IoniconsName; label: string; color: string; bg: string; route: string }[] = [
  { icon: "scan-outline",         label: "وصفة طبية", color: "#7C3AED", bg: "#FAF5FF", route: "/(tabs)/search"   },
  { icon: "leaf-outline",         label: "فيتامينات",  color: "#059669", bg: "#ECFDF5", route: "/(tabs)/products" },
  { icon: "heart-circle-outline", label: "الأم والطفل",color: "#DB2777", bg: "#FFF1F2", route: "/(tabs)/products" },
  { icon: "pricetag-outline",     label: "العروض",    color: "#D97706", bg: "#FFFBEB", route: "/(tabs)/search"   },
];

const QuickAction = memo(function QuickAction({
  icon, label, color, bg, onPress,
}: { icon: IoniconsName; label: string; color: string; bg: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex:       1,
        alignItems: "center",
        gap:        10,
        opacity:    pressed ? 0.78 : 1,
        transform:  [{ scale: pressed ? 0.98 : 1 }],
      })}>
      <View style={[quickStyles.tile, { backgroundColor: bg, borderColor: `${color}26` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <UIText variant="caption" weight="bold" align="center" color="secondary" style={quickStyles.label}>
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
  return (
    <View style={sectionHeaderStyles.row}>
      <View style={sectionHeaderStyles.leftBlock}>
        <View style={[sectionHeaderStyles.icon, { backgroundColor: `${accent}14`, borderColor: `${accent}28` }]}>
          <Ionicons name={icon} size={15} color={accent} />
        </View>
        <View>
          {eyebrow && (
            <UIText variant="eyebrow" color="tertiary" align="right">
              {eyebrow}
            </UIText>
          )}
          <UIText variant="section-head" align="right" style={sectionHeaderStyles.title}>
            {title}
          </UIText>
        </View>
      </View>
      {rightSlot ?? (onMore && (
        <Pressable onPress={onMore} style={sectionHeaderStyles.moreBtn} hitSlop={6}>
          <UIText variant="caption" weight="bold" color="brand">عرض الكل</UIText>
          <Ionicons name="chevron-back" size={13} color={theme.colors.brand[700]} />
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
}: { products: NativeProduct[]; onProductPress: (id: string) => void }) {
  const { h, m, s } = useEndOfDayCountdown();
  const items = products.slice(0, 6);

  if (items.length === 0) return null;

  return (
    <View style={{ gap: 16 }}>
      <SectionHeader
        eyebrow="ينتهي خلال ساعات"
        title="عروض اليوم"
        icon="flash"
        accent={theme.colors.error.base}
        rightSlot={
          <View style={countdownStyles.timer}>
            <CountdownUnit value={s} label="ث" />
            <UIText variant="card-title" weight="black" color="tertiary" style={countdownStyles.colon}>:</UIText>
            <CountdownUnit value={m} label="د" />
            <UIText variant="card-title" weight="black" color="tertiary" style={countdownStyles.colon}>:</UIText>
            <CountdownUnit value={h} label="س" />
          </View>
        }
      />

      {/* Horizontal product scroll */}
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
  const router        = useRouter();
  const insets        = useSafeAreaInsets();
  const cartCount     = useCartStore((s) => s.itemCount());
  const { user }      = useAuth();

  const { data: categories = [], refetch: refCats, isLoading: catsLoading } =
    useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: featured = [], refetch: refFeat, isLoading: featLoading, isRefetching } =
    useQuery({ queryKey: ["featured"], queryFn: () => fetchFeaturedProducts(12) });

  const onRefresh = useCallback(async () => {
    await Promise.all([refCats(), refFeat()]);
  }, [refCats, refFeat]);

  // Stable renderItem callbacks — keeps FlatList's prop comparison stable
  // across HomeScreen rerenders so the memo'd row cells skip work.
  const renderCategory = useCallback(
    ({ item, index }: { item: NativeCategory; index: number }) => (
      <CategoryCard
        category={item}
        gradientIdx={index}
        lang="ar"
        variant="pill"
        onPress={() => router.push({ pathname: "/category/[id]", params: { id: item.id } })}
      />
    ),
    [router],
  );

  const renderFeatured = useCallback(
    ({ item, index }: { item: NativeProduct; index: number }) => (
      <View style={featuredCellStyle}>
        <ProductCard
          product={item}
          lang="ar"
          badge={index === 0 ? "hot" : index === 2 ? "new" : undefined}
          onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
        />
      </View>
    ),
    [router],
  );

  const greeting = user?.name ? `مرحباً، ${user.name.split(" ")[0]}` : "مرحباً بك";

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
    <Animated.ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: theme.layout.tabBarHeight + 24 }}
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

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          homeStyles.hero,
          { paddingTop: insets.top + 18 },
        ]}>

        {/* Subtle grid lines — restraint, very faint */}
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              homeStyles.heroGrid,
              { left: `${i * 33 + 5}%` as unknown as number },
            ]}
          />
        ))}

        {/* Top bar */}
        <View style={homeStyles.topBar}>
          <View style={homeStyles.logoWrap}>
            <AppLogo size="sm" />
          </View>

          <View style={homeStyles.actionBtns}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                router.push("/(tabs)/cart");
              }}
              accessibilityRole="button"
              accessibilityLabel="عربة التسوق"
              style={homeStyles.headerBtn}>
              <Ionicons name="bag-outline" size={18} color="rgba(255,255,255,0.92)" />
              {cartCount > 0 && (
                <View style={homeStyles.headerBtnBadge}>
                  <Text style={homeStyles.headerBtnBadgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Editorial headline — premium hierarchy */}
        <Animated.View
          entering={FadeInUp.duration(440).delay(80)}
          style={homeStyles.heroHeadingStack}>
          <UIText variant="eyebrow" align="right" style={homeStyles.heroEyebrow}>
            {greeting}
          </UIText>
          <UIText
            variant="hero"
            color="inverse"
            align="right"
            style={homeStyles.heroTitle}>
            {"ابحث عن\nدوائك بسهولة"}
          </UIText>
          <UIText
            variant="body-sm"
            color="inverse-muted"
            align="right"
            style={homeStyles.heroSub}>
            توصيل خلال 30–60 دقيقة  •  أدوية أصلية  •  دفع عند الاستلام
          </UIText>
        </Animated.View>

        {/* Premium glass search bar */}
        <Animated.View entering={FadeInUp.duration(440).delay(140)}>
          <Pressable
            onPress={() => router.push("/(tabs)/search")}
            accessibilityRole="button"
            accessibilityLabel="ابحث عن دواء، كود، أو مستحضر"
            style={homeStyles.search}>
            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.78)" />
            <Text style={homeStyles.searchPlaceholder}>
              ابحث عن دواء، كود، أو مستحضر…
            </Text>
            <View style={homeStyles.searchKbd}>
              <UIText variant="eyebrow" style={{ color: "rgba(255,255,255,0.72)" }}>بحث</UIText>
            </View>
          </Pressable>
        </Animated.View>
      </LinearGradient>

      {/* ── Trust strip — overlapping clinical commitment row ──────────────── */}
      <Animated.View
        entering={FadeInDown.duration(440).delay(120)}
        style={homeStyles.trustWrap}>
        <View style={homeStyles.trustCard}>
          {([
            { icon: "flash-outline" as IoniconsName,            label: "توصيل سريع",      accent: theme.colors.amber[700],  bg: theme.colors.amber[50]  },
            { icon: "shield-checkmark-outline" as IoniconsName, label: "أدوية أصلية",     accent: theme.colors.success.strong, bg: theme.colors.success.bg },
            { icon: "wallet-outline" as IoniconsName,           label: "دفع عند الاستلام", accent: theme.colors.brand[700],  bg: theme.colors.brand.lighter },
            { icon: "refresh-outline" as IoniconsName,          label: "إرجاع مضمون",     accent: theme.colors.purple[700], bg: theme.colors.purple[50] },
          ]).map((t, i, arr) => (
            <View
              key={t.label}
              style={[
                homeStyles.trustCell,
                i < arr.length - 1 && homeStyles.trustCellDivider,
              ]}>
              <View style={[homeStyles.trustIcon, { backgroundColor: t.bg }]}>
                <Ionicons name={t.icon} size={15} color={t.accent} />
              </View>
              <UIText variant="eyebrow" color="secondary" align="center" style={homeStyles.trustLabel}>
                {t.label}
              </UIText>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ── Promo Carousel ───────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(380).delay(110)} style={{ paddingTop: 20, paddingBottom: 4 }}>
        <PromoCarousel
          onSlidePress={(route) => {
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
            router.push(route as Parameters<typeof router.push>[0]);
          }}
        />
      </Animated.View>

      {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(420).delay(190)} style={homeStyles.sectionBlock}>
        <SectionHeader
          eyebrow="مفضّلات سريعة"
          title="تسوق بسرعة"
          icon="apps-outline"
        />
        <View style={homeStyles.quickRow}>
          {QUICK_ACTIONS.map((qa) => (
            <QuickAction
              key={qa.label}
              {...qa}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                router.push(qa.route as Parameters<typeof router.push>[0]);
              }}
            />
          ))}
        </View>
      </Animated.View>

      {/* ── Categories ───────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(420).delay(230)} style={homeStyles.sectionBlock}>
        <SectionHeader
          eyebrow="جميع الأقسام"
          title="تسوق حسب القسم"
          icon="grid-outline"
          onMore={() => router.push("/(tabs)/products")}
        />
        {catsLoading ? (
          <FlatList
            data={[1, 2, 3, 4]}
            horizontal
            inverted
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, gap: 10, paddingTop: 4 }}
            keyExtractor={(k) => String(k)}
            renderItem={() => <CategoryCardSkeleton />}
          />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(c) => c.id}
            horizontal
            inverted
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, paddingTop: 4, gap: 10 }}
            removeClippedSubviews
            initialNumToRender={6}
            renderItem={renderCategory}
          />
        )}
      </Animated.View>

      {/* ── Flash Sale ───────────────────────────────────────────────────────── */}
      {!featLoading && featured.length > 0 && (
        <Animated.View entering={FadeInDown.duration(420).delay(270)} style={homeStyles.sectionBlockTall}>
          <FlashSaleSection
            products={featured}
            onProductPress={(id) => router.push({ pathname: "/product/[id]", params: { id } })}
          />
        </Animated.View>
      )}

      {/* ── Featured Products ─────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(420).delay(310)} style={homeStyles.sectionBlock}>
        <SectionHeader
          eyebrow="موصى به من فريقنا الصيدلاني"
          title="منتجات مميزة"
          icon="star-outline"
          accent={theme.colors.amber[700]}
          onMore={() => router.push("/(tabs)/search")}
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

      {/* ── Pharmacist Support — calm editorial card ──────────────────────── */}
      <Animated.View entering={FadeInDown.duration(420).delay(360)} style={homeStyles.supportWrap}>
        <LinearGradient
          colors={theme.gradients.heroPrimary as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={homeStyles.supportCard}>
          {/* Single soft glow accent — no decorative geometry */}
          <View style={homeStyles.supportGlow} />

          <View style={homeStyles.supportRow}>
            <View style={homeStyles.supportIconTile}>
              <Ionicons name="medkit-outline" size={22} color={theme.colors.brand[200]} />
            </View>
            <View style={{ flex: 1 }}>
              <UIText variant="eyebrow" align="right" style={{ color: theme.colors.brand[300] }}>
                دعم صيدلاني  •  ٢٤ ساعة
              </UIText>
              <UIText variant="section-head" color="inverse" align="right" style={homeStyles.supportTitle}>
                تحتاج استشارة سريعة؟
              </UIText>
              <UIText variant="body-sm" color="inverse-muted" align="right" style={homeStyles.supportSub}>
                فريقنا الصيدلاني يردّ خلال دقائق على واتساب
              </UIText>
            </View>
          </View>

          <Pressable
            onPress={() => Linking.openURL("https://wa.me/201112343212?text=مرحباً،%20أود%20الاستفسار").catch(() => {})}
            accessibilityRole="button"
            accessibilityLabel="تواصل عبر واتساب"
            style={({ pressed }) => [
              homeStyles.supportCTA,
              { opacity: pressed ? 0.92 : 1 },
            ]}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <UIText variant="body-sm" weight="extrabold" style={{ color: theme.colors.text.primary }}>
              تواصل عبر واتساب
            </UIText>
            <Ionicons name="chevron-back" size={14} color={theme.colors.text.secondary} />
          </Pressable>
        </LinearGradient>
      </Animated.View>

    </Animated.ScrollView>
    </View>
  );
}

// Module-level constants — created once, prevents per-render object creation
// in hot renderItem closures.
const featuredCellStyle = { flex: 1 } as const;

const homeStyles = StyleSheet.create({
  // ── Hero ─────────────────────────────────────────────────────────────
  hero: {
    paddingBottom:     46,   // larger bottom area — trust strip overlaps gracefully
    paddingHorizontal: theme.layout.pagePaddingH,
    overflow:          "hidden",
  },
  heroGrid: {
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
    ...theme.shadow.md,
  },
  actionBtns: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
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
    borderColor:     "rgba(255,255,255,0.18)",
  },
  headerBtnBadge: {
    position:        "absolute",
    top:             -5,
    left:            -5,
    backgroundColor: theme.colors.error.base,
    borderRadius:    9,
    minWidth:        18,
    height:          18,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 4,
    borderWidth:     1.5,
    borderColor:     "#021D2E",
  },
  headerBtnBadgeText: { color: "#fff", fontSize: 9, fontFamily: theme.fonts.black },

  heroHeadingStack: {
    gap:          8,
    marginBottom: 22,
  },
  heroEyebrow: {
    color: theme.colors.brand[300],
  },
  heroTitle: {
    fontSize:      32,
    lineHeight:    40,
    letterSpacing: -0.8,
  },
  heroSub: {
    marginTop: 4,
    lineHeight: 20,
  },

  // ── Glass search ──────────────────────────────────────────────────────
  search: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               12,
    backgroundColor:   theme.colors.glass,
    borderRadius:      theme.radius["2xl"],
    paddingHorizontal: 16,
    paddingVertical:   15,
    borderWidth:       1,
    borderColor:       theme.colors.glassBorder,
  },
  searchPlaceholder: {
    flex:       1,
    color:      "rgba(255,255,255,0.55)",
    fontSize:   13.5,
    fontFamily: theme.fonts.regular,
    textAlign:  "right",
  },
  searchKbd: {
    backgroundColor:   "rgba(255,255,255,0.18)",
    borderRadius:      9,
    paddingHorizontal: 10,
    paddingVertical:   6,
  },

  // ── Trust strip ───────────────────────────────────────────────────────
  trustWrap: {
    marginTop:        -28,   // overlap into the hero
    marginHorizontal: theme.layout.pagePaddingH,
    marginBottom:     6,
  },
  trustCard: {
    backgroundColor:   theme.colors.surface,
    borderRadius:      theme.radius["2xl"],
    paddingVertical:   14,
    paddingHorizontal: 4,
    flexDirection:     "row-reverse",
    ...theme.shadow.lg,
    shadowOpacity:     0.10,
  },
  trustCell: {
    flex:           1,
    alignItems:     "center",
    gap:            8,
    paddingHorizontal: 4,
  },
  trustCellDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.border.hairline,
  },
  trustIcon: {
    width:           34,
    height:          34,
    borderRadius:    11,
    alignItems:      "center",
    justifyContent:  "center",
  },
  trustLabel: {
    lineHeight: 13,
  },

  // ── Section rhythm ────────────────────────────────────────────────────
  sectionBlock: {
    paddingTop: 32,
    gap:        16,
  },
  sectionBlockTall: {
    paddingTop: 36,
  },

  // ── Quick actions row ─────────────────────────────────────────────────
  quickRow: {
    flexDirection:    "row-reverse",
    gap:              10,
    paddingHorizontal: theme.layout.pagePaddingH,
  },

  // ── Pharmacist support card ───────────────────────────────────────────
  supportWrap: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop:        36,
  },
  supportCard: {
    borderRadius:      theme.radius["2xl"],
    padding:           18,
    gap:               16,
    overflow:          "hidden",
    ...theme.shadow.lg,
    shadowOpacity:     0.12,
  },
  supportGlow: {
    position:        "absolute",
    right:           -40,
    top:             -40,
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: "rgba(13,184,168,0.10)",
  },
  supportRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           14,
  },
  supportIconTile: {
    width:           48,
    height:          48,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.16)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  supportTitle: {
    marginTop:     4,
    letterSpacing: -0.3,
  },
  supportSub: {
    marginTop:  4,
    lineHeight: 20,
  },
  supportCTA: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               10,
    backgroundColor:   "#fff",
    borderRadius:      theme.radius.xl,
    paddingHorizontal: 18,
    paddingVertical:   13,
    ...theme.shadow.sm,
  },
});

// ── Promo carousel styles ──────────────────────────────────────────────
const promoStyles = StyleSheet.create({
  slide: {
    marginHorizontal: 16,
    borderRadius:     22,
    padding:          22,
    overflow:         "hidden",
    ...theme.shadow.lg,
    shadowOpacity:    0.12,
  },
  flare: {
    position:     "absolute",
    right:        -50,
    top:          -50,
    width:        160,
    height:       160,
    borderRadius: 80,
  },
  row: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  copy: {
    flex: 1,
    gap:  8,
  },
  tagRow: {
    flexDirection: "row-reverse",
  },
  tag: {
    borderRadius:    999,
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderWidth:     1,
  },
  title: {
    letterSpacing: -0.5,
    lineHeight:    32,
  },
  sub: {
    lineHeight: 18,
  },
  iconPill: {
    width:           58,
    height:          58,
    borderRadius:    18,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.22)",
    marginStart:     18,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent:"center",
    gap:           5,
    marginTop:     14,
  },
  dot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: theme.colors.slate[200],
  },
  dotActive: {
    width:           22,
    backgroundColor: theme.colors.brand[600],
  },
});

// ── Countdown styles ───────────────────────────────────────────────────
const countdownStyles = StyleSheet.create({
  timer: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
  },
  colon: {
    color:        theme.colors.text.tertiary,
    marginBottom: 14,
  },
  unit: {
    alignItems: "center",
    gap:        3,
  },
  cell: {
    backgroundColor:   theme.colors.brand[700],
    borderRadius:      10,
    paddingHorizontal: 9,
    paddingVertical:   5,
    minWidth:          36,
    alignItems:        "center",
  },
  value: {
    color:         "#fff",
    fontSize:      15,
    letterSpacing: 0.4,
  },
  label: {
    color:    theme.colors.text.tertiary,
  },
});

// ── Section header styles ──────────────────────────────────────────────
const sectionHeaderStyles = StyleSheet.create({
  row: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.layout.pagePaddingH,
  },
  leftBlock: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  icon: {
    width:           36,
    height:          36,
    borderRadius:    11,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
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

// ── Quick action styles ────────────────────────────────────────────────
const quickStyles = StyleSheet.create({
  tile: {
    width:           58,
    height:          58,
    borderRadius:    18,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    ...theme.shadow.xs,
  },
  label: {
    lineHeight: 14,
  },
});

