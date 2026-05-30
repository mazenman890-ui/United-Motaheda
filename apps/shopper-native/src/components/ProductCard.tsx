/**
 * ProductCard — Premium Dark-Glass Edition
 *
 * A completely redesigned product card with:
 *   • Deep navy card with glass-edge border
 *   • Gradient "Add to Cart" button (teal → cyan)
 *   • Neon-tinted price in brand color
 *   • Full-height image with dramatic gradient fade
 *   • Elastic spring animations on every interaction
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
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
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { theme } from "@/theme";
import { Text as UIText } from "@/shared/ui";
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

// ─── Rating display (only shown when product has real rating data) ─────────────

function Stars({ value, count, size = 11 }: { value: number; count?: number | null; size?: number }) {
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 3 }}>
      <Ionicons name="star" size={size} color="#F59E0B" />
      <UIText
        style={{
          fontSize:   size - 0.5,
          color:      "#F59E0B",
          fontFamily: theme.fonts.bold,
          lineHeight: size + 2,
        }}>
        {value.toFixed(1)}
        {count != null && count > 0 ? ` (${count})` : ""}
      </UIText>
    </View>
  );
}

// ─── Category → palette mapping ───────────────────────────────────────────────

const CATEGORY_PALETTE: Record<string, [string, string, string]> = {
  "العناية بالشعر":                ["#064e3b", "#065f46", "#10b981"],
  "Hair Care":                     ["#064e3b", "#065f46", "#10b981"],
  "العناية بالبشرة":               ["#3b0764", "#4c1d95", "#a855f7"],
  "Skincare":                      ["#3b0764", "#4c1d95", "#a855f7"],
  "مستحضرات التجميل والمكياج":    ["#500724", "#881337", "#f43f5e"],
  "Cosmetics & Makeup":            ["#500724", "#881337", "#f43f5e"],
  "العناية بالفم والأسنان":        ["#172554", "#1e3a8a", "#3b82f6"],
  "Dental & Oral":                  ["#172554", "#1e3a8a", "#3b82f6"],
  "الفيتامينات والمكملات الغذائية": ["#451a03", "#78350f", "#f59e0b"],
  "Vitamins & Supplements":        ["#451a03", "#78350f", "#f59e0b"],
  "أدوية":                         ["#022c22", "#065c54", "#0db8a8"],
  "Medications":                   ["#022c22", "#065c54", "#0db8a8"],
  "المستلزمات الطبية":             ["#0c1a2e", "#0c2a48", "#0891b2"],
  "Medical Supplies":              ["#0c1a2e", "#0c2a48", "#0891b2"],
  "الرعاية الصحية العامة":         ["#0f172a", "#1e293b", "#64748b"],
  "General Healthcare":            ["#0f172a", "#1e293b", "#64748b"],
  "العناية بالجسم":                ["#431407", "#7c2d12", "#f97316"],
  "Body Care":                     ["#431407", "#7c2d12", "#f97316"],
  "صحة المرأة":                    ["#500724", "#831843", "#ec4899"],
  "Women's Health":                ["#500724", "#831843", "#ec4899"],
  "الأطفال والرضع":                ["#3f3a00", "#713f12", "#eab308"],
  "Baby & Child":                  ["#3f3a00", "#713f12", "#eab308"],
  "العناية بالرجل":                ["#0f172a", "#1e293b", "#475569"],
  "Men's Care":                    ["#0f172a", "#1e293b", "#475569"],
  "العناية بالعيون":               ["#0c1a2e", "#0e3a4a", "#06b6d4"],
  "Eye Care":                      ["#0c1a2e", "#0e3a4a", "#06b6d4"],
};

const DEFAULT_PALETTE: [string, string, string] = ["#0c1a2e", "#0c2a48", "#0891b2"];

function categoryIcon(cat: string): React.ComponentProps<typeof Ionicons>["name"] {
  const c = cat.toLowerCase();
  if (c.includes("hair") || c.includes("شعر"))                              return "sparkles-outline";
  if (c.includes("skin") || c.includes("بشرة"))                             return "leaf-outline";
  if (c.includes("makeup") || c.includes("تجميل") || c.includes("cosmetic"))return "color-palette-outline";
  if (c.includes("dental") || c.includes("أسنان") || c.includes("oral"))    return "medical-outline";
  if (c.includes("vitamin") || c.includes("فيتامين") || c.includes("supplement") || c.includes("مكمل")) return "fitness-outline";
  if (c.includes("medic") || c.includes("دواء") || c.includes("أدوية"))     return "medkit-outline";
  if (c.includes("suppli") || c.includes("مستلزم"))                         return "medkit-outline";
  if (c.includes("body") || c.includes("جسم"))                              return "body-outline";
  if (c.includes("women") || c.includes("مرأة") || c.includes("woman"))     return "heart-outline";
  if (c.includes("baby") || c.includes("طفل") || c.includes("رضيع"))        return "happy-outline";
  if (c.includes("men") || c.includes("رجل") || c.includes("man's"))        return "person-outline";
  if (c.includes("eye") || c.includes("عيون"))                              return "eye-outline";
  if (c.includes("general") || c.includes("رعاية"))                         return "shield-checkmark-outline";
  return "medkit-outline";
}

function ProductImagePlaceholder({ category }: { category: string }) {
  const [bg1, bg2, iconColor] = CATEGORY_PALETTE[category] ?? DEFAULT_PALETTE;
  const iconName = categoryIcon(category);

  return (
    <LinearGradient
      colors={[bg1, bg2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}>
      {/* Corner glow arc */}
      <View style={[styles.placeholderArc, { backgroundColor: iconColor + "18" }]} />
      {/* Centre icon */}
      <View style={styles.placeholderCenter}>
        <View style={[styles.placeholderRing, { borderColor: iconColor + "30" }]}>
          <View style={[styles.placeholderDisc, { backgroundColor: iconColor + "20" }]}>
            <Ionicons name={iconName} size={34} color={iconColor} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

