/**
 * CartDrawer — premium animated bottom sheet for cart preview.
 *
 * Usage:
 *   const ref = useRef<CartDrawerRef>(null);
 *   <CartDrawer ref={ref} />
 *   ref.current?.open();
 *
 * Reads cart + pricing from the canonical Zustand store. Reactive to
 * mutations made anywhere in the app.
 */

import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCartStore, selectPricing, selectItemCount } from "@/stores/cart";
import { useDeliveryQuote } from "@/features/delivery";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";
import type { CartItem } from "@/stores/cart";

export interface CartDrawerRef {
  open: () => void;
  close: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export const CartDrawer = forwardRef<CartDrawerRef>(function CartDrawer(_, ref) {
  const sheetRef = useRef<BottomSheet>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = useCartStore((s) => s.items);
  const pricing = useCartStore(selectPricing);
  const itemCount = useCartStore(selectItemCount);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);

  const delivery = useDeliveryQuote({ subtotal: pricing.subtotal });

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.snapToIndex(0),
    close: () => sheetRef.current?.close(),
  }));

  const snapPoints = useMemo(() => ["70%", "92%"], []);

  const handleCheckout = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    sheetRef.current?.close();
    router.push("/checkout");
  }, [router]);

  const handleViewCart = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    sheetRef.current?.close();
    router.push("/(tabs)/cart");
  }, [router]);

  const renderItem = useCallback(({ item }: { item: CartItem }) => (
    <CartDrawerRow
      item={item}
      onIncrement={() => updateQty(item.productId, item.quantity + 1)}
      onDecrement={() => updateQty(item.productId, Math.max(1, item.quantity - 1))}
      onRemove={() => removeItem(item.productId)}
    />
  ), [updateQty, removeItem]);

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      index={-1}
      enablePanDownToClose
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}>
      <BottomSheetView style={{ flex: 1 }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.bagIcon}>
              <Ionicons name="bag-handle" size={16} color={theme.colors.brand[600]} />
            </View>
            <View>
              <Text style={styles.headerTitle}>سلة المشتريات</Text>
              <Text style={styles.headerSub}>
                {itemCount > 0 ? `${itemCount} منتج` : "السلة فارغة"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => sheetRef.current?.close()}
            hitSlop={10}
            style={styles.closeBtn}>
            <Ionicons name="close" size={16} color={theme.colors.slate[600]} />
          </Pressable>
        </View>

        {/* ── Body ── */}
        {items.length === 0 ? (
          <EmptyCartBody />
        ) : (
          <>
            <BottomSheetFlatList
              data={items}
              keyExtractor={(item) => item.productId}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            {/* ── Footer ── */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalLabel}>المجموع الفرعي</Text>
                <Text style={styles.totalValue}>{formatPrice(pricing.subtotal)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalLabel}>التوصيل</Text>
                <Text style={styles.totalValue}>
                  {delivery.isFree ? "مجاني" : formatPrice(delivery.cost)}
                </Text>
              </View>
              {pricing.discount > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalLabel, { color: theme.colors.green[600] }]}>الخصم</Text>
                  <Text style={[styles.totalValue, { color: theme.colors.green[600] }]}>
                    −{formatPrice(pricing.discount)}
                  </Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>الإجمالي</Text>
                <Text style={styles.grandTotalValue}>
                  {formatPrice(pricing.subtotal - pricing.discount + delivery.cost)}
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable onPress={handleViewCart} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>عرض السلة</Text>
                </Pressable>
                <Pressable onPress={handleCheckout} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>إتمام الطلب</Text>
                  <Ionicons name="arrow-back" size={14} color="#fff" />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
});

// ─── Row ─────────────────────────────────────────────────────────────────────

