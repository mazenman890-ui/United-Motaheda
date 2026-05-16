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
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { fetchCategories, fetchFeaturedProducts, type NativeProduct } from "@/services/productsApi";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton, CategoryCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";
import { useAuth } from "@/contexts/AuthContext";

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
            style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1, width: screenW })}>
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ marginHorizontal: 16, borderRadius: 20, padding: 22, overflow: "hidden", ...theme.shadow.lg }}>
              {/* Decorative circles */}
              <View style={{ position: "absolute", right: -28, top: -28, width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.06)" }} />
              <View style={{ position: "absolute", left: 20, bottom: -36, width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.04)" }} />
              <View style={{ position: "absolute", right: 80, top: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.03)" }} />

              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, gap: 7 }}>
                  {/* Tag */}
                  <View style={{ flexDirection: "row-reverse" }}>
                    <View style={{ backgroundColor: `${item.accent}30`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${item.accent}50` }}>
                      <Text style={{ color: item.accent, fontSize: 10, fontFamily: theme.fonts.black, letterSpacing: 0.8 }}>
                        {item.tag}
                      </Text>
                    </View>
                  </View>
                  {/* Title */}
                  <Text style={{ color: "#fff", fontSize: 22, fontFamily: theme.fonts.black, lineHeight: 30, textAlign: "right" }}>
                    {item.title}
                  </Text>
                  {/* Subtitle */}
                  <Text style={{ color: "rgba(255,255,255,0.60)", fontSize: 11, fontFamily: theme.fonts.semibold, textAlign: "right", lineHeight: 16 }}>
                    {item.sub}
                  </Text>
                </View>

                {/* Icon pill */}
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", marginStart: 16 }}>
                  <Ionicons name={item.icon} size={26} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        )}
      />

      {/* Dot indicators */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 10 }}>
        {PROMO_SLIDES.map((_, i) => (
          <View
            key={i}
            style={{
              width:           i === current ? 20 : 6,
              height:          6,
              borderRadius:    3,
              backgroundColor: i === current ? theme.colors.brand[600] : theme.colors.slate[200],
            }}
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
    <View style={{ alignItems: "center", gap: 2 }}>
      <View style={{ backgroundColor: "#0F172A", borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, minWidth: 34, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 15, fontFamily: theme.fonts.black, letterSpacing: 0.5 }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 8.5, fontFamily: theme.fonts.semibold, color: theme.colors.text.tertiary }}>{label}</Text>
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
      style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 7, opacity: pressed ? 0.72 : 1 })}>
      <View style={{
        width:           54,
        height:          54,
        borderRadius:    17,
        backgroundColor: bg,
        alignItems:      "center",
        justifyContent:  "center",
        borderWidth:     1,
        borderColor:     `${color}22`,
        ...theme.shadow.sm,
      }}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={{ fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.text.secondary, textAlign: "center" }}>
        {label}
      </Text>
    </Pressable>
  );
});

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({
  title, icon, accent = theme.colors.brand[600], onMore, rightSlot,
}: {
  title:    string;
  icon:     IoniconsName;
  accent?:  string;
  onMore?:  () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.layout.pagePaddingH }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: `${accent}18`, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={14} color={accent} />
        </View>
        <Text style={{ fontSize: theme.fontSize.xl, fontFamily: theme.fonts.black, color: theme.colors.text.primary }}>
          {title}
        </Text>
      </View>
      {rightSlot ?? (onMore && (
        <Pressable onPress={onMore} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Ionicons name="chevron-back" size={13} color={theme.colors.brand[600]} />
          <Text style={{ fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.brand[600] }}>عرض الكل</Text>
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
    <View style={{ gap: 14 }}>
      {/* Header row */}
      <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.layout.pagePaddingH }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="flash" size={15} color="#DC2626" />
          </View>
          <Text style={{ fontSize: theme.fontSize.xl, fontFamily: theme.fonts.black, color: theme.colors.text.primary }}>عروض اليوم</Text>
        </View>

        {/* Countdown */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <CountdownUnit value={s} label="ث" />
          <Text style={{ color: theme.colors.text.tertiary, fontFamily: theme.fonts.black, marginBottom: 14 }}>:</Text>
          <CountdownUnit value={m} label="د" />
          <Text style={{ color: theme.colors.text.tertiary, fontFamily: theme.fonts.black, marginBottom: 14 }}>:</Text>
          <CountdownUnit value={h} label="س" />
        </View>
      </View>

      {/* Horizontal product scroll */}
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, gap: 10 }}
        renderItem={({ item, index }) => (
          <View style={{ width: 158 }}>
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
        style={{
          paddingTop:        insets.top + 16,
          paddingBottom:     32,
          paddingHorizontal: theme.layout.pagePaddingH,
          overflow:          "hidden",
        }}>

        {/* Subtle grid lines */}
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ position: "absolute", left: `${i * 33 + 5}%` as unknown as number, top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.025)" }} />
        ))}

        {/* Top bar */}
        <View style={homeStyles.topBar}>
          {/* Brand logo */}
          <View style={homeStyles.logoWrap}>
            <Image
              source={require("../../assets/logo.png")}
              style={{ width: 100, height: 36 }}
              contentFit="contain"
            />
          </View>

          {/* Action buttons */}
          <View style={homeStyles.actionBtns}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                router.push("/(tabs)/cart");
              }}
              style={homeStyles.headerBtn}>
              <Ionicons name="bag-outline" size={17} color="rgba(255,255,255,0.90)" />
              {cartCount > 0 && (
                <View style={homeStyles.headerBtnBadge}>
                  <Text style={homeStyles.headerBtnBadgeText}>{cartCount > 9 ? "9+" : cartCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Greeting + headline */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={{ gap: 6, marginBottom: 20 }}>
          <Text style={{ color: theme.colors.brand[300], fontSize: 12, fontFamily: theme.fonts.semibold, textAlign: "right" }}>
            {greeting}
          </Text>
          <Text style={{ color: "#fff", fontSize: 22, fontFamily: theme.fonts.black, lineHeight: 30, textAlign: "right" }}>
            {"ابحث عن\nدوائك بسهولة"}
          </Text>
        </Animated.View>

        {/* Search bar */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          style={{
            flexDirection:     "row-reverse",
            alignItems:        "center",
            gap:               10,
            backgroundColor:   "rgba(255,255,255,0.13)",
            borderRadius:      theme.radius["2xl"],
            paddingHorizontal: 14,
            paddingVertical:   13,
            borderWidth:       1,
            borderColor:       "rgba(255,255,255,0.20)",
          }}>
          <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.70)" />
          <Text style={{ flex: 1, color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: theme.fonts.regular, textAlign: "right" }}>
            ابحث عن دواء، كود، أو مستحضر…
          </Text>
          <View style={{ backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: "rgba(255,255,255,0.60)", fontSize: 10, fontFamily: theme.fonts.bold }}>بحث</Text>
          </View>
        </Pressable>
      </LinearGradient>

      {/* ── Trust strip ──────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={{ marginTop: -20, marginHorizontal: 16, marginBottom: 4 }}>
        <View style={{
          backgroundColor:   theme.colors.surface,
          borderRadius:      theme.radius["2xl"],
          paddingVertical:   12,
          paddingHorizontal: 8,
          flexDirection:     "row-reverse",
          ...theme.shadow.lg,
          borderWidth:       StyleSheet.hairlineWidth,
          borderColor:       theme.colors.border.default,
        }}>
          {([
            { icon: "flash-outline" as IoniconsName,            label: "توصيل سريع",         accent: theme.colors.amber[600],  bg: theme.colors.amber[50]  },
            { icon: "shield-checkmark-outline" as IoniconsName, label: "أدوية أصلية",        accent: theme.colors.green[600],  bg: theme.colors.green[50]  },
            { icon: "wallet-outline" as IoniconsName,           label: "الدفع عند الاستلام",   accent: theme.colors.brand[600],  bg: theme.colors.brand[50]  },
            { icon: "refresh-outline" as IoniconsName,          label: "إرجاع مضمون",        accent: theme.colors.purple[600], bg: theme.colors.purple[50] },
          ]).map((t, i, arr) => (
            <View key={t.label} style={{ flex: 1, alignItems: "center", gap: 5, borderRightWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0, borderRightColor: theme.colors.border.default, paddingHorizontal: 2 }}>
              <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={t.icon} size={14} color={t.accent} />
              </View>
              <Text style={{ fontSize: 9, fontFamily: theme.fonts.bold, color: theme.colors.text.secondary, textAlign: "center", lineHeight: 12 }}>{t.label}</Text>
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
      <Animated.View entering={FadeInDown.duration(380).delay(150)} style={{ paddingTop: 24, paddingHorizontal: theme.layout.pagePaddingH, gap: 12 }}>
        <Text style={{ fontSize: theme.fontSize.xl, fontFamily: theme.fonts.black, color: theme.colors.text.primary, textAlign: "right" }}>
          تسوق بسرعة
        </Text>
        <View style={{ flexDirection: "row-reverse", gap: 8 }}>
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
      <Animated.View entering={FadeInDown.duration(380).delay(185)} style={{ paddingTop: 28, gap: 14 }}>
        <SectionHeader
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
            renderItem={({ item, index }) => (
              <CategoryCard
                category={item}
                gradientIdx={index}
                lang="ar"
                variant="pill"
                onPress={() => router.push({ pathname: "/category/[id]", params: { id: item.id } })}
              />
            )}
          />
        )}
      </Animated.View>

      {/* ── Flash Sale ───────────────────────────────────────────────────────── */}
      {!featLoading && featured.length > 0 && (
        <Animated.View entering={FadeInDown.duration(380).delay(220)} style={{ paddingTop: 28 }}>
          <FlashSaleSection
            products={featured}
            onProductPress={(id) => router.push({ pathname: "/product/[id]", params: { id } })}
          />
        </Animated.View>
      )}

      {/* ── Featured Products ─────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(380).delay(255)} style={{ paddingTop: 28, gap: 14 }}>
        <SectionHeader
          title="منتجات مميزة"
          icon="star-outline"
          accent={theme.colors.amber[600]}
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
            columnWrapperStyle={{ gap: 10, flexDirection: "row-reverse" }}
            contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, gap: 10 }}
            renderItem={({ item, index }) => (
              <View style={{ flex: 1 }}>
                <ProductCard
                  product={item}
                  lang="ar"
                  badge={index === 0 ? "hot" : index === 2 ? "new" : undefined}
                  onPress={() => router.push({ pathname: "/product/[id]", params: { id: item.id } })}
                />
              </View>
            )}
          />
        )}
      </Animated.View>

      {/* ── WhatsApp CTA ─────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(380).delay(290)} style={{ paddingHorizontal: theme.layout.pagePaddingH, paddingTop: 28 }}>
        <LinearGradient
          colors={theme.gradients.heroPrimary as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: theme.radius["2xl"], padding: 20, alignItems: "center", gap: 10, overflow: "hidden", ...theme.shadow.brand }}>
          <View style={{ position: "absolute", right: -20, top: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.05)" }} />
          <Text style={{ color: theme.colors.brand[300], fontSize: 10, fontFamily: theme.fonts.extrabold, letterSpacing: 1.8 }}>دعم صيدلاني</Text>
          <Text style={{ fontSize: 18, fontFamily: theme.fonts.black, color: "#fff", textAlign: "center" }}>تحتاج مساعدة؟</Text>
          <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 18 }}>فريقنا الصيدلاني جاهز للرد</Text>
          <Pressable
            onPress={() => Linking.openURL("https://wa.me/201112343212?text=مرحباً،%20أود%20الاستفسار").catch(() => {})}
            style={({ pressed }) => ({
              flexDirection:     "row",
              alignItems:        "center",
              gap:               8,
              backgroundColor:   "#fff",
              borderRadius:      theme.radius.xl,
              paddingHorizontal: 22,
              paddingVertical:   11,
              marginTop:         4,
              opacity:           pressed ? 0.88 : 1,
              ...theme.shadow.md,
            })}>
            <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
            <Text style={{ color: theme.colors.text.primary, fontFamily: theme.fonts.black, fontSize: 13 }}>
              تواصل معنا
            </Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>

    </Animated.ScrollView>
    </View>
  );
}

const homeStyles = StyleSheet.create({
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  logoWrap: {
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 5,
    ...theme.shadow.sm,
  },
  actionBtns: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  headerBtn: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  headerBtnBadge: {
    position: "absolute",
    top: -4,
    left: -4,
    backgroundColor: theme.colors.error.base,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#021D2E",
  },
  headerBtnBadgeText: { color: "#fff", fontSize: 8, fontFamily: theme.fonts.black },
  fab: {
    position: "absolute",
    zIndex: 50,
  },
  fabInner: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: theme.colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.brand,
    borderWidth: 1,
    borderColor: theme.colors.brand[500],
  },
  fabBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: theme.colors.error.base,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#fff",
  },
  fabBadgeText: { color: "#fff", fontSize: 8.5, fontFamily: theme.fonts.black },
});

