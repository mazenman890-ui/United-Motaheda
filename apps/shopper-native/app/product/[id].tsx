import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { fetchProductById } from "@/services/productsApi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCartStore } from "@/stores/cart";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

export default function ProductDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [qty, setQty] = useState(1);

  const addItem   = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart    = cartItems.some((i) => i.productId === id);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn:  () => fetchProductById(id!),
    enabled:  !!id,
  });

  const handleAdd = () => {
    if (!product) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addItem(product, qty);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Floating back */}
      <View style={{ position: "absolute", top: insets.top + 10, right: 16, zIndex: 20 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", ...theme.shadow.md }}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.slate[700]} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>

        {/* Image hero */}
        <View style={{ height: 300, backgroundColor: theme.colors.slate[50] }}>
          {isLoading ? (
            <Skeleton height={300} radius={0} />
          ) : product?.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={["#ecfdf5", "#d1fae5", "#a7f3d0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
              <View style={{ width: 100, height: 100, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center", ...theme.shadow.md }}>
                <MaterialCommunityIcons name="pill" size={52} color={theme.colors.brand[400]} />
              </View>
            </LinearGradient>
          )}
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {isLoading ? (
            <>
              <Skeleton width="60%" height={12} />
              <Skeleton width="85%" height={24} />
              <Skeleton width="45%" height={16} />
              <Skeleton height={52} />
              <Skeleton height={120} />
            </>
          ) : product ? (
            <>
              {/* Category + stock badge */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: theme.colors.brand[500] }} />
                  <Text style={{ fontSize: 12, color: theme.colors.brand[600], fontWeight: "700" }}>
                    {product.categoryName}
                  </Text>
                </View>
                <View style={{
                  flexDirection:   "row",
                  alignItems:      "center",
                  gap:             5,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius:    theme.radius.full,
                  backgroundColor: product.inStock ? "#f0fdf4" : "#fef2f2",
                  borderWidth:     1,
                  borderColor:     product.inStock ? "#bbf7d0" : "#fecaca",
                }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: product.inStock ? "#16a34a" : "#dc2626" }} />
                  <Text style={{ fontSize: 11, fontWeight: "800", color: product.inStock ? "#16a34a" : "#dc2626" }}>
                    {product.inStock ? "متاح" : "نفذ"}
                  </Text>
                </View>
              </View>

              {/* Name */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 21, fontWeight: "900", color: theme.colors.slate[900], lineHeight: 29, textAlign: "right" }}>
                  {product.nameAr ?? product.name}
                </Text>
                {product.nameEn && (
                  <Text style={{ fontSize: 13, color: theme.colors.slate[400], textAlign: "right" }}>
                    {product.nameEn}
                  </Text>
                )}
              </View>

              {/* Price */}
              <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 8 }}>
                <Text style={{ fontSize: 28, fontWeight: "900", color: theme.colors.amber[600] }}>
                  {formatPrice(product.price * qty)}
                </Text>
                {qty > 1 && (
                  <Text style={{ fontSize: 13, color: theme.colors.slate[400] }}>
                    ({formatPrice(product.price)} × {qty})
                  </Text>
                )}
              </View>

              {/* Qty picker */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.slate[600] }}>الكمية:</Text>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", backgroundColor: theme.colors.slate[50], borderRadius: 14, borderWidth: 1, borderColor: theme.colors.slate[200], overflow: "hidden" }}>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQty((q) => q + 1); }}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.brand[600] }}>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff", lineHeight: 24 }}>+</Text>
                  </Pressable>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.slate[900], paddingHorizontal: 20 }}>{qty}</Text>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setQty((q) => Math.max(1, q - 1)); }}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 20, fontWeight: "800", color: theme.colors.slate[500], lineHeight: 24 }}>−</Text>
                  </Pressable>
                </View>
              </View>

              {/* Trust badges */}
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                {([
                  { iconName: "flash-outline" as const,            label: "توصيل سريع" },
                  { iconName: "shield-checkmark-outline" as const, label: "أصلي 100%" },
                  { iconName: "refresh-outline" as const,          label: "قابل للإرجاع" },
                ] as { iconName: React.ComponentProps<typeof Ionicons>["name"]; label: string }[]).map((b) => (
                  <View key={b.label} style={{ flex: 1, backgroundColor: theme.colors.brand[50], borderRadius: theme.radius.lg, padding: 10, alignItems: "center", gap: 4, borderWidth: 1, borderColor: theme.colors.brand[100] }}>
                    <Ionicons name={b.iconName} size={20} color={theme.colors.brand[600]} />
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.brand[700], textAlign: "center" }}>{b.label}</Text>
                  </View>
                ))}
              </View>

              {/* Details card */}
              <View style={{ backgroundColor: theme.colors.slate[50], borderRadius: theme.radius.xl, padding: 16, gap: 0, borderWidth: 1, borderColor: theme.colors.slate[100] }}>
                <Text style={{ fontSize: 13, fontWeight: "900", color: theme.colors.slate[700], textAlign: "right", marginBottom: 12 }}>تفاصيل المنتج</Text>
                <DetailRow label="الكود" value={product.code ?? "-"} last={false} />
                <DetailRow label="الباركود" value={product.barcode ?? "-"} last={false} />
                <DetailRow label="القسم" value={product.categoryName ?? "-"} last={false} />
                <DetailRow label="الاسم الإنجليزي" value={product.nameEn ?? "-"} last />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      {product && (
        <View style={{
          position:          "absolute",
          bottom:            0, left: 0, right: 0,
          backgroundColor:   "#fff",
          padding:           16,
          paddingBottom:     insets.bottom + 12,
          borderTopWidth:    1,
          borderTopColor:    theme.colors.slate[100],
          gap:               8,
          ...theme.shadow.lg,
        }}>
          {inCart && (
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6 }}>
              <Text style={{ fontSize: 13, color: theme.colors.brand[600], fontWeight: "700" }}>عرض السلة ←</Text>
            </Pressable>
          )}
          <Button
            variant={inCart ? "secondary" : "primary"}
            size="lg"
            fullWidth
            disabled={!product.inStock}
            onPress={handleAdd}>
            {inCart ? "في السلة — أضف المزيد" : product.inStock ? `أضف للسلة — ${formatPrice(product.price * qty)}` : "غير متاح حالياً"}
          </Button>
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last: boolean }) {
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: theme.colors.slate[100] }}>
      <Text style={{ fontSize: 12, color: theme.colors.slate[500], fontWeight: "600" }}>{label}</Text>
      <Text style={{ fontSize: 12, color: theme.colors.slate[800], fontWeight: "700", maxWidth: "60%", textAlign: "left" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}
