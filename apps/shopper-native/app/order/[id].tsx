/**
 * Order Details — /order/[id]
 *
 * Full order view with:
 *   - Sticky header (order ID + status + payment badge)
 *   - Order timeline (contextual to payment method)
 *   - Purchased items (image from product_snapshot or hydrated from products)
 *   - Delivery address
 *   - Payment method card + proof image for manual payments
 *   - Price breakdown
 *
 * Deep link: tapping a product thumbnail navigates to /product/[id]
 */

import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Image as ExpoImage } from "expo-image";
import { Image as RNImage, Platform } from "react-native";

// expo-image passes camelCase fetchPriority to the DOM on web, which React doesn't
// recognise. Use RNImage on web to avoid the warning; ExpoImage on native for
// its superior caching and contentFit support.
function SafeImage({
  source,
  style,
  contentFit,
}: {
  source: { uri: string };
  style: object;
  contentFit: "contain" | "cover";
}) {
  if (Platform.OS === "web") {
    return <RNImage source={source} style={style} resizeMode={contentFit} />;
  }
  return <ExpoImage source={source} style={style} contentFit={contentFit} />;
}
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useOrderDetail } from "@/features/orders/hooks/useOrders";
import { Text as UIText } from "@/shared/ui";
import { Badge } from "@/components/ui/Badge";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";
import { useAppLanguage } from "@/i18n/LanguageProvider";
import type { Order, OrderStatus } from "@/stores/orders";

// ─── Status / payment metadata ────────────────────────────────────────────────

type StatusVariant = "success" | "warning" | "brand" | "error" | "neutral";

const ORDER_STATUS_META: Record<
  OrderStatus,
  { labelKey: string; variant: StatusVariant; icon: React.ComponentProps<typeof Ionicons>["name"] }
> = {
  pending:         { labelKey: "orders.pending",        variant: "warning", icon: "time-outline"             },
  pending_payment: { labelKey: "orders.pendingPayment",  variant: "warning", icon: "card-outline"             },
  processing:      { labelKey: "orders.processing",     variant: "brand",   icon: "refresh-outline"          },
  shipped:         { labelKey: "orders.shipped",        variant: "brand",   icon: "car-outline"              },
  delivered:       { labelKey: "orders.delivered",      variant: "success", icon: "checkmark-circle-outline" },
  cancelled:       { labelKey: "orders.cancelled",      variant: "error",   icon: "close-circle-outline"     },
};

const PAYMENT_METHOD_META: Record<
  string,
  { labelKey: string; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; bg: string }
> = {
  cod:          { labelKey: "checkout.methodCodTitle",      icon: "cash-outline",   color: theme.colors.green[700],  bg: theme.colors.green[50]  },
  vodafone:     { labelKey: "checkout.methodVodafoneTitle", icon: "wallet-outline", color: theme.colors.red[600],    bg: theme.colors.red[50]    },
  vodafone_cash:{ labelKey: "checkout.methodVodafoneTitle", icon: "wallet-outline", color: theme.colors.red[600],    bg: theme.colors.red[50]    },
  instapay:     { labelKey: "checkout.methodInstapayTitle", icon: "flash-outline",  color: theme.colors.purple[600], bg: theme.colors.purple[50] },
};

function getPaymentMeta(method: string | null) {
  if (!method) return PAYMENT_METHOD_META.cod;
  return PAYMENT_METHOD_META[method] ?? PAYMENT_METHOD_META.cod;
}

