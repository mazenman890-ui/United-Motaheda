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
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchCategories, fetchFeaturedProducts } from "@/services/productsApi";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";

const TRUST_ITEMS = [
  { icon: "🚀", stat: "24h",  titleAr: "توصيل سريع",    descAr: "لباب البيت في القاهرة",  color: theme.colors.brand[600] },
  { icon: "✅", stat: "100%", titleAr: "أدوية أصلية",   descAr: "معتمدة ومضمونة",          color: "#10b981" },
  { icon: "📍", stat: "5",    titleAr: "فروع بالقاهرة", descAr: "في أرجاء القاهرة",        color: "#8b5cf6" },
  { icon: "💬", stat: "24/7", titleAr: "دعم متواصل",    descAr: "نحن هنا دائماً",           color: "#f59e0b" },
];

export default function HomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
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
      style={{ flex: 1, backgroundColor: theme.colors.slate[50] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={theme.colors.brand[500]} />
      }>

      {/* ── Hero ── */}
      <LinearGradient
        colors={["#0d9488", "#0f766e", "#115e59"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 16, paddingBottom: 48, paddingHorizontal: 20 }}>

        {/* Top bar */}
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 18 }}>💊</Text>
            </View>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900" }}>United Motaheda</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={{ position: "relative", width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20 }}>🛒</Text>
            {cartCount > 0 && (
              <View style={{ position: "absolute", top: -3, right: -3, backgroundColor: "#f59e0b", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Greeting */}
        <View style={{ gap: 6, marginBottom: 24 }}>
          <Text style={{ color: "rgba(255,255,255,0.70)", fontSize: 13, fontWeight: "600" }}>صيدلية الموثوقية</Text>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900", lineHeight: 34 }}>
            {"صحتك أولويتنا\nكل وقت وكل يوم 💚"}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4 }}>
            أكثر من 52,000 منتج صيدلاني أصلي
          </Text>
        </View>

        {/* Search CTA */}
        <Pressable
          onPress={() => router.push("/(tabs)/search")}
          style={{
            flexDirection:   "row-reverse",
            alignItems:      "center",
            gap:             10,
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius:    16,
            paddingHorizontal: 16,
            paddingVertical:   14,
            borderWidth:     1,
            borderColor:     "rgba(255,255,255,0.25)",
          }}>
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 14 }}>ابحث عن دواء أو منتج…</Text>
        </Pressable>
      </LinearGradient>

      {/* ── Trust cards ── */}
      <View style={{ marginTop: -20, marginHorizontal: 16, marginBottom: 8 }}>
        <View style={{
          flexDirection: "row-reverse",
          backgroundColor: "#fff",
          borderRadius:    20,
          padding:         14,
          gap:             4,
          ...theme.shadow.md,
        }}>
          {TRUST_ITEMS.map((item) => (
            <View key={item.titleAr} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <Text style={{ fontSize: 14, fontWeight: "900", color: item.color }}>{item.stat}</Text>
              <Text style={{ fontSize: 9, fontWeight: "700", color: theme.colors.slate[700], textAlign: "center" }}>{item.titleAr}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Categories ── */}
      <View style={{ paddingVertical: 20 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 14 }}>
          <Text style={{ fontSize: 17, fontWeight: "900", color: theme.colors.slate[950] }}>تسوق حسب القسم</Text>
          <Pressable onPress={() => router.push("/(tabs)/products")}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.brand[600] }}>كل الأقسام ←</Text>
          </Pressable>
        </View>

        {catsLoading ? (
          <View style={{ flexDirection: "row-reverse", gap: 10, paddingHorizontal: 20 }}>
            {[1, 2, 3].map((k) => (
              <View key={k} style={{ width: 108, height: 168, borderRadius: 20, backgroundColor: theme.colors.slate[200] }} />
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
      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: theme.colors.brand[500] }} />
            <Text style={{ fontSize: 17, fontWeight: "900", color: theme.colors.slate[950] }}>منتجات مميزة</Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/products")}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.brand[600] }}>عرض الكل ←</Text>
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
      <View style={{ backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 24, gap: 16, ...theme.shadow.sm }}>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.slate[400], letterSpacing: 2, textTransform: "uppercase" }}>لماذا تختارنا</Text>
          <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.slate[950] }}>الجودة والثقة أولاً</Text>
        </View>

        {[
          { icon: "🏥", title: "صيدلية معتمدة", desc: "مرخصة من وزارة الصحة المصرية وخاضعة للرقابة الدورية" },
          { icon: "🌡️", title: "تخزين صحيح",   desc: "جميع المنتجات مخزنة في ظروف مثالية للحفاظ على جودتها" },
          { icon: "👨‍⚕️", title: "استشارة صيدلي", desc: "فريق صيادلة متخصصين جاهز للرد على استفساراتك" },
          { icon: "🔄", title: "سياسة إرجاع",  desc: "إرجاع سهل ومضمون خلال 14 يوماً من الاستلام" },
        ].map((item) => (
          <View key={item.title} style={{ flexDirection: "row-reverse", alignItems: "flex-start", gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.brand[50], alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.slate[900] }}>{item.title}</Text>
              <Text style={{ fontSize: 12, color: theme.colors.slate[500], lineHeight: 17 }}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Contact Banner ── */}
      <LinearGradient
        colors={[theme.colors.brand[600], theme.colors.brand[800]]}
        style={{ marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 32, alignItems: "center", gap: 10 }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: "#fff" }}>تحتاج مساعدة؟ 💬</Text>
        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", textAlign: "center" }}>
          فريقنا جاهز للرد على أسئلتك حول الأدوية والمنتجات
        </Text>
        <Pressable style={{ backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 }}>
          <Text style={{ color: theme.colors.brand[700], fontWeight: "900", fontSize: 14 }}>تواصل معنا عبر واتساب 📱</Text>
        </Pressable>
      </LinearGradient>

    </ScrollView>
  );
}
