import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";
import { useCartStore } from "@/stores/cart";
import type { NativeProduct } from "@/services/productsApi";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ProductCardProps {
  product:  NativeProduct;
  lang?:    "ar" | "en";
  onPress?: () => void;
}

export function ProductCard({ product, lang = "ar", onPress }: ProductCardProps) {
  const addItem   = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart    = cartItems.some((i) => i.productId === product.id);

  const scale    = useSharedValue(1);
  const btnScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const handlePressIn  = () => { scale.value = withSpring(0.97, { damping: 14, stiffness: 300 }); };
  const handlePressOut = () => { scale.value = withSpring(1,    { damping: 14, stiffness: 300 }); };

  const handleAdd = () => {
    if (!product.inStock) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    btnScale.value = withSpring(0.85, { damping: 8, stiffness: 400 }, () => {
      btnScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    });
    addItem(product);
  };

  const name = lang === "ar"
    ? (product.nameAr ?? product.name)
    : (product.nameEn ?? product.name);

  return (
    <Animated.View style={[cardStyle, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius:    theme.radius["2xl"],
          overflow:        "hidden",
          borderWidth:     1,
          borderColor:     "rgba(0,0,0,0.05)",
          ...theme.shadow.sm,
        }}>

        {/* Image */}
        <View style={{ height: 152, backgroundColor: theme.colors.slate[50] }}>
          {product.imageUrl ? (
            <Image
              source={product.imageUrl}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={["#ecfeff", "#cffafe", "#a5f3fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="pill" size={44} color={theme.colors.brand[300]} />
            </LinearGradient>
          )}

          {/* Out-of-stock dim */}
          {!product.inStock && (
            <View
              style={{
                position:        "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0,0,0,0.38)",
                alignItems:      "center",
                justifyContent:  "center",
              }}>
              <View
                style={{
                  backgroundColor:   "rgba(0,0,0,0.55)",
                  borderRadius:      theme.radius.md,
                  paddingHorizontal: 10,
                  paddingVertical:   5,
                }}>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                  {lang === "ar" ? "نفذ المخزون" : "Out of stock"}
                </Text>
              </View>
            </View>
          )}

          {/* In-cart dot */}
          {inCart && (
            <View
              style={{
                position:        "absolute",
                top:             8,
                left:            8,
                width:           22,
                height:          22,
                borderRadius:    7,
                backgroundColor: theme.colors.brand[600],
                alignItems:      "center",
                justifyContent:  "center",
                ...theme.shadow.sm,
              }}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={{ padding: 12, gap: 4 }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize:   12,
              fontWeight: "700",
              color:      theme.colors.slate[800],
              lineHeight: 17,
              textAlign:  "right",
              minHeight:  34,
            }}>
            {name}
          </Text>

          <Text
            numberOfLines={1}
            style={{
              fontSize:   10,
              color:      theme.colors.slate[400],
              fontWeight: "500",
              textAlign:  "right",
            }}>
            {lang === "ar" ? product.categoryName : product.categoryNameEn}
          </Text>

          <View
            style={{
              flexDirection:  "row",
              alignItems:     "center",
              justifyContent: "space-between",
              marginTop:      6,
            }}>
            <Text
              style={{
                fontSize:   16,
                fontWeight: "900",
                color:      theme.colors.amber[600],
              }}>
              {formatPrice(product.price, lang)}
            </Text>

            <Animated.View style={btnStyle}>
              <Pressable
                onPress={handleAdd}
                disabled={!product.inStock}
                style={{
                  width:           36,
                  height:          36,
                  borderRadius:    11,
                  backgroundColor: inCart ? theme.colors.brand[100] : theme.colors.brand[600],
                  alignItems:      "center",
                  justifyContent:  "center",
                  opacity:         product.inStock ? 1 : 0.3,
                  ...theme.shadow.sm,
                }}>
                <Ionicons
                  name={inCart ? "checkmark" : "add"}
                  size={18}
                  color={inCart ? theme.colors.brand[700] : "#fff"}
                />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
