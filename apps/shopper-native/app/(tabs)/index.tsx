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

const TRUST_PILLS: { icon: IoniconsName; label: string }[] = [
  { icon: "flash-outline",            label: "توصيل 24 ساعة" },
  { icon: "shield-checkmark-outline", label: "أدوية أصلية 100%" },
  { icon: "wallet-outline",           label: "دفع عند الاستلام" },
  { icon: "refresh-outline",          label: "إرجاع مضمون" },
];

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
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={onRefresh}
          tintColor={theme.colors.brand[500]}
          colors={[theme.colors.brand[500]]}
        />
      }>

      {/* ── Hero ── */}
      <LinearGradient
        colors={[theme.colors.hero, theme.colors.heroMid, theme.colors.heroBright]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          paddingTop:        insets.top + 20,
          paddingBottom:     60,
          paddingHorizontal: 20,
        }}>

        {/* Top bar */}
        <View
          style={{
            flexDirection:  "row-reverse",
            alignItems:     "center",
            justifyContent: "space-between",
            marginBottom:   28,
          }}>
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
              <MaterialCommunityIcons name="pill" size={22} color="#fff" />
            </View>
            <View>
              <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "700", letterSpacing: 1.2 }}>
                صيدلية
              </Text>
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.2 }}>
                United Motaheda
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/cart")}
            style={{
              position:        "relative",
              width:           44,
              height:          44,
              borderRadius:    14,
              backgroundColor: theme.colors.glass,
              alignItems:      "center",
              justifyContent:  "center",
              borderWidth:     1,
              borderColor:     theme.colors.glassBorder,
            }}>
            <Ionicons name="cart-outline" size={22} color="#fff" />
            {cartCount > 0 && (
              <View
                style={{
                  position:          "absolute",
                  top:               -5,
                  right:             -5,
                  backgroundColor:   theme.colors.amber[500],
                  borderRadius:      9,
                  minWidth:          18,
                  height:            18,
                  alignItems:        "center",
                  justifyContent:    "center",
                  paddingHorizontal: 4,
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

        {/* Headline */}
        <View style={{ gap: 10, marginBottom: 26 }}>
          <Text
            style={{
              color:      "rgba(255,255,255,0.50)",
              fontSize:   11,
              fontWeight: "700",
              letterSpacing: 2,
              textAlign:  "right",
            }}>
            لكل داء دواء
          </Text>
          <Text
            style={{
              color:      "#fff",
              fontSize:   26,
              fontWeight: "900",
              lineHeight: 34,
              textAlign:  "right",
            }}>
            {"صحتك أولويتنا\nفي كل وقت"}
          </Text>
          <Text
            style={{
              color:     "rgba(255,255,255,0.55)",
              fontSize:  13,
              textAlign: "right",
              lineHeight: 19,
            }}>
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
            backgroundColor:   "rgba(255,255,255,0.13)",
            borderRadius:      theme.radius["2xl"],
            paddingHorizontal: 16,
            paddingVertical:   14,
            borderWidth:       1,
            borderColor:       "rgba(255,255,255,0.22)",
          }}>
          <View
            style={{
              width:           36,
              height:          36,
              borderRadius:    11,
              backgroundColor: "rgba(255,255,255,0.15)",
              alignItems:      "center",
              justifyContent:  "center",
            }}>
            <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={{ color: "rgba(255,255,255,0.50)", fontSize: 14, flex: 1, textAlign: "right" }}>
            ابحث عن دواء أو منتج…
          </Text>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.18)",
              borderRadius:    8,
              paddingHorizontal: 8,
              paddingVertical:   4,
            }}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "700" }}>بحث</Text>
          </View>
        </Pressable>
      </LinearGradient>

      {/* ── Trust strip ── */}
      <View style={{ marginTop: -24, marginHorizontal: 16, marginBottom: 6 }}>
        <View
          style={{
            backgroundColor:   "#fff",
            borderRadius:      theme.radius["2xl"],
            paddingVertical:   16,
            paddingHorizontal: 10,
            flexDirection:     "row-reverse",
            ...theme.shadow.lg,
            borderWidth:       1,
            borderColor:       "rgba(0,0,0,0.04)",
          }}>
          {TRUST_PILLS.map((t, i) => (
            <View
              key={t.label}
              style={{
                flex:         1,
                alignItems:   "center",
                gap:          5,
                borderRightWidth: i < TRUST_PILLS.length - 1 ? 1 : 0,
                borderRightColor: theme.colors.slate[100],
                paddingHorizontal: 2,
              }}>
              <View
                style={{
                  width:           34,
                  height:          34,
                  borderRadius:    10,
                  backgroundColor: theme.colors.brand[50],
                  alignItems:      "center",
                  justifyContent:  "center",
                }}>
                <Ionicons name={t.icon} size={17} color={theme.colors.brand[600]} />
              </View>
              <Text
                style={{
                  fontSize:   9,
                  fontWeight: "700",
                  color:      theme.colors.slate[600],
                  textAlign:  "center",
                  lineHeight: 12,
                }}>
                {t.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Categories ── */}
      <View style={{ paddingTop: 28 }}>
        <SectionHeader
          title="تسوق حسب القسم"
          onMore={() => router.push("/(tabs)/products")}
        />

        {catsLoading ? (
          <View style={{ flexDirection: "row-reverse", gap: 10, paddingHorizontal: 20, paddingTop: 12 }}>
            {[1, 2, 3, 4].map((k) => (
              <View
                key={k}
                style={{
                  width:            102,
                  height:           172,
                  borderRadius:     theme.radius["2xl"],
                  backgroundColor:  theme.colors.slate[200],
                  overflow:         "hidden",
                }}
              />
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
            renderItem={({ item, index }) => (
              <CategoryCard
                category={item}
                gradientIdx={index}
                lang="ar"
                variant="pill"
                onPress={() =>
                  router.push({ pathname: "/category/[id]", params: { id: item.id } })
                }
              />
            )}
          />
        )}
      </View>

      {/* ── Featured Products ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 30 }}>
        <SectionHeader
          title="منتجات مميزة"
          accentColor={theme.colors.amber[500]}
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
                    onPress={() =>
                      router.push({ pathname: "/product/[id]", params: { id: p.id } })
                    }
                  />
                </View>
              ))}
        </View>
      </View>

      {/* ── WhatsApp CTA ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 30, paddingBottom: 100 + insets.bottom }}>
        <LinearGradient
          colors={[theme.colors.hero, theme.colors.heroBright]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius:  theme.radius["2xl"],
            padding:       24,
            alignItems:    "center",
            gap:           12,
            ...theme.shadow.brand,
          }}>
          <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 }}>
            لكل داء دواء
          </Text>
          <Text style={{ fontSize: 21, fontWeight: "900", color: "#fff", textAlign: "center" }}>
            تحتاج مساعدة؟
          </Text>
          <Text
            style={{
              fontSize:  13,
              color:     "rgba(255,255,255,0.65)",
              textAlign: "center",
              lineHeight: 20,
            }}>
            فريقنا جاهز للرد على أسئلتك حول الأدوية
          </Text>
          <Pressable
            style={({ pressed }) => ({
              backgroundColor:   "#fff",
              borderRadius:      theme.radius.xl,
              paddingHorizontal: 28,
              paddingVertical:   13,
              marginTop:         4,
              flexDirection:     "row",
              alignItems:        "center",
              gap:               8,
              opacity:           pressed ? 0.88 : 1,
              ...theme.shadow.md,
            })}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            <Text style={{ color: theme.colors.brand[800], fontWeight: "900", fontSize: 14 }}>
              تواصل معنا
            </Text>
          </Pressable>
        </LinearGradient>
      </View>
    </ScrollView>
  );
}

function SectionHeader({
  title,
  accentColor = "#059669",
  onMore,
}: {
  title:         string;
  accentColor?:  string;
  onMore?:       () => void;
}) {
  return (
    <View
      style={{
        flexDirection:  "row-reverse",
        alignItems:     "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
      }}>
      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width:           3,
            height:          20,
            borderRadius:    2,
            backgroundColor: accentColor,
          }}
        />
        <Text style={{ fontSize: 17, fontWeight: "900", color: theme.colors.slate[900] }}>
          {title}
        </Text>
      </View>
      {onMore && (
        <Pressable
          onPress={onMore}
          style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Ionicons name="chevron-back" size={13} color={theme.colors.brand[600]} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.brand[600] }}>
            عرض الكل
          </Text>
        </Pressable>
      )}
    </View>
  );
}
