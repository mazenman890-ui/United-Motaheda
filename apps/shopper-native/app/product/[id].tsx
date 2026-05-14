import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
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

const TRUST_BADGES: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[] = [
  { icon: "flash-outline",            label: "توصيل سريع" },
  { icon: "shield-checkmark-outline", label: "أصلي 100%" },
  { icon: "refresh-outline",          label: "إرجاع مضمون" },
];

export default function ProductDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addItem(product, qty);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>

      {/* Floating back */}
      <View
        style={{
          position: "absolute",
          top:      insets.top + 10,
          right:    16,
          zIndex:   20,
        }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width:           44,
            height:          44,
            borderRadius:    14,
            backgroundColor: "rgba(255,255,255,0.94)",
            alignItems:      "center",
            justifyContent:  "center",
            opacity:         pressed ? 0.82 : 1,
            ...theme.shadow.md,
          })}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.slate[700]} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>

        {/* Hero image */}
        <View style={{ height: 310, backgroundColor: theme.colors.slate[50] }}>
          {isLoading ? (
            <Skeleton height={310} radius={0} />
          ) : product?.imageUrl ? (
            <Image
              source={product.imageUrl}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              transition={300}
            />
          ) : (
            <LinearGradient
              colors={["#ecfeff", "#cffafe", "#a5f3fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
              <View
                style={{
                  width:           110,
                  height:          110,
                  borderRadius:    34,
                  backgroundColor: "rgba(255,255,255,0.7)",
                  alignItems:      "center",
                  justifyContent:  "center",
                  ...theme.shadow.md,
                }}>
                <MaterialCommunityIcons name="pill" size={56} color={theme.colors.brand[400]} />
              </View>
            </LinearGradient>
          )}
        </View>

        <View style={{ padding: 20, gap: 18 }}>
          {isLoading ? (
            <>
              <Skeleton width="55%" height={11} />
              <Skeleton width="88%" height={26} />
              <Skeleton width="40%" height={14} />
              <Skeleton height={56} />
              <Skeleton height={128} />
            </>
          ) : product ? (
            <>
              {/* Category + stock */}
              <View
                style={{
                  flexDirection:  "row-reverse",
                  alignItems:     "center",
                  justifyContent: "space-between",
                }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                  <View
                    style={{
                      width:           3,
                      height:          14,
                      borderRadius:    2,
                      backgroundColor: theme.colors.brand[500],
                    }}
                  />
                  <Text style={{ fontSize: 12, color: theme.colors.brand[600], fontWeight: "700" }}>
                    {product.categoryName}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection:     "row",
                    alignItems:        "center",
                    gap:               5,
                    paddingHorizontal: 10,
                    paddingVertical:   5,
                    borderRadius:      theme.radius.full,
                    backgroundColor:   product.inStock ? "#ecfeff" : "#fef2f2",
                    borderWidth:       1,
                    borderColor:       product.inStock ? "#a5f3fc" : "#fecaca",
                  }}>
                  <View
                    style={{
                      width:           6,
                      height:          6,
                      borderRadius:    3,
                      backgroundColor: product.inStock ? "#0e7490" : "#dc2626",
                    }}
                  />
                  <Text
                    style={{
                      fontSize:   11,
                      fontWeight: "800",
                      color:      product.inStock ? "#0e7490" : "#dc2626",
                    }}>
                    {product.inStock ? "متاح" : "نفذ"}
                  </Text>
                </View>
              </View>

              {/* Name */}
              <View style={{ gap: 5 }}>
                <Text
                  style={{
                    fontSize:   22,
                    fontWeight: "900",
                    color:      theme.colors.slate[900],
                    lineHeight: 30,
                    textAlign:  "right",
                  }}>
                  {product.nameAr ?? product.name}
                </Text>
                {product.nameEn && (
                  <Text style={{ fontSize: 13, color: theme.colors.slate[400], textAlign: "right" }}>
                    {product.nameEn}
                  </Text>
                )}
              </View>

              {/* Price + qty */}
              <View
                style={{
                  flexDirection:  "row-reverse",
                  alignItems:     "center",
                  justifyContent: "space-between",
                }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 6 }}>
                  <Text style={{ fontSize: 30, fontWeight: "900", color: theme.colors.amber[600] }}>
                    {formatPrice(product.price * qty)}
                  </Text>
                  {qty > 1 && (
                    <Text style={{ fontSize: 13, color: theme.colors.slate[400] }}>
                      ({formatPrice(product.price)} × {qty})
                    </Text>
                  )}
                </View>

                {/* Qty stepper */}
                <View
                  style={{
                    flexDirection:   "row-reverse",
                    alignItems:      "center",
                    backgroundColor: theme.colors.slate[50],
                    borderRadius:    14,
                    borderWidth:     1,
                    borderColor:     theme.colors.slate[200],
                    overflow:        "hidden",
                  }}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setQty((q) => q + 1);
                    }}
                    style={{
                      width:           42,
                      height:          42,
                      alignItems:      "center",
                      justifyContent:  "center",
                      backgroundColor: theme.colors.brand[600],
                    }}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </Pressable>
                  <Text
                    style={{
                      fontSize:          17,
                      fontWeight:        "900",
                      color:             theme.colors.slate[900],
                      paddingHorizontal: 18,
                    }}>
                    {qty}
                  </Text>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setQty((q) => Math.max(1, q - 1));
                    }}
                    style={{
                      width:          42,
                      height:         42,
                      alignItems:     "center",
                      justifyContent: "center",
                    }}>
                    <Ionicons name="remove" size={20} color={theme.colors.slate[500]} />
                  </Pressable>
                </View>
              </View>

              {/* Trust badges */}
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                {TRUST_BADGES.map((b) => (
                  <View
                    key={b.label}
                    style={{
                      flex:              1,
                      backgroundColor:   theme.colors.brand[50],
                      borderRadius:      theme.radius.lg,
                      padding:           10,
                      alignItems:        "center",
                      gap:               5,
                      borderWidth:       1,
                      borderColor:       theme.colors.brand[100],
                    }}>
                    <Ionicons name={b.icon} size={20} color={theme.colors.brand[600]} />
                    <Text
                      style={{
                        fontSize:   10,
                        fontWeight: "700",
                        color:      theme.colors.brand[700],
                        textAlign:  "center",
                      }}>
                      {b.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Details card */}
              <View
                style={{
                  backgroundColor: theme.colors.slate[50],
                  borderRadius:    theme.radius.xl,
                  padding:         16,
                  borderWidth:     1,
                  borderColor:     theme.colors.slate[100],
                }}>
                <Text
                  style={{
                    fontSize:     12,
                    fontWeight:   "900",
                    color:        theme.colors.slate[600],
                    textAlign:    "right",
                    marginBottom: 14,
                    letterSpacing: 0.5,
                  }}>
                  تفاصيل المنتج
                </Text>
                <DetailRow label="الكود"          value={product.code    ?? "-"} />
                <DetailRow label="الباركود"       value={product.barcode ?? "-"} />
                <DetailRow label="القسم"          value={product.categoryName ?? "-"} />
                <DetailRow label="الاسم الإنجليزي" value={product.nameEn ?? "-"} last />
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      {product && (
        <View
          style={{
            position:          "absolute",
            bottom:            0,
            left:              0,
            right:             0,
            backgroundColor:   "#fff",
            padding:           16,
            paddingBottom:     insets.bottom + 14,
            borderTopWidth:    1,
            borderTopColor:    theme.colors.slate[100],
            gap:               10,
            ...theme.shadow.lg,
          }}>
          {inCart && (
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              style={{
                flexDirection:  "row-reverse",
                alignItems:     "center",
                justifyContent: "center",
                gap:            6,
                paddingVertical: 6,
              }}>
              <Ionicons name="cart-outline" size={14} color={theme.colors.brand[600]} />
              <Text style={{ fontSize: 13, color: theme.colors.brand[600], fontWeight: "700" }}>
                عرض السلة
              </Text>
            </Pressable>
          )}
          <Button
            variant={inCart ? "secondary" : "primary"}
            size="lg"
            fullWidth
            disabled={!product.inStock}
            onPress={handleAdd}>
            {inCart
              ? "في السلة — أضف المزيد"
              : product.inStock
              ? `أضف للسلة — ${formatPrice(product.price * qty)}`
              : "غير متاح حالياً"}
          </Button>
        </View>
      )}
    </View>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection:   "row-reverse",
        justifyContent:  "space-between",
        alignItems:      "center",
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.slate[100],
      }}>
      <Text style={{ fontSize: 12, color: theme.colors.slate[400], fontWeight: "600" }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize:   12,
          color:      theme.colors.slate[800],
          fontWeight: "700",
          maxWidth:   "60%",
          textAlign:  "left",
        }}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
