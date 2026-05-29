import React, { memo, useCallback } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "@/i18n/LanguageProvider";
import { useAuth } from "@/features/auth";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { AppHeader } from "@/shared/components";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";
import type { Order, OrderStatus } from "@/stores/orders";
import { useOrders } from "../hooks/useOrders";

// ─── Status metadata ─────────────────────────────────────────────────────────

const STATUS_META: Record<
  OrderStatus,
  {
    labelKey: string;
    variant:  "success" | "warning" | "brand" | "error" | "neutral";
    icon:     React.ComponentProps<typeof Ionicons>["name"];
  }
> = {
  pending:         { labelKey: "orders.pending",    variant: "warning", icon: "time-outline"             },
  pending_payment: { labelKey: "orders.pendingPayment", variant: "warning", icon: "card-outline"         },
  processing:      { labelKey: "orders.processing", variant: "brand",   icon: "refresh-outline"          },
  shipped:         { labelKey: "orders.shipped",    variant: "brand",   icon: "car-outline"              },
  delivered:       { labelKey: "orders.delivered",  variant: "success", icon: "checkmark-circle-outline" },
  cancelled:       { labelKey: "orders.cancelled",  variant: "error",   icon: "close-circle-outline"     },
};

// ─── Payment status helpers ───────────────────────────────────────────────────

function paymentStatusMeta(
  paymentStatus: string,
  t: (k: string) => string,
): {
  label: string;
  color: string;
  bg:    string;
} {
  switch (paymentStatus) {
    case "pending_verification":
      return { label: t("orders.paymentPendingVerification"), color: theme.colors.amber[700], bg: theme.colors.amber[50] };
    case "verified":
    case "paid":
      return { label: t("orders.paymentVerified"),            color: theme.colors.green[700], bg: theme.colors.green[50] };
    case "failed":
      return { label: t("orders.paymentFailed"),              color: theme.colors.red[700],   bg: theme.colors.red[50] };
    default:
      return { label: "",                                      color: "",                       bg: "" };
  }
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDate(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
      day:   "numeric",
      month: "long",
      year:  "numeric",
    });
  } catch {
    return "";
  }
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard(): React.ReactElement {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.card}>
      <View style={styles.skeletonHeader}>
        <View style={[styles.skeletonRect, { width: 34, height: 34, borderRadius: 11 }]} />
        <View style={{ flex: 1, gap: 6, marginRight: 10 }}>
          <View style={[styles.skeletonRect, { width: "40%", height: 10 }]} />
          <View style={[styles.skeletonRect, { width: "30%", height: 14 }]} />
        </View>
        <View style={[styles.skeletonRect, { width: 70, height: 22, borderRadius: 8 }]} />
      </View>
      <View style={styles.skeletonItems}>
        <View style={[styles.skeletonRect, { width: 54, height: 54, borderRadius: 12 }]} />
        <View style={{ flex: 1, gap: 6, marginRight: 10 }}>
          <View style={[styles.skeletonRect, { width: "60%", height: 12 }]} />
          <View style={[styles.skeletonRect, { width: "40%", height: 10 }]} />
        </View>
      </View>
      <View style={styles.skeletonFooter}>
        <View style={[styles.skeletonRect, { width: 60, height: 10 }]} />
        <View style={[styles.skeletonRect, { width: 80, height: 18, borderRadius: 6 }]} />
      </View>
    </Animated.View>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

