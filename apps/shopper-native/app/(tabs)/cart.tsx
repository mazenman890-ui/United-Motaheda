import React from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useCartStore } from "@/stores/cart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";
import { formatPrice, truncate } from "@/utils/format";

export default function CartScreen() {
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const items      = useCartStore((s) => s.items);
  const subtotal   = useCartStore((s) => s.subtotal());
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty  = useCartStore((s) => s.updateQty);
  const clearCart  = useCartStore((s) => s.clearCart);

  const delivery = subtotal >= 200 ? 0 : 15;
  const total    = subtotal + delivery;

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <View style={{
          paddingTop:        insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom:     16,
          backgroundColor:   "#fff",
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.slate[100],
        }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.slate[900], textAlign: "right" }}>السلة</Text>
        </View>
        <EmptyState
          icon={<Ionicons name="cart-outline" size={44} color={theme.colors.brand[500]} />}
          title="السلة فارغة"
          description="أضف بعض المنتجات لتبدأ تسوقك"
          actionLabel="تصفح المنتجات"
          onAction={() => router.push("/(tabs)/products")}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop:        insets.top + 14,
        paddingHorizontal: 20,
        paddingBottom:     14,
        backgroundColor:   "#fff",
        flexDirection:     "row-reverse",
        alignItems:        "center",
        justifyContent:    "space-between",
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.slate[100],
        ...theme.shadow.xs,
      }}>
        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.slate[900] }}>
          السلة <Text style={{ color: theme.colors.brand[600] }}>({items.length})</Text>
        </Text>
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearCart();
          }}
          hitSlop={10}>
          <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: "700" }}>مسح الكل</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 200 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const name = item.product.nameAr ?? item.product.name;
          return (
            <View style={{
              backgroundColor: "#fff",
              borderRadius:    theme.radius.xl,
              padding:         14,
              flexDirection:   "row-reverse",
              gap:             14,
              borderWidth:     1,
              borderColor:     theme.colors.slate[100],
              ...theme.shadow.sm,
            }}>
              {/* Image */}
              <View style={{ width: 80, height: 80, borderRadius: theme.radius.lg, backgroundColor: theme.colors.slate[50], overflow: "hidden", borderWidth: 1, borderColor: theme.colors.slate[100] }}>
                {item.product.imageUrl ? (
                  <Image source={{ uri: item.product.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={["#f0fdf4", "#dcfce7"]}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="pill" size={32} color={theme.colors.slate[300]} />
                  </LinearGradient>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1, gap: 5 }}>
                <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: "700", color: theme.colors.slate[800], textAlign: "right", lineHeight: 18 }}>
                  {truncate(name, 60)}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.amber[600], textAlign: "right" }}>
                  {formatPrice(item.product.price * item.quantity)}
                </Text>

                {/* Qty + delete */}
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", backgroundColor: theme.colors.slate[50], borderRadius: 10, borderWidth: 1, borderColor: theme.colors.slate[200], overflow: "hidden" }}>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQty(item.productId, item.quantity + 1); }}
                      style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.brand[600] }}>
                      <Ionicons name="add" size={18} color="#fff" />
                    </Pressable>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.slate[900], paddingHorizontal: 12 }}>{item.quantity}</Text>
                    <Pressable
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); updateQty(item.productId, item.quantity - 1); }}
                      style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="remove" size={18} color={theme.colors.slate[500]} />
                    </Pressable>
                  </View>

                  <View style={{ flex: 1 }} />
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); removeItem(item.productId); }}
                    hitSlop={10}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="trash-outline" size={15} color={theme.colors.error} />
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom summary */}
      <View style={{
        position:          "absolute",
        bottom:            0, left: 0, right: 0,
        backgroundColor:   "#fff",
        paddingHorizontal: 20,
        paddingTop:        16,
        paddingBottom:     insets.bottom + 16,
        borderTopWidth:    1,
        borderTopColor:    theme.colors.slate[150],
        gap:               12,
        ...theme.shadow.lg,
      }}>
        {/* Free delivery progress */}
        {delivery > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 11, color: theme.colors.slate[500], textAlign: "right" }}>
              أضف <Text style={{ color: theme.colors.brand[600], fontWeight: "800" }}>{formatPrice(200 - subtotal)}</Text> للحصول على شحن مجاني
            </Text>
            <View style={{ height: 4, backgroundColor: theme.colors.slate[100], borderRadius: 2 }}>
              <View style={{ height: 4, width: `${Math.min((subtotal / 200) * 100, 100)}%`, backgroundColor: theme.colors.brand[500], borderRadius: 2 }} />
            </View>
          </View>
        )}

        <View style={{ gap: 8 }}>
          <SummaryRow label="المجموع الجزئي" value={formatPrice(subtotal)} />
          <SummaryRow label="التوصيل" value={delivery === 0 ? "شحن مجاني" : formatPrice(delivery)} valueGreen={delivery === 0} />
          <View style={{ height: 1, backgroundColor: theme.colors.slate[150] }} />
          <SummaryRow label="الإجمالي" value={formatPrice(total)} bold />
        </View>

        <Button variant="primary" size="lg" fullWidth onPress={() => router.push("/checkout")}>
          {`إتمام الطلب — ${formatPrice(total)}`}
        </Button>
      </View>
    </View>
  );
}

function SummaryRow({ label, value, bold, valueGreen }: { label: string; value: string; bold?: boolean; valueGreen?: boolean }) {
  return (
    <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 13, fontWeight: bold ? "800" : "500", color: bold ? theme.colors.slate[900] : theme.colors.slate[500] }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: bold ? "900" : "700", color: valueGreen ? theme.colors.brand[600] : bold ? theme.colors.amber[600] : theme.colors.slate[800] }}>{value}</Text>
    </View>
  );
}
