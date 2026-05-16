import React, { memo, useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { theme } from "@/theme";
import { Badge } from "./ui/Badge";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import type { NativeProduct } from "@/services/productsApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product:          NativeProduct;
  onPress?:         () => void;
  lang?:            "ar" | "en";
  variant?:         "grid" | "row";
  badge?:           "new" | "hot" | "sale";
  discountPercent?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deterministicRating(id: string): { value: number; count: number } {
  const n = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return {
    value: Math.round((3.6 + (n % 14) / 10) * 10) / 10,
    count: 22 + (n % 170),
  };
}

function Stars({ value, size = 11 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row-reverse", gap: 1.5 }}>
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Component ────────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
  product,
  onPress,
  lang            = "ar",
  variant         = "grid",
  badge,
  discountPercent,
}: ProductCardProps) {
  const addItem   = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const inCart    = cartItems.some((i) => i.productId === product.id);
  const cartQty   = cartItems.find((i) => i.productId === product.id)?.quantity ?? 0;

  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const inWishlist     = useWishlistStore((s) => s.has(product.id));

  const [showAdded, setShowAdded] = useState(false);
  const scale    = useSharedValue(1);
  const btnScale = useSharedValue(1);
  const hrtScale = useSharedValue(1);

  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const btnAnim  = useAnimatedStyle(() => ({
    transform:       [{ scale: btnScale.value }],
    backgroundColor: showAdded ? theme.colors.brand[600] : theme.colors.brand[50],
  }));
  const hrtAnim  = useAnimatedStyle(() => ({ transform: [{ scale: hrtScale.value }] }));

  const handlePressIn  = () => { scale.value = withSpring(0.97, theme.animation.spring.snappy); };
  const handlePressOut = () => { scale.value = withSpring(1.0,  theme.animation.spring.snappy); };

  const handleAddToCart = useCallback(() => {
    if (!product.inStock) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    btnScale.value = withSequence(
      withSpring(0.80, theme.animation.spring.stiff),
      withSpring(1.18, theme.animation.spring.bouncy),
      withSpring(1.0,  theme.animation.spring.default),
    );
    addItem(product, 1);
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 1400);
  }, [product, addItem, btnScale]);

  const handleWishlist = useCallback(() => {
    if (Platform.OS !== "web") {
      (inWishlist
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      ).catch(() => {});
    }
    hrtScale.value = withSequence(
      withSpring(0.72, theme.animation.spring.stiff),
      withSpring(1.32, theme.animation.spring.bouncy),
      withSpring(1.0,  theme.animation.spring.default),
    );
    toggleWishlist(product);
  }, [product, toggleWishlist, hrtScale, inWishlist]);

  const displayName = lang === "ar"
    ? (product.nameAr ?? product.name)
    : (product.nameEn ?? product.name);

  const rating      = deterministicRating(product.id);
  const isLowStock  = product.stock > 0 && product.stock <= 3;
  const origPrice   = discountPercent ? product.price / (1 - discountPercent / 100) : null;

  const badgeMeta =
    badge === "new"  ? { label: "جديد",                       bg: "#EEF2FF", color: "#4F46E5" } :
    badge === "hot"  ? { label: "الأكثر مبيعاً",               bg: "#FEF2F2", color: "#DC2626" } :
    badge === "sale" ? { label: `${discountPercent ?? 0}% خصم`, bg: "#FFFBEB", color: "#B45309" } :
    null;

  // ── Grid variant ───────────────────────────────────────────────────────────
  if (variant === "grid") {
    return (
      <AnimatedPressable
        entering={FadeIn.duration(220)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[cardAnim, styles.gridCard]}>

        {/* ── Image area ── */}
        <View style={styles.imgBox}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              transition={240}
            />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Ionicons name="medkit-outline" size={38} color={theme.colors.slate[300]} />
            </View>
          )}

          {/* Gradient fade at bottom */}
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.92)"]}
            style={styles.imgGrad}
            pointerEvents="none"
          />

          {/* Out of stock overlay */}
          {!product.inStock && (
            <View style={styles.oos}>
              <View style={styles.oosPill}>
                <Ionicons name="alert-circle-outline" size={13} color={theme.colors.slate[500]} />
                <Text style={styles.oosText}>نفذ المخزون</Text>
              </View>
            </View>
          )}

          {/* Low stock warning */}
          {isLowStock && product.inStock && (
            <View style={styles.lowStockPill}>
              <Text style={styles.lowStockText}>آخر {product.stock} قطع!</Text>
            </View>
          )}

          {/* Cart qty badge */}
          {inCart && (
            <Animated.View entering={FadeIn.duration(160)} style={styles.qtyBadge}>
              <Text style={styles.qtyText}>{cartQty}</Text>
            </Animated.View>
          )}

          {/* Feature badge (top-left) – conflicts with qty badge so only when not in cart */}
          {badgeMeta && !inCart && (
            <View style={[styles.topBadge, { backgroundColor: badgeMeta.bg }]}>
              <Text style={[styles.topBadgeText, { color: badgeMeta.color }]}>{badgeMeta.label}</Text>
            </View>
          )}

          {/* Wishlist button (top-right) */}
          <Animated.View style={[styles.heartBtn, hrtAnim]}>
            <Pressable
              onPress={handleWishlist}
              hitSlop={8}
              style={[styles.heartPressable, inWishlist && styles.heartActive]}>
              <Ionicons
                name={inWishlist ? "heart" : "heart-outline"}
                size={14}
                color={inWishlist ? theme.colors.rose[500] : theme.colors.slate[400]}
              />
            </Pressable>
          </Animated.View>

          {/* "Added!" flash confirmation */}
          {showAdded && (
            <Animated.View
              entering={FadeIn.duration(120)}
              exiting={FadeOut.duration(350)}
              style={styles.addedFlash}>
              <Ionicons name="checkmark-circle" size={12} color={theme.colors.brand[600]} />
              <Text style={styles.addedFlashText}>تمت الإضافة ✓</Text>
            </Animated.View>
          )}
        </View>

        {/* ── Info ── */}
        <View style={styles.gridInfo}>
          <Text style={styles.catLabel} numberOfLines={1}>{product.categoryName}</Text>
          <Text style={styles.nameLabel} numberOfLines={2}>{displayName}</Text>

          {/* Rating stars */}
          <View style={styles.ratingRow}>
            <Stars value={rating.value} />
            <Text style={styles.ratingCount}>{rating.value} ({rating.count})</Text>
          </View>

          {/* Price + Add button */}
          <View style={styles.priceRow}>
            <View style={{ alignItems: "flex-end", gap: 1 }}>
              <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 2 }}>
                <Text style={styles.price}>{product.price.toFixed(2)}</Text>
                <Text style={styles.priceCur}>ج.م</Text>
              </View>
              {origPrice && (
                <Text style={styles.origPrice}>{origPrice.toFixed(0)} ج.م</Text>
              )}
            </View>
            <Animated.View style={[btnAnim, styles.addBtn]}>
              <Pressable onPress={handleAddToCart} disabled={!product.inStock} hitSlop={8}>
                {showAdded ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : inCart ? (
                  <Text style={styles.addBtnQty}>{cartQty}</Text>
                ) : (
                  <Ionicons name="add" size={18} color={theme.colors.brand[600]} />
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // ── Row variant ────────────────────────────────────────────────────────────
  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[cardAnim, styles.rowCard]}>

      <View style={styles.rowThumb}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Ionicons name="medkit-outline" size={28} color={theme.colors.slate[300]} />
          </View>
        )}
        {badgeMeta && (
          <View style={[styles.thumbBadge, { backgroundColor: badgeMeta.bg }]}>
            <Text style={[styles.thumbBadgeText, { color: badgeMeta.color }]}>{discountPercent}%</Text>
          </View>
        )}
      </View>

      <View style={styles.rowInfo}>
        <Text style={styles.catLabel} numberOfLines={1}>{product.categoryName}</Text>
        <Text style={[styles.nameLabel, { fontSize: theme.fontSize.md, lineHeight: 20 }]} numberOfLines={2}>{displayName}</Text>
        <View style={[styles.ratingRow, { marginTop: 2 }]}>
          <Stars value={rating.value} size={10} />
          <Text style={styles.ratingCount}>({rating.count})</Text>
        </View>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
          <View>
            <Text style={styles.price}>
              {product.price.toFixed(2)} <Text style={styles.priceCur}>ج.م</Text>
            </Text>
            {origPrice && <Text style={styles.origPrice}>{origPrice.toFixed(0)} ج.م</Text>}
          </View>
          {!product.inStock && <Badge variant="neutral" size="sm">نفذ</Badge>}
        </View>
      </View>

      <View style={styles.rowActions}>
        <Animated.View style={hrtAnim}>
          <Pressable
            onPress={handleWishlist}
            hitSlop={6}
            style={[styles.rowActionBtn, inWishlist && styles.rowActionBtnHeart]}>
            <Ionicons
              name={inWishlist ? "heart" : "heart-outline"}
              size={16}
              color={inWishlist ? theme.colors.rose[500] : theme.colors.slate[400]}
            />
          </Pressable>
        </Animated.View>
        <Animated.View style={[btnAnim, styles.rowActionBtn]}>
          <Pressable onPress={handleAddToCart} disabled={!product.inStock} hitSlop={6}>
            {showAdded ? (
              <Ionicons name="checkmark" size={18} color="#fff" />
            ) : inCart ? (
              <Text style={styles.addBtnQty}>{cartQty}</Text>
            ) : (
              <Ionicons name="add" size={18} color={theme.colors.brand[600]} />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* ── Grid ── */
  gridCard:        { backgroundColor: theme.colors.surface, borderRadius: theme.layout.cardRadius, overflow: "hidden", ...theme.shadow.md, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border.medium },
  imgBox:          { height: 165, backgroundColor: theme.colors.subtle, position: "relative" },
  imgGrad:         { position: "absolute", bottom: 0, left: 0, right: 0, height: 56 },
  imgPlaceholder:  { flex: 1, alignItems: "center", justifyContent: "center" },

  oos:             { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(248,250,252,0.90)", alignItems: "center", justifyContent: "center" },
  oosPill:         { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: theme.colors.slate[100], borderRadius: 9, paddingHorizontal: 10, paddingVertical: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.slate[200] },
  oosText:         { fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.slate[500] },

  lowStockPill:    { position: "absolute", bottom: 6, left: 6, backgroundColor: "#FEF2F2", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: "#FECDD3" },
  lowStockText:    { fontSize: 9, fontFamily: theme.fonts.black, color: "#DC2626" },

  qtyBadge:        { position: "absolute", top: 8, left: 8, backgroundColor: theme.colors.brand[600], borderRadius: theme.radius.full, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  qtyText:         { color: "#fff", fontSize: 10, fontFamily: theme.fonts.black },

  topBadge:        { position: "absolute", top: 8, left: 8, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3 },
  topBadgeText:    { fontSize: 9, fontFamily: theme.fonts.black, letterSpacing: 0.3 },

  heartBtn:        { position: "absolute", top: 8, right: 8 },
  heartPressable:  { width: 30, height: 30, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border.medium, ...theme.shadow.sm },
  heartActive:     { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" },

  addedFlash:      { position: "absolute", bottom: 6, right: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.colors.brand[100], ...theme.shadow.sm },
  addedFlashText:  { fontSize: 10, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },

  gridInfo:        { padding: 12, gap: 4 },
  catLabel:        { fontSize: 9.5, fontFamily: theme.fonts.semibold, color: theme.colors.text.tertiary, textAlign: "right", letterSpacing: 0.4 },
  nameLabel:       { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: "right", lineHeight: 18 },
  ratingRow:       { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  ratingCount:     { fontSize: 9, fontFamily: theme.fonts.regular, color: theme.colors.text.tertiary },
  priceRow:        { flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 },
  price:           { fontSize: 15, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },
  priceCur:        { fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.brand[600] },
  origPrice:       { fontSize: 10, fontFamily: theme.fonts.regular, color: theme.colors.text.tertiary, textDecorationLine: "line-through", textAlign: "right" },
  addBtn:          { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  addBtnQty:       { fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },

  /* ── Row ── */
  rowCard:             { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.layout.cardRadius, padding: 12, ...theme.shadow.card, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border.medium },
  rowThumb:            { width: 82, height: 82, borderRadius: theme.radius.xl, overflow: "hidden", backgroundColor: theme.colors.subtle, position: "relative" },
  thumbBadge:          { position: "absolute", top: 4, right: 4, borderRadius: 5, paddingHorizontal: 4, paddingVertical: 2 },
  thumbBadgeText:      { fontSize: 8, fontFamily: theme.fonts.black },
  rowInfo:             { flex: 1, gap: 2 },
  rowActions:          { gap: 8, alignItems: "center" },
  rowActionBtn:        { width: 36, height: 36, borderRadius: theme.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.brand[50], borderWidth: 1, borderColor: theme.colors.brand[100] },
  rowActionBtnHeart:   { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" },
});
