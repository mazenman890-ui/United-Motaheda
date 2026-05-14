import React, { useCallback, memo } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { fetchCategories, fetchFeaturedProducts } from "@/services/productsApi";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TRUST_PILLS: { icon: IoniconsName; label: string }[] = [
  { icon: "flash-outline",            label: "توصيل 24 ساعة" },
  { icon: "shield-checkmark-outline", label: "أدوية أصلية" },
  { icon: "wallet-outline",           label: "الدفع عند الاستلام" },
  { icon: "refresh-outline",          label: "إرجاع مضمون" },
];

interface PromoItem {
  id:      string;
  colors:  [string, string];
  icon:    IoniconsName;
  eyebrow: string;
  title:   string;
  cta:     string;
}

const PROMOS: PromoItem[] = [
  {
    id:      "delivery",
    colors:  [theme.colors.heroMid, theme.colors.heroBright],
    icon:    "flash-outline",
    eyebrow: "عرض محدود",
    title:   "شحن مجاني فوق 200 جنيه",
    cta:     "تسوق الآن",
  },
  {
    id:      "vitamins",
    colors:  ["#2563eb", "#1d4ed8"],
    icon:    "leaf-outline",
    eyebrow: "قسم الفيتامينات",
    title:   "مكملات صحية لكل يوم",
    cta:     "اكتشف",
  },
  {
    id:      "skin",
    colors:  ["#9333ea", "#7e22ce"],
    icon:    "sparkles-outline",
    eyebrow: "العناية بالبشرة",
    title:   "تشكيلة فاخرة من الكريمات",
    cta:     "تصفح",
  },
];

const PromoCard = memo(function PromoCard({ item, onPress }: { item: PromoItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 260, marginLeft: 12 }}>
      <LinearGradient
        colors={item.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius:  theme.radius["2xl"],
          padding:       18,
          height:        130,
          justifyContent: "space-between",
          overflow:      "hidden",
        }}>
        {/* Decorative circles */}
        <View style={{ position: "absolute", right: -20, top: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.08)" }} />
        <View style={{ position: "absolute", right: 28, bottom: -28, width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.06)" }} />

        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name={item.icon} size={16} color="#fff" />
          </View>
          <Text style={{ color: "rgba(255,255,255,0.60)", fontSize: 11, fontWeight: "700" }}>{item.eyebrow}</Text>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900", textAlign: "right" }} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700" }}>{item.cta}</Text>
            <Ionicons name="arrow-back" size={11} color="rgba(255,255,255,0.85)" />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});

