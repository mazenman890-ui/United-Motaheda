/**
 * Cart Screen — Premium RTL-Ready Edition
 *
 * Entire screen uses `row-reverse` layouts so it behaves perfectly
 * in right‑to‑left locales without any absolute positioning.
 * Animations are subtle spring‑based, and all interactions
 * include haptic feedback.
 */
import React, { memo, useCallback, useMemo } from "react";
import {
  FlatList,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutRight,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useCartStore, type CartItem } from "@/stores/cart";
import {
  useDeliveryContext,
  FREE_DELIVERY_THRESHOLD,
} from "@/features/delivery";
import { showConfirmSheet } from "@/shared/store/appSheetStore";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/shared/theme";

// ─── Animated stepper button ─────────────────────────────────────────────────
const StepBtn = memo(function StepBtn({
  icon,
  onPress,
  disabled,
}: {
  icon: "add" | "remove";
  onPress: () => void;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.82, { damping: 14, stiffness: 500 }),
      withTiming(1, { duration: 120 }),
    );
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  }, [disabled, onPress, scale]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        hitSlop={10}
        accessibilityRole="button"
        style={[s.stepBtn, disabled && s.stepBtnDisabled]}
      >
        <Ionicons
          name={icon}
          size={14}
          color={disabled ? theme.colors.slate[400] : theme.colors.brand[700]}
        />
      </Pressable>
    </Animated.View>
  );
});

// ─── Cart item card (memoised, RTL-safe) ─────────────────────────────────────
const CartItemCard = memo(function CartItemCard({
  item,
  index,
}: {
  item: CartItem;
  index: number;
}) {
  const { t } = useTranslation();
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const product = item.product;
  const maxQty = product.stock > 0 ? Math.floor(product.stock) : item.quantity;
  const isAtMax = item.quantity >= maxQty;
  const lineTotal = (product.price * item.quantity).toFixed(2);
  const name = product.nameAr ?? product.name;

  const handleInc = useCallback(() => {
    if (isAtMax) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {},
      );
      return;
    }
    updateQty(item.productId, item.quantity + 1);
  }, [isAtMax, item.productId, item.quantity, updateQty]);

  const handleDec = useCallback(() => {
    if (item.quantity > 1) {
      updateQty(item.productId, item.quantity - 1);
    } else {
      removeItem(item.productId);
    }
  }, [item.productId, item.quantity, removeItem, updateQty]);

  const handleRemove = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
      () => {},
    );
    removeItem(item.productId);
  }, [item.productId, removeItem]);

  return (
    <Animated.View
      entering={FadeInRight.duration(300)
        .delay(index * 50)
        .springify()
        .damping(18)}
      exiting={FadeOutRight.duration(220)}
      layout={Layout.springify().damping(18)}
      style={s.card}
    >
      {/* Row 1: category + delete */}
      <View style={s.cardTopRow}>
        <Text style={s.catLabel} numberOfLines={1}>
          {product.categoryName}
        </Text>
        <Pressable
          onPress={handleRemove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("cart.removeItem")}
          style={s.deleteBtn}
        >
          <Ionicons
            name="trash-outline"
            size={13}
            color={theme.colors.error.base}
          />
        </Pressable>
      </View>

      {/* Row 2: image + name */}
      <View style={s.cardMidRow}>
        <View style={s.imgBox}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
              transition={150}
            />
          ) : (
            <View style={s.imgFallback}>
              <Ionicons name="medkit-outline" size={26} color={theme.colors.slate[300]} />
            </View>
          )}
        </View>
        <Text style={s.productName} numberOfLines={3}>
          {name}
        </Text>
      </View>

      {/* Row 3: price + stepper */}
      <View style={s.cardBottomRow}>
        <View style={s.priceWrap}>
          <Text style={s.lineTotal}>{lineTotal}</Text>
          <Text style={s.currency}>{t("common.currency")}</Text>
          {item.quantity > 1 && (
            <Text style={s.unitHint}>
              {product.price.toFixed(0)} × {item.quantity}
            </Text>
          )}
        </View>

        <View style={s.stepper}>
          <StepBtn icon="add" onPress={handleInc} disabled={isAtMax} />
          <Text style={[s.qtyNum, isAtMax && s.qtyNumMax]}>
            {item.quantity}
          </Text>
          <StepBtn icon="remove" onPress={handleDec} />
        </View>
      </View>

      {/* Max quantity hint */}
      {isAtMax && product.stock > 0 && (
        <Animated.View entering={FadeInDown.duration(160)} style={s.maxHint}>
          <Ionicons
            name="alert-circle"
            size={10}
            color={theme.colors.amber[700]}
          />
          <Text style={s.maxHintText}>{t("common.maxQty")}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
});