// ─── Animated Pressable ───────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Main Component ───────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
  product,
  onPress,
  lang            = "ar",
  variant         = "grid",
  badge,
  discountPercent,
}: ProductCardProps) {
  const { t } = useTranslation();
  const addItem  = useCartStore((s) => s.addItem);
  const cartQty  = useCartStore(
    (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
  );
  const inCart   = cartQty > 0;

  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const inWishlist     = useWishlistStore((s) => s.has(product.id));

  const [showAdded, setShowAdded] = useState(false);
  const [showMaxed, setShowMaxed] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const cardScale  = useSharedValue(1);
  const btnScale   = useSharedValue(1);
  const hrtScale   = useSharedValue(1);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  // Opacity is static per product — kept outside the worklet so the worklet
  // only reads shared values and never touches the JS closure on the UI thread.
  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const hrtAnim = useAnimatedStyle(() => ({
    transform: [{ scale: hrtScale.value }],
  }));

  const handlePressIn  = () => { cardScale.value = withSpring(0.975, { damping: 20, stiffness: 420 }); };
  const handlePressOut = () => { cardScale.value = withSpring(1.0,   { damping: 18, stiffness: 380 }); };

  const maxQty = product.inStock && product.stock > 0 ? Math.floor(product.stock) : 0;
  const isAtMax = maxQty > 0 && cartQty >= maxQty;

  const handleAddToCart = useCallback(() => {
    if (!product.inStock) return;

    if (isAtMax) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setShowMaxed(true);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { setShowMaxed(false); timerRef.current = null; }, 1400);
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    btnScale.value = withSequence(
      withSpring(0.84, { damping: 18, stiffness: 500 }),
      withSpring(1.12, { damping: 14, stiffness: 380 }),
      withSpring(1.0,  { damping: 18, stiffness: 400 }),
    );
    addItem(product, 1);
    setShowAdded(true);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setShowAdded(false); timerRef.current = null; }, 1500);
  }, [product, addItem, btnScale, isAtMax]);

  const handleWishlist = useCallback(() => {
    if (Platform.OS !== "web") {
      (inWishlist
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      ).catch(() => {});
    }
    // Crisp single-pop: fast dip → near-critically-damped spring that lands
    // precisely at 1.0 with no lingering oscillation.
    // damping ratio ≈ 0.87 (22 / 2√(450×0.4)) → minimal overshoot, snappy.
    hrtScale.value = withSequence(
      withTiming(0.80, { duration: 75 }),
      withSpring(1.0,  { damping: 22, stiffness: 450, mass: 0.4 }),
    );
    toggleWishlist(product);
  }, [product, toggleWishlist, hrtScale, inWishlist]);

  const displayName = lang === "ar"
    ? (product.nameAr ?? product.name)
    : (product.nameEn ?? product.name);

  // Only show ratings when real data exists — never fake a value
  const hasRating = product.ratingAvg != null && product.ratingAvg > 0;
  const isLowStock = product.stock > 0 && product.stock <= 3;
  const origPrice  = resolvedDiscount ? product.price / (1 - resolvedDiscount / 100) : null;

  // Badge — prefer real product flags, fall back to explicit prop, never fake
  const resolvedBadge =
    product.isBestseller ? "hot" :
    product.isNew        ? "new" :
    product.isSale       ? "sale" :
    badge; // explicit override from caller (e.g. deals screen passing "sale")

  // Discount — prefer real field, fall back to caller prop
  const resolvedDiscount = product.discountPercent ?? discountPercent ?? null;

  const badgeMeta =
    resolvedBadge === "new"  ? { label: t("products.badgeNew"),                                               grad: ["#2563EB", "#1D4ED8"] as [string, string] } :
    resolvedBadge === "hot"  ? { label: t("products.badgeBestSeller"),                                        grad: ["#EF4444", "#B91C1C"] as [string, string] } :
    resolvedBadge === "sale" ? { label: t("products.badgeSale", { n: Math.round(resolvedDiscount ?? 0) }),    grad: ["#F59E0B", "#D97706"] as [string, string] } :
    null;

  // ── GRID variant ───────────────────────────────────────────────────────────

  if (variant === "grid") {
    return (
      <AnimatedPressable
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
              transition={150}
            />
          ) : (
            <ProductImagePlaceholder category={product.categoryName} />
          )}

          {/* Dark-fade at bottom — View is cheaper than LinearGradient for
              a decorative overlay that never changes colours */}
          <View style={[styles.imgFade, { pointerEvents: "none" }]} />

          {/* OOS overlay */}
          {!product.inStock && (
            <View style={styles.oosOverlay}>
              <View style={styles.oosPill}>
                <Ionicons name="alert-circle-outline" size={12} color="#94A3B8" />
                <UIText variant="eyebrow" style={styles.oosText}>{t("common.outOfStock")}</UIText>
              </View>
            </View>
          )}

          {/* Low-stock banner */}
          {isLowStock && product.inStock && (
            <View style={styles.lowStockBadge}>
              <Ionicons name="warning" size={10} color="#FCA5A5" />
              <UIText variant="eyebrow" style={styles.lowStockText}>{t("products.lowStockCount", { n: product.stock })}</UIText>
            </View>
          )}

          {/* Cart qty chip */}
          {inCart && (
            <View style={styles.cartChip}>
              <UIText variant="eyebrow" style={styles.cartChipText}>{cartQty}</UIText>
            </View>
          )}

          {/* Feature badge */}
          {badgeMeta && !inCart && (
            <LinearGradient
              colors={badgeMeta.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featureBadge}>
              <UIText variant="eyebrow" style={styles.featureBadgeText}>{badgeMeta.label}</UIText>
            </LinearGradient>
          )}

          {/* Wishlist button */}
          <Animated.View style={[styles.heartWrap, hrtAnim]}>
            <Pressable onPress={handleWishlist} hitSlop={8}
              style={[styles.heartBtn, inWishlist && styles.heartBtnActive]}>
              <Ionicons
                name={inWishlist ? "heart" : "heart-outline"}
                size={14}
                color={inWishlist ? "#F43F5E" : "#94A3B8"}
              />
            </Pressable>
          </Animated.View>

          {/* Added / Maxed flash */}
          {(showAdded || showMaxed) && (
            <Animated.View
              entering={FadeIn.duration(120)}
              exiting={FadeOut.duration(320)}
              style={[styles.flashChip, showMaxed && styles.flashChipMax]}>
              <Ionicons
                name={showMaxed ? "alert-circle" : "checkmark-circle"}
                size={12}
                color={showMaxed ? "#FCA5A5" : "#6EE7B7"}
              />
              <UIText variant="eyebrow" style={[styles.flashText, showMaxed && styles.flashTextMax]}>
                {showMaxed ? t("common.maxQty") : t("products.addedToCart")}
              </UIText>
            </Animated.View>
          )}
        </View>

        {/* ── Info ── */}
        <View style={styles.gridInfo}>
          <UIText variant="eyebrow" align="right" numberOfLines={1} style={styles.categoryLabel}>
            {product.categoryName}
          </UIText>
          <UIText variant="body-sm" weight="bold" align="right" numberOfLines={2} style={styles.productName}>
            {displayName}
          </UIText>

          {/* Stars row — only shown when product has real ratings */}
          {hasRating && (
            <View style={styles.starsRow}>
              <Stars value={product.ratingAvg!} count={product.ratingCount} size={10} />
            </View>
          )}

          {/* Price + Add button */}
          <View style={styles.priceRow}>
            <View style={{ alignItems: "flex-end", gap: 1 }}>
              <View style={styles.priceInner}>
                <UIText variant="card-title" weight="black" style={styles.priceValue}>
                  {product.price.toFixed(2)}
                </UIText>
                <UIText variant="eyebrow" style={styles.priceCurrency}>{t("common.currency")}</UIText>
              </View>
              {!!origPrice && (
                <UIText variant="eyebrow" style={styles.origPrice}>
                  {origPrice.toFixed(0)} {t("common.currency")}
                </UIText>
              )}
            </View>

            {/* Add to Cart CTA */}
            <Animated.View style={[btnAnim, !product.inStock && styles.btnDisabled]}>
              <Pressable
                onPress={handleAddToCart}
                disabled={!product.inStock}
                hitSlop={8}
                style={styles.addBtnWrap}>
                {isAtMax ? (
                  <View style={[styles.addBtn, styles.addBtnLocked]}>
                    <Ionicons name="lock-closed" size={14} color="#FCA5A5" />
                  </View>
                ) : (
                  <View style={[styles.addBtn, showAdded && styles.addBtnSuccess]}>
                    {showAdded ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : inCart ? (
                      <UIText variant="caption" weight="black" style={styles.addBtnQty}>
                        {cartQty}
                      </UIText>
                    ) : (
                      <Ionicons name="add" size={20} color="#fff" />
                    )}
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </AnimatedPressable>
    );
  }

  // ── ROW variant ────────────────────────────────────────────────────────────

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[cardAnim, styles.rowCard]}>

      {/* Thumbnail */}
      <View style={styles.rowThumb}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={150}
          />
        ) : (
          <ProductImagePlaceholder category={product.categoryName} />
        )}
        {badgeMeta && (
          <LinearGradient
            colors={badgeMeta.grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.thumbBadge}>
            <UIText variant="eyebrow" style={styles.featureBadgeText}>{discountPercent}%</UIText>
          </LinearGradient>
        )}
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <UIText variant="eyebrow" align="right" numberOfLines={1} style={styles.categoryLabel}>
          {product.categoryName}
        </UIText>
        <UIText variant="body-sm" weight="bold" align="right" numberOfLines={2} style={styles.rowProductName}>
          {displayName}
        </UIText>
        {hasRating && (
          <View style={[styles.starsRow, { marginTop: 4 }]}>
            <Stars value={product.ratingAvg!} count={product.ratingCount} size={9} />
          </View>
        )}
        <View style={styles.rowPriceRow}>
          <View style={styles.priceInner}>
            <UIText variant="card-title" weight="black" style={styles.priceValue}>
              {product.price.toFixed(2)}
            </UIText>
            <UIText variant="eyebrow" style={styles.priceCurrency}>{t("common.currency")}</UIText>
          </View>
          {!product.inStock && (
            <View style={styles.oosPillSmall}>
              <UIText variant="eyebrow" style={styles.oosText}>{t("common.outOfStock")}</UIText>
            </View>
          )}
        </View>
      </View>

      {/* Row actions */}
      <View style={styles.rowActions}>
        <Animated.View style={hrtAnim}>
          <Pressable onPress={handleWishlist} hitSlop={8}
            style={[styles.rowActionBtn, inWishlist && styles.heartBtnActive]}>
            <Ionicons
              name={inWishlist ? "heart" : "heart-outline"}
              size={16}
              color={inWishlist ? "#F43F5E" : "#64748B"}
            />
          </Pressable>
        </Animated.View>

        <Animated.View style={[btnAnim, !product.inStock && styles.btnDisabled]}>
          <Pressable onPress={handleAddToCart} disabled={!product.inStock} hitSlop={8} style={styles.rowAddWrap}>
            {isAtMax ? (
              <View style={[styles.rowActionBtn, styles.addBtnLocked]}>
                <Ionicons name="lock-closed" size={14} color="#FCA5A5" />
              </View>
            ) : (
              <View style={[styles.rowActionBtn, styles.addBtnBase, showAdded && styles.addBtnSuccess]}>
                {showAdded ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : inCart ? (
                  <UIText variant="caption" weight="black" style={styles.addBtnQty}>{cartQty}</UIText>
                ) : (
                  <Ionicons name="add" size={20} color="#fff" />
                )}
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
// Custom comparator — skip re-render when only `onPress` changes.
// ProductGrid creates a new inline arrow per renderItem call; comparing it
// would always return false and defeat memo entirely.  The actual navigation
// target (product.id) is stable because it is embedded in `product`, which
// we DO compare by reference.
}, (prev, next) =>
  prev.product          === next.product &&
  prev.lang             === next.lang    &&
  prev.variant          === next.variant &&
  prev.badge            === next.badge   &&
  prev.discountPercent  === next.discountPercent,
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = "#FFFFFF";

const styles = StyleSheet.create({
  // ── Grid card ──────────────────────────────────────────────────────────────
  gridCard: {
    backgroundColor: CARD_BG,
    borderRadius:    20,
    overflow:        "hidden",
    borderWidth:     1,
    borderColor:     "rgba(15,23,42,0.07)",
    shadowColor:     "#0C2240",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.10,
    shadowRadius:    14,
    elevation:       5,
  },

  imgBox: {
    height:          172,
    backgroundColor: "#F0F4F8",
    position:        "relative",
  },

  imgFade: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    height:          64,
    // Solid semi-transparent overlay — cheaper than LinearGradient (no GPU
    // gradient shader), provides enough contrast for the info that overlaps.
    backgroundColor: "rgba(5,12,24,0.42)",
  },

  placeholderArc: {
    position:     "absolute",
    top:          -40,
    right:        -40,
    width:        130,
    height:       130,
    borderRadius: 65,
  },
  placeholderCenter: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  placeholderRing: {
    width:        84,
    height:       84,
    borderRadius: 42,
    borderWidth:  1.5,
    alignItems:   "center",
    justifyContent: "center",
  },
  placeholderDisc: {
    width:        72,
    height:       72,
    borderRadius: 36,
    alignItems:   "center",
    justifyContent: "center",
  },

  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,250,252,0.90)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  oosPill: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             5,
    backgroundColor: "#F1F5F9",
    borderRadius:    10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth:     1,
    borderColor:     "#E2E8F0",
  },
  oosPillSmall: {
    backgroundColor: "#F1F5F9",
    borderRadius:    6,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderWidth:     1,
    borderColor:     "#E2E8F0",
  },
  oosText: {
    color:      "#64748B",
    fontSize:   10,
    fontFamily: theme.fonts.bold,
  },

  lowStockBadge: {
    position:        "absolute",
    bottom:          10,
    left:            10,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             4,
    backgroundColor: "rgba(30,10,10,0.82)",
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   5,
    borderWidth:     1,
    borderColor:     "rgba(252,165,165,0.25)",
  },
  lowStockText: {
    color:      "#FCA5A5",
    fontSize:   10,
    fontFamily: theme.fonts.bold,
  },

  cartChip: {
    position:        "absolute",
    top:             10,
    left:            10,
    backgroundColor: "#0891B2",
    borderRadius:    999,
    minWidth:        24,
    height:          24,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 7,
    borderWidth:     2,
    borderColor:     "#fff",
    shadowColor:     "#0891B2",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.55,
    shadowRadius:    6,
    elevation:       4,
  },
  cartChipText: {
    color:      "#fff",
    fontSize:   10,
    fontFamily: theme.fonts.black,
  },

  featureBadge: {
    position:         "absolute",
    top:              10,
    left:             10,
    borderRadius:     8,
    paddingHorizontal: 9,
    paddingVertical:   4,
    overflow:         "hidden",
  },
  featureBadgeText: {
    color:      "#fff",
    fontSize:   9.5,
    fontFamily: theme.fonts.black,
    letterSpacing: 0.3,
  },

  heartWrap: {
    position: "absolute",
    top:      10,
    right:    10,
  },
  heartBtn: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(15,23,42,0.08)",
    overflow:        "hidden",
    shadowColor:     "#0C2240",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  // Soft rose tint when favourited — elegant, not aggressively red
  heartBtnActive: {
    backgroundColor: "#FFF0F3",
    borderColor:     "#FECDD3",
  },

  flashChip: {
    position:          "absolute",
    bottom:            10,
    right:             10,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   "rgba(6,30,48,0.88)",
    borderRadius:      9,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       "rgba(14,184,168,0.30)",
  },
  flashChipMax: {
    borderColor:     "rgba(252,165,165,0.30)",
    backgroundColor: "rgba(60,10,10,0.88)",
  },
  flashText: {
    color:      "#6EE7B7",
    fontSize:   10,
    fontFamily: theme.fonts.bold,
  },
  flashTextMax: {
    color: "#FCA5A5",
  },

  // Info section
  gridInfo: {
    padding: 14,
    gap:     5,
    backgroundColor: CARD_BG,
  },
  categoryLabel: {
    color:      "#94A3B8",
    fontSize:   9.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily: theme.fonts.bold,
  },
  productName: {
    color:      "#0F172A",
    lineHeight: 20,
    minHeight:  40,
    fontSize:   13.5,
  },
  starsRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           5,
    marginTop:     1,
  },
  ratingText: {
    color:      "#94A3B8",
    fontSize:   10,
    fontFamily: theme.fonts.regular,
  },
  priceRow: {
    flexDirection:  "row-reverse",
    alignItems:     "flex-end",
    justifyContent: "space-between",
    marginTop:      8,
  },
  priceInner: {
    flexDirection:  "row-reverse",
    alignItems:     "baseline",
    gap:            3,
  },
  priceValue: {
    color:         "#0A9A8C",
    fontSize:      18,
    letterSpacing: -0.5,
    fontFamily:    theme.fonts.black,
  },
  priceCurrency: {
    color:      "#0DB8A8",
    fontSize:   11,
    fontFamily: theme.fonts.bold,
  },
  origPrice: {
    color:              "#94A3B8",
    textDecorationLine: "line-through",
    fontSize:           10,
    fontFamily:         theme.fonts.regular,
  },

  addBtnWrap: {
    borderRadius: 14,
    overflow:     "hidden",
  },
  addBtn: {
    width:           40,
    height:          40,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
    // Default teal background — replaces the LinearGradient.
    // Using a flat colour is dramatically cheaper on both iOS (Metal) and
    // Android (canvas): no shader compilation, no per-frame gradient draw.
    backgroundColor: "#0DB8A8",
  },
  addBtnSuccess: {
    // Swap to green when "added" flash is showing
    backgroundColor: "#059669",
  },
  // Base teal for ROW variant buttons (rowActionBtn has its own bg, so we
  // need to explicitly override it here)
  addBtnBase: {
    backgroundColor: "#0DB8A8",
    borderColor:     "#0891B2",
  },
  // Applied to btnAnim wrapper when product is out-of-stock — keeps the
  // opacity computation out of the Reanimated worklet (pure JS, no UI thread)
  btnDisabled: {
    opacity: 0.4,
  },
  addBtnLocked: {
    backgroundColor: "#FEF2F2",
    borderWidth:     1,
    borderColor:     "#FECACA",
  },
  addBtnQty: {
    color:      "#fff",
    fontSize:   13,
    fontFamily: theme.fonts.black,
  },

  // ── Row variant ────────────────────────────────────────────────────────────
  rowCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             14,
    backgroundColor: CARD_BG,
    borderRadius:    18,
    padding:         14,
    borderWidth:     1,
    borderColor:     "rgba(15,23,42,0.07)",
    shadowColor:     "#0C2240",
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.08,
    shadowRadius:    10,
    elevation:       4,
  },
  rowThumb: {
    width:        86,
    height:       86,
    borderRadius: 16,
    overflow:     "hidden",
    backgroundColor: "#F0F4F8",
    position:     "relative",
  },
  thumbBadge: {
    position:         "absolute",
    top:              4,
    right:            4,
    borderRadius:     6,
    paddingHorizontal: 5,
    paddingVertical:   2,
    overflow:         "hidden",
  },
  rowInfo: {
    flex: 1,
    gap:  3,
  },
  rowProductName: {
    color:      "#0F172A",
    fontSize:   14,
    lineHeight: 20,
  },
  rowPriceRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      6,
  },
  rowActions: {
    gap:        10,
    alignItems: "center",
  },
  rowAddWrap: {
    borderRadius: 12,
    overflow:     "hidden",
  },
  rowActionBtn: {
    width:          38,
    height:         38,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.05)",
    borderWidth:    1,
    borderColor:    "rgba(15,23,42,0.07)",
    overflow:       "hidden",
  },
});