function CartDrawerRow({
  item, onIncrement, onDecrement, onRemove,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const product = item.product;
  const lineTotal = (product?.price ?? 0) * item.quantity;

  const haptic = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };

  return (
    <View style={styles.row}>
      {product?.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.rowImage} contentFit="contain" />
      ) : (
        <View style={[styles.rowImage, styles.rowImageFallback]}>
          <Ionicons name="medkit-outline" size={20} color={theme.colors.slate[400]} />
        </View>
      )}

      <View style={styles.rowContent}>
        <Text style={styles.rowName} numberOfLines={2}>{product?.name}</Text>
        <Text style={styles.rowPrice}>{formatPrice(lineTotal)}</Text>

        <View style={styles.qtyRow}>
          <View style={styles.qtyControl}>
            <Pressable onPress={() => { haptic(); onDecrement(); }} style={styles.qtyBtn}>
              <Ionicons name="remove" size={13} color={theme.colors.slate[700]} />
            </Pressable>
            <Text style={styles.qtyValue}>{item.quantity}</Text>
            <Pressable onPress={() => { haptic(); onIncrement(); }} style={styles.qtyBtn}>
              <Ionicons name="add" size={13} color={theme.colors.slate[700]} />
            </Pressable>
          </View>
          <Pressable onPress={() => { haptic(); onRemove(); }} hitSlop={6} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={14} color={theme.colors.red[500]} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Empty ───────────────────────────────────────────────────────────────────

function EmptyCartBody() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}>
        <Ionicons name="bag-outline" size={36} color={theme.colors.brand[400]} />
      </View>
      <Text style={styles.emptyTitle}>السلة فارغة</Text>
      <Text style={styles.emptyDesc}>ابدأ بتصفح المنتجات وأضف ما تحتاجه</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: theme.colors.slate[300],
    width: 40,
    height: 4,
  },

  // Header
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
  },
  headerLeft: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  bagIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontFamily: theme.fonts.black, color: theme.colors.text.primary, textAlign: "right" },
  headerSub: { fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "right" },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: theme.colors.slate[50],
    alignItems: "center", justifyContent: "center",
  },

  // List
  list: { paddingHorizontal: 20, paddingVertical: 12 },
  separator: { height: 10 },

  // Row
  row: {
    flexDirection: "row-reverse",
    gap: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  rowImage: {
    width: 64, height: 64, borderRadius: 10,
    backgroundColor: theme.colors.slate[50],
  },
  rowImageFallback: {
    alignItems: "center", justifyContent: "center",
  },
  rowContent: { flex: 1, gap: 4, justifyContent: "space-between" },
  rowName: { fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.slate[800], textAlign: "right" },
  rowPrice: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.brand[600], textAlign: "right" },
  qtyRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  qtyControl: {
    flexDirection: "row-reverse", alignItems: "center", gap: 4,
    backgroundColor: theme.colors.slate[50],
    borderRadius: 8, padding: 2,
  },
  qtyBtn: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.default,
  },
  qtyValue: { minWidth: 18, textAlign: "center", fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.slate[800] },
  removeBtn: { padding: 4 },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
    backgroundColor: theme.colors.muted,
  },
  totalsRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: { fontSize: 12, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500] },
  totalValue: { fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.slate[700] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.slate[200], marginVertical: 8 },
  grandTotalRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "baseline" },
  grandTotalLabel: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  grandTotalValue: { fontSize: 18, fontFamily: theme.fonts.black, color: theme.colors.brand[600] },

  actions: { flexDirection: "row-reverse", gap: 10, marginTop: 14 },
  secondaryBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5, borderColor: theme.colors.border.medium,
    alignItems: "center", justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.slate[700] },
  primaryBtn: {
    flex: 1.4, paddingVertical: 13, borderRadius: 14,
    backgroundColor: theme.colors.brand[600],
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6,
    ...theme.shadow.brand,
  },
  primaryBtnText: { fontSize: 13, fontFamily: theme.fonts.black, color: "#fff" },

  // Empty
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyIcon: {
    width: 76, height: 76, borderRadius: 24,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: theme.fonts.black, color: theme.colors.text.primary },
  emptyDesc: { fontSize: 12, fontFamily: theme.fonts.regular, color: theme.colors.slate[400], textAlign: "center" },
});
