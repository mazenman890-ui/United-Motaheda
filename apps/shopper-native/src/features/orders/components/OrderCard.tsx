import React, { memo, useCallback } from "react";
import { Platform, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "@/i18n/LanguageProvider";
import { Badge } from "@/components/ui/Badge";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { formatPrice } from "@/utils/format";
import type { Order, OrderStatus } from "@/stores/orders";
import { listS, INDIGO_DOT, EMERALD_DOT } from "./orders.styles";

// ─── Status metadata ──────────────────────────────────────────────────────────

export const STATUS_META: Record<
  OrderStatus,
  {
    labelKey: string;
    variant:  "success" | "warning" | "brand" | "error" | "neutral";
    icon:     React.ComponentProps<typeof Ionicons>["name"];
    dot:      string;
  }
> = {
  pending:         { labelKey: "orders.pending",        variant: "warning", icon: "time-outline",             dot: theme.colors.amber[500] },
  pending_payment: { labelKey: "orders.pendingPayment", variant: "warning", icon: "card-outline",             dot: theme.colors.amber[500] },
  processing:      { labelKey: "orders.processing",     variant: "brand",   icon: "refresh-outline",          dot: theme.colors.teal[500]  },
  shipped:         { labelKey: "orders.shipped",        variant: "brand",   icon: "car-outline",              dot: INDIGO_DOT              },
  delivered:       { labelKey: "orders.delivered",      variant: "success", icon: "checkmark-circle-outline", dot: EMERALD_DOT             },
  cancelled:       { labelKey: "orders.cancelled",      variant: "error",   icon: "close-circle-outline",     dot: theme.colors.red[500]   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDate(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return "";
  }
}

export function paymentDot(status: string): string | null {
  switch (status) {
    case "pending_verification": return theme.colors.amber[500];
    case "verified":
    case "paid":                 return EMERALD_DOT;
    case "failed":               return theme.colors.red[500];
    default:                     return null;
  }
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

export function SkeletonCard(): React.ReactElement {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={listS.card}>
      <View style={listS.skeletonRow}>
        <View style={[listS.skeletonRect, { width: 36, height: 36, borderRadius: 12 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[listS.skeletonRect, { width: "35%", height: 9 }]} />
          <View style={[listS.skeletonRect, { width: "55%", height: 14 }]} />
          <View style={[listS.skeletonRect, { width: "40%", height: 9 }]} />
        </View>
        <View style={[listS.skeletonRect, { width: 72, height: 24, borderRadius: 20 }]} />
      </View>
      <View style={listS.skeletonItems}>
        <View style={[listS.skeletonRect, { width: 56, height: 56, borderRadius: 14 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[listS.skeletonRect, { width: "65%", height: 12 }]} />
          <View style={[listS.skeletonRect, { width: "40%", height: 10 }]} />
        </View>
      </View>
      <View style={listS.skeletonFooter}>
        <View style={[listS.skeletonRect, { width: 70, height: 10, borderRadius: 4 }]} />
        <View style={[listS.skeletonRect, { width: 90, height: 18, borderRadius: 6 }]} />
      </View>
    </Animated.View>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

export const OrderCard = memo(function OrderCard({
  order, index, onPress,
}: { order: Order; index: number; onPress: (id: string) => void }): React.ReactElement {
  const { t }        = useTranslation();
  const { language } = useAppLanguage();
  const meta         = STATUS_META[order.status] ?? STATUS_META.pending;
  const firstItem    = order.items[0];
  const extraCount   = order.items.length - 1;
  const shortId      = order.id.slice(-8).toUpperCase();
  const pmDot        = paymentDot(order.paymentStatus ?? "");

  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress     = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress(order.id);
  }, [onPress, order.id]);
  const handlePressIn   = useCallback(() => { scale.value = withSpring(0.978, { damping: 20, stiffness: 400 }); }, [scale]);
  const handlePressOut  = useCallback(() => { scale.value = withSpring(1.0,   { damping: 18, stiffness: 380 }); }, [scale]);

  return (
    <Animated.View
      style={cardAnim}
      entering={FadeInDown.duration(340).delay(index * 55).springify().damping(22)}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={listS.card}>

        <View style={[listS.statusLine, { backgroundColor: meta.dot }]} />

        <View style={listS.cardHeader}>
          <View style={listS.headerLeft}>
            <View style={[listS.orderIcon, { borderColor: meta.dot + "30", backgroundColor: meta.dot + "12" }]}>
              <Ionicons name={meta.icon} size={16} color={meta.dot} />
            </View>
            <View>
              <UIText style={listS.orderRef}>{t("orders.orderLabel")} #{shortId}</UIText>
              <UIText style={listS.orderDate}>{formatDate(order.createdAt, language)}</UIText>
            </View>
          </View>
          <View style={listS.badgeGroup}>
            <Badge variant={meta.variant} size="sm">{t(meta.labelKey)}</Badge>
            {pmDot && <View style={[listS.pmDot, { backgroundColor: pmDot }]} />}
          </View>
        </View>

        <View style={listS.itemsRow}>
          {firstItem?.imageUrl ? (
            <Image source={{ uri: firstItem.imageUrl }} style={listS.itemThumb} contentFit="contain" />
          ) : (
            <View style={[listS.itemThumb, listS.itemPlaceholder]}>
              <Ionicons name="medkit-outline" size={20} color={theme.colors.slate[300]} />
            </View>
          )}
          <View style={{ flex: 1, gap: 3 }}>
            <UIText variant="body-sm" weight="bold" align="right" numberOfLines={1}>
              {firstItem?.name || t("orders.noItems")}
            </UIText>
            {extraCount > 0 && (
              <UIText variant="caption" color="muted" align="right">
                {t("orders.moreItems", { count: extraCount })}
              </UIText>
            )}
          </View>
          <Ionicons name="chevron-back" size={14} color={theme.colors.slate[300]} />
        </View>

        <View style={listS.cardFooter}>
          <UIText variant="caption" color="muted">{t("orders.total")}</UIText>
          <UIText style={listS.totalText}>{formatPrice(order.total)}</UIText>
        </View>
      </Pressable>
    </Animated.View>
  );
});
