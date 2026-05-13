import React, { useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCategories, fetchFeaturedProducts } from "@/services/productsApi";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const STATS: { iconName: IoniconsName; value: string; label: string; color: string }[] = [
  { iconName: "flash-outline",             value: "24h",  label: "توصيل سريع",  color: theme.colors.brand[600] },
  { iconName: "shield-checkmark-outline",  value: "100%", label: "أدوية أصلية", color: "#10b981" },
  { iconName: "location-outline",          value: "5",    label: "فروع القاهرة", color: "#8b5cf6" },
  { iconName: "chatbubble-ellipses-outline", value: "24/7", label: "دعم متواصل", color: "#f59e0b" },
];

const WHY_US: { iconName: IoniconsName; title: string; desc: string }[] = [
  { iconName: "ribbon-outline",       title: "صيدلية معتمدة",  desc: "مرخصة من وزارة الصحة المصرية وخاضعة للرقابة الدورية" },
  { iconName: "thermometer-outline",  title: "تخزين صحيح",    desc: "جميع المنتجات مخزنة في ظروف مثالية للحفاظ على جودتها" },
  { iconName: "person-circle-outline", title: "استشارة صيدلي", desc: "فريق صيادلة متخصصين جاهز للرد على استفساراتك" },
  { iconName: "refresh-outline",      title: "سياسة إرجاع",   desc: "إرجاع سهل ومضمون خلال 14 يوماً من الاستلام" },
];