// ─── Header section (extracted to avoid inline re‑creation) ──────────────────
const CartHeader = memo(function CartHeader({
  t,
  insetsTop,
  count,
  onClearPress,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  insetsTop: number;
  count: number;
  onClearPress: () => void;
}) {
  return (
    <LinearGradient
      colors={[theme.colors.hero, "#032840", "#053C5A"]}
      style={[s.header, { paddingTop: insetsTop + 14 }]}
    >
      <View style={s.headerGlowOrb} />
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <View style={s.headerIcon}>
            <Ionicons name="bag-outline" size={18} color={theme.colors.teal[500]} />
          </View>
          <View>
            <Text style={s.headerEyebrow}>{t("cart.eyebrow")}</Text>
            <Text style={s.headerTitle}>{t("cart.title")}</Text>
          </View>
        </View>
        <View style={s.headerActions}>
          <View style={s.countBadge}>
            <Text style={s.countText}>{t("cart.itemCount", { count })}</Text>
          </View>
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("cart.clearCart")}
            style={s.clearBtn}
            onPress={onClearPress}
          >
            <Ionicons
              name="trash-outline"
              size={13}
              color={theme.colors.error.base}
            />
            <Text style={s.clearText}>{t("common.clear")}</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CartScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal);
  const itemCount = useCartStore((s) => s.itemCount);
  const clearCart = useCartStore((s) => s.clearCart);

  const sub = useMemo(() => subtotal(), [subtotal, items]);
  const count = useMemo(() => itemCount(), [itemCount, items]);
  const delivery = useDeliveryContext();

  // Correct delivery cost: 0 when delivery is free
  const deliveryCost = delivery.isFree ? 0 : delivery.cost;
  const total = sub + deliveryCost;

  const progress = useMemo(
    () => Math.min(sub / FREE_DELIVERY_THRESHOLD, 1),
    [sub],
  );
  const remaining = delivery.isFree
    ? 0
    : delivery.amountToFreeDelivery?.toFixed(2) ?? "0.00";

  const handleClearCart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    showConfirmSheet(
      t("cart.clearCartTitle"),
      t("cart.clearCartMessage"),
      () => {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
        clearCart();
      },
      { confirmLabel: t("cart.clearAll"), danger: true },
    );
  }, [clearCart, t]);

  const handleCheckout = useCallback(() => {
    if (delivery.isDeliverable) {
      router.push("/checkout");
    }
  }, [delivery.isDeliverable, router]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={[s.header, { paddingTop: 16 }]}>
          <View style={s.headerLeft}>
            <View style={s.headerIcon}>
              <Ionicons name="bag-outline" size={18} color={theme.colors.teal[500]} />
            </View>
            <View>
              <Text style={s.headerEyebrow}>{t("cart.eyebrow")}</Text>
              <Text style={s.headerTitle}>{t("cart.title")}</Text>
            </View>
          </View>
        </View>
        <EmptyState
          icon="bag-outline"
          title={t("cart.emptyTitle")}
          description={t("cart.emptyDescription")}
          actionLabel={t("cart.emptyAction")}
          onAction={() => router.push("/(tabs)/products")}
        />
      </View>
    );
  }

  // ── Populated screen ────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      <CartHeader
        t={t}
        insetsTop={insets.top}
        count={count}
        onClearPress={handleClearCart}
      />

      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 16,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <CartListHeader
            t={t}
            delivery={delivery}
            progress={progress}
            remaining={remaining}
          />
        }
        renderItem={({ item, index }) => (
          <CartItemCard item={item} index={index} />
        )}
      />

      {/* Footer — sits naturally at the bottom in flex flow */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 10) + 8 }]}>
        <View style={s.footerHandle} />
        <View style={s.totalsBlock}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{t("cart.subtotal")}</Text>
            <Text style={s.totalValue}>
              {sub.toFixed(2)} {t("common.currency")}
            </Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>{t("cart.delivery")}</Text>
            {delivery.isFree ? (
              <Text style={s.totalFree}>{t("common.free")}</Text>
            ) : (
              <Text style={s.totalValue}>
                {deliveryCost.toFixed(2)} {t("common.currency")}
              </Text>
            )}
          </View>
          <View style={s.totalDivider} />
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>{t("cart.total")}</Text>
            <View style={s.grandRight}>
              <Text style={s.grandValue}>{total.toFixed(2)}</Text>
              <Text style={s.grandCurrency}>{t("common.currency")}</Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={handleCheckout}
          disabled={!delivery.isDeliverable}
          style={({ pressed }) => [
            s.checkoutOuter,
            pressed && { opacity: 0.93 },
            !delivery.isDeliverable && { opacity: 0.55 },
          ]}
        >
          <LinearGradient
            colors={
              delivery.isDeliverable
                ? [theme.colors.teal[500], theme.colors.brand[600]]
                : [theme.colors.slate[400], theme.colors.slate[400]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.checkoutGrad}
          >
            <Ionicons name="bag-check-outline" size={20} color="#fff" />
            <Text style={s.checkoutText}>
              {delivery.isDeliverable
                ? t("cart.checkoutBtn", { total: total.toFixed(2) })
                : t("cart.outsideDelivery")}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Extracted list header ────────────────────────────────────────────────────
const CartListHeader = memo(function CartListHeader({
  t,
  delivery,
  progress,
  remaining,
}: {
  t: (key: string, options?: Record<string, unknown>) => string;
  delivery: ReturnType<typeof useDeliveryContext>;
  progress: number;
  remaining: string;
}) {
  return (
    <>
      {/* Out-of-service banner */}
      {delivery.outOfServiceMessage && (
        <Animated.View entering={FadeInDown.duration(220)} style={s.warnBanner}>
          <Ionicons
            name="alert-circle"
            size={15}
            color={theme.colors.amber[700]}
          />
          <Text style={s.warnText}>
            {delivery.outOfServiceMessage ?? t("cart.outOfServiceArea")}
          </Text>
        </Animated.View>
      )}

      {/* Branch pill */}
      {delivery.branch && delivery.isDeliverable && (
        <Animated.View entering={FadeInDown.duration(240)} style={s.branchPill}>
          <View style={s.branchIconBox}>
            <Ionicons name="storefront-outline" size={14} color={theme.colors.teal[500]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.branchEyebrow}>{t("cart.deliveringFrom")}</Text>
            <Text style={s.branchName} numberOfLines={1}>
              {delivery.branch.fullNameAr ?? delivery.branch.nameAr}
              {delivery.distanceKm != null &&
                ` · ${delivery.distanceKm.toFixed(1)} ${t("home.kmUnit")}`}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={18} color={theme.colors.teal[500]} />
        </Animated.View>
      )}

      {/* Delivery progress */}
      <View style={s.deliveryCard}>
        {delivery.isFree ? (
          <View style={s.freeRow}>
            <LinearGradient
              colors={["#059669", "#10B981"]}
              style={s.freeIconBox}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#fff"
              />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.freeTitle}>{t("cart.freeDelivery")}</Text>
              <Text style={s.freeSub}>
                {t("cart.freeDeliverySubtitle", {
                  threshold: FREE_DELIVERY_THRESHOLD,
                })}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={s.progressHeader}>
              <View style={s.progressLeft}>
                <Ionicons
                  name="bicycle-outline"
                  size={15}
                  color={theme.colors.amber[700]}
                />
                <Text style={s.progressLabel}>
                  {t("cart.addForFreeDelivery", { remaining })}
                </Text>
              </View>
              <Text style={s.progressPct}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <View style={s.track}>
              <View
                style={[
                  s.fill,
                  { width: `${Math.max(progress * 100, 2)}%` as string },
                ]}
              />
            </View>
          </>
        )}
      </View>

      {/* Trust badges */}
      <View style={s.trustRow}>
        {(
          [
            {
              icon: "flash-outline" as const,
              label: t("cart.fastDelivery"),
              g: [theme.colors.amber[600], theme.colors.amber[500]] as [string, string],
            },
            {
              icon: "shield-checkmark-outline" as const,
              label: t("cart.securePayment"),
              g: ["#059669", "#10B981"] as [string, string],
            },
            {
              icon: "refresh-outline" as const,
              label: t("cart.guaranteedReturns"),
              g: ["#6D28D9", "#7C3AED"] as [string, string],
            },
          ] as const
        ).map((b, i, arr) => (
          <View
            key={b.label}
            style={[s.trustCell, i < arr.length - 1 && s.trustDivider]}
          >
            <LinearGradient colors={b.g} style={s.trustIconBox}>
              <Ionicons name={b.icon} size={13} color="#fff" />
            </LinearGradient>
            <Text style={s.trustLabel}>{b.label}</Text>
          </View>
        ))}
      </View>
    </>
  );
});