const OrderCard = memo(function OrderCard({
  order,
  index,
  onPress,
}: {
  order:   Order;
  index:   number;
  onPress: (id: string) => void;
}): React.ReactElement {
  const { t }          = useTranslation();
  const { language }   = useAppLanguage();
  const meta       = STATUS_META[order.status] ?? STATUS_META.pending;
  const firstItem  = order.items[0];
  const extraCount = order.items.length - 1;
  const shortId    = order.id.slice(-8).toUpperCase();
  const pmStatus   = paymentStatusMeta(order.paymentStatus ?? "", t);

  return (
    <Animated.View
      entering={FadeInDown
        .duration(340)
        .delay(index * 60)
        .springify()
        .damping(20)}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.96, transform: [{ scale: 0.995 }] },
        ]}
        onPress={() => onPress(order.id)}
        accessibilityRole="button"
        accessibilityLabel={`${t("orders.orderLabel")} ${shortId}`}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.orderIconBox}>
              <Ionicons name="bag-outline" size={16} color={theme.colors.brand[700]} />
            </View>
            <View>
              <UIText variant="eyebrow" color="tertiary" align="right">{t("orders.orderLabel")}</UIText>
              <UIText variant="card-title" align="right" style={styles.orderIdText}>
                #{shortId}
              </UIText>
              <UIText variant="caption" color="muted" align="right" style={styles.orderDateText}>
                {formatDate(order.createdAt, language)}
              </UIText>
            </View>
          </View>
          <View style={styles.badgeStack}>
            <Badge variant={meta.variant} size="sm">{t(meta.labelKey)}</Badge>
            {pmStatus.label ? (
              <View style={[styles.pmBadge, { backgroundColor: pmStatus.bg }]}>
                <UIText variant="eyebrow" style={{ color: pmStatus.color }}>
                  {pmStatus.label}
                </UIText>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Items preview ──────────────────────────────────────────────── */}
        <View style={styles.itemsRow}>
          {firstItem?.imageUrl ? (
            <Image
              source={{ uri: firstItem.imageUrl }}
              style={styles.itemThumb}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
              <Ionicons
                name="medkit-outline"
                size={18}
                color={theme.colors.slate[300]}
              />
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <UIText
              variant="body-sm"
              weight="bold"
              align="right"
              numberOfLines={1}>
              {firstItem?.name || t("orders.noItems")}
            </UIText>
            {order.items.length > 1 && (
              <UIText variant="caption" color="tertiary" align="right">
                {t("orders.moreItems", { count: extraCount })}
              </UIText>
            )}
            {order.items.length === 0 && (
              <UIText variant="caption" color="muted" align="right">
                {t("orders.noItems")}
              </UIText>
            )}
          </View>
          <Ionicons
            name="chevron-back"
            size={14}
            color={theme.colors.slate[400]}
            style={{ marginLeft: 4 }}
          />
        </View>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <View style={styles.cardFooter}>
          <UIText variant="body-sm" color="secondary">{t("orders.total")}</UIText>
          <UIText
            variant="card-title"
            weight="black"
            align="right"
            style={styles.totalValue}>
            {formatPrice(order.total)}
          </UIText>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export interface OrdersScreenProps {
  showBack?: boolean;
}

export function OrdersScreen({
  showBack = true,
}: OrdersScreenProps): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();
  const { user } = useAuth();

  const {
    data:        orders        = [],
    isLoading,
    isRefetching,
    refetch,
    isSuccess,
  } = useOrders(user?.id);

  const handleOrderPress = useCallback(
    (orderId: string) => router.push(`/order/${orderId}`),
    [router],
  );

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <View style={styles.screen}>
      <AppHeader title={t("orders.title")} showBack={showBack} />

      {isLoading ? (
        <View style={[styles.list, { paddingBottom: insets.bottom + 24, gap: 12 }]}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : isSuccess && orders.length === 0 ? (
        <EmptyState
          icon="bag-outline"
          title={t("orders.empty")}
          description={t("orders.emptyDescription")}
          actionLabel={t("common.shopNow")}
          onAction={() => router.push("/(tabs)/products")}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={theme.colors.brand[600]}
              colors={[theme.colors.brand[600]]}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <UIText variant="eyebrow" color="tertiary" align="right">
                {t("orders.eyebrow")}
              </UIText>
              <UIText
                variant="card-title"
                align="right"
                style={styles.listHeaderTitle}>
                {t("orders.countOrders", { count: orders.length })}
              </UIText>
            </View>
          }
          renderItem={({ item, index }) => (
            <OrderCard
              order={item}
              index={index}
              onPress={handleOrderPress}
            />
          )}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  list: {
    padding: theme.layout.pagePaddingH,
    gap:     12,
  },
  listHeader: {
    marginBottom: 6,
    gap:          2,
  },
  listHeaderTitle: {
    letterSpacing: -0.3,
  },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    padding:         18,
    gap:             14,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "flex-start",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
  },
  orderIconBox: {
    width:           34,
    height:          34,
    borderRadius:    11,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  orderIdText: {
    letterSpacing: -0.2,
    marginTop:     1,
  },
  orderDateText: {
    marginTop:     1,
    textTransform: "none",
    letterSpacing: 0,
  },
  badgeStack: {
    alignItems: "flex-end",
    gap:        4,
  },
  pmBadge: {
    paddingHorizontal: 7,
    paddingVertical:   3,
    borderRadius:      6,
  },

  // Items row
  itemsRow: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    theme.radius.lg,
    padding:         12,
  },
  itemThumb: {
    width:           54,
    height:          54,
    borderRadius:    theme.radius.md,
    overflow:        "hidden",
    backgroundColor: theme.colors.surface,
  },
  itemThumbPlaceholder: {
    backgroundColor: theme.colors.slate[100],
    alignItems:      "center",
    justifyContent:  "center",
  },

  // Footer
  cardFooter: {
    flexDirection:  "row-reverse",
    justifyContent: "space-between",
    alignItems:     "center",
    paddingTop:     12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.hairline,
  },
  totalValue: {
    color:         theme.colors.brand[700],
    letterSpacing: -0.4,
  },

  // Skeleton
  skeletonHeader: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
  },
  skeletonItems: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    theme.radius.lg,
    padding:         12,
  },
  skeletonFooter: {
    flexDirection:  "row-reverse",
    justifyContent: "space-between",
    paddingTop:     12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.hairline,
  },
  skeletonRect: {
    backgroundColor: theme.colors.slate[100],
    borderRadius:    6,
  },
});
