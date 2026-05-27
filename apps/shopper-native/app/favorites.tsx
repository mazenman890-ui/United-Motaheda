import React, { memo, useCallback } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeOutRight, Layout } from "react-native-reanimated";
import { useWishlistStore, clearUserWishlist } from "@/stores/wishlist";
import { useCartStore } from "@/stores/cart";
import type { NativeProduct } from "@/services/productsApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

const FavoriteCard = memo(function FavoriteCard({ product, index }: { product: NativeProduct; index: number }) {
  const router   = useRouter();
  const toggle   = useWishlistStore((s) => s.toggle);
  const addItem  = useCartStore((s) => s.addItem);
  const inCart   = useCartStore((s) => s.items.some((i) => i.productId === product.id));
  const name     = product.nameAr ?? product.name;

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
            <Ionicons name="medkit-outline" size={28} color={theme.colors.slate[300]} />
          )}
          {!product.inStock && (
            <View style={styles.outOfStockOverlay}>
              <UIText variant="eyebrow" color="inverse">نفذ</UIText>
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
          accessibilityLabel={`إزالة ${name} من المفضلة`}>
          <Ionicons name="heart" size={18} color={theme.colors.rose[500]} />
        </Pressable>
        <Pressable
          onPress={handleAddToCart}
          disabled={!product.inStock}
          accessibilityRole="button"
          accessibilityLabel={!product.inStock ? `${name} غير متوفر` : inCart ? `${name} موجود في السلة` : `إضافة ${name} إلى السلة`}
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
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
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

    if (Platform.OS === "web") {
      doClear();
      return;
    }
    Alert.alert(
      "مسح المفضلة",
      "هل تريد إزالة جميع المنتجات من المفضلة؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "مسح الكل",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            doClear();
          },
        },
      ],
    );
  }, [clear, userId]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="رجوع">
          <Ionicons name="arrow-forward" size={18} color={theme.colors.text.primary} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <UIText variant="eyebrow" color="tertiary">المفضلة الخاصة بك</UIText>
          <UIText variant="card-title" align="center" style={styles.titleNew}>المفضلة</UIText>
        </View>
        {items.length > 0 ? (
          <Pressable
            onPress={handleClearAll}
            hitSlop={8}
            style={{ minWidth: 60, alignItems: "flex-start" }}
            accessibilityRole="button"
            accessibilityLabel="مسح جميع المفضلات">
            <UIText variant="caption" weight="bold" style={{ color: theme.colors.error.base }}>
              مسح الكل
            </UIText>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {!isHydrated ? null : items.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="لا توجد منتجات مفضلة"
          description="أضف المنتجات التي تعجبك إلى المفضلة لتجدها هنا بسرعة"
          actionLabel="تصفح المنتجات"
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
              <Badge variant="brand" size="sm">{`${items.length} منتج`}</Badge>
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
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  cardWrap: {
    paddingBottom: 12,
  },
  header: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    justifyContent:   "space-between",
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   14,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
  },
  titleNew: {
    letterSpacing: -0.2,
    marginTop:     1,
  },
  list: {
    padding: theme.layout.pagePaddingH,
    gap:     12,
  },
  listHeader: {
    flexDirection: "row-reverse",
    marginBottom:  6,
  },
  card: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             14,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    ...theme.shadow.card,
  },
  imgBox: {
    width:           76,
    height:          76,
    borderRadius:    theme.radius.lg,
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
    width:           38,
    height:          38,
    borderRadius:    11,
    backgroundColor: theme.colors.rose[50],
    borderWidth:     1,
    borderColor:     theme.colors.rose[100],
    alignItems:      "center",
    justifyContent:  "center",
  },
  cartBtn: {
    width:           38,
    height:          38,
    borderRadius:    11,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
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
