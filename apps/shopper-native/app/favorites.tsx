import React, { useCallback, useEffect } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeOutRight, Layout } from "react-native-reanimated";
import { useWishlistStore } from "@/stores/wishlist";
import { useCartStore } from "@/stores/cart";
import type { NativeProduct } from "@/services/productsApi";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

function FavoriteCard({ product, index }: { product: NativeProduct; index: number }) {
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
              <Text style={styles.outOfStockText}>نفذ</Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.catLabel} numberOfLines={1}>{product.categoryName}</Text>
        <Pressable onPress={() => router.push({ pathname: "/product/[id]", params: { id: product.id } })}>
          <Text style={styles.nameLabel} numberOfLines={2}>{name}</Text>
        </Pressable>
        <Text style={styles.priceLabel}>{formatPrice(product.price)}</Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={handleRemove} hitSlop={8} style={styles.removeBtn}>
          <Ionicons name="heart" size={18} color={theme.colors.rose[500]} />
        </Pressable>
        <Pressable
          onPress={handleAddToCart}
          disabled={!product.inStock}
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
}

export default function FavoritesScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { items, isHydrated, hydrate, clear } = useWishlistStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleClearAll = useCallback(() => {
    if (Platform.OS === "web") {
      clear();
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
            clear();
          },
        },
      ],
    );
  }, [clear]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>المفضلة</Text>
        {items.length > 0 ? (
          <Pressable onPress={handleClearAll} hitSlop={8}>
            <Text style={styles.clearBtn}>مسح الكل</Text>
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
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Badge variant="brand" size="sm">{`${items.length} منتج`}</Badge>
            </View>
          }
          renderItem={({ item, index }) => <FavoriteCard product={item} index={index} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: theme.colors.bg },
  header:            { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.layout.pagePaddingH, paddingVertical: 14, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border.default, ...theme.shadow.xs },
  backBtn:           { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.subtle, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border.default },
  title:             { fontSize: theme.fontSize['2xl'], fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  clearBtn:          { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.bold, color: theme.colors.error.base },
  list:              { padding: theme.layout.pagePaddingH, gap: 10 },
  listHeader:        { flexDirection: "row-reverse", marginBottom: 4 },
  card:              { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.layout.cardRadius, padding: 12, ...theme.shadow.card, borderWidth: 1, borderColor: theme.colors.border.default },
  imgBox:            { width: 72, height: 72, borderRadius: theme.radius.lg, backgroundColor: theme.colors.subtle, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  outOfStockText:    { fontSize: 10, fontFamily: theme.fonts.black, color: "#fff" },
  catLabel:          { fontSize: theme.fontSize.xs, fontFamily: theme.fonts.regular, color: theme.colors.text.tertiary, textAlign: "right" },
  nameLabel:         { fontSize: theme.fontSize.base, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: "right", lineHeight: 18 },
  priceLabel:        { fontSize: theme.fontSize.lg, fontFamily: theme.fonts.black, color: theme.colors.brand[700], textAlign: "right" },
  actions:           { alignItems: "center", gap: 10 },
  removeBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.rose[50], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.rose[100] },
  cartBtn:           { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.colors.brand[50], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.brand[100] },
  cartBtnActive:     { backgroundColor: theme.colors.brand[600], borderColor: theme.colors.brand[600] },
  cartBtnDisabled:   { backgroundColor: theme.colors.subtle, borderColor: theme.colors.border.default },
});
