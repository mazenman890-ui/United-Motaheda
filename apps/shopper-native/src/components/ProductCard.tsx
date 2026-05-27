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
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { theme } from "@/theme";
import { Badge } from "./ui/Badge";
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

// ─── Placeholder palette — maps category to a warm gradient pair ──────────────

const CATEGORY_PALETTE: Record<string, [string, string, string]> = {
  // [gradient-start, gradient-end, icon-color]
  "العناية بالشعر":                ["#f0fdf4", "#dcfce7", "#16a34a"],
  "Hair Care":                     ["#f0fdf4", "#dcfce7", "#16a34a"],
  "العناية بالبشرة":               ["#fdf4ff", "#fae8ff", "#a855f7"],
  "Skincare":                      ["#fdf4ff", "#fae8ff", "#a855f7"],
  "مستحضرات التجميل والمكياج":    ["#fff0f6", "#ffe4ee", "#e11d6c"],
  "Cosmetics & Makeup":            ["#fff0f6", "#ffe4ee", "#e11d6c"],
  "العناية بالفم والأسنان":        ["#eff6ff", "#dbeafe", "#2563eb"],
  "Dental & Oral":                  ["#eff6ff", "#dbeafe", "#2563eb"],
  "الفيتامينات والمكملات الغذائية": ["#fffbeb", "#fef3c7", "#d97706"],
  "Vitamins & Supplements":        ["#fffbeb", "#fef3c7", "#d97706"],
  "أدوية":                         ["#ecfdf5", "#d1fae5", "#059669"],
  "Medications":                   ["#ecfdf5", "#d1fae5", "#059669"],
  "المستلزمات الطبية":             ["#f0f9ff", "#e0f2fe", "#0284c7"],
  "Medical Supplies":              ["#f0f9ff", "#e0f2fe", "#0284c7"],
  "الرعاية الصحية العامة":         ["#f8fafc", "#f1f5f9", "#475569"],
  "General Healthcare":            ["#f8fafc", "#f1f5f9", "#475569"],
  "العناية بالجسم":                ["#fff7ed", "#ffedd5", "#ea580c"],
  "Body Care":                     ["#fff7ed", "#ffedd5", "#ea580c"],
  "صحة المرأة":                    ["#fdf2f8", "#fce7f3", "#db2777"],
  "Women's Health":                ["#fdf2f8", "#fce7f3", "#db2777"],
  "الأطفال والرضع":                ["#fefce8", "#fef9c3", "#ca8a04"],
  "Baby & Child":                  ["#fefce8", "#fef9c3", "#ca8a04"],
  "العناية بالرجل":                ["#f1f5f9", "#e2e8f0", "#334155"],
  "Men's Care":                    ["#f1f5f9", "#e2e8f0", "#334155"],
  "العناية بالعيون":               ["#ecfeff", "#cffafe", "#0891b2"],
  "Eye Care":                      ["#ecfeff", "#cffafe", "#0891b2"],
};

const DEFAULT_PALETTE: [string, string, string] = ["#f0f9ff", "#e0f2fe", "#0284c7"];

type PlaceholderSize = "lg" | "sm";

interface ProductImagePlaceholderProps {
  category: string;
  size:     PlaceholderSize;
}

