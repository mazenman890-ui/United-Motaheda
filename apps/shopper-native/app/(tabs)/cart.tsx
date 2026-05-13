import React from "react";
import {
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useCartStore } from "@/stores/cart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";
import { formatPrice, truncate } from "@/utils/format";

export default function CartScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const items    = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty  = useCartStore((s) => s.updateQty);
  const clearCart  = useCartStore((s) => s.clearCart);

  const delivery = subtotal >= 200 ? 0 : 15;
  const total    = subtotal + delivery;

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.slate[50] }}>
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: theme.colors.slate[100] }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.slate[950], textAlign: "right" }}>السلة</Text>
        </View>
        <EmptyState
          icon="🛒"
          title="السلة فارغة"
          description="أضف بعض المنتجات لتبدأ تسوقك"
          actionLabel="تصفح المنتجات"
          onAction={() => router.push("/(tabs)/products")}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.slate[50] }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: "#fff",
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.slate[100],
        ...theme.shadow.sm,
      }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.slate[950] }}>
          السلة ({items.length})
        </Text>
        <Pressable
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); clearCart(); }}
          hitSlop={8}>
          <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: "700" }}>مسح الكل</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const name = item.product.nameAr ?? item.product.name;
          return (
            <View style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 12,
              flexDirection: "row-reverse",
              gap: 12,
              ...theme.shadow.sm,
            }}>
              {/* Image */}
              <View style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: theme.colors.slate[50], overflow: "hidden" }}>
                {item.product.imageUrl ? (
                  <Image source={{ uri: item.product.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 28 }}>💊</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "700", color: theme.colors.slate[900], textAlign: "right" }}>
                  {truncate(name, 60)}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.brand[700], textAlign: "right" }}>
                  {formatPrice(item.product.price * item.quantity)}
                </Text>

                {/* Qty controls */}
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQty(item.productId, item.quantity + 1); }}
                    style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.colors.brand[600], alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", lineHeight: 22 }}>+</Text>
                  </Pressable>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.slate[900], minWidth: 24, textAlign: "center" }}>{item.quantity}</Text>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQty(item.productId, item.quantity - 1); }}
                    style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: theme.colors.slate[100], alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.slate[600], lineHeight: 22 }}>−</Text>
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => removeItem(item.productId)} hitSlop={8}>
                    <Text style={{ fontSize: 18 }}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Summary panel */}
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: "#fff",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: insets.bottom + 16,
        borderTopWidth: 1,
        borderTopColor: theme.colors.slate[200],
        gap: 10,
        ...theme.shadow.lg,
      }}>
        <View style={{ gap: 6 }}>
          <Row label="المجموع الجزئي" value={formatPrice(subtotal)} />
          <Row
            label="توصيل"
            value={delivery === 0 ? "مجاني 🎉" : formatPrice(delivery)}
            valueColor={delivery === 0 ? theme.colors.success : undefined}
          />
          {delivery > 0 && (
            <Text style={{ fontSize: 11, color: theme.colors.slate[400], textAlign: "right" }}>
              الشحن مجاني عند الطلب بأكثر من 200 ج.م
            </Text>
          )}
          <View style={{ height: 1, backgroundColor: theme.colors.slate[100] }} />
          <Row label="الإجمالي" value={formatPrice(total)} bold />
        </View>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push("/checkout")}>
          تأكيد الطلب 🛍️
        </Button>
      </View>
    </View>
  );
}

function Row({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 13, fontWeight: bold ? "800" : "500", color: bold ? theme.colors.slate[950] : theme.colors.slate[600] }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: bold ? "900" : "700", color: valueColor ?? (bold ? theme.colors.brand[700] : theme.colors.slate[900]) }}>{value}</Text>
    </View>
  );
}
