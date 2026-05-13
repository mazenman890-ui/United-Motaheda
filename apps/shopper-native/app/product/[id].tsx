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
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCartStore } from "@/stores/cart";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

export default function ProductDetailScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const [qty, setQty] = useState(1);

  const addItem    = useCartStore((s) => s.addItem);
  const cartItems  = useCartStore((s) => s.items);
  const inCart     = cartItems.some((i) => i.productId === id);

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
      {/* Back button floating */}
      <View style={{
        position:    "absolute", top: insets.top + 8, right: 16, zIndex: 20,
      }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.90)", alignItems: "center", justifyContent: "center", ...theme.shadow.md }}>
          <Text style={{ fontSize: 18, color: theme.colors.slate[700] }}>→</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>

        {/* Image hero */}
        <View style={{ height: 280, backgroundColor: theme.colors.slate[50] }}>
          {isLoading ? (
            <Skeleton height={280} radius={0} />
          ) : product?.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={["#f0fdfa", "#ccfbf1"]}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 80 }}>💊</Text>
            </LinearGradient>
          )}
        </View>

        <View style={{ padding: 20, gap: 14 }}>
          {isLoading ? (
            <>
              <Skeleton width="80%" height={22} />
              <Skeleton width="55%" height={16} />
              <Skeleton height={48} />
            </>
          ) : product ? (
            <>
              {/* Category + stock */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 12, color: theme.colors.brand[600], fontWeight: "700" }}>
                  {product.categoryName}
                </Text>
                <Badge
                  label={product.inStock ? "متاح ✓" : "نفذ"}
                  variant={product.inStock ? "success" : "error"}
                  dot
                />
              </View>

              {/* Name */}
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.slate[950], lineHeight: 28, textAlign: "right" }}>
                {product.nameAr ?? product.name}
              </Text>
              {product.nameEn && (
                <Text style={{ fontSize: 14, color: theme.colors.slate[500], textAlign: "right" }}>
                  {product.nameEn}
                </Text>
              )}

              {/* Price */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                <Text style={{ fontSize: 26, fontWeight: "900", color: theme.colors.brand[700] }}>
                  {formatPrice(product.price * qty)}
                </Text>
                {qty > 1 && (
                  <Text style={{ fontSize: 14, color: theme.colors.slate[400] }}>
                    ({formatPrice(product.price)} × {qty})
                  </Text>
                )}
              </View>

              {/* Qty picker */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.slate[700] }}>الكمية:</Text>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, backgroundColor: theme.colors.slate[100], borderRadius: 12, padding: 4 }}>
                  <Pressable
                    onPress={() => setQty((q) => Math.max(1, q - 1))}
                    style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", ...theme.shadow.sm }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.slate[700] }}>−</Text>
                  </Pressable>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.slate[900], minWidth: 28, textAlign: "center" }}>{qty}</Text>
                  <Pressable
                    onPress={() => setQty((q) => q + 1)}
                    style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: theme.colors.brand[600], alignItems: "center", justifyContent: "center", ...theme.shadow.sm }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Details card */}
              <View style={{ backgroundColor: theme.colors.slate[50], borderRadius: 16, padding: 16, gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.slate[800], textAlign: "right" }}>تفاصيل المنتج</Text>
                <DetailRow label="الكود" value={product.code} />
                <DetailRow label="الباركود" value={product.barcode} />
                <DetailRow label="القسم" value={product.categoryName} />
                <DetailRow label="الاسم الإنجليزي" value={product.nameEn ?? "-"} />
              </View>

              {/* Delivery info */}
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                {["🚀 توصيل سريع", "✅ أصلي 100%", "🔄 قابل للإرجاع"].map((s) => (
                  <View key={s} style={{ flex: 1, backgroundColor: theme.colors.brand[50], borderRadius: 10, padding: 10, alignItems: "center" }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.brand[700], textAlign: "center" }}>{s}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      {product && (
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          backgroundColor: "#fff",
          padding: 16,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: theme.colors.slate[200],
          flexDirection: "row-reverse",
          gap: 10,
          ...theme.shadow.lg,
        }}>
          <Button
            variant={inCart ? "secondary" : "primary"}
            size="lg"
            fullWidth
            disabled={!product.inStock}
            onPress={handleAdd}>
            {inCart ? "✓ في السلة — أضف المزيد" : product.inStock ? "أضف للسلة 🛒" : "غير متاح"}
          </Button>
        </View>
      )}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 12, color: theme.colors.slate[500], fontWeight: "600" }}>{label}</Text>
      <Text style={{ fontSize: 12, color: theme.colors.slate[800], fontWeight: "700", flex: 1, textAlign: "left" }} numberOfLines={1}>{value}</Text>
    </View>
  );
}
