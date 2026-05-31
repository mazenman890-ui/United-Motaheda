import React, { useState, useCallback, useEffect } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { fetchProductById } from "@/services/productsApi";
import { useRecentlyViewedStore } from "@/features/products";
import { useRelatedProducts } from "@/features/recommendations";
import { useScreenTrace } from "@/features/observability";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  FadeIn,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/components/ProductCard";
import { Text as UIText } from "@/shared/ui";
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

const TRUST_BADGES: { icon: React.ComponentProps<typeof Ionicons>["name"]; labelKey: string }[] = [
  { icon: "flash-outline",            labelKey: "product.trustFastDelivery" },
  { icon: "shield-checkmark-outline", labelKey: "product.trustOriginal"     },
  { icon: "refresh-outline",          labelKey: "product.trustReturns"      },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  useScreenTrace("product-detail");
  const { t, i18n } = useTranslation();
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const [qty, setQty] = useState(1);

  const pushRecentlyViewed = useRecentlyViewedStore((s) => s.push);

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
  // withTiming belongs in the setter (handleScroll), not inside useAnimatedStyle —
  // calling it here starts a new animation worklet every frame instead of once on change.
  const stickyHdr  = useAnimatedStyle(() => ({ opacity: headerOpac.value }));

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn:  () => fetchProductById(id!),
    enabled:  !!id,
  });

  // Max quantity the user is allowed to add — capped at live stock.
  const maxQty = product?.inStock ? Math.max(1, Math.ceil(product.stock ?? 0)) : 0;

  // If product reloads with a lower stock than the current qty selector, clamp down.
  useEffect(() => {
    if (maxQty > 0) setQty((q) => Math.min(q, maxQty));
  }, [maxQty]);

  // Persist to the MMKV-backed recently-viewed LRU once the product loads.
  // Lightweight projection (id/name/price/image) — full row stays in the
  // React Query cache and is re-fetched on next view via useProduct.
  useEffect(() => {
    if (!product) return;
    pushRecentlyViewed({
      id:       product.id,
      name:     product.name,
      price:    product.price,
      imageUrl: product.imageUrl,
    });
  }, [product, pushRecentlyViewed]);

  const { data: relatedProductsRaw } = useRelatedProducts(product?.id, 8);
  const relatedProducts = (relatedProductsRaw ?? []).slice(0, 6);

  const rating = deterministicRating(id ?? "");

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const target = e.nativeEvent.contentOffset.y > 300 ? 1 : 0;
    if (headerOpac.value !== target) {
      headerOpac.value = withTiming(target, { duration: 180 });
    }
  }, [headerOpac]);

  const handleAdd = useCallback(() => {
    if (!product) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Restrained 3-leg pop on the unified `press` spring — pop, not bounce
    btnScale.value = withSequence(
      withSpring(0.94, theme.animation.spring.press),
      withSpring(1.04, theme.animation.spring.press),
      withSpring(1.0,  theme.animation.spring.press),
    );
    addItem(product, qty);
  }, [product, qty, addItem, btnScale]);

  const handleWishlist = useCallback(() => {
    if (!product) return;
    (inWishlist
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    ).catch(() => {});
    // Wishlist heart — slightly more pop than cart-add (emotional moment),
    // but still on the unified `press` spring — never bouncy
    hrtScale.value = withSequence(
      withSpring(0.82, theme.animation.spring.press),
      withSpring(1.18, theme.animation.spring.press),
      withSpring(1.0,  theme.animation.spring.press),
    );
    toggleWishlist(product);
  }, [product, inWishlist, hrtScale, toggleWishlist]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>

      {/* ── Sticky mini-header — refined hairline divider ── */}
      <Animated.View
        style={[stickyHdr, {
          position:          "absolute",
          top:               0,
          left:              0,
          right:             0,
          zIndex:            50,
          backgroundColor:   "rgba(255,255,255,0.97)",
          paddingTop:        insets.top,
          paddingHorizontal: 16,
          paddingBottom:     12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border.hairline,
        }]}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 38, height: 38, borderRadius: 12,
              backgroundColor: theme.colors.surfaceSunken,
              alignItems: "center", justifyContent: "center",
            }}>
            <Ionicons name="arrow-forward" size={17} color={theme.colors.slate[700]} />
          </Pressable>
          <UIText variant="body-sm" weight="bold" align="right" numberOfLines={1} style={{ flex: 1 }}>
            {product?.nameAr ?? product?.name ?? ""}
          </UIText>
        </View>
      </Animated.View>

      {/* ── Floating action buttons — premium glass tiles ── */}
      <View style={{ position: "absolute", top: insets.top + 12, right: 16, zIndex: 20, gap: 10 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          style={({ pressed }) => ({
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.97)",
            alignItems: "center", justifyContent: "center",
            opacity: pressed ? 0.86 : 1,
            ...theme.shadow.card,
          })}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.slate[700]} />
        </Pressable>
        {product && (
          <Animated.View style={hrtAnim}>
            <Pressable
              onPress={handleWishlist}
              accessibilityRole="button"
              accessibilityLabel={inWishlist ? t("product.removeFromWishlist") : t("product.addToWishlist")}
              style={({ pressed }) => ({
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: inWishlist ? theme.colors.rose[50] : "rgba(255,255,255,0.97)",
                alignItems: "center", justifyContent: "center",
                opacity: pressed ? 0.86 : 1,
                ...theme.shadow.card,
                borderWidth: inWishlist ? 1 : 0,
                borderColor: theme.colors.rose[100],
              })}>
              <Ionicons
                name={inWishlist ? "heart" : "heart-outline"}
                size={18}
                color={inWishlist ? theme.colors.rose[500] : theme.colors.slate[600]}
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
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, pointerEvents: "none" }}
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
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, pointerEvents: "none" }}
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
              {/* ── Category strip + stock indicator ── */}
              <View style={pdStyles.metaRow}>
                <View style={pdStyles.categoryStrip}>
                  <View style={pdStyles.categoryBar} />
                  <UIText variant="eyebrow" color="brand">
                    {product.categoryName}
                  </UIText>
                </View>
                <Badge variant={product.inStock ? "success" : "error"} size="sm">
                  {product.inStock ? t("product.inStock") : t("product.outOfStock")}
                </Badge>
              </View>

              {/* ── Name — editorial 2-tier ── */}
              <View style={pdStyles.nameStack}>
                <UIText variant="screen-title" align="right" style={pdStyles.nameAr}>
                  {product.nameAr ?? product.name}
                </UIText>
                {product.nameEn && (
                  <UIText variant="body-sm" color="tertiary" align="right" style={pdStyles.nameEn}>
                    {product.nameEn}
                  </UIText>
                )}
              </View>

              {/* ── Rating row — premium hierarchy ── */}
              <View style={pdStyles.ratingRow}>
                <Stars value={rating.value} />
                <UIText variant="body-sm" weight="bold">
                  {rating.value}
                </UIText>
                <UIText variant="caption" color="tertiary">
                  {t("product.ratingCount", { count: rating.count })}
                </UIText>
              </View>

              {/* ── Price + Qty stepper — premium metric typography ── */}
              <View style={pdStyles.priceRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <UIText variant="eyebrow" color="tertiary" align="right">
                    {t("product.priceLabel")}
                  </UIText>
                  <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 6 }}>
                    <UIText variant="metric" align="right" style={pdStyles.priceMetric}>
                      {formatPrice(product.price * qty)}
                    </UIText>
                  </View>
                  {qty > 1 && (
                    <UIText variant="caption" color="tertiary" align="right">
                      {formatPrice(product.price)} × {qty}
                    </UIText>
                  )}
                </View>

                {/* Qty stepper — stock-capped */}
                <View style={{ gap: 4 }}>
                  <View style={pdStyles.stepperWrap}>
                    <Pressable
                      onPress={() => {
                        if (qty >= maxQty) {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
                          return;
                        }
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setQty((q) => Math.min(q + 1, maxQty));
                      }}
                      disabled={qty >= maxQty}
                      style={[pdStyles.stepperBtn, pdStyles.stepperBtnInc, qty >= maxQty && { opacity: 0.45 }]}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </Pressable>
                    <View style={pdStyles.stepperValueWrap}>
                      <UIText variant="card-title" weight="black" style={pdStyles.stepperValue}>
                        {qty}
                      </UIText>
                    </View>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setQty((q) => Math.max(1, q - 1)); }}
                      disabled={qty === 1}
                      style={[pdStyles.stepperBtn, qty === 1 && { opacity: 0.4 }]}>
                      <Ionicons name="remove" size={20} color={theme.colors.slate[600]} />
                    </Pressable>
                  </View>
                  {/* Stock availability indicator */}
                  {product.inStock && product.stock > 0 && product.stock <= 10 && (
                    <UIText
                      variant="eyebrow"
                      align="center"
                      style={{ color: qty >= maxQty ? theme.colors.error.strong : theme.colors.amber[600] }}>
                      {qty >= maxQty
                        ? t("product.stockMax")
                        : t("product.stockRemaining", { count: product.stock })}
                    </UIText>
                  )}
                </View>
              </View>

              {/* ── Trust badges — clinical commitment row ── */}
              <View style={pdStyles.trustRow}>
                {TRUST_BADGES.map((b, i, arr) => (
                  <View
                    key={b.labelKey}
                    style={[
                      pdStyles.trustCell,
                      i < arr.length - 1 && pdStyles.trustCellDivider,
                    ]}>
                    <View style={pdStyles.trustIcon}>
                      <Ionicons name={b.icon} size={18} color={theme.colors.brand[700]} />
                    </View>
                    <UIText variant="eyebrow" color="secondary" align="center" style={pdStyles.trustLabel}>
                      {t(b.labelKey)}
                    </UIText>
                  </View>
                ))}
              </View>

              {/* ── Details card — editorial layout ── */}
              <View style={pdStyles.detailsCard}>
                <View style={pdStyles.detailsHeader}>
                  <UIText variant="eyebrow" color="tertiary" align="right">
                    {t("product.detailsEyebrow")}
                  </UIText>
                  <UIText variant="card-title" align="right" style={pdStyles.detailsTitle}>
                    {t("product.details")}
                  </UIText>
                </View>
                <View style={pdStyles.detailsBody}>
                  <DetailRow label={t("product.code")}        value={product.code    ?? "-"} />
                  <DetailRow label={t("product.barcode")}    value={product.barcode ?? "-"} />
                  <DetailRow label={t("product.category")}  value={product.categoryName ?? "-"} />
                  <DetailRow label={t("product.nameEnLabel")} value={product.nameEn ?? "-"} last />
                </View>
              </View>

              {/* ── Related products — editorial section ── */}
              {relatedProducts.length > 0 && (
                <View style={{ gap: 14 }}>
                  <View style={pdStyles.sectionHeader}>
                    <View style={pdStyles.sectionIcon}>
                      <Ionicons name="grid-outline" size={14} color={theme.colors.brand[700]} />
                    </View>
                    <View>
                      <UIText variant="eyebrow" color="tertiary" align="right">
                        {t("product.relatedEyebrow")}
                      </UIText>
                      <UIText variant="card-title" align="right" style={pdStyles.sectionTitle}>
                        {t("product.relatedTitle")}
                      </UIText>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}>
                    {relatedProducts.map((p) => (
                      <Animated.View key={p.id} entering={FadeIn.duration(240)} style={{ width: 155 }}>
                        <ProductCard
                          product={p}
                          lang={i18n.language === "en" ? "en" : "ar"}
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

      {/* ── Sticky CTA — premium anchor with metric typography ── */}
      {product && (
        <View style={[pdStyles.cta, { paddingBottom: insets.bottom + 14 }]}>
          {inCart && (
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              style={pdStyles.viewCartLink}>
              <Ionicons name="cart-outline" size={14} color={theme.colors.brand[700]} />
              <UIText variant="caption" weight="bold" color="brand">
                {t("product.viewCart")}
              </UIText>
              <Ionicons name="chevron-back" size={12} color={theme.colors.brand[700]} />
            </Pressable>
          )}
          <Animated.View style={btnAnim}>
            <Button
              variant={inCart ? "secondary" : "primary"}
              size="lg"
              fullWidth
              gradient={!inCart}
              disabled={!product.inStock}
              onPress={handleAdd}>
              {inCart
                ? t("product.inCartAddMore")
                : product.inStock
                ? t("product.addWithPrice", { price: formatPrice(product.price * qty) })
                : t("product.unavailable")}
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
    <View style={[pdStyles.detailRow, last && { borderBottomWidth: 0 }]}>
      <UIText variant="body-sm" color="secondary">{label}</UIText>
      <UIText variant="body-sm" weight="bold" align="left" numberOfLines={1} style={pdStyles.detailValue}>
        {value}
      </UIText>
    </View>
  );
}

const pdStyles = StyleSheet.create({
  // ── Category + stock row ─────────────────────────────────────────
  metaRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
  },
  categoryStrip: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           8,
  },
  categoryBar: {
    width:           3,
    height:          16,
    borderRadius:    2,
    backgroundColor: theme.colors.brand[600],
  },

  // ── Name ─────────────────────────────────────────────────────────
  nameStack: {
    gap: 6,
  },
  nameAr: {
    letterSpacing: -0.4,
    lineHeight:    32,
  },
  nameEn: {
    fontStyle: "italic",
  },

  // ── Rating ───────────────────────────────────────────────────────
  ratingRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           8,
  },

  // ── Price + Stepper ─────────────────────────────────────────────
  priceRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            16,
  },
  priceMetric: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.8,
  },
  stepperWrap: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    backgroundColor: theme.colors.surface,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    overflow:        "hidden",
  },
  stepperBtn: {
    width:           44,
    height:          44,
    alignItems:      "center",
    justifyContent:  "center",
  },
  stepperBtnInc: {
    backgroundColor: theme.colors.brand[700],
  },
  stepperValueWrap: {
    minWidth:        44,
    alignItems:      "center",
    justifyContent:  "center",
  },
  stepperValue: {
    letterSpacing: -0.2,
  },

  // ── Trust row ────────────────────────────────────────────────────
  trustRow: {
    flexDirection:    "row-reverse",
    backgroundColor:  theme.colors.surface,
    borderRadius:     18,
    paddingVertical:  16,
    paddingHorizontal: 4,
    ...theme.shadow.card,
  },
  trustCell: {
    flex:       1,
    alignItems: "center",
    gap:        8,
    paddingHorizontal: 4,
  },
  trustCellDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.border.hairline,
  },
  trustIcon: {
    width:           42,
    height:          42,
    borderRadius:    13,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  trustLabel: {
    lineHeight: 13,
  },

  // ── Details card ────────────────────────────────────────────────
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    overflow:        "hidden",
    ...theme.shadow.card,
  },
  detailsHeader: {
    paddingHorizontal: 18,
    paddingVertical:   14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
    gap:               2,
  },
  detailsTitle: {
    letterSpacing: -0.2,
  },
  detailsBody: {
    paddingHorizontal: 18,
  },
  detailRow: {
    flexDirection:    "row-reverse",
    justifyContent:   "space-between",
    alignItems:       "center",
    paddingVertical:  13,
    borderBottomWidth:StyleSheet.hairlineWidth,
    borderBottomColor:theme.colors.border.hairline,
  },
  detailValue: {
    maxWidth: "60%",
  },

  // ── Section header for "Related" ────────────────────────────────
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  sectionIcon: {
    width:           34,
    height:          34,
    borderRadius:    11,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  sectionTitle: {
    letterSpacing: -0.2,
    marginTop:     1,
  },

  // ── Sticky CTA ──────────────────────────────────────────────────
  cta: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingTop:      14,
    gap:             10,
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  theme.colors.border.hairline,
    shadowColor:     "#0C2240",
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.06,
    shadowRadius:    12,
    elevation:       8,
  },
  viewCartLink: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "center",
    gap:            6,
    paddingVertical: 4,
  },
});
