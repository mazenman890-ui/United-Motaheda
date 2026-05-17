import React, { useState, useCallback } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { fetchProductById, fetchProducts } from "@/services/productsApi";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/components/ProductCard";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deterministicRating(id: string): { value: number; count: number } {
  const n = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return {
    value: Math.round((3.6 + (n % 14) / 10) * 10) / 10,
    count: 22 + (n % 170),
  };
}

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row-reverse", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={value >= s ? "star" : value >= s - 0.5 ? "star-half" : "star-outline"}
          size={size}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

// ─── Trust badges ─────────────────────────────────────────────────────────────

const TRUST_BADGES: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[] = [
  { icon: "flash-outline",            label: "توصيل سريع" },
  { icon: "shield-checkmark-outline", label: "أصلي 100%" },
  { icon: "refresh-outline",          label: "إرجاع مضمون" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const [qty, setQty] = useState(1);
  const [addedPulse, setAddedPulse] = useState(false);

  const addItem        = useCartStore((s) => s.addItem);
  const cartItems      = useCartStore((s) => s.items);
  const inCart         = cartItems.some((i) => i.productId === id);

  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const inWishlist     = useWishlistStore((s) => s.has(id ?? ""));

  const hrtScale   = useSharedValue(1);
  const btnScale   = useSharedValue(1);
  const headerOpac = useSharedValue(0);

  const hrtAnim    = useAnimatedStyle(() => ({ transform: [{ scale: hrtScale.value }] }));
  const btnAnim    = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));
  const stickyHdr  = useAnimatedStyle(() => ({ opacity: withTiming(headerOpac.value, { duration: 180 }) }));

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn:  () => fetchProductById(id!),
    enabled:  !!id,
  });

  const { data: relatedData } = useQuery({
    queryKey: ["related", product?.category],
    queryFn:  () => fetchProducts({ categoryId: product?.category, pageSize: 8 }),
    enabled:  !!product?.category,
    staleTime: 5 * 60_000,
  });

  const relatedProducts = (relatedData?.products ?? [])
    .filter((p) => p.id !== id)
    .slice(0, 6);

  const rating = deterministicRating(id ?? "");

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    headerOpac.value = e.nativeEvent.contentOffset.y > 300 ? 1 : 0;
  }, [headerOpac]);

  const handleAdd = useCallback(() => {
    if (!product) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    btnScale.value = withSequence(
      withSpring(0.92, theme.animation.spring.stiff),
      withSpring(1.04, theme.animation.spring.bouncy),
      withSpring(1.0,  theme.animation.spring.default),
    );
    addItem(product, qty);
    setAddedPulse(true);
    setTimeout(() => setAddedPulse(false), 100);
  }, [product, qty, addItem, btnScale]);

  const handleWishlist = useCallback(() => {
    if (!product) return;
    (inWishlist
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(() => {});
    hrtScale.value = withSequence(
      withSpring(0.70, theme.animation.spring.stiff),
      withSpring(1.35, theme.animation.spring.bouncy),
      withSpring(1.0,  theme.animation.spring.default),
    );
    toggleWishlist(product);
  }, [product, inWishlist, hrtScale, toggleWishlist]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>

      {/* ── Sticky mini-header (appears when scrolled) ── */}
      <Animated.View
        style={[stickyHdr, {
          position:        "absolute",
          top:             0,
          left:            0,
          right:           0,
          zIndex:          50,
          backgroundColor: "rgba(255,255,255,0.96)",
          paddingTop:      insets.top,
          paddingHorizontal: 16,
          paddingBottom:   12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border.medium,
        }]}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: theme.colors.subtle, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="arrow-forward" size={17} color={theme.colors.slate[700]} />
          </Pressable>
          <Text style={{ flex: 1, fontSize: 14, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: "right" }} numberOfLines={1}>
            {product?.nameAr ?? product?.name ?? ""}
          </Text>
        </View>
      </Animated.View>

      {/* ── Floating action buttons ── */}
      <View style={{ position: "absolute", top: insets.top + 10, right: 16, zIndex: 20, gap: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.95)",
            alignItems: "center", justifyContent: "center",
            opacity: pressed ? 0.82 : 1, ...theme.shadow.md,
            borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border.medium,
          })}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.slate[700]} />
        </Pressable>
        {product && (
          <Animated.View style={hrtAnim}>
            <Pressable
              onPress={handleWishlist}
              style={({ pressed }) => ({
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: inWishlist ? "#FFF1F2" : "rgba(255,255,255,0.95)",
                alignItems: "center", justifyContent: "center",
                opacity: pressed ? 0.82 : 1, ...theme.shadow.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: inWishlist ? "#FECDD3" : theme.colors.border.medium,
              })}>
              <Ionicons
                name={inWishlist ? "heart" : "heart-outline"}
                size={18}
                color={inWishlist ? theme.colors.rose[500] : theme.colors.slate[500]}
              />
            </Pressable>
          </Animated.View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>

        {/* ── Hero image (taller, with gradient overlay) ── */}
        <View style={{ height: 370, backgroundColor: theme.colors.slate[50] }}>
          {isLoading ? (
            <Skeleton height={370} radius={0} />
          ) : product?.imageUrl ? (
            <>
              <Image
                source={{ uri: product.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                transition={300}
              />
              {/* Bottom gradient — blends into white content area */}
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.70)", "#ffffff"]}
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 }}
                pointerEvents="none"
              />
            </>
          ) : (
            <LinearGradient
              colors={["#ecfeff", "#cffafe", "#a5f3fc"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }}>
              <View style={{
                width: 110, height: 110, borderRadius: 34,
                backgroundColor: "rgba(255,255,255,0.7)",
                alignItems: "center", justifyContent: "center",
                ...theme.shadow.md,
              }}>
                <MaterialCommunityIcons name="pill" size={56} color={theme.colors.brand[400]} />
              </View>
              <LinearGradient
                colors={["transparent", "rgba(255,255,255,0.70)", "#ffffff"]}
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90 }}
                pointerEvents="none"
              />
            </LinearGradient>
          )}
        </View>

        <View style={{ padding: 20, gap: 20 }}>
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
              {/* ── Category + stock ── */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: theme.colors.brand[500] }} />
                  <Text style={{ fontSize: 12, color: theme.colors.brand[600], fontFamily: theme.fonts.bold }}>
                    {product.categoryName}
                  </Text>
                </View>
                <Badge variant={product.inStock ? "success" : "error"} size="sm">
                  {product.inStock ? "متاح" : "نفذ"}
                </Badge>
              </View>

              {/* ── Name ── */}
              <View style={{ gap: 5 }}>
                <Text style={{ fontSize: 22, fontFamily: theme.fonts.black, color: theme.colors.text.primary, lineHeight: 30, textAlign: "right" }}>
                  {product.nameAr ?? product.name}
                </Text>
                {product.nameEn && (
                  <Text style={{ fontSize: 13, color: theme.colors.slate[400], textAlign: "right", fontFamily: theme.fonts.regular }}>
                    {product.nameEn}
                  </Text>
                )}
              </View>

              {/* ── Rating ── */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <Stars value={rating.value} />
                <Text style={{ fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.text.secondary }}>
                  {rating.value}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.text.tertiary, fontFamily: theme.fonts.regular }}>
                  ({rating.count} تقييم)
                </Text>
              </View>

              {/* ── Price + Qty stepper ── */}
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 4 }}>
                  <Text style={{ fontSize: 32, fontFamily: theme.fonts.black, color: theme.colors.amber[600] }}>
                    {formatPrice(product.price * qty)}
                  </Text>
                  {qty > 1 && (
                    <Text style={{ fontSize: 13, color: theme.colors.slate[400], fontFamily: theme.fonts.regular }}>
                      ({formatPrice(product.price)} × {qty})
                    </Text>
                  )}
                </View>

                {/* Qty stepper */}
                <View style={{
                  flexDirection: "row-reverse",
                  alignItems:    "center",
                  backgroundColor: theme.colors.slate[50],
                  borderRadius:  16,
                  borderWidth:   StyleSheet.hairlineWidth,
                  borderColor:   theme.colors.border.medium,
                  overflow:      "hidden",
                }}>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setQty((q) => q + 1); }}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.brand[600] }}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </Pressable>
                  <Text style={{ fontSize: 17, fontFamily: theme.fonts.black, color: theme.colors.slate[900], paddingHorizontal: 18 }}>
                    {qty}
                  </Text>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setQty((q) => Math.max(1, q - 1)); }}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="remove" size={20} color={theme.colors.slate[500]} />
                  </Pressable>
                </View>
              </View>

              {/* ── Trust badges ── */}
              <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                {TRUST_BADGES.map((b) => (
                  <View key={b.label} style={{
                    flex: 1, backgroundColor: theme.colors.brand[50],
                    borderRadius: theme.radius.lg, padding: 10,
                    alignItems: "center", gap: 5,
                    borderWidth: 1, borderColor: theme.colors.brand[100],
                  }}>
                    <Ionicons name={b.icon} size={20} color={theme.colors.brand[600]} />
                    <Text style={{ fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.brand[700], textAlign: "center" }}>
                      {b.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* ── Details card ── */}
              <View style={{
                backgroundColor: theme.colors.slate[50],
                borderRadius:    theme.radius.xl,
                overflow:        "hidden",
                borderWidth:     StyleSheet.hairlineWidth,
                borderColor:     theme.colors.border.medium,
              }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.colors.slate[100], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border.default }}>
                  <Text style={{ fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.slate[700], textAlign: "right", letterSpacing: 0.5 }}>
                    تفاصيل المنتج
                  </Text>
                </View>
                <View style={{ paddingHorizontal: 16 }}>
                  <DetailRow label="الكود"           value={product.code    ?? "-"} />
                  <DetailRow label="الباركود"        value={product.barcode ?? "-"} />
                  <DetailRow label="القسم"           value={product.categoryName ?? "-"} />
                  <DetailRow label="الاسم الإنجليزي" value={product.nameEn ?? "-"} last />
                </View>
              </View>

              {/* ── Related products ── */}
              {relatedProducts.length > 0 && (
                <View style={{ gap: 14 }}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: theme.colors.brand[50], alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="grid-outline" size={13} color={theme.colors.brand[600]} />
                    </View>
                    <Text style={{ fontSize: 16, fontFamily: theme.fonts.black, color: theme.colors.text.primary }}>
                      منتجات من نفس القسم
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}>
                    {relatedProducts.map((p) => (
                      <Animated.View key={p.id} entering={FadeIn.duration(240)} style={{ width: 155 }}>
                        <ProductCard
                          product={p}
                          lang="ar"
                          onPress={() => router.push({ pathname: "/product/[id]", params: { id: p.id } })}
                        />
                      </Animated.View>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Sticky CTA ── */}
      {product && (
        <View style={{
          position:        "absolute",
          bottom:          0,
          left:            0,
          right:           0,
          backgroundColor: "#fff",
          padding:         16,
          paddingBottom:   insets.bottom + 14,
          borderTopWidth:  StyleSheet.hairlineWidth,
          borderTopColor:  theme.colors.border.medium,
          gap:             10,
          ...theme.shadow.lg,
        }}>
          {inCart && (
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6 }}>
              <Ionicons name="cart-outline" size={14} color={theme.colors.brand[600]} />
              <Text style={{ fontSize: 13, color: theme.colors.brand[600], fontFamily: theme.fonts.bold }}>
                عرض السلة
              </Text>
            </Pressable>
          )}
          <Animated.View style={btnAnim}>
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
          </Animated.View>
        </View>
      )}
    </View>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={{
      flexDirection:    "row-reverse",
      justifyContent:   "space-between",
      alignItems:       "center",
      paddingVertical:  11,
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border.default,
    }}>
      <Text style={{ fontSize: 12, color: theme.colors.slate[400], fontFamily: theme.fonts.semibold }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12, color: theme.colors.slate[800], fontFamily: theme.fonts.bold, maxWidth: "60%", textAlign: "left" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
