import React from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  const addItem   = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart    = cartItems.some((i) => i.productId === product.id);

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
        borderWidth:     1,
        borderColor:     theme.colors.slate[100],
        ...theme.shadow.sm,
      })}>

      {/* Image */}
      <View style={{ height: 148, backgroundColor: theme.colors.slate[50] }}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#f0fdf4", "#dcfce7"]}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="pill" size={42} color={theme.colors.slate[300]} />
          </LinearGradient>
        )}

        {/* Out of stock overlay */}
        {!product.inStock && (
          <View style={{
            position:        "absolute", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "rgba(0,0,0,0.40)",
            alignItems:      "center",
            justifyContent:  "center",
          }}>
            <View style={{ backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                {lang === "ar" ? "نفذ المخزون" : "Out of stock"}
              </Text>
            </View>
          </View>
        )}

        {/* In-cart badge */}
        {inCart && (
          <View style={{
            position:          "absolute",
            top:               8,
            left:              8,
            backgroundColor:   theme.colors.brand[600],
            borderRadius:      8,
            width:             24,
            height:            24,
            alignItems:        "center",
            justifyContent:    "center",
          }}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
      </View>

      {/* Details */}
      <View style={{ padding: 11, gap: 5 }}>
        <Text
          numberOfLines={2}
          style={{ fontSize: 12, fontWeight: "700", color: theme.colors.slate[900], lineHeight: 17, textAlign: "right" }}>
          {truncate(name, 50)}
        </Text>

        <Text style={{ fontSize: 10, color: theme.colors.slate[400], fontWeight: "500", textAlign: "right" }} numberOfLines={1}>
          {lang === "ar" ? product.categoryName : product.categoryNameEn}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.amber[600] }}>
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
              opacity:         !product.inStock ? 0.35 : pressed ? 0.8 : 1,
              ...theme.shadow.sm,
            })}>
            <Ionicons
              name={inCart ? "checkmark" : "add"}
              size={18}
              color={inCart ? theme.colors.brand[700] : "#fff"}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