function getPaymentStatusDisplay(status: string): { labelKey: string; color: string; icon: React.ComponentProps<typeof Ionicons>["name"] } {
  switch (status) {
    case "pending_verification":
      return { labelKey: "orders.paymentStatusPendingVerification", color: theme.colors.amber[700],  icon: "hourglass-outline"    };
    case "verified":
    case "paid":
      return { labelKey: "orders.paymentStatusVerified",            color: theme.colors.green[700],  icon: "checkmark-circle"     };
    case "failed":
      return { labelKey: "orders.paymentStatusFailed",              color: theme.colors.red[600],    icon: "close-circle-outline" };
    case "pending":
    default:
      return { labelKey: "orders.paymentStatusPending",             color: theme.colors.slate[500],  icon: "time-outline"         };
  }
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

interface TimelineStep {
  key:      string;
  labelKey: string;
  done:     boolean;
  icon:     React.ComponentProps<typeof Ionicons>["name"];
}

function buildTimeline(order: Order): TimelineStep[] {
  const isCod    = !order.paymentMethod || order.paymentMethod === "cod";
  const isManual = !isCod;
  const s        = order.status;
  const ps       = order.paymentStatus;

  const done = (check: boolean) => check;

  const base: TimelineStep[] = [
    { key: "placed",     labelKey: "orders.stepPlaced",           done: true, icon: "bag-check-outline" },
  ];

  if (isManual) {
    base.push(
      { key: "payment_uploaded", labelKey: "orders.stepPaymentUploaded", done: done(["pending_verification","verified","paid"].includes(ps)), icon: "cloud-upload-outline"       },
      { key: "payment_verified", labelKey: "orders.stepPaymentVerified", done: done(["verified","paid"].includes(ps)),                         icon: "shield-checkmark-outline"   },
    );
  }

  base.push(
    { key: "processing", labelKey: "orders.stepProcessing", done: done(["processing","shipped","delivered"].includes(s)), icon: "cube-outline"              },
    { key: "shipped",    labelKey: "orders.stepShipped",    done: done(["shipped","delivered"].includes(s)),               icon: "car-outline"               },
    { key: "delivered",  labelKey: "orders.stepDelivered",  done: done(s === "delivered"),                                  icon: "checkmark-circle-outline"  },
  );

  if (s === "cancelled") {
    return base
      .filter((step) => ["placed","cancelled_status"].includes(step.key))
      .concat([
        { key: "cancelled_status", labelKey: "orders.stepCancelled", done: true, icon: "close-circle-outline" },
      ]);
  }

  return base;
}

// ─── Helper: date format ──────────────────────────────────────────────────────

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "ar-EG", {
      weekday: "long",
      day:     "numeric",
      month:   "long",
      year:    "numeric",
    });
  } catch { return iso; }
}

function formatTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale === "en" ? "en-US" : "ar-EG", {
      hour:   "2-digit",
      minute: "2-digit",
    });
  } catch { return ""; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailSection({
  title,
  icon,
  delay = 0,
  children,
}: {
  title:    string;
  icon:     React.ComponentProps<typeof Ionicons>["name"];
  delay?:   number;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(360)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconBox}>
          <Ionicons name={icon} size={14} color={theme.colors.brand[700]} />
        </View>
        <UIText variant="card-title" align="right" style={styles.sectionTitle}>
          {title}
        </UIText>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </Animated.View>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label:      string;
  value:      string;
  valueColor?: string;
}): React.ReactElement {
  return (
    <View style={styles.infoRow}>
      <UIText variant="body-sm" color="secondary">{label}</UIText>
      <UIText
        variant="body-sm"
        weight="bold"
        style={{ color: valueColor ?? theme.colors.text.primary, textAlign: "left" }}>
        {value}
      </UIText>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OrderDetailScreen(): React.ReactElement {
  const router            = useRouter();
  const insets            = useSafeAreaInsets();
  const { t }             = useTranslation();
  const { language }      = useAppLanguage();
  const { id }            = useLocalSearchParams<{ id: string }>();

  const {
    data:        order,
    isLoading,
    isRefetching,
    refetch,
    isError,
  } = useOrderDetail(id);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <HeaderBackButton onPress={() => router.back()} />
        </View>
        <ActivityIndicator
          size="large"
          color={theme.colors.brand[600]}
          style={{ marginTop: 80 }}
        />
      </View>
    );
  }

  // ── Error / not found ──────────────────────────────────────────────────────
  if (isError || !order) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <HeaderBackButton onPress={() => router.back()} />
        </View>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.slate[300]} />
          <UIText variant="sheet-title" color="secondary" align="center" style={{ marginTop: 16 }}>
            {t("orders.loadError")}
          </UIText>
          <UIText variant="body" color="muted" align="center" style={{ marginTop: 8 }}>
            {t("orders.loadErrorDesc")}
          </UIText>
          <Pressable onPress={handleRefresh} style={styles.retryBtn}>
            <UIText variant="body-sm" weight="bold" style={{ color: theme.colors.brand[700] }}>
              {t("common.retry")}
            </UIText>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusMeta  = ORDER_STATUS_META[order.status] ?? ORDER_STATUS_META.pending;
  const pmMeta      = getPaymentMeta(order.paymentMethod);
  const psDisplay   = getPaymentStatusDisplay(order.paymentStatus);
  const timeline    = buildTimeline(order);
  const shortId     = order.id.slice(-8).toUpperCase();
  const isManualPay = order.paymentMethod && order.paymentMethod !== "cod";
  const address     = order.address;
  const formattedAddress =
    address.formatted ??
    [
      address.street,
      address.building && t("orders.building", { n: address.building }),
      address.floor    && t("orders.floor",    { n: address.floor    }),
      address.apartment && t("orders.apt",     { n: address.apartment }),
      address.city,
    ]
      .filter(Boolean)
      .join(language === "en" ? ", " : "، ");

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.duration(240)}
        style={styles.header}>
        <HeaderBackButton onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <UIText variant="eyebrow" color="tertiary" align="right">
            {t("orders.orderDetail")}
          </UIText>
          <UIText variant="card-title" align="right" style={styles.headerOrderId}>
            #{shortId}
          </UIText>
        </View>
        <Badge variant={statusMeta.variant} size="sm">{t(statusMeta.labelKey)}</Badge>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.brand[600]}
            colors={[theme.colors.brand[600]]}
          />
        }>

        {/* ── Meta chip row ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(30).duration(320)} style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.slate[500]} />
            <UIText variant="eyebrow" color="tertiary">{formatDate(order.createdAt, language)}</UIText>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={12} color={theme.colors.slate[500]} />
            <UIText variant="eyebrow" color="tertiary">{formatTime(order.createdAt, language)}</UIText>
          </View>
          {order.items.length > 0 && (
            <View style={styles.metaChip}>
              <Ionicons name="cube-outline" size={12} color={theme.colors.slate[500]} />
              <UIText variant="eyebrow" color="tertiary">
                {t("orders.items", { count: order.items.length })}
              </UIText>
            </View>
          )}
        </Animated.View>

        {/* ── Timeline ──────────────────────────────────────────────────── */}
        <DetailSection title={t("orders.timeline")} icon="git-branch-outline" delay={60}>
          {timeline.map((step, i) => (
            <View key={step.key} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    step.done
                      ? styles.timelineDotDone
                      : styles.timelineDotPending,
                  ]}>
                  <Ionicons
                    name={step.icon}
                    size={13}
                    color={step.done ? "#fff" : theme.colors.slate[400]}
                  />
                </View>
                {i < timeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      step.done && styles.timelineLineDone,
                    ]}
                  />
                )}
              </View>
              <UIText
                variant="body-sm"
                weight={step.done ? "bold" : "regular"}
                style={{
                  color:      step.done ? theme.colors.text.primary : theme.colors.slate[400],
                  textAlign:  "right",
                  flex:       1,
                  marginRight: 12,
                }}>
                {t(step.labelKey)}
              </UIText>
            </View>
          ))}
        </DetailSection>

        {/* ── Items ─────────────────────────────────────────────────────── */}
        {order.items.length > 0 && (
          <DetailSection title={t("orders.itemsSection")} icon="bag-outline" delay={120}>
            {order.items.map((item) => (
              <Pressable
                key={item.productId}
                style={({ pressed }) => [
                  styles.itemCard,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
                ]}
                onPress={() => router.push(`/product/${item.productId}`)}
                accessibilityRole="button"
                accessibilityLabel={item.name}>
                {item.imageUrl ? (
                  <SafeImage
                    source={{ uri: item.imageUrl }}
                    style={styles.itemImage}
                    contentFit="contain"
                  />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                    <Ionicons
                      name="medkit-outline"
                      size={22}
                      color={theme.colors.slate[300]}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <UIText
                    variant="body-sm"
                    weight="bold"
                    align="right"
                    numberOfLines={2}>
                    {item.name || t("orders.noItems")}
                  </UIText>
                  <View style={styles.itemMeta}>
                    <UIText variant="caption" color="secondary">
                      {t("orders.qty", { count: item.quantity })}
                    </UIText>
                    <UIText
                      variant="caption"
                      weight="bold"
                      style={{ color: theme.colors.brand[700] }}>
                      {formatPrice(item.price)}
                    </UIText>
                  </View>
                </View>
                <Ionicons
                  name="chevron-back"
                  size={14}
                  color={theme.colors.slate[300]}
                />
              </Pressable>
            ))}
          </DetailSection>
        )}

        {/* ── Delivery address ──────────────────────────────────────────── */}
        <DetailSection title={t("orders.addressSection")} icon="location-outline" delay={180}>
          <View style={styles.addressCard}>
            <View style={styles.addressRow}>
              <Ionicons
                name="person-outline"
                size={14}
                color={theme.colors.brand[700]}
              />
              <UIText variant="body-sm" weight="bold" style={styles.addressText}>
                {address.name}
              </UIText>
            </View>
            <View style={styles.addressRow}>
              <Ionicons
                name="call-outline"
                size={14}
                color={theme.colors.brand[700]}
              />
              <UIText variant="body-sm" style={styles.addressText}>
                {address.phone}
              </UIText>
            </View>
            <View style={[styles.addressRow, { alignItems: "flex-start" }]}>
              <Ionicons
                name="map-outline"
                size={14}
                color={theme.colors.brand[700]}
                style={{ marginTop: 2 }}
              />
              <UIText
                variant="body-sm"
                style={[styles.addressText, { flex: 1 }]}
                numberOfLines={3}>
                {formattedAddress}
              </UIText>
            </View>
          </View>
        </DetailSection>

        {/* ── Payment ───────────────────────────────────────────────────── */}
        <DetailSection title={t("checkout.paymentSection")} icon="card-outline" delay={240}>
          <View style={[styles.paymentCard, { backgroundColor: pmMeta.bg }]}>
            <View style={[styles.paymentIconBox, { backgroundColor: "#fff" }]}>
              <Ionicons name={pmMeta.icon} size={20} color={pmMeta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <UIText
                variant="body-sm"
                weight="bold"
                align="right"
                style={{ color: pmMeta.color }}>
                {t(pmMeta.labelKey)}
              </UIText>
              <View style={styles.paymentStatusRow}>
                <Ionicons name={psDisplay.icon} size={12} color={psDisplay.color} />
                <UIText
                  variant="caption"
                  style={{ color: psDisplay.color, marginRight: 4 }}>
                  {t(psDisplay.labelKey)}
                </UIText>
              </View>
            </View>
          </View>

          {/* Transfer number if manual */}
          {isManualPay && order.transferNumber && (
            <View style={styles.transferRow}>
              <UIText variant="caption" color="tertiary">{t("orders.transferNumber")}</UIText>
              <UIText variant="body-sm" weight="bold">
                {order.transferNumber}
              </UIText>
            </View>
          )}

          {/* Payment proof image if available */}
          {isManualPay && order.paymentProofUrl && (
            <View style={styles.proofContainer}>
              <UIText
                variant="eyebrow"
                color="tertiary"
                align="right"
                style={{ marginBottom: 8 }}>
                {t("orders.paymentProof")}
              </UIText>
              <SafeImage
                source={{ uri: order.paymentProofUrl }}
                style={styles.proofImage}
                contentFit="cover"
              />
            </View>
          )}
        </DetailSection>

        {/* ── Price breakdown ───────────────────────────────────────────── */}
        <DetailSection title={t("orders.priceSection")} icon="receipt-outline" delay={300}>
          <InfoRow
            label={t("checkout.subtotalRow", { count: order.items.length })}
            value={formatPrice(order.subtotal)}
          />
          <View style={styles.priceDivider} />
          <InfoRow
            label={t("checkout.deliveryRow")}
            value={order.delivery === 0 ? t("common.free") : formatPrice(order.delivery)}
            valueColor={order.delivery === 0 ? theme.colors.green[600] : undefined}
          />
          {(order.discountTotal ?? 0) > 0 && (
            <InfoRow
              label={t("checkout.discountRow")}
              value={`−${formatPrice(order.discountTotal ?? 0)}`}
              valueColor={theme.colors.green[600]}
            />
          )}
          <View style={[styles.priceDivider, { marginVertical: 12 }]} />
          <View style={styles.totalRow}>
            <UIText variant="body" weight="extrabold" color="primary">
              {t("orders.total")}
            </UIText>
            <UIText
              variant="card-title"
              weight="black"
              style={{ color: theme.colors.brand[700], letterSpacing: -0.4 }}>
              {formatPrice(order.total)}
            </UIText>
          </View>
        </DetailSection>

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        {order.address.notes ? (
          <DetailSection title={t("orders.notesSection")} icon="chatbubble-outline" delay={360}>
            <UIText variant="body-sm" color="secondary" align="right" style={{ lineHeight: 22 }}>
              {order.address.notes}
            </UIText>
          </DetailSection>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Header back button ───────────────────────────────────────────────────────

function HeaderBackButton({ onPress }: { onPress: () => void }): React.ReactElement {
  return (
    <Pressable onPress={onPress} style={styles.backBtn} hitSlop={8} accessibilityRole="button">
      <Ionicons name="chevron-forward" size={18} color={theme.colors.slate[700]} />
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  centerScreen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: 16,
    paddingBottom:     14,
    paddingTop:        10,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
    shadowColor:       "#0C2240",
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.04,
    shadowRadius:      6,
    elevation:         2,
  },
  headerOrderId: {
    letterSpacing: -0.3,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: theme.colors.subtle,
    alignItems:      "center",
    justifyContent:  "center",
  },
  scrollContent: {
    padding: theme.layout.pagePaddingH,
    gap:     14,
  },

  // Meta chips
  metaRow: {
    flexDirection:  "row-reverse",
    flexWrap:       "wrap",
    gap:            8,
    marginBottom:   2,
  },
  metaChip: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             5,
    backgroundColor: theme.colors.slate[50],
    paddingHorizontal: 10,
    paddingVertical:   6,
    borderRadius:      999,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },

  // Section card
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    ...theme.shadow.card,
  },
  sectionHeader: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 16,
    paddingTop:        14,
    paddingBottom:     8,
  },
  sectionIconBox: {
    width:           30,
    height:          30,
    borderRadius:    10,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  sectionTitle: {
    letterSpacing: -0.2,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom:     16,
    paddingTop:        4,
    gap:               10,
  },

  // Timeline
  timelineRow: {
    flexDirection: "row-reverse",
    alignItems:    "flex-start",
    marginBottom:  4,
  },
  timelineLeft: {
    alignItems:  "center",
    width:       36,
    marginLeft:  4,
  },
  timelineDot: {
    width:           32,
    height:          32,
    borderRadius:    16,
    alignItems:      "center",
    justifyContent:  "center",
  },
  timelineDotDone: {
    backgroundColor: theme.colors.brand[600],
  },
  timelineDotPending: {
    backgroundColor: theme.colors.slate[100],
    borderWidth:     1,
    borderColor:     theme.colors.slate[200],
  },
  timelineLine: {
    width:           2,
    height:          20,
    marginTop:       3,
    backgroundColor: theme.colors.slate[200],
    borderRadius:    1,
  },
  timelineLineDone: {
    backgroundColor: theme.colors.brand[300],
  },

  // Item cards
  itemCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    14,
    padding:         12,
  },
  itemImage: {
    width:        60,
    height:       60,
    borderRadius: 10,
    overflow:     "hidden",
  },
  itemImagePlaceholder: {
    backgroundColor: theme.colors.slate[100],
    alignItems:      "center",
    justifyContent:  "center",
  },
  itemMeta: {
    flexDirection:  "row-reverse",
    justifyContent: "space-between",
    marginTop:      4,
  },

  // Address
  addressCard: {
    backgroundColor: theme.colors.slate[50],
    borderRadius:    14,
    padding:         14,
    gap:             10,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
  },
  addressRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
  },
  addressText: {
    textAlign: "right",
    flex:      1,
  },

  // Payment
  paymentCard: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
    borderRadius:  14,
    padding:       14,
  },
  paymentIconBox: {
    width:           44,
    height:          44,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.card,
  },
  paymentStatusRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    gap:            4,
    marginTop:      4,
  },
  transferRow: {
    flexDirection:  "row-reverse",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius:   10,
    backgroundColor: theme.colors.slate[50],
    borderWidth:    1,
    borderColor:    theme.colors.border.hairline,
  },
  proofContainer: {
    marginTop: 4,
  },
  proofImage: {
    width:        "100%",
    height:       220,
    borderRadius: 14,
    overflow:     "hidden",
    backgroundColor: theme.colors.slate[100],
  },

  // Price
  infoRow: {
    flexDirection:  "row-reverse",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingVertical: 3,
  },
  priceDivider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  6,
  },
  totalRow: {
    flexDirection:  "row-reverse",
    justifyContent: "space-between",
    alignItems:     "baseline",
  },

  // Error state
  errorState: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    paddingBottom:     80,
  },
  retryBtn: {
    marginTop:         20,
    paddingHorizontal: 24,
    paddingVertical:   12,
    borderRadius:      12,
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
  },
});
