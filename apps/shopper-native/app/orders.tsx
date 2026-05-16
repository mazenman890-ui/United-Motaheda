import React, { useCallback, useEffect } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useOrderStore, type Order, type OrderStatus } from "@/stores/orders";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";

const STATUS_META: Record<OrderStatus, { label: string; variant: "success" | "warning" | "brand" | "error" | "neutral"; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  pending:    { label: "قيد المعالجة",   variant: "warning", icon: "time-outline" },
  processing: { label: "جارٍ التجهيز",  variant: "brand",   icon: "refresh-outline" },
  shipped:    { label: "في الطريق",       variant: "brand",   icon: "car-outline" },
  delivered:  { label: "تم التسليم",      variant: "success", icon: "checkmark-circle-outline" },
  cancelled:  { label: "ملغي",            variant: "error",   icon: "close-circle-outline" },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

function OrderCard({ order, index }: { order: Order; index: number }) {
  const router = useRouter();
  const meta   = STATUS_META[order.status];
  const firstItem = order.items[0];
  const extraCount = order.items.length - 1;

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
        onPress={() => {}}>

        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <View style={styles.orderIconBox}>
              <Ionicons name="bag-outline" size={16} color={theme.colors.brand[600]} />
            </View>
            <View>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>
          <Badge variant={meta.variant} size="sm">
            {meta.label}
          </Badge>
        </View>

        {/* Items preview */}
        <View style={styles.itemsRow}>
          {firstItem?.imageUrl ? (
            <Image source={{ uri: firstItem.imageUrl }} style={styles.itemThumb} contentFit="contain" />
          ) : (
            <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
              <Ionicons name="medkit-outline" size={18} color={theme.colors.slate[300]} />
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.itemName} numberOfLines={1}>{firstItem?.name ?? "منتج"}</Text>
            {extraCount > 0 && (
              <Text style={styles.extraCount}>+{extraCount} منتجات أخرى</Text>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.totalLabel}>الإجمالي</Text>
          <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function OrdersScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { orders, isHydrated, hydrate } = useOrderStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  useFocusEffect(useCallback(() => {
    hydrate();
  }, [hydrate]));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>طلباتي</Text>
        <View style={{ width: 38 }} />
      </View>

      {!isHydrated ? null : orders.length === 0 ? (
        <EmptyState
          icon="bag-outline"
          title="لا توجد طلبات بعد"
          description="لم تقم بأي طلب حتى الآن. تصفح منتجاتنا وابدأ التسوق"
          actionLabel="تسوق الآن"
          onAction={() => router.push("/(tabs)/products")}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.countLabel}>{orders.length} طلب</Text>
          }
          renderItem={({ item, index }) => <OrderCard order={item} index={index} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: theme.colors.bg },
  header:       { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: theme.layout.pagePaddingH, paddingVertical: 14, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border.default, ...theme.shadow.xs },
  backBtn:      { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.subtle, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.border.default },
  title:        { fontSize: theme.fontSize['2xl'], fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  list:         { padding: theme.layout.pagePaddingH, gap: 12 },
  countLabel:   { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.semibold, color: theme.colors.text.tertiary, textAlign: "right", marginBottom: 4 },
  card:         { backgroundColor: theme.colors.surface, borderRadius: theme.layout.cardRadius, padding: 16, gap: 12, ...theme.shadow.card, borderWidth: 1, borderColor: theme.colors.border.default },
  cardHeader:   { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between" },
  orderIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.brand[50], alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.brand[100] },
  orderId:      { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: "right" },
  orderDate:    { fontSize: theme.fontSize.xs, fontFamily: theme.fonts.regular, color: theme.colors.text.tertiary, textAlign: "right" },
  itemsRow:     { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: theme.colors.subtle, borderRadius: theme.radius.lg, padding: 10 },
  itemThumb:    { width: 52, height: 52, borderRadius: theme.radius.md, overflow: "hidden" },
  itemThumbPlaceholder: { backgroundColor: theme.colors.slate[100], alignItems: "center", justifyContent: "center" },
  itemName:     { fontSize: theme.fontSize.base, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: "right" },
  extraCount:   { fontSize: theme.fontSize.xs, fontFamily: theme.fonts.regular, color: theme.colors.text.tertiary, textAlign: "right" },
  cardFooter:   { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border.default },
  totalLabel:   { fontSize: theme.fontSize.sm, fontFamily: theme.fonts.semibold, color: theme.colors.text.secondary },
  totalValue:   { fontSize: theme.fontSize.lg, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },
});
