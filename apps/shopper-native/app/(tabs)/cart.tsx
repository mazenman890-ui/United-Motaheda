import React, { memo, useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { showConfirmSheet } from "@/shared/store/appSheetStore";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeOutUp, Layout } from "react-native-reanimated";
import { useCartStore, type CartItem } from "@/stores/cart";
import {
  useDeliveryContext,
  FREE_DELIVERY_THRESHOLD,
} from "@/features/delivery";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";

function QtyButton({ icon, onPress, disabled }: { icon: "add" | "remove"; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => ({
        width:           32,
        height:          32,
        borderRadius:    11,
        backgroundColor: disabled ? theme.colors.slate[100] : theme.colors.brand.lighter,
        alignItems:      "center",
        justifyContent:  "center",
        borderWidth:     1,
        borderColor:     disabled ? theme.colors.border.hairline : theme.colors.border.brandSoft,
        opacity:         pressed ? 0.7 : 1,
        transform:       [{ scale: pressed ? 0.96 : 1 }],
      })}>
      <Ionicons name={icon} size={16} color={disabled ? theme.colors.text.disabled : theme.colors.brand[700]} />
    </Pressable>
  );
}

const CartItemCard = memo(function CartItemCard({ item }: { item: CartItem }) {
  // Per-field selectors — function references are stable in zustand, so this
  // row only re-renders when its `item` prop changes, not on every cart
  // mutation (was: whole-store subscription → O(N) wasted renders per tap).
  const updateQty  = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const product    = item.product;

  // If product is now out of stock, lock at current qty rather than allowing increase.
  const maxQty = product.stock > 0 ? Math.ceil(product.stock) : item.quantity;
  const isAtMax = item.quantity >= maxQty;

  const handleInc = useCallback(() => {
    if (isAtMax) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    updateQty(item.productId, item.quantity + 1);
  }, [item, updateQty, isAtMax]);

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
        <UIText variant="eyebrow" color="tertiary" align="right" numberOfLines={1}>
          {product.categoryName}
        </UIText>
        <UIText variant="body-sm" weight="bold" align="right" numberOfLines={2} style={styles.nameLabelNew}>
          {name}
        </UIText>
        <View style={styles.priceCluster}>
          <UIText variant="card-title" weight="black" style={styles.priceLabelNew}>
            {lineTotal} <UIText variant="eyebrow" style={{ color: theme.colors.brand[600] }}>ج.م</UIText>
          </UIText>
          {item.quantity > 1 && (
            <UIText variant="caption" color="tertiary">
              ({product.price.toFixed(2)} × {item.quantity})
            </UIText>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={{ alignItems: "center", gap: 8 }}>
        <Pressable
          onPress={handleRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="إزالة المنتج"
          style={styles.removeBtn}>
          <Ionicons name="trash-outline" size={15} color={theme.colors.error.base} />
        </Pressable>
        <View style={{ alignItems: "center", gap: 4 }}>
          <QtyButton icon="add" onPress={handleInc} disabled={isAtMax} />
          <UIText variant="body-sm" weight="black" style={styles.qtyNew}>{item.quantity}</UIText>
          <QtyButton icon="remove" onPress={handleDec} />
          {isAtMax && product.stock > 0 && (
            <UIText variant="eyebrow" style={{ color: theme.colors.error.strong, fontSize: 8, textAlign: "center", maxWidth: 52 }}>
              الحد الأقصى
            </UIText>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Subscribe only to `items` (the only field that changes per-tap). The
  // store's `subtotal`/`itemCount`/`clearCart` are functions and identity-
  // stable, so pulling them as their own selectors avoids subscribing to
  // unrelated state slices.
  const items     = useCartStore((s) => s.items);
  const subtotal  = useCartStore((s) => s.subtotal);
  const itemCount = useCartStore((s) => s.itemCount);
  const clearCart = useCartStore((s) => s.clearCart);
  const sub   = subtotal();
  const count = itemCount();

  // ── Canonical delivery quote — branch-aware, address-aware, identical
  //    to Checkout. Replaces the prior hardcoded `25 EGP` fallback so the
  //    cart screen pricing matches what the user will actually be charged. ──
  const delivery = useDeliveryContext();
  const deliveryCost = delivery.cost;
  const total = sub + deliveryCost;
  const progress = Math.min(sub / FREE_DELIVERY_THRESHOLD, 1);
  const remaining = delivery.amountToFreeDelivery.toFixed(2);

  if (items.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
        <View style={styles.topBar}>
          <View>
            <UIText variant="eyebrow" color="tertiary" align="right">عربة التسوق</UIText>
            <UIText variant="card-title" align="right" style={styles.titleNew}>السلة</UIText>
          </View>
        </View>
        <EmptyState
          icon="bag-outline"
          title="سلتك فارغة"
          description="تصفح منتجاتنا وأضف ما يعجبك لتجده هنا"
          actionLabel="تسوق الآن"
          onAction={() => router.push("/(tabs)/products")}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header — editorial 2-tier */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
          <View>
            <UIText variant="eyebrow" color="tertiary" align="right">عربة التسوق</UIText>
            <UIText variant="card-title" align="right" style={styles.titleNew}>السلة</UIText>
          </View>
          <View style={styles.countChip}>
            <UIText variant="eyebrow" style={{ color: theme.colors.brand[700] }}>
              {count} منتج
            </UIText>
          </View>
        </View>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
            showConfirmSheet(
              "مسح السلة",
              "هل تريد إزالة جميع المنتجات من سلتك؟ لا يمكن التراجع عن هذا.",
              () => {
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                }
                clearCart();
              },
              { confirmLabel: "مسح الكل", danger: true },
            );
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="مسح السلة"
          style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={14} color={theme.colors.error.base} />
          <UIText variant="eyebrow" style={{ color: theme.colors.error.base }}>مسح</UIText>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={{ paddingHorizontal: theme.layout.pagePaddingH, paddingTop: 8, paddingBottom: 260, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Out-of-service banner — surfaces only when the resolved
                address is outside Cairo or beyond branch radius. */}
            {delivery.outOfServiceMessage && (
              <Animated.View
                entering={FadeInDown.duration(220)}
                style={styles.outOfServiceBanner}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.amber[700]} />
                <UIText variant="caption" weight="bold" style={{ flex: 1, color: theme.colors.amber[900] }}>
                  {delivery.outOfServiceMessage}
                </UIText>
              </Animated.View>
            )}

            {/* Branch indicator — premium trust signal showing which
                pharmacy is fulfilling the order. */}
            {delivery.branch && delivery.isDeliverable && (
              <Animated.View
                entering={FadeInDown.duration(260)}
                style={styles.branchPill}>
                <View style={styles.branchPillIcon}>
                  <Ionicons name="storefront-outline" size={13} color={theme.colors.brand[700]} />
                </View>
                <View style={{ flex: 1 }}>
                  <UIText variant="eyebrow" color="tertiary" align="right">يتم التوصيل من</UIText>
                  <UIText variant="caption" weight="bold" align="right" style={styles.branchPillLabel}>
                    {delivery.branch.fullNameAr ?? delivery.branch.nameAr}
                    {delivery.distanceKm != null && ` • ${delivery.distanceKm.toFixed(1)} كم`}
                  </UIText>
                </View>
              </Animated.View>
            )}

            {/* Delivery progress — clinical "you're almost there" card */}
            <View style={styles.deliveryBar}>
              {delivery.isFree ? (
                <View style={styles.deliveryFreeRow}>
                  <View style={styles.deliveryIcon}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success.base} />
                  </View>
                  <View>
                    <UIText variant="body-sm" weight="extrabold" align="right" style={{ color: theme.colors.success.strong }}>
                      توصيل مجاني!
                    </UIText>
                    <UIText variant="eyebrow" color="success" align="right" style={styles.deliveryFreeSub}>
                      طلبك يتجاوز {FREE_DELIVERY_THRESHOLD} ج.م
                    </UIText>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.deliveryProgressHeader}>
                    <View style={styles.deliveryProgressLeft}>
                      <Ionicons name="bicycle-outline" size={16} color={theme.colors.amber[700]} />
                      <UIText variant="body-sm" weight="bold" color="secondary" align="right">
                        أضف {remaining} ج.م للتوصيل المجاني
                      </UIText>
                    </View>
                    <UIText variant="eyebrow" color="brand">
                      {Math.round(progress * 100)}%
                    </UIText>
                  </View>
                  <View style={styles.progressTrack}>
                    <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` as unknown as number }]} />
                  </View>
                </>
              )}
            </View>

            {/* Trust badges — clinical commitment row */}
            <View style={styles.trustRow}>
              {([
                { icon: "flash-outline",            label: "توصيل سريع" },
                { icon: "shield-checkmark-outline", label: "دفع آمن" },
                { icon: "refresh-outline",          label: "إرجاع مضمون" },
              ] as { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }[]).map((b, i, arr) => (
                <View
                  key={b.label}
                  style={[
                    styles.trustCell,
                    i < arr.length - 1 && styles.trustCellDivider,
                  ]}>
                  <Ionicons name={b.icon} size={16} color={theme.colors.brand[700]} />
                  <UIText variant="eyebrow" color="secondary" align="center">{b.label}</UIText>
                </View>
              ))}
            </View>
          </>
        }
        renderItem={({ item }) => <CartItemCard item={item} />}
      />

      {/* Sticky checkout footer — premium anchor */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.footerTotalsBlock}>
          {([
            { label: "المجموع الفرعي", value: `${sub.toFixed(2)} ج.م`, valueColor: undefined },
            {
              label:      "التوصيل",
              value:      delivery.isFree ? "مجاني" : `${deliveryCost.toFixed(2)} ج.م`,
              valueColor: delivery.isFree ? theme.colors.success.strong : undefined,
            },
          ]).map((row) => (
            <View key={row.label} style={styles.footerRow}>
              <UIText variant="body-sm" color="secondary">{row.label}</UIText>
              <UIText variant="body-sm" weight="bold" style={{ color: row.valueColor ?? theme.colors.text.primary }}>
                {row.value}
              </UIText>
            </View>
          ))}
          <View style={styles.footerDivider} />
          <View style={styles.footerRow}>
            <View>
              <UIText variant="eyebrow" color="tertiary">المبلغ الإجمالي</UIText>
              <UIText variant="card-title" align="right" style={styles.totalLabel}>
                الإجمالي
              </UIText>
            </View>
            <UIText variant="sheet-title" weight="black" align="left" style={styles.totalValue}>
              {total.toFixed(2)}  <UIText variant="caption" weight="bold" style={{ color: theme.colors.brand[600] }}>ج.م</UIText>
            </UIText>
          </View>
        </View>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          gradient
          disabled={!delivery.isDeliverable}
          onPress={() => router.push("/checkout")}>
          {delivery.isDeliverable
            ? `إتمام الطلب — ${total.toFixed(2)} ج.م`
            : "العنوان خارج نطاق التوصيل"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // ── Header ─────────────────────────────────────────────────────
  topBar: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    justifyContent:   "space-between",
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   14,
  },
  titleNew: {
    letterSpacing: -0.2,
    marginTop:     1,
  },
  countChip: {
    backgroundColor: theme.colors.brand.lighter,
    borderRadius:    10,
    paddingHorizontal: 9,
    paddingVertical:   5,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
  },
  clearBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             5,
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:    10,
    backgroundColor: theme.colors.error.bg,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
  },

  // ── Out-of-service banner ──────────────────────────────────────
  outOfServiceBanner: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              10,
    backgroundColor:  theme.colors.amber[50],
    borderRadius:     14,
    paddingHorizontal: 14,
    paddingVertical:   12,
    marginBottom:     10,
    borderWidth:      1,
    borderColor:      "rgba(245,158,11,0.20)",
  },

  // ── Branch pill — shows fulfilling branch ───────────────────────
  branchPill: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              12,
    backgroundColor:  theme.colors.surface,
    borderRadius:     14,
    paddingHorizontal: 14,
    paddingVertical:   10,
    marginBottom:     10,
    ...theme.shadow.card,
  },
  branchPillIcon: {
    width:           30,
    height:          30,
    borderRadius:    10,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  branchPillLabel: {
    marginTop: 1,
  },

  // ── Delivery progress card ───────────────────────────────────────
  deliveryBar: {
    backgroundColor:  theme.colors.surface,
    borderRadius:     16,
    padding:          14,
    marginBottom:     12,
    ...theme.shadow.card,
  },
  deliveryFreeRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  deliveryIcon: {
    width:           36,
    height:          36,
    borderRadius:    11,
    backgroundColor: theme.colors.success.bg,
    borderWidth:     1,
    borderColor:     theme.colors.success.light,
    alignItems:      "center",
    justifyContent:  "center",
  },
  deliveryFreeSub: {
    marginTop: 2,
  },
  deliveryProgressHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   10,
  },
  deliveryProgressLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           8,
    flex:          1,
  },
  progressTrack: {
    height:          6,
    backgroundColor: theme.colors.slate[100],
    borderRadius:    3,
    overflow:        "hidden",
    borderWidth:     1,
    borderColor:     theme.colors.slate[200],
  },
  progressFill: {
    height:          "100%",
    backgroundColor: "#0DB8A8",
    borderRadius:    3,
  },

  // ── Trust row ───────────────────────────────────────────────────
  trustRow: {
    flexDirection:   "row-reverse",
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom:    8,
    ...theme.shadow.card,
  },
  trustCell: {
    flex:       1,
    alignItems: "center",
    gap:        6,
    paddingHorizontal: 4,
  },
  trustCellDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.border.hairline,
  },

  // ── Item card ───────────────────────────────────────────────────
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
  nameLabelNew: {
    lineHeight: 20,
  },
  priceCluster: {
    flexDirection: "row-reverse",
    alignItems:    "baseline",
    gap:           6,
    marginTop:     2,
  },
  priceLabelNew: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.3,
  },
  removeBtn: {
    width:           32,
    height:          32,
    borderRadius:    10,
    backgroundColor: theme.colors.error.bg,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
    alignItems:      "center",
    justifyContent:  "center",
  },
  qtyNew: {
    minWidth:  22,
    textAlign: "center",
  },

  // ── Sticky footer ────────────────────────────────────────────────
  footer: {
    position:        "absolute",
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop:      16,
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  theme.colors.border.hairline,
    shadowColor:     "#0C2240",
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.06,
    shadowRadius:    12,
    elevation:       8,
  },
  footerTotalsBlock: {
    gap:          10,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: "row-reverse",
    justifyContent:"space-between",
    alignItems:    "center",
  },
  footerDivider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  4,
  },
  totalLabel: {
    letterSpacing: -0.2,
    marginTop:     1,
  },
  totalValue: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.5,
  },
});