export default function HomeScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.itemCount());

  const { data: categories = [], refetch: refCats, isLoading: catsLoading } =
    useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: featured = [], refetch: refFeat, isLoading: featLoading, isRefetching } =
    useQuery({ queryKey: ["featured"], queryFn: () => fetchFeaturedProducts(8) });

  const onRefresh = useCallback(async () => {
    await Promise.all([refCats(), refFeat()]);
  }, [refCats, refFeat]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={theme.colors.brand[400]}
          colors={[theme.colors.brand[500]]}
        />
      }>

      {/* ── Hero ── */}
      <LinearGradient
        colors={[theme.colors.hero, theme.colors.heroMid, theme.colors.heroBright]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          paddingTop:        insets.top + 18,
          paddingBottom:     64,
          paddingHorizontal: 20,
          overflow:          "hidden",
        }}>

        {/* Subtle grid lines */}
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ position: "absolute", left: `${i * 33}%` as unknown as number, top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.028)" }} />
        ))}

        {/* Top bar */}
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width:           42,
                height:          42,
                borderRadius:    14,
                backgroundColor: theme.colors.glass,
                alignItems:      "center",
                justifyContent:  "center",
                borderWidth:     1,
                borderColor:     theme.colors.glassBorder,
              }}>
              <Ionicons name="medical-outline" size={22} color="#fff" />
            </View>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }}>صيدلية</Text>
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900" }}>United Motaheda</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Notifications */}
            <View
              style={{
                width:           42,
                height:          42,
                borderRadius:    14,
                backgroundColor: theme.colors.glass,
                alignItems:      "center",
                justifyContent:  "center",
                borderWidth:     1,
                borderColor:     theme.colors.glassBorder,
              }}>
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.75)" />
            </View>
            {/* Cart */}
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              style={{
                position:        "relative",
                width:           42,
                height:          42,
                borderRadius:    14,
                backgroundColor: theme.colors.glass,
                alignItems:      "center",
                justifyContent:  "center",
                borderWidth:     1,
                borderColor:     theme.colors.glassBorder,
              }}>
              <Ionicons name="cart-outline" size={20} color="#fff" />
              {cartCount > 0 && (
                <View
                  style={{
                    position:          "absolute",
                    top:               -4,
                    right:             -4,
                    backgroundColor:   theme.colors.amber[500],
                    borderRadius:      8,
                    minWidth:          17,
                    height:            17,
                    alignItems:        "center",
                    justifyContent:    "center",
                    paddingHorizontal: 3,
                    borderWidth:       2,
                    borderColor:       theme.colors.heroMid,
                  }}>
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Headline */}
        <View style={{ gap: 8, marginBottom: 22 }}>
          <Text style={{ color: theme.colors.brand[300], fontSize: 11, fontWeight: "800", letterSpacing: 2.2, textAlign: "right" }}>
            لكل داء دواء
          </Text>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 36, textAlign: "right" }}>
            {"صحتك\nأولويتنا في كل وقت"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.50)", fontSize: 13, textAlign: "right", lineHeight: 20 }}>
            52,000+ منتج صيدلاني أصلي
          </Text>
        </View>

        {/* Search bar */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          style={{
            flexDirection:     "row-reverse",
            alignItems:        "center",
            gap:               10,
            backgroundColor:   "rgba(255,255,255,0.11)",
            borderRadius:      theme.radius["2xl"],
            paddingHorizontal: 14,
            paddingVertical:   13,
            borderWidth:       1,
            borderColor:       "rgba(255,255,255,0.18)",
          }}>
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.80)" />
          </View>
          <Text style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, flex: 1, textAlign: "right" }}>
            ابحث عن دواء، كود، أو منتج…
          </Text>
          <View style={{ backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "700" }}>بحث</Text>
          </View>
        </Pressable>
      </LinearGradient>

      {/* ── Trust strip ── */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(80)}
        style={{ marginTop: -28, marginHorizontal: 14, marginBottom: 8 }}>
        <View
          style={{
            backgroundColor:   "#fff",
            borderRadius:      theme.radius["2xl"],
            paddingVertical:   14,
            paddingHorizontal: 8,
            flexDirection:     "row-reverse",
            ...theme.shadow.lg,
            borderWidth:       1,
            borderColor:       "rgba(0,0,0,0.04)",
          }}>
          {TRUST_PILLS.map((t, i) => (
            <View
              key={t.label}
              style={{
                flex:              1,
                alignItems:        "center",
                gap:               5,
                borderRightWidth:  i < TRUST_PILLS.length - 1 ? 1 : 0,
                borderRightColor:  theme.colors.slate[100],
                paddingHorizontal: 2,
              }}>
              <View
                style={{
                  width:           32,
                  height:          32,
                  borderRadius:    10,
                  backgroundColor: theme.colors.brand[50],
                  alignItems:      "center",
                  justifyContent:  "center",
                }}>
                <Ionicons name={t.icon} size={16} color={theme.colors.brand[600]} />
              </View>
              <Text style={{ fontSize: 9, fontWeight: "700", color: theme.colors.slate[600], textAlign: "center", lineHeight: 12 }}>
                {t.label}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ── Promo banners ── */}
      <Animated.View entering={FadeInDown.duration(400).delay(140)} style={{ paddingTop: 22 }}>
        <SectionHeader title="عروض وتخفيضات" icon="pricetag-outline" />
        <ScrollView
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingRight: 2 }}
          style={{ marginTop: 0 }}>
          {PROMOS.map((p) => (
            <PromoCard
              key={p.id}
              item={p}
              onPress={() => router.push("/(tabs)/products")}
            />
          ))}
          <View style={{ width: 14 }} />
        </ScrollView>
      </Animated.View>

      {/* ── Categories ── */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={{ paddingTop: 26 }}>
        <SectionHeader title="تسوق حسب القسم" icon="grid-outline" onMore={() => router.push("/(tabs)/products")} />

        {catsLoading ? (
          <View style={{ flexDirection: "row-reverse", gap: 10, paddingHorizontal: 20, paddingTop: 12 }}>
            {[1, 2, 3, 4].map((k) => (
              <View key={k} style={{ width: 100, height: 170, borderRadius: theme.radius["2xl"], backgroundColor: theme.colors.slate[200] }} />
            ))}
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(c) => c.id}
            horizontal
            inverted
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 10 }}
            removeClippedSubviews
            initialNumToRender={6}
            maxToRenderPerBatch={8}
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

      {/* ── Featured Products ── */}
      <Animated.View entering={FadeInDown.duration(400).delay(260)} style={{ paddingHorizontal: 14, paddingTop: 28 }}>
        <SectionHeader
          title="منتجات مميزة"
          icon="star-outline"
          accent={theme.colors.amber[500]}
          onMore={() => router.push("/(tabs)/search")}
        />

        <View style={{ marginTop: 14, flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
          {featLoading
            ? [1, 2, 3, 4].map((k) => (
                <View key={k} style={{ width: "47%" }}>
                  <ProductCardSkeleton />
                </View>
              ))
            : featured.map((p) => (
                <View key={p.id} style={{ width: "47%" }}>
                  <ProductCard
                    product={p}
                    lang="ar"
                    onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
                  />
                </View>
              ))}
        </View>
      </Animated.View>

      {/* ── CTA banner ── */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(320)}
        style={{ paddingHorizontal: 14, paddingTop: 28, paddingBottom: 100 + insets.bottom }}>
        <LinearGradient
          colors={[theme.colors.hero, theme.colors.heroBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: theme.radius["2xl"],
            padding:      24,
            alignItems:   "center",
            gap:          10,
            overflow:     "hidden",
            ...theme.shadow.brand,
          }}>
          <View style={{ position: "absolute", right: -24, top: -24, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.05)" }} />

          <Text style={{ color: theme.colors.brand[300], fontSize: 11, fontWeight: "800", letterSpacing: 1.8 }}>
            لكل داء دواء
          </Text>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#fff", textAlign: "center" }}>
            تحتاج مساعدة؟
          </Text>
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.58)", textAlign: "center", lineHeight: 20 }}>
            فريقنا الصيدلاني جاهز للرد على أسئلتك
          </Text>
          <Pressable
            style={({ pressed }) => ({
              flexDirection:     "row",
              alignItems:        "center",
              gap:               8,
              backgroundColor:   "#fff",
              borderRadius:      theme.radius.xl,
              paddingHorizontal: 26,
              paddingVertical:   12,
              marginTop:         4,
              opacity:           pressed ? 0.88 : 1,
              ...theme.shadow.md,
            })}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={{ color: theme.colors.brand[800], fontWeight: "900", fontSize: 14 }}>
              تواصل معنا
            </Text>
          </Pressable>
        </LinearGradient>
      </Animated.View>
    </ScrollView>
  );
}

const SectionHeader = memo(function SectionHeader({
  title,
  icon,
  accent = theme.colors.brand[600],
  onMore,
}: {
  title:   string;
  icon:    IoniconsName;
  accent?: string;
  onMore?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection:     "row-reverse",
        alignItems:        "center",
        justifyContent:    "space-between",
        paddingHorizontal: 20,
      }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width:           30,
            height:          30,
            borderRadius:    9,
            backgroundColor: `${accent}18`,
            alignItems:      "center",
            justifyContent:  "center",
          }}>
          <Ionicons name={icon} size={15} color={accent} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.slate[900] }}>{title}</Text>
      </View>
      {onMore && (
        <Pressable onPress={onMore} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Ionicons name="chevron-back" size={13} color={theme.colors.brand[600]} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.brand[600] }}>عرض الكل</Text>
        </Pressable>
      )}
    </View>
  );
});
