import React, { memo, useCallback } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { showConfirmSheet } from "@/shared/store/appSheetStore";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeOutRight, Layout } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useWishlistStore, clearUserWishlist } from "@/stores/wishlist";
import { useCartStore } from "@/stores/cart";
import type { NativeProduct } from "@/services/productsApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { formatPrice } from "@/utils/format";
import { flexRow, isRtl } from "@/utils/layout";

const FavoriteCard = memo(function FavoriteCard({ product, index }: { product: NativeProduct; index: number }) {
  const router  = useRouter();
  const { t }   = useTranslation();
  const toggle  = useWishlistStore((s) => s.toggle);
  const addItem = useCartStore((s) => s.addItem);
  const inCart  = useCartStore((s) => s.items.some((i) => i.productId === product.id));
  const name    = product.nameAr ?? product.name;

  const handleRemove = useCallback(() => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    toggle(product);
  }, [product, toggle]);

  const handleAddToCart = useCallback(() => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addItem(product, 1);
  }, [product, addItem]);

  return (
    <Animated.View
      entering={FadeInDown.duration(280).delay(index * 50)}
      exiting={FadeOutRight.duration(220)}
      layout={Layout.springify()}
      style={styles.card}>

      {/* Image */}
      <Pressable onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}>
        <View style={styles.imgBox}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={180} />
          ) : (
            <>
              <LinearGradient
                colors={["rgba(2,29,46,0.06)", "rgba(13,184,168,0.10)"]}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="medkit-outline" size={28} color={theme.colors.slate[300]} />
            </>
          )}
          {!product.inStock && (
            <View style={styles.outOfStockOverlay}>
              <UIText variant="eyebrow" color="inverse">{t("common.outOfStock")}</UIText>
            </View>
          )}
        </View>
      </Pressable>

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <UIText variant="eyebrow" color="tertiary" align="right" numberOfLines={1}>
          {product.categoryName}
        </UIText>
        <Pressable onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}>
          <UIText variant="body-sm" weight="bold" align="right" numberOfLines={2} style={styles.nameLabelNew}>
            {name}
          </UIText>
        </Pressable>
        <UIText variant="card-title" weight="black" align="right" style={styles.priceLabelNew}>
          {formatPrice(product.price)}
        </UIText>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleRemove}
          hitSlop={8}
          style={styles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel={t("wishlist.removeFrom", { name })}>
          <Ionicons name="heart" size={18} color={theme.colors.rose[500]} />
        </Pressable>
        <Pressable
          onPress={handleAddToCart}
          disabled={!product.inStock}
          accessibilityRole="button"
          accessibilityLabel={
            !product.inStock
              ? t("wishlist.notAvailable", { name })
              : inCart
              ? t("wishlist.inCart", { name })
              : t("wishlist.addToCartLabel", { name })
          }
          accessibilityState={{ disabled: !product.inStock }}
          style={[styles.cartBtn, inCart && styles.cartBtnActive, !product.inStock && styles.cartBtnDisabled]}>
          <Ionicons
            name={inCart ? "checkmark" : "cart-outline"}
            size={16}
            color={inCart ? "#fff" : product.inStock ? theme.colors.brand[600] : theme.colors.text.disabled}
          />
        </Pressable>
      </View>
    </Animated.View>
  );
});

