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

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
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
import { theme } from "@/shared/theme";
import { Text as UIText } from "@/shared/ui";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import type { NativeProduct } from "@/services/productsApi";
import { flexRow, isRtl } from "@/utils/layout";

const _isRtl = isRtl();

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
    <View style={{ flexDirection: flexRow(_isRtl), alignItems: "center", gap: 3 }}>
      <Ionicons name="star" size={size} color={theme.colors.amber[500]} />
      <UIText
        style={{
          fontSize:   size - 0.5,
          color:      theme.colors.amber[500],
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
  "مستحضرات التجميل والمكياج":    ["#500724", "#881337", theme.colors.rose[500]],
  "Cosmetics & Makeup":            ["#500724", "#881337", theme.colors.rose[500]],
  "العناية بالفم والأسنان":        ["#172554", "#1e3a8a", "#3b82f6"],
  "Dental & Oral":                  ["#172554", "#1e3a8a", "#3b82f6"],
  "الفيتامينات والمكملات الغذائية": ["#451a03", theme.colors.amber[900], theme.colors.amber[500]],
  "Vitamins & Supplements":        ["#451a03", theme.colors.amber[900], theme.colors.amber[500]],
  "أدوية":                         ["#022c22", theme.colors.teal[800], theme.colors.teal[500]],
  "Medications":                   ["#022c22", theme.colors.teal[800], theme.colors.teal[500]],
  "المستلزمات الطبية":             ["#0c1a2e", "#0c2a48", theme.colors.brand[600]],
  "Medical Supplies":              ["#0c1a2e", "#0c2a48", theme.colors.brand[600]],
  "الرعاية الصحية العامة":         [theme.colors.slate[900], theme.colors.slate[800], theme.colors.slate[500]],
  "General Healthcare":            [theme.colors.slate[900], theme.colors.slate[800], theme.colors.slate[500]],
  "العناية بالجسم":                ["#431407", "#7c2d12", "#f97316"],
  "Body Care":                     ["#431407", "#7c2d12", "#f97316"],
  "صحة المرأة":                    ["#500724", "#831843", "#ec4899"],
  "Women's Health":                ["#500724", "#831843", "#ec4899"],
  "الأطفال والرضع":                ["#3f3a00", "#713f12", "#eab308"],
  "Baby & Child":                  ["#3f3a00", "#713f12", "#eab308"],
  "العناية بالرجل":                [theme.colors.slate[900], theme.colors.slate[800], theme.colors.slate[600]],
  "Men's Care":                    [theme.colors.slate[900], theme.colors.slate[800], theme.colors.slate[600]],
  "العناية بالعيون":               ["#0c1a2e", "#0e3a4a", theme.colors.brand[500]],
  "Eye Care":                      ["#0c1a2e", "#0e3a4a", theme.colors.brand[500]],
};

const DEFAULT_PALETTE: [string, string, string] = ["#0c1a2e", "#0c2a48", theme.colors.brand[600]];

// ─── Card-specific palette (glass/overlay values without theme tokens) ────────
// These intentional design values appear on image/dark backgrounds where theme
// surface tokens don't apply — they are approved glass-surface constants.
const CARD = {
  // Dark slate overlay borders
  border05:       "rgba(15,23,42,0.05)",
  border07:       "rgba(15,23,42,0.07)",
  border08:       "rgba(15,23,42,0.08)",
  // Image overlays
  imgFade:        "rgba(5,12,24,0.42)",   // dark bottom-fade on image
  oosScrim:       "rgba(248,250,252,0.90)", // OOS scrim over image
  // Low-stock badge (dark red tint on image)
  lowStockBg:     "rgba(30,10,10,0.82)",
  lowStockBorder: "rgba(252,165,165,0.25)",
  // Heart button glass surface
  heartBg:        "rgba(255,255,255,0.95)",
  // Flash feedback chips
  flashBg:        "rgba(6,30,48,0.88)",
  flashErrBg:     "rgba(60,10,10,0.88)",
  flashTeal:      "rgba(14,184,168,0.30)",
  flashRose:      "rgba(252,165,165,0.30)",
  // Accent colours without palette tokens
  rose300:        "#FCA5A5",   // rose-300 — error/max state on dark bg
  teal200:        "#6EE7B7",   // teal-200  — add-to-cart flash text
  successGreen:   "#059669",   // emerald-600 — add-to-cart success bg
} as const;

// NEW badge gradient — bright blue, no theme palette token
const NEW_BADGE_GRADIENT: [string, string] = ["#2563EB", "#1D4ED8"];

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
      <View style={[styles.placeholderArc, { backgroundColor: iconColor + "18" }]} />
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

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const hrtAnim = useAnimatedStyle(() => ({
    transform: [{ scale: hrtScale.value }],
  }));

  // 0.97 — matches Button's canonical press value; `press` spring is tuned for
  // a decisive click feel without bounce. Runs 100% on the UI thread.
  const handlePressIn  = () => { cardScale.value = withSpring(0.97, theme.animation.spring.press); };
  const handlePressOut = () => { cardScale.value = withSpring(1,    theme.animation.spring.press); };

  const maxQty  = product.inStock && product.stock > 0 ? Math.floor(product.stock) : 0;
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
    hrtScale.value = withSequence(
      withTiming(0.80, { duration: 75 }),
      withSpring(1.0,  { damping: 22, stiffness: 450, mass: 0.4 }),
    );
    toggleWishlist(product);
  }, [product, toggleWishlist, hrtScale, inWishlist]);

  const displayName = lang === "ar"
    ? (product.nameAr ?? product.name)
    : (product.nameEn ?? product.name);

  const hasRating   = product.ratingAvg != null && product.ratingAvg > 0;
  const isLowStock  = product.stock > 0 && product.stock <= 3;

  const resolvedDiscount = product.discountPercent ?? discountPercent ?? null;
  const origPrice        = resolvedDiscount ? product.price / (1 - resolvedDiscount / 100) : null;

  const resolvedBadge =
    product.isBestseller ? "hot" :
    product.isNew        ? "new" :
    product.isSale       ? "sale" :
    badge;

  const badgeMeta =
    resolvedBadge === "new"  ? { label: t("products.badgeNew"),                                              grad: NEW_BADGE_GRADIENT } :
    resolvedBadge === "hot"  ? { label: t("products.badgeBestSeller"),                                       grad: [theme.colors.red[500], theme.colors.red[700]] as [string, string] } :
    resolvedBadge === "sale" ? { label: t("products.badgeSale", { n: Math.round(resolvedDiscount ?? 0) }),   grad: [theme.colors.amber[500], theme.colors.amber[600]] as [string, string] } :
    null;

  // ── GRID variant ───────────────────────────────────────────────────────────

  if (variant === "grid") {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[cardAnim, styles.gridCard]}>

        <View style={styles.imgBox}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={100}
            />
          ) : (
            <ProductImagePlaceholder category={product.categoryName} />
          )}

          <View style={[styles.imgFade, { pointerEvents: "none" }]} />

          {!product.inStock && (
            <View style={styles.oosOverlay}>
              <View style={styles.oosPill}>
                <Ionicons name="alert-circle-outline" size={12} color={theme.colors.slate[400]} />
                <UIText variant="eyebrow" style={styles.oosText}>{t("common.outOfStock")}</UIText>
              </View>
            </View>
          )}

          {isLowStock && product.inStock && (
            <View style={styles.lowStockBadge}>
              <Ionicons name="warning" size={10} color={CARD.rose300} />
              <UIText variant="eyebrow" style={styles.lowStockText}>
                {t("products.lowStockCount", { n: product.stock })}
              </UIText>
            </View>
          )}

          {inCart && (
            <View style={styles.cartChip}>
              <UIText variant="eyebrow" style={styles.cartChipText}>{cartQty}</UIText>
            </View>
          )}

          {badgeMeta && !inCart && (
            <LinearGradient
              colors={badgeMeta.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.featureBadge}>
              <UIText variant="eyebrow" style={styles.featureBadgeText}>{badgeMeta.label}</UIText>
            </LinearGradient>
          )}

          <Animated.View style={[styles.heartWrap, hrtAnim]}>
            <Pressable onPress={handleWishlist} hitSlop={8}
              style={[styles.heartBtn, inWishlist && styles.heartBtnActive]}>
              <Ionicons
                name={inWishlist ? "heart" : "heart-outline"}
                size={14}
                color={inWishlist ? theme.colors.rose[500] : theme.colors.slate[400]}
              />
            </Pressable>
          </Animated.View>

          {(showAdded || showMaxed) && (
            <Animated.View
              entering={FadeIn.duration(120)}
              exiting={FadeOut.duration(320)}
              style={[styles.flashChip, showMaxed && styles.flashChipMax]}>
              <Ionicons
                name={showMaxed ? "alert-circle" : "checkmark-circle"}
                size={12}
                color={showMaxed ? CARD.rose300 : CARD.teal200}
              />
              <UIText variant="eyebrow" style={[styles.flashText, showMaxed && styles.flashTextMax]}>
                {showMaxed ? t("common.maxQty") : t("products.addedToCart")}
              </UIText>
            </Animated.View>
          )}
        </View>

        <View style={styles.gridInfo}>
          <UIText variant="eyebrow" align="right" numberOfLines={1} style={styles.categoryLabel}>
            {product.categoryName}
          </UIText>
          <UIText variant="body-sm" weight="bold" align="right" numberOfLines={2} style={styles.productName}>
            {displayName}
          </UIText>

          {hasRating && (
            <View style={styles.starsRow}>
              <Stars value={product.ratingAvg!} count={product.ratingCount} size={10} />
            </View>
          )}

          {/* ── Price + button row ───────────────────────────────────────────
               Deleted wrappers:
                 - <View priceCol>  (extra column grouper)
                 - <View priceInner> (extra row grouper for value+currency)
                 - <Animated.View><Pressable><View addBtn> chain →
                   collapsed to single AnimatedPressable with addBtn styles
               Two layers removed from the tree. */}
          <View style={styles.priceRow}>

            {/* Price value + currency in a direct row-reverse sub-group */}
            <View style={styles.priceGroup}>
              <View style={styles.priceAmountRow}>
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

            {/* Add-to-cart: Animated.View+Pressable+View → single AnimatedPressable */}
            <AnimatedPressable
              onPress={handleAddToCart}
              disabled={!product.inStock}
              hitSlop={8}
              style={[
                btnAnim,
                isAtMax ? [styles.addBtn, styles.addBtnLocked]
                        : [styles.addBtn, showAdded && styles.addBtnSuccess],
                !product.inStock && styles.btnDisabled,
              ]}>
              {isAtMax ? (
                <Ionicons name="lock-closed" size={14} color={CARD.rose300} />
              ) : showAdded ? (
                <Ionicons name="checkmark" size={18} color={theme.colors.surface} />
              ) : inCart ? (
                <UIText variant="caption" weight="black" style={styles.addBtnQty}>
                  {cartQty}
                </UIText>
              ) : (
                <Ionicons name="add" size={20} color={theme.colors.surface} />
              )}
            </AnimatedPressable>

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

      <View style={styles.rowThumb}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
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

      <View style={styles.rowInfo}>
        <UIText variant="eyebrow" align="right" numberOfLines={1} style={styles.categoryLabel}>
          {product.categoryName}
        </UIText>
        <UIText variant="body-sm" weight="bold" align="right" numberOfLines={2} style={styles.rowProductName}>
          {displayName}
        </UIText>
        {hasRating && (
          <View style={[styles.starsRow, { marginTop: theme.spacing.xs }]}>
            <Stars value={product.ratingAvg!} count={product.ratingCount} size={9} />
          </View>
        )}
        <View style={styles.rowPriceRow}>
          {/* Row variant: priceInner replaced with priceAmountRow (same rename as grid) */}
          <View style={styles.priceAmountRow}>
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

      <View style={styles.rowActions}>
        <Animated.View style={hrtAnim}>
          <Pressable onPress={handleWishlist} hitSlop={8}
            style={[styles.rowActionBtn, inWishlist && styles.heartBtnActive]}>
            <Ionicons
              name={inWishlist ? "heart" : "heart-outline"}
              size={16}
              color={inWishlist ? theme.colors.rose[500] : theme.colors.slate[500]}
            />
          </Pressable>
        </Animated.View>

        <Animated.View style={[btnAnim, !product.inStock && styles.btnDisabled]}>
          <Pressable onPress={handleAddToCart} disabled={!product.inStock} hitSlop={8} style={styles.rowAddWrap}>
            {isAtMax ? (
              <View style={[styles.rowActionBtn, styles.addBtnLocked]}>
                <Ionicons name="lock-closed" size={14} color={CARD.rose300} />
              </View>
            ) : (
              <View style={[styles.rowActionBtn, styles.addBtnBase, showAdded && styles.addBtnSuccess]}>
                {showAdded ? (
                  <Ionicons name="checkmark" size={18} color={theme.colors.surface} />
                ) : inCart ? (
                  <UIText variant="caption" weight="black" style={styles.addBtnQty}>{cartQty}</UIText>
                ) : (
                  <Ionicons name="add" size={20} color={theme.colors.surface} />
                )}
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
// Custom comparator — skip re-render when only `onPress` changes.
// FlashList creates a new inline arrow per renderItem call; comparing it
// would always return false and defeat memo entirely. The actual navigation
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

const styles = StyleSheet.create({
  // ── Grid card ──────────────────────────────────────────────────────────────
  gridCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    20,
    overflow:        "hidden",
    borderWidth:     1,
    borderColor:     CARD.border07,
    shadowColor:     theme.colors.hero,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.10,
    shadowRadius:    14,
    elevation:       5,
  },

  imgBox: {
    height:          172,
    backgroundColor: theme.colors.subtle,
    position:        "relative",
  },

  imgFade: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    height:          64,
    backgroundColor: CARD.imgFade,
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
    width:          84,
    height:         84,
    borderRadius:   42,
    borderWidth:    1.5,
    alignItems:     "center",
    justifyContent: "center",
  },
  placeholderDisc: {
    width:          72,
    height:         72,
    borderRadius:   36,
    alignItems:     "center",
    justifyContent: "center",
  },

  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: CARD.oosScrim,
    alignItems:      "center",
    justifyContent:  "center",
  },
  oosPill: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   theme.colors.slate[100],
    borderRadius:      10,
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   7,
    borderWidth:       1,
    borderColor:       theme.colors.slate[200],
  },
  oosPillSmall: {
    backgroundColor:   theme.colors.slate[100],
    borderRadius:      6,
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderWidth:       1,
    borderColor:       theme.colors.slate[200],
  },
  oosText: {
    color:      theme.colors.slate[500],
    fontSize:   10,
    fontFamily: theme.fonts.bold,
  },

  lowStockBadge: {
    position:          "absolute",
    bottom:            10,
    left:              10,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               theme.spacing.xs,
    backgroundColor:   CARD.lowStockBg,
    borderRadius:      8,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       CARD.lowStockBorder,
  },
  lowStockText: {
    color:      CARD.rose300,
    fontSize:   10,
    fontFamily: theme.fonts.bold,
  },

  cartChip: {
    position:          "absolute",
    top:               10,
    left:              10,
    backgroundColor:   theme.colors.brand[600],
    borderRadius:      999,
    minWidth:          24,
    height:            24,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 7,
    borderWidth:       2,
    borderColor:       theme.colors.surface,
    shadowColor:       theme.colors.brand[600],
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.55,
    shadowRadius:      6,
    elevation:         4,
  },
  cartChipText: {
    color:      theme.colors.surface,
    fontSize:   10,
    fontFamily: theme.fonts.black,
  },

  featureBadge: {
    position:          "absolute",
    top:               10,
    left:              10,
    borderRadius:      8,
    paddingHorizontal: 9,
    paddingVertical:   theme.spacing.xs,
    overflow:          "hidden",
  },
  featureBadgeText: {
    color:         theme.colors.surface,
    fontSize:      9.5,
    fontFamily:    theme.fonts.black,
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
    backgroundColor: CARD.heartBg,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     CARD.border08,
    overflow:        "hidden",
    shadowColor:     theme.colors.hero,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  heartBtnActive: {
    backgroundColor: theme.colors.rose[50],
    borderColor:     theme.colors.rose[100],
  },

  flashChip: {
    position:          "absolute",
    bottom:            10,
    right:             10,
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   CARD.flashBg,
    borderRadius:      9,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       CARD.flashTeal,
  },
  flashChipMax: {
    borderColor:     CARD.flashRose,
    backgroundColor: CARD.flashErrBg,
  },
  flashText: {
    color:      CARD.teal200,
    fontSize:   10,
    fontFamily: theme.fonts.bold,
  },
  flashTextMax: {
    color: CARD.rose300,
  },

  gridInfo: {
    padding:          14,
    gap:              5,
    backgroundColor:  theme.colors.surface,
  },
  categoryLabel: {
    color:         theme.colors.slate[400],
    fontSize:      9.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    fontFamily:    theme.fonts.bold,
  },
  productName: {
    color:      theme.colors.slate[900],
    lineHeight: 20,
    minHeight:  40,
    fontSize:   13.5,
  },
  starsRow: {
    flexDirection: flexRow(_isRtl),
    alignItems:    "center",
    gap:           5,
    marginTop:     1,
  },
  ratingText: {
    color:      theme.colors.slate[400],
    fontSize:   10,
    fontFamily: theme.fonts.regular,
  },
  priceRow: {
    flexDirection:  flexRow(_isRtl),
    alignItems:     "flex-end",
    justifyContent: "space-between",
    marginTop:      theme.spacing.sm,
  },
  // Replaces priceCol + priceInner (2 levels removed):
  // priceGroup: column container for amount-row + optional strikethrough price
  priceGroup: {
    alignItems: "flex-end",
    gap:        1,
  },
  // priceAmountRow: single row for the number + currency label
  priceAmountRow: {
    flexDirection: flexRow(_isRtl),
    alignItems:    "baseline",
    gap:           3,
  },
  priceValue: {
    color:         theme.colors.teal[600],
    fontSize:      18,
    letterSpacing: -0.5,
    fontFamily:    theme.fonts.black,
  },
  priceCurrency: {
    color:      theme.colors.teal[500],
    fontSize:   11,
    fontFamily: theme.fonts.bold,
  },
  origPrice: {
    color:              theme.colors.slate[400],
    textDecorationLine: "line-through",
    fontSize:           10,
    fontFamily:         theme.fonts.regular,
  },

  addBtn: {
    width:           40,
    height:          40,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
    backgroundColor: theme.colors.teal[500],
  },
  addBtnSuccess: {
    backgroundColor: CARD.successGreen,
  },
  addBtnBase: {
    backgroundColor: theme.colors.teal[500],
    borderColor:     theme.colors.brand[600],
  },
  btnDisabled: {
    opacity: 0.4,
  },
  addBtnLocked: {
    backgroundColor: theme.colors.error.bg,
    borderWidth:     1,
    borderColor:     theme.colors.rose[100],
  },
  addBtnQty: {
    color:      theme.colors.surface,
    fontSize:   13,
    fontFamily: theme.fonts.black,
  },

  // ── Row variant ────────────────────────────────────────────────────────────
  rowCard: {
    flexDirection:    flexRow(_isRtl),
    alignItems:       "center",
    gap:              14,
    backgroundColor:  theme.colors.surface,
    borderRadius:     18,
    padding:          14,
    borderWidth:      1,
    borderColor:      CARD.border07,
    shadowColor:      theme.colors.hero,
    shadowOffset:     { width: 0, height: 3 },
    shadowOpacity:    0.08,
    shadowRadius:     10,
    elevation:        4,
  },
  rowThumb: {
    width:           86,
    height:          86,
    borderRadius:    16,
    overflow:        "hidden",
    backgroundColor: theme.colors.subtle,
    position:        "relative",
  },
  thumbBadge: {
    position:          "absolute",
    top:               theme.spacing.xs,
    right:             theme.spacing.xs,
    borderRadius:      6,
    paddingHorizontal: 5,
    paddingVertical:   2,
    overflow:          "hidden",
  },
  rowInfo: {
    flex: 1,
    gap:  3,
  },
  rowProductName: {
    color:      theme.colors.slate[900],
    fontSize:   14,
    lineHeight: 20,
  },
  rowPriceRow: {
    flexDirection:  flexRow(_isRtl),
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
    width:           38,
    height:          38,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: CARD.border05,
    borderWidth:     1,
    borderColor:     CARD.border07,
    overflow:        "hidden",
  },
});