export default function HomeScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.itemCount());

  const { data: categories = [], refetch: refetchCats, isLoading: catsLoading } =
    useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const { data: featured = [], refetch: refetchFeat, isLoading: featLoading, isRefetching } =
    useQuery({ queryKey: ["featured"], queryFn: () => fetchFeaturedProducts(8) });

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchCats(), refetchFeat()]);
  }, [refetchCats, refetchFeat]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.colors.brand[500]} />
      }>

      {/* ── Hero ── */}
      <LinearGradient
        colors={["#065f46", "#047857", "#059669"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 18, paddingBottom: 56, paddingHorizontal: 20 }}>

        {/* Top bar */}
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}>
              <MaterialCommunityIcons name="pill" size={22} color="#fff" />
            </View>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>صيدلية</Text>
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.3 }}>United Motaheda</Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={{ position: "relative", width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }}>
            <Ionicons name="cart-outline" size={22} color="#fff" />
            {cartCount > 0 && (
              <View style={{ position: "absolute", top: -4, right: -4, backgroundColor: theme.colors.amber[500], borderRadius: 8, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, borderWidth: 2, borderColor: "#047857" }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Headline */}
        <View style={{ gap: 8, marginBottom: 28 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
            <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: theme.colors.amber[400] }} />
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 }}>صيدليتك الموثوقة</Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 36, textAlign: "right" }}>
            {"صحتك أولويتنا\nكل وقت وكل يوم"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, textAlign: "right", lineHeight: 20 }}>
            أكثر من 52,000 منتج صيدلاني أصلي
          </Text>
        </View>

        {/* Search bar */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          style={{
            flexDirection:     "row-reverse",
            alignItems:        "center",
            gap:               10,
            backgroundColor:   "rgba(255,255,255,0.12)",
            borderRadius:      theme.radius.xl,
            paddingHorizontal: 16,
            paddingVertical:   14,
            borderWidth:       1,
            borderColor:       "rgba(255,255,255,0.22)",
          }}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
          <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, flex: 1, textAlign: "right" }}>ابحث عن دواء أو منتج…</Text>
        </Pressable>
      </LinearGradient>

      {/* ── Stats strip ── */}
      <View style={{ marginTop: -22, marginHorizontal: 16 }}>
        <View style={{
          flexDirection:     "row-reverse",
          backgroundColor:   "#fff",
          borderRadius:      theme.radius.xl,
          paddingVertical:   16,
          paddingHorizontal: 8,
          ...theme.shadow.lg,
        }}>
          {STATS.map((s, i) => (
            <View key={s.label} style={{ flex: 1, alignItems: "center", gap: 4, borderRightWidth: i < STATS.length - 1 ? 1 : 0, borderRightColor: theme.colors.slate[100] }}>
              <Ionicons name={s.iconName} size={22} color={s.color} />
              <Text style={{ fontSize: 15, fontWeight: "900", color: s.color }}>{s.value}</Text>
              <Text style={{ fontSize: 9, fontWeight: "700", color: theme.colors.slate[600], textAlign: "center", lineHeight: 13 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Categories ── */}
      <View style={{ paddingTop: 28, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: theme.colors.brand[500] }} />
            <Text style={{ fontSize: 17, fontWeight: "900", color: theme.colors.slate[900] }}>تسوق حسب القسم</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/products")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="chevron-back" size={13} color={theme.colors.brand[600]} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.brand[600] }}>كل الأقسام</Text>
          </Pressable>
        </View>

        {catsLoading ? (
          <View style={{ flexDirection: "row-reverse", gap: 10, paddingHorizontal: 20 }}>
            {[1, 2, 3, 4].map((k) => (
              <View key={k} style={{ width: 100, height: 168, borderRadius: 20, backgroundColor: theme.colors.slate[200] }} />
            ))}
          </View>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(c) => c.id}
            horizontal
            inverted
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            renderItem={({ item, index }) => (
              <CategoryCard
                category={item}
                gradientIdx={index}
                lang="ar"
                onPress={() => router.push({ pathname: "/category/[id]", params: { id: item.id } })}
              />
            )}
          />
        )}
      </View>

      {/* ── Featured Products ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <View style={{ width: 4, height: 20, borderRadius: 2, backgroundColor: theme.colors.amber[500] }} />
            <Text style={{ fontSize: 17, fontWeight: "900", color: theme.colors.slate[900] }}>منتجات مميزة</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/products")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="chevron-back" size={13} color={theme.colors.brand[600]} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.brand[600] }}>عرض الكل</Text>
          </Pressable>
        </View>

        {featLoading ? (
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
            {[1, 2, 3, 4].map((k) => <View key={k} style={{ width: "47%" }}><ProductCardSkeleton /></View>)}
          </View>
        ) : (
          <View style={{ flexDirection: "row-reverse", flexWrap: "wrap", gap: 10 }}>
            {featured.map((p) => (
              <View key={p.id} style={{ width: "47%" }}>
                <ProductCard
                  product={p}
                  lang="ar"
                  onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Why Us ── */}
      <View style={{ marginHorizontal: 16, marginTop: 24, marginBottom: 20, backgroundColor: "#fff", borderRadius: theme.radius["2xl"], padding: 20, gap: 18, ...theme.shadow.md, borderWidth: 1, borderColor: theme.colors.slate[100] }}>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.brand[500], letterSpacing: 2.5 }}>لماذا تختارنا</Text>
          <Text style={{ fontSize: 19, fontWeight: "900", color: theme.colors.slate[900] }}>الجودة والثقة أولاً</Text>
        </View>
        {WHY_US.map((item) => (
          <View key={item.title} style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: 14 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.brand[50], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.brand[100] }}>
              <Ionicons name={item.iconName} size={22} color={theme.colors.brand[600]} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.slate[900], textAlign: "right" }}>{item.title}</Text>
              <Text style={{ fontSize: 12, color: theme.colors.slate[500], lineHeight: 18, textAlign: "right" }}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── CTA Banner ── */}
      <LinearGradient
        colors={["#065f46", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ marginHorizontal: 16, borderRadius: theme.radius["2xl"], padding: 24, marginBottom: 32, alignItems: "center", gap: 12, ...theme.shadow.brand }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: "#fff", textAlign: "center" }}>تحتاج مساعدة؟</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 20 }}>
          فريقنا جاهز للرد على أسئلتك حول الأدوية والمنتجات
        </Text>
        <Pressable style={{ backgroundColor: "#fff", borderRadius: theme.radius.lg, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4, flexDirection: "row", alignItems: "center", gap: 8, ...theme.shadow.md }}>
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          <Text style={{ color: theme.colors.brand[700], fontWeight: "900", fontSize: 14 }}>تواصل معنا واتساب</Text>
        </Pressable>
      </LinearGradient>

    </ScrollView>
  );
}
