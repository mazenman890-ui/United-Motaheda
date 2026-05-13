import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { theme } from "@/theme";
import { formatPrice, truncate } from "@/utils/format";
import { useCartStore } from "@/stores/cart";
import type { NativeProduct } from "@/services/productsApi";

interface ProductCardProps {
  product:  NativeProduct;
  lang?:    "ar" | "en";
  onPress?: () => void;
}

export function ProductCard({ product, lang = "ar", onPress }: ProductCardProps) {
  const addItem  = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart   = cartItems.some((i) => i.productId === product.id);

  const name = lang === "ar"
    ? (product.nameAr ?? product.name)
    : (product.nameEn ?? product.name);

  const handleAddToCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem(product);
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: "#fff",
        borderRadius:    theme.radius.xl,
        overflow:        "hidden",
        opacity:         pressed ? 0.95 : 1,
        transform:       [{ scale: pressed ? 0.98 : 1 }],
        ...theme.shadow.md,
      })}>

      {/* Image area */}
      <View style={{ height: 148, backgroundColor: theme.colors.slate[50] }}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#f0fdfa", "#ccfbf1"]}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 40 }}>💊</Text>
          </LinearGradient>
        )}

        {/* Stock badge */}
        {!product.inStock && (
          <View style={{
            position: "absolute", top: 8, right: 8,
            backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6,
            paddingHorizontal: 7, paddingVertical: 3,
          }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
              {lang === "ar" ? "نفذ" : "Out"}
            </Text>
          </View>
        )}

        {/* In-cart indicator */}
        {inCart && (
          <View style={{
            position: "absolute", top: 8, left: 8,
            backgroundColor: theme.colors.brand[600], borderRadius: 6,
            paddingHorizontal: 7, paddingVertical: 3,
          }}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>✓</Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={{ padding: 11, gap: 6 }}>
        <Text
          numberOfLines={2}
          style={{ fontSize: 12, fontWeight: "700", color: theme.colors.slate[900], lineHeight: 17 }}>
          {truncate(name, 50)}
        </Text>

        <Text style={{ fontSize: 10, color: theme.colors.slate[400], fontWeight: "500" }} numberOfLines={1}>
          {lang === "ar" ? product.categoryName : product.categoryNameEn}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.brand[700] }}>
            {formatPrice(product.price, lang)}
          </Text>

          <Pressable
            onPress={handleAddToCart}
            disabled={!product.inStock}
            style={({ pressed }) => ({
              width:           36,
              height:          36,
              borderRadius:    10,
              backgroundColor: inCart ? theme.colors.brand[100] : theme.colors.brand[600],
              alignItems:      "center",
              justifyContent:  "center",
              opacity:         !product.inStock ? 0.4 : pressed ? 0.8 : 1,
              ...theme.shadow.sm,
            })}>
            <Text style={{ color: inCart ? theme.colors.brand[700] : "#fff", fontSize: 18, lineHeight: 22 }}>
              {inCart ? "✓" : "+"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