// ─── Styles (unchanged structure, only refined where necessary) ──────────────
const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FA",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    overflow: "hidden",
    backgroundColor: theme.colors.hero,
  },
  headerGlowOrb: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(13,184,168,0.12)",
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(13,184,168,0.15)",
    borderWidth: 1,
    borderColor: "rgba(13,184,168,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerEyebrow: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    textAlign: "right",
    letterSpacing: 0.4,
  },
  headerTitle: {
    fontFamily: theme.fonts.black,
    fontSize: 22,
    color: "#fff",
    textAlign: "right",
    letterSpacing: -0.4,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  countBadge: {
    backgroundColor: "rgba(13,184,168,0.18)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(13,184,168,0.35)",
  },
  countText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: "#5EEAD4",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
  },
  clearText: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.error.base,
  },
  warnBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.amber[50],
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.22)",
  },
  warnText: {
    flex: 1,
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    color: theme.colors.amber[900],
    textAlign: "right",
    lineHeight: 18,
  },
  branchPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    shadowColor: "#0C2240",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(13,184,168,0.14)",
  },
  branchIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(13,184,168,0.10)",
    borderWidth: 1,
    borderColor: "rgba(13,184,168,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  branchEyebrow: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.colors.text.tertiary,
    textAlign: "right",
  },
  branchName: {
    fontFamily: theme.fonts.black,
    fontSize: 13,
    color: theme.colors.text.primary,
    textAlign: "right",
    marginTop: 1,
  },
  deliveryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    shadowColor: "#0C2240",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  freeRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
  },
  freeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  freeTitle: {
    fontFamily: theme.fonts.black,
    fontSize: 15,
    color: "#059669",
    textAlign: "right",
    letterSpacing: -0.2,
  },
  freeSub: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#10B981",
    textAlign: "right",
    marginTop: 2,
  },
  progressHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  progressLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: "right",
    flex: 1,
  },
  progressPct: {
    fontFamily: theme.fonts.black,
    fontSize: 13,
    color: theme.colors.brand[700],
    marginLeft: 8,
  },
  track: {
    height: 7,
    backgroundColor: theme.colors.slate[100],
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: theme.colors.teal[500],
    borderRadius: 4,
  },
  trustRow: {
    flexDirection: "row-reverse",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 4,
    shadowColor: "#0C2240",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  trustCell: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  trustDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(15,23,42,0.08)",
  },
  trustIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  trustLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 9,
    color: theme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 13,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
    shadowColor: "#0C2240",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.05)",
  },
  cardTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 9.5,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "right",
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: theme.colors.error.bg,
    borderWidth: 1,
    borderColor: theme.colors.error.light,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMidRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
  },
  imgBox: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F0F4F8",
    flexShrink: 0,
  },
  imgFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.slate[50],
  },
  productName: {
    flex: 1,
    fontFamily: theme.fonts.black,
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: "right",
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  cardBottomRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  priceWrap: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: 4,
  },
  lineTotal: {
    fontFamily: theme.fonts.black,
    fontSize: 18,
    color: theme.colors.teal[600],
    letterSpacing: -0.4,
  },
  currency: {
    fontFamily: theme.fonts.bold,
    fontSize: 11,
    color: theme.colors.teal[500],
  },
  unitHint: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: theme.colors.text.tertiary,
    marginRight: 4,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F4F8",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.07)",
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(13,184,168,0.30)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.brand[600],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  stepBtnDisabled: {
    backgroundColor: theme.colors.slate[100],
    borderColor: "rgba(15,23,42,0.08)",
    shadowOpacity: 0,
    elevation: 0,
  },
  qtyNum: {
    fontFamily: theme.fonts.black,
    fontSize: 16,
    color: theme.colors.text.primary,
    minWidth: 22,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  qtyNumMax: {
    color: theme.colors.amber[700],
  },
  maxHint: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: theme.colors.amber[50],
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.20)",
  },
  maxHintText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: theme.colors.amber[700],
  },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 4,
    shadowColor: "#0C2240",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  footerHandle: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(15,23,42,0.08)",
    alignSelf: "center",
    marginBottom: 14,
  },
  totalsBlock: {
    gap: 8,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 13.5,
    color: theme.colors.text.secondary,
  },
  totalValue: {
    fontFamily: theme.fonts.semibold,
    fontSize: 13.5,
    color: theme.colors.text.primary,
  },
  totalFree: {
    fontFamily: theme.fonts.black,
    fontSize: 13.5,
    color: "#059669",
  },
  totalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.08)",
    marginVertical: 2,
  },
  grandRow: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  grandLabel: {
    fontFamily: theme.fonts.black,
    fontSize: 18,
    color: theme.colors.text.primary,
    letterSpacing: -0.3,
  },
  grandRight: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: 4,
  },
  grandValue: {
    fontFamily: theme.fonts.black,
    fontSize: 26,
    color: theme.colors.teal[600],
    letterSpacing: -0.8,
  },
  grandCurrency: {
    fontFamily: theme.fonts.bold,
    fontSize: 13,
    color: theme.colors.teal[500],
  },
  checkoutOuter: {
    borderRadius: 18,
    overflow: "hidden",
  },
  checkoutGrad: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
  },
  checkoutText: {
    fontFamily: theme.fonts.black,
    fontSize: 15,
    color: "#fff",
    letterSpacing: 0.1,
  },
});