export default function FavoritesScreen() {
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const { t }      = useTranslation();
  // Per-field selectors — avoids whole-store subscription.
  const items      = useWishlistStore((s) => s.items);
  const isHydrated = useWishlistStore((s) => s.isHydrated);
  const userId     = useWishlistStore((s) => s.userId);
  const clear      = useWishlistStore((s) => s.clear);

  // Initial hydrate is owned by PharmacyBootstrap (auth-aware). No call here.

  const handleClearAll = useCallback(() => {
    const doClear = () => {
      // Clear local immediately for snappy UI.
      clear();
      // If authed, also wipe server-side so the empty wishlist syncs across
      // devices and survives sign-out/sign-in. Fire-and-forget.
      if (userId) {
        void clearUserWishlist(userId).catch((e) => {
          if (__DEV__) console.warn("[favorites] clearUserWishlist failed:", e);
        });
      }
    };

    showConfirmSheet(
      t("wishlist.clearTitle"),
      t("wishlist.clearMessage"),
      () => {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
        doClear();
      },
      { confirmLabel: t("cart.clearAll"), danger: true },
    );
  }, [clear, userId, t]);

  return (
    <View style={[styles.screen, { paddingTop: 0 }]}>
      {/* ── Hero header ──────────────────────────────────────── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 14 }]}>

        {/* Decorative orbs */}
        <View style={styles.heroOrb1} />
        <View style={styles.heroOrb2} />

        {/* Top row */}
        <View style={styles.heroTopRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.heroBtn}
            hitSlop={10}
            accessibilityRole="button">
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.85)" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <UIText style={styles.heroEyebrow}>{t("wishlist.yourWishlist")}</UIText>
            <UIText style={styles.heroTitle}>{t("wishlist.title")}</UIText>
          </View>
          {items.length > 0 ? (
            <Pressable
              onPress={handleClearAll}
              hitSlop={8}
              style={styles.heroClearBtn}
              accessibilityRole="button"
              accessibilityLabel={t("wishlist.clearAllLabel")}>
              <Ionicons name="trash-outline" size={15} color="rgba(255,89,89,0.90)" />
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Stats pill row */}
        {items.length > 0 && (
          <View style={styles.heroStats}>
            <View style={styles.heroStatPill}>
              <Ionicons name="heart" size={11} color={theme.colors.rose[400]} />
              <UIText style={styles.heroStatText}>{t("products.items", { count: items.length })}</UIText>
            </View>
          </View>
        )}
      </LinearGradient>

      {!isHydrated ? null : items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title={t("wishlist.empty")}
          description={t("wishlist.emptyDescription")}
          actionLabel={t("wishlist.browse")}
          onAction={() => router.push("/(tabs)/products")}
        />
      ) : (
        <FlashList<NativeProduct>
          data={items}
          keyExtractor={favoriteKeyExtractor}
          getItemType={favoriteItemType}
          contentContainerStyle={{
            padding:       theme.layout.pagePaddingH,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Badge variant="brand" size="sm">{t("products.items", { count: items.length })}</Badge>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={styles.cardWrap}>
              <FavoriteCard product={item} index={index} />
            </View>
          )}
        />
      )}
    </View>
  );
}

// Stable refs so React doesn't reallocate them on every render — FlashList
// pools cells by getItemType so a stable identifier keeps the recycler happy.
const favoriteKeyExtractor = (p: NativeProduct) => p.id;
const favoriteItemType     = () => "favorite-card";

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  cardWrap: {
    paddingBottom: 12,
  },
  // ── Hero header
  hero: {
    paddingHorizontal: 20,
    paddingBottom:     18,
    overflow:          "hidden",
  },
  heroOrb1: {
    position:        "absolute",
    right:           -40,
    top:             -40,
    width:           150,
    height:          150,
    borderRadius:    75,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroOrb2: {
    position:        "absolute",
    left:            -30,
    bottom:          -30,
    width:           100,
    height:          100,
    borderRadius:    50,
    backgroundColor: "rgba(13,184,168,0.08)",
  },
  heroTopRow: {
    flexDirection: flexRow(isRtl()) as "row" | "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  heroBtn: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.16)",
  },
  heroEyebrow: {
    fontSize:      10.5,
    fontFamily:    theme.fonts.bold,
    color:         "rgba(255,255,255,0.55)",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize:      22,
    fontFamily:    theme.fonts.black,
    color:         "#fff",
    letterSpacing: -0.3,
    marginTop:     1,
  },
  heroClearBtn: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: "rgba(255,50,50,0.14)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,50,50,0.18)",
  },
  heroStats: {
    flexDirection: flexRow(isRtl()) as "row" | "row-reverse",
    gap:           8,
    marginTop:     14,
  },
  heroStatPill: {
    flexDirection:     flexRow(isRtl()) as "row" | "row-reverse",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   "rgba(255,255,255,0.12)",
    borderRadius:      999,
    paddingHorizontal: 12,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.14)",
  },
  heroStatText: {
    fontSize:   11,
    fontFamily: theme.fonts.bold,
    color:      "rgba(255,255,255,0.85)",
  },
  // ── List
  listHeader: {
    flexDirection: flexRow(isRtl()) as "row" | "row-reverse",
    marginBottom:  12,
  },
  // ── Card
  card: {
    flexDirection:   flexRow(isRtl()) as "row" | "row-reverse",
    alignItems:      "center",
    gap:             14,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.card,
  },
  imgBox: {
    width:           82,
    height:          82,
    borderRadius:    14,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.50)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  nameLabelNew: {
    lineHeight: 20,
  },
  priceLabelNew: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.3,
    marginTop:     2,
  },
  actions: {
    alignItems: "center",
    gap:        10,
  },
  removeBtn: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: theme.colors.rose[50],
    borderWidth:     1,
    borderColor:     theme.colors.rose[100],
    alignItems:      "center",
    justifyContent:  "center",
  },
  cartBtn: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
    elevation:       3,
    shadowColor:     theme.colors.hero,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.08,
    shadowRadius:    6,
  },
  cartBtnActive: {
    backgroundColor: theme.colors.brand[700],
    borderColor:     theme.colors.brand[700],
  },
  cartBtnDisabled: {
    backgroundColor: theme.colors.subtle,
    borderColor:     theme.colors.border.default,
  },
});