function ProductImagePlaceholder({ category, size }: ProductImagePlaceholderProps) {
  const [g1, g2, iconColor] = CATEGORY_PALETTE[category] ?? DEFAULT_PALETTE;
  const iconName  = categoryIcon(category);
  const iconSize  = size === "lg" ? 44 : 28;
  const circleSize = size === "lg" ? 88 : 56;

  return (
    <LinearGradient
      colors={[g1, g2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}>
      {/* Decorative corner arc — top-right */}
      <View style={[
        styles.placeholderArc,
        {
          width:  circleSize * 1.6,
          height: circleSize * 1.6,
          borderRadius: circleSize * 0.8,
          backgroundColor: iconColor + "0C",
          top:    -circleSize * 0.55,
          right:  -circleSize * 0.55,
        },
      ]} />
      {/* Centre glow disc */}
      <View style={styles.placeholderInner}>
        <View style={[
          styles.placeholderCircle,
          {
            width:        circleSize,
            height:       circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: iconColor + "18",
          },
        ]}>
          <Ionicons name={iconName} size={iconSize} color={iconColor} />
        </View>
      </View>
    </LinearGradient>
  );
}

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
  if (c.includes("baby") || c.includes("طفل") || c.includes("رضيع") || c.includes("infant")) return "happy-outline";
  if (c.includes("men") || c.includes("رجل") || c.includes("man's"))        return "person-outline";
  if (c.includes("eye") || c.includes("عيون"))                              return "eye-outline";
  if (c.includes("general") || c.includes("رعاية"))                         return "shield-checkmark-outline";
  if (c.includes("nutrition") || c.includes("تغذية"))                       return "nutrition-outline";
  if (c.includes("fragrance") || c.includes("عطر") || c.includes("perfume"))return "flower-outline";
  if (c.includes("first aid") || c.includes("إسعاف"))                       return "bandage-outline";
  return "medkit-outline";
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
  product,
  onPress,
  lang            = "ar",
  variant         = "grid",
  badge,
  discountPercent,
}: ProductCardProps) {
  // Primitive selectors only — the card re-renders ONLY when its own line
  // changes, not when any other cart item mutates. Previously this card
  // subscribed to the entire `items` array, so toggling a single item
  // re-rendered every visible card in the grid (50+ at a time on tablets).
  const addItem  = useCartStore((s) => s.addItem);
  const cartQty  = useCartStore(
    (s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0,
  );
  const inCart   = cartQty > 0;

  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const inWishlist     = useWishlistStore((s) => s.has(product.id));

  const [showAdded, setShowAdded]   = useState(false);
  const [showMaxed, setShowMaxed]   = useState(false);

  // Tracked so we can (a) clear the prior timer on spam-tap so the card
  // doesn't oscillate, and (b) clear on unmount so setShowAdded(false)
  // doesn't fire on an unmounted component when the user navigates away
  // during the 1400ms confirmation window.
  const showAddedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (showAddedTimerRef.current !== null) clearTimeout(showAddedTimerRef.current);
  }, []);

  const scale    = useSharedValue(1);
  const btnScale = useSharedValue(1);
  const hrtScale = useSharedValue(1);

  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const btnAnim  = useAnimatedStyle(() => ({
    transform:       [{ scale: btnScale.value }],
    backgroundColor: showAdded ? theme.colors.brand[600] : theme.colors.brand[50],
  }));
  const hrtAnim  = useAnimatedStyle(() => ({ transform: [{ scale: hrtScale.value }] }));

  // Refined hardware-switch feel — subtle, never bouncy
  const handlePressIn  = () => { scale.value = withSpring(0.985, theme.animation.spring.press); };
  const handlePressOut = () => { scale.value = withSpring(1.0,   theme.animation.spring.press); };

  // Max quantity allowed — capped at live stock so the button stops at the shelf limit.
  const maxQty = product.inStock && product.stock > 0 ? Math.ceil(product.stock) : 0;
  const isAtMax = maxQty > 0 && cartQty >= maxQty;

  const handleAddToCart = useCallback(() => {
    if (!product.inStock) return;

    if (isAtMax) {
      // Already at stock limit — give error haptic + show "الكمية القصوى" flash.
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setShowMaxed(true);
      if (showAddedTimerRef.current !== null) clearTimeout(showAddedTimerRef.current);
      showAddedTimerRef.current = setTimeout(() => {
        setShowMaxed(false);
        showAddedTimerRef.current = null;
      }, 1400);
      return;
    }

    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    btnScale.value = withSequence(
      withSpring(0.90, theme.animation.spring.press),
      withSpring(1.06, theme.animation.spring.press),
      withSpring(1.0,  theme.animation.spring.press),
    );
    addItem(product, 1);
    setShowAdded(true);
    if (showAddedTimerRef.current !== null) clearTimeout(showAddedTimerRef.current);
    showAddedTimerRef.current = setTimeout(() => {
      setShowAdded(false);
      showAddedTimerRef.current = null;
    }, 1400);
  }, [product, addItem, btnScale, isAtMax]);

  const handleWishlist = useCallback(() => {
    if (Platform.OS !== "web") {
      (inWishlist
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      ).catch(() => {});
    }
    // Wishlist heart — emotional moment gets slightly more pop, but
    // still restrained on the unified `press` spring
    hrtScale.value = withSequence(
      withSpring(0.82, theme.animation.spring.press),
      withSpring(1.18, theme.animation.spring.press),
      withSpring(1.0,  theme.animation.spring.press),
    );
    toggleWishlist(product);
  }, [product, toggleWishlist, hrtScale, inWishlist]);

  const displayName = lang === "ar"
    ? (product.nameAr ?? product.name)
    : (product.nameEn ?? product.name);

  // product.id is stable for the lifetime of this card instance; memoize so
  // the 36-char reduce loop doesn't run on every render.
  const rating = useMemo(() => deterministicRating(product.id), [product.id]);
  const isLowStock  = product.stock > 0 && product.stock <= 3;
  const origPrice   = discountPercent ? product.price / (1 - discountPercent / 100) : null;

  const badgeMeta =
    badge === "new"  ? { label: "جديد",                       bg: theme.colors.info.bg,    color: theme.colors.info.strong } :
    badge === "hot"  ? { label: "الأكثر مبيعاً",               bg: theme.colors.error.bg,   color: theme.colors.error.strong } :
    badge === "sale" ? { label: `${discountPercent ?? 0}%- خصم`, bg: theme.colors.amber[50], color: theme.colors.amber[800] } :
    null;

  // ── Grid variant ───────────────────────────────────────────────────────────
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
              transition={240}
            />
          ) : (
            <ProductImagePlaceholder category={product.categoryName} size="lg" />
          )}

          {/* Gradient fade at bottom */}
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.92)"]}
            style={[styles.imgGrad, { pointerEvents: "none" }]}
          />

          {/* Out of stock overlay */}
          {!product.inStock && (
            <View style={styles.oos}>
              <View style={styles.oosPill}>
                <Ionicons name="alert-circle-outline" size={13} color={theme.colors.slate[500]} />
                <UIText variant="eyebrow" color="secondary">نفذ المخزون</UIText>
              </View>
            </View>
          )}

          {/* Low stock warning */}
          {isLowStock && product.inStock && (
            <View style={styles.lowStockPill}>
              <UIText variant="eyebrow" style={{ color: theme.colors.error.strong }}>
                آخر {product.stock} قطع
              </UIText>
            </View>
          )}

          {/* Cart qty badge */}
          {inCart && (
            <Animated.View style={styles.qtyBadge}>
              <UIText variant="eyebrow" color="inverse" style={styles.qtyTextNew}>
                {cartQty}
              </UIText>
            </Animated.View>
          )}

          {/* Feature badge — only when not in cart */}
          {badgeMeta && !inCart && (
            <View style={[styles.topBadge, { backgroundColor: badgeMeta.bg, borderColor: `${badgeMeta.color}22` }]}>
              <UIText variant="eyebrow" style={{ color: badgeMeta.color }}>
                {badgeMeta.label}
              </UIText>
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
                size={15}
                color={inWishlist ? theme.colors.rose[500] : theme.colors.slate[500]}
              />
            </Pressable>
          </Animated.View>

          {/* Added / Max flash */}
          {(showAdded || showMaxed) && (
            <Animated.View
              entering={FadeIn.duration(140)}
              exiting={FadeOut.duration(380)}
              style={[styles.addedFlash, showMaxed && styles.addedFlashMax]}>
              <Ionicons
                name={showMaxed ? "alert-circle" : "checkmark-circle"}
                size={12}
                color={showMaxed ? theme.colors.error.strong : theme.colors.brand[700]}
              />
              <UIText variant="eyebrow" style={{ color: showMaxed ? theme.colors.error.strong : theme.colors.brand[700] }}>
                {showMaxed ? "الكمية القصوى" : "تمت الإضافة"}
              </UIText>
            </Animated.View>
          )}
        </View>

        {/* ── Info ── */}
        <View style={styles.gridInfo}>
          <UIText variant="eyebrow" color="tertiary" align="right" numberOfLines={1}>
            {product.categoryName}
          </UIText>
          <UIText variant="body-sm" weight="bold" align="right" numberOfLines={2} style={styles.nameLabelNew}>
            {displayName}
          </UIText>

          {/* Rating stars */}
          <View style={styles.ratingRow}>
            <Stars value={rating.value} />
            <UIText variant="eyebrow" color="tertiary">
              {rating.value} ({rating.count})
            </UIText>
          </View>

          {/* Price + Add button */}
          <View style={styles.priceRow}>
            <View style={{ alignItems: "flex-end", gap: 1 }}>
              <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 3 }}>
                <UIText variant="card-title" weight="black" style={styles.priceNew}>
                  {product.price.toFixed(2)}
                </UIText>
                <UIText variant="eyebrow" style={styles.priceCurNew}>ج.م</UIText>
              </View>
              {!!origPrice && (
                <UIText variant="eyebrow" color="tertiary" align="right" style={styles.origPriceNew}>
                  {origPrice.toFixed(0)} ج.م
                </UIText>
              )}
            </View>
            <Animated.View style={[btnAnim, styles.addBtn, isAtMax && styles.addBtnMax]}>
              <Pressable onPress={handleAddToCart} disabled={!product.inStock} hitSlop={8}>
                {showAdded ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : isAtMax ? (
                  <Ionicons name="lock-closed" size={14} color={theme.colors.error.strong} />
                ) : inCart ? (
                  <UIText variant="caption" weight="black" style={styles.addBtnQtyNew}>
                    {cartQty}
                  </UIText>
                ) : (
                  <Ionicons name="add" size={18} color={theme.colors.brand[700]} />
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
          <ProductImagePlaceholder category={product.categoryName} size="sm" />
        )}
        {badgeMeta && (
          <View style={[styles.thumbBadge, { backgroundColor: badgeMeta.bg, borderColor: `${badgeMeta.color}22` }]}>
            <UIText variant="eyebrow" style={{ color: badgeMeta.color }}>{discountPercent}%</UIText>
          </View>
        )}
      </View>

      <View style={styles.rowInfo}>
        <UIText variant="eyebrow" color="tertiary" align="right" numberOfLines={1}>
          {product.categoryName}
        </UIText>
        <UIText variant="body-sm" weight="bold" align="right" numberOfLines={2} style={styles.nameLabelRowNew}>
          {displayName}
        </UIText>
        <View style={[styles.ratingRow, { marginTop: 4 }]}>
          <Stars value={rating.value} size={10} />
          <UIText variant="eyebrow" color="tertiary">({rating.count})</UIText>
        </View>
        <View style={styles.rowPriceRow}>
          <View>
            <View style={{ flexDirection: "row-reverse", alignItems: "baseline", gap: 3 }}>
              <UIText variant="card-title" weight="black" style={styles.priceNew}>
                {product.price.toFixed(2)}
              </UIText>
              <UIText variant="eyebrow" style={styles.priceCurNew}>ج.م</UIText>
            </View>
            {!!origPrice && (
              <UIText variant="eyebrow" color="tertiary" align="right" style={styles.origPriceNew}>
                {origPrice.toFixed(0)} ج.م
              </UIText>
            )}
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
              color={inWishlist ? theme.colors.rose[500] : theme.colors.slate[500]}
            />
          </Pressable>
        </Animated.View>
        <Animated.View style={[btnAnim, styles.rowActionBtn, isAtMax && styles.addBtnMax]}>
          <Pressable onPress={handleAddToCart} disabled={!product.inStock} hitSlop={6}>
            {showAdded ? (
              <Ionicons name="checkmark" size={18} color="#fff" />
            ) : isAtMax ? (
              <Ionicons name="lock-closed" size={14} color={theme.colors.error.strong} />
            ) : inCart ? (
              <UIText variant="caption" weight="black" style={styles.addBtnQtyNew}>
                {cartQty}
              </UIText>
            ) : (
              <Ionicons name="add" size={18} color={theme.colors.brand[700]} />
            )}
          </Pressable>
        </Animated.View>
      </View>
    </AnimatedPressable>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* ── Grid — premium clinical card ─────────────────────────────────── */
  gridCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    overflow:        "hidden",
    ...theme.shadow.card,
  },
  imgBox: {
    height:          170,
    backgroundColor: theme.colors.surfaceSunken,
    position:        "relative",
  },
  imgGrad: {
    position: "absolute",
    bottom:   0,
    left:     0,
    right:    0,
    height:   60,
  },
  placeholderArc: {
    position: "absolute",
  },
  placeholderInner: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  placeholderCircle: {
    alignItems:     "center",
    justifyContent: "center",
  },

  /* Out-of-stock — calmer, non-alarming */
  oos: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(248,250,252,0.92)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  oosPill: {
    flexDirection:    "row",
    alignItems:       "center",
    gap:              6,
    backgroundColor:  theme.colors.surface,
    borderRadius:     9,
    paddingHorizontal:10,
    paddingVertical:  6,
    borderWidth:      StyleSheet.hairlineWidth,
    borderColor:      theme.colors.border.hairline,
  },

  /* Low-stock pill — softer error tint */
  lowStockPill: {
    position:        "absolute",
    bottom:          8,
    left:            8,
    backgroundColor: theme.colors.error.bg,
    borderRadius:    8,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
  },

  /* Cart-qty badge — premium brand pill */
  qtyBadge: {
    position:        "absolute",
    top:             10,
    left:            10,
    backgroundColor: theme.colors.brand[700],
    borderRadius:    999,
    minWidth:        24,
    height:          24,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 7,
    borderWidth:     1.5,
    borderColor:     "#fff",
  },
  qtyTextNew: {
    color:   "#fff",
  },

  topBadge: {
    position:        "absolute",
    top:             10,
    left:            10,
    borderRadius:    8,
    paddingHorizontal: 9,
    paddingVertical:   4,
    borderWidth:     1,
  },

  /* Heart button — refined glass tile */
  heartBtn: {
    position: "absolute",
    top:      10,
    right:    10,
  },
  heartPressable: {
    width:           32,
    height:          32,
    borderRadius:    11,
    backgroundColor: "rgba(255,255,255,0.97)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.hairline,
  },
  heartActive: {
    backgroundColor: theme.colors.rose[50],
    borderColor:     theme.colors.rose[100],
  },

  /* "Added!" flash — refined confirmation chip */
  addedFlash: {
    position:        "absolute",
    bottom:          8,
    right:           8,
    flexDirection:   "row",
    alignItems:      "center",
    gap:             5,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius:    8,
    paddingHorizontal: 9,
    paddingVertical:   5,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    ...theme.shadow.hairline,
  },
  addedFlashMax: {
    borderColor: theme.colors.error.light,
    backgroundColor: theme.colors.error.bg,
  },

  /* Info section — premium rhythm */
  gridInfo: {
    padding: 14,
    gap:     5,
  },
  nameLabelNew: {
    lineHeight: 19,
    minHeight:  38,
  },
  ratingRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           5,
    marginTop:     1,
  },
  priceRow: {
    flexDirection:  "row-reverse",
    alignItems:     "flex-end",
    justifyContent: "space-between",
    marginTop:      8,
  },
  priceNew: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.3,
  },
  priceCurNew: {
    color: theme.colors.brand[600],
  },
  origPriceNew: {
    color:              theme.colors.text.tertiary,
    textDecorationLine: "line-through",
    letterSpacing:      0.2,
    textTransform:      "none",
  },
  addBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
  },
  addBtnQtyNew: {
    color: theme.colors.brand[700],
  },
  addBtnMax: {
    backgroundColor: theme.colors.error.bg,
    borderColor:     theme.colors.error.light,
  },

  /* ── Row variant ───────────────────────────────────────────────── */
  rowCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             14,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    ...theme.shadow.card,
  },
  rowThumb: {
    width:           84,
    height:          84,
    borderRadius:    theme.radius.xl,
    overflow:        "hidden",
    backgroundColor: theme.colors.surfaceSunken,
    position:        "relative",
  },
  thumbBadge: {
    position:        "absolute",
    top:             4,
    right:           4,
    borderRadius:    6,
    paddingHorizontal: 5,
    paddingVertical:   2,
    borderWidth:     1,
  },
  rowInfo: {
    flex: 1,
    gap:  3,
  },
  nameLabelRowNew: {
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
  rowActionBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
  },
  rowActionBtnHeart: {
    backgroundColor: theme.colors.rose[50],
    borderColor:     theme.colors.rose[100],
  },
});
