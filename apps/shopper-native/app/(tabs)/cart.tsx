import React, { useCallback } from "react";
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
import Animated, { FadeInDown, FadeOutUp, Layout } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useCartStore, type CartItem } from "@/stores/cart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

const FREE_DELIVERY_THRESHOLD = 200;

function QtyButton({ icon, onPress, disabled }: { icon: "add" | "remove"; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: disabled ? theme.colors.slate[100] : theme.colors.brand[50],
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: disabled ? theme.colors.border.default : theme.colors.brand[200],
        opacity: pressed ? 0.7 : 1,
      })}>
      <Ionicons name={icon} size={16} color={disabled ? theme.colors.text.disabled : theme.colors.brand[600]} />
    </Pressable>
  );
}

function CartItemCard({ item }: { item: CartItem }) {
  const { updateQty, removeItem } = useCartStore();
  const product = item.product;

  const handleInc = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQty(item.productId, item.quantity + 1);
  }, [item, updateQty]);

  const handleDec = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.quantity > 1) updateQty(item.productId, item.quantity - 1);
    else removeItem(item.productId);
  }, [item, updateQty, removeItem]);

  const handleRemove = useCallback(() => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    removeItem(item.productId);
  }, [item.productId, removeItem]);

  const name = product.nameAr ?? product.name;
  const lineTotal = (product.price * item.quantity).toFixed(2);

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutUp.duration(200)}
      layout={Layout.springify()}
      style={styles.card}>
      {/* Product image */}
      <View style={styles.imgBox}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={180} />
        ) : (
          <Ionicons name="medkit-outline" size={26} color={theme.colors.slate[300]} />
        )}
      </View>

      {/* Info */}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.catLabel} numberOfLines={1}>{product.categoryName}</Text>
        <Text style={styles.nameLabel} numberOfLines={2}>{name}</Text>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
          <Text style={styles.priceLabel}>{lineTotal} ج.م</Text>
          {item.quantity > 1 && (
            <Text style={{ fontSize: 10, fontFamily: theme.fonts.regular, color: theme.colors.slate[400] }}>
              ({product.price.toFixed(2)} × {item.quantity})
            </Text>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={{ alignItems: "center", gap: 6 }}>
        <Pressable onPress={handleRemove} hitSlop={8} style={{ opacity: 0.6, padding: 2 }}>
          <Ionicons name="trash-outline" size={16} color={theme.colors.error.base} />
        </Pressable>
        <View style={{ alignItems: "center", gap: 3 }}>
          <QtyButton icon="add" onPress={handleInc} />
          <Text style={styles.qty}>{item.quantity}</Text>
          <QtyButton icon="remove" onPress={handleDec} />
        </View>
      </View>
    </Animated.View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, subtotal, clearCart, itemCount } = useCartStore();
  const sub = subtotal();
  const count = itemCount();
  const delivery = sub >= FREE_DELIVERY_THRESHOLD ? 0 : 25;
  const total = sub + delivery;
  const progress = Math.min(sub / FREE_DELIVERY_THRESHOLD, 1);
  const remaining = Math.max(FREE_DELIVERY_THRESHOLD - sub, 0).toFixed(2);

  if (items.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topBar}>
          <Text style={styles.title}>السلة</Text>
        </View>
        <EmptyState
          icon="bag-outline"
          title="سلتك فارغة"
          description="تصفح منتجاتنا وأضف ما يعجبك"
          actionLabel="تسوق الآن"
          onAction={() => router.push("/(tabs)/products")}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
          <Text style={styles.title}>السلة</Text>
          <View
            style={{
              backgroundColor: theme.colors.brand[50],
              borderRadius: 10,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: theme.colors.brand[100],
            }}>
            <Text style={{ fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.brand[700] }}>
              {count} منتج
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (Platform.OS === "web") { clearCart(); return; }
            Alert.alert("مسح السلة", "هل تريد إزالة جميع المنتجات من سلتك؟", [
              { text: "إلغاء", style: "cancel" },
              {
                text: "مسح الكل",
                style: "destructive",
                onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                  clearCart();
                },
              },
            ]);
          }}
          hitSlop={8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
            backgroundColor: theme.colors.error.bg,
          }}>
          <Ionicons name="trash-outline" size={14} color={theme.colors.error.base} />
          <Text style={{ fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.error.base }}>مسح</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, paddingTop: 8, paddingBottom: 260, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Delivery progress */}
            <View style={styles.deliveryBar}>
              {delivery === 0 ? (
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.green[50], alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success.base} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.success.text }}>
                      توصيل مجاني!
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: theme.fonts.regular, color: theme.colors.success.base }}>
                      طلبك يتجاوز {FREE_DELIVERY_THRESHOLD} ج.م
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                      <Ionicons name="bicycle-outline" size={16} color={theme.colors.amber[600]} />
                      <Text style={{ fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.text.secondary }}>
                        أضف {remaining} ج.م للتوصيل المجاني
                      </Text>
                    </View>
                    <Text style={{ fontSize: 10, fontFamily: theme.fonts.black, color: theme.colors.brand[600] }}>
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` as unknown as number }]} />
                  </View>
                </>
              )}
            </View>

            {/* Trust badges */}
            <View style={{ flexDirection: "row-reverse", gap: 8, marginBottom: 4 }}>
              {[
                { icon: "flash-outline" as const, label: "توصيل سريع" },
                { icon: "shield-checkmark-outline" as const, label: "دفع آمن" },
                { icon: "refresh-outline" as const, label: "إرجاع مضمون" },
              ].map((b) => (
                <View
                  key={b.label}
                  style={{
                    flex: 1,
                    backgroundColor: theme.colors.brand[50],
                    borderRadius: 12,
                    paddingVertical: 8,
                    alignItems: "center",
                    gap: 4,
                    borderWidth: 1,
                    borderColor: theme.colors.brand[100],
                  }}>
                  <Ionicons name={b.icon} size={14} color={theme.colors.brand[600]} />
                  <Text style={{ fontSize: 9, fontFamily: theme.fonts.bold, color: theme.colors.brand[700] }}>{b.label}</Text>
                </View>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => <CartItemCard item={item} />}
      />

      {/* Sticky checkout footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View style={{ gap: 8, marginBottom: 14 }}>
          {[
            { label: "المجموع الفرعي", value: `${sub.toFixed(2)} ج.م` },
            {
              label: "التوصيل",
              value: delivery === 0 ? "مجاني" : `${delivery} ج.م`,
              valueColor: delivery === 0 ? theme.colors.success.base : undefined,
            },
          ].map((row) => (
            <View key={row.label} style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, fontFamily: theme.fonts.regular, color: theme.colors.text.secondary }}>{row.label}</Text>
              <Text style={{ fontSize: 13, fontFamily: theme.fonts.bold, color: row.valueColor ?? theme.colors.text.primary }}>{row.value}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: theme.colors.border.default, marginVertical: 2 }} />
          <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 15, fontFamily: theme.fonts.black, color: theme.colors.text.primary }}>الإجمالي</Text>
            <Text style={{ fontSize: 17, fontFamily: theme.fonts.black, color: theme.colors.brand[700] }}>{total.toFixed(2)} ج.م</Text>
          </View>
        </View>

        <Button variant="primary" size="lg" fullWidth gradient onPress={() => router.push("/checkout")}>
          إتمام الطلب — {total.toFixed(2)} ج.م
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical: 14,
  },
  title: { fontSize: theme.fontSize["2xl"], fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  deliveryBar: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    ...theme.shadow.xs,
  },
  progressTrack: { height: 6, backgroundColor: theme.colors.slate[200], borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.brand[600], borderRadius: 3 },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 14,
    ...theme.shadow.card,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  imgBox: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.subtle,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  catLabel: { fontSize: 10, fontFamily: theme.fonts.regular, color: theme.colors.text.tertiary, textAlign: "right" },
  nameLabel: { fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: "right", lineHeight: 18 },
  priceLabel: { fontSize: 15, fontFamily: theme.fonts.black, color: theme.colors.brand[700], textAlign: "right" },
  qty: { fontSize: 14, fontFamily: theme.fonts.black, color: theme.colors.text.primary, minWidth: 20, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
    ...theme.shadow.xl,
  },
});
