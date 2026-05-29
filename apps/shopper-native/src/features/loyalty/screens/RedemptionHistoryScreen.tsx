/**
 * RedemptionHistoryScreen — full history of all gift redemptions (all states).
 *
 * Groups by state: active (reserved/fulfilled) at top, then cancelled/expired.
 * Shows tracking number when available. Cancel action for reserved items.
 */

import React, { useCallback, useMemo } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { theme } from "@/theme";
import { useScreenTrace } from "@/features/observability";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { useRedemptions } from "../hooks/useRedemptions";
import { useCancelGiftRedemption } from "../hooks/useCancelGiftRedemption";
import type { GiftRedemption, GiftRedemptionState } from "../types";
import { showConfirmSheet } from "@/shared/store/appSheetStore";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

type TFunc = ReturnType<typeof useTranslation>["t"];

export function RedemptionHistoryScreen() {
  useScreenTrace("loyalty-redemption-history");
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const redemptions = useRedemptions();
  const cancel      = useCancelGiftRedemption();

  const refreshing = redemptions.isFetching && !redemptions.isLoading;

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void redemptions.refetch();
  }, [redemptions]);

  const { active, inactive } = useMemo(() => {
    const all = redemptions.data ?? [];
    return {
      active:   all.filter((r) => r.state === "reserved" || r.state === "fulfilled"),
      inactive: all.filter((r) => r.state === "cancelled" || r.state === "expired"),
    };
  }, [redemptions.data]);

  const handleCancel = useCallback(
    (r: GiftRedemption) => {
      showConfirmSheet(
        t("loyalty.cancelOrderTitle"),
        t("loyalty.cancelOrderBody"),
        () => {
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          cancel.cancel({ redemptionId: r.id, reason: "user_cancelled" });
        },
        { confirmLabel: t("loyalty.cancelConfirmLabel"), danger: true },
      );
    },
    [cancel, t],
  );

  if (redemptions.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title={t("loyalty.redemptionsTitle")} subtitle={t("loyalty.redemptionsSubtitle")} />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.card, styles.skeletonCard]} accessibilityLabel={t("common.loading")} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (redemptions.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title={t("loyalty.redemptionsTitle")} subtitle={t("loyalty.redemptionsSubtitle")} />
        <View style={styles.centerPanel}>
          <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.slate[400]} />
          <Text style={styles.errorTitle} maxFontSizeMultiplier={1.4}>{t("loyalty.redemptionsErrorTitle")}</Text>
          <Pressable
            onPress={() => void redemptions.refetch()}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={styles.primaryBtnText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isEmpty = active.length === 0 && inactive.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <SubScreenHeader title={t("loyalty.redemptionsTitle")} subtitle={t("loyalty.redemptionsSubtitle")} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            accessibilityLabel={t("loyalty.redemptionsRefreshA11y")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.centerPanel}>
            <Ionicons name="gift-outline" size={36} color={theme.colors.slate[300]} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>{t("loyalty.redemptionsEmpty")}</Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={1.5}>
              {t("loyalty.redemptionsEmptyBody")}
            </Text>
          </View>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <SectionHeader title={t("loyalty.activeOrders")} />
                {active.map((r) => (
                  <RedemptionCard
                    key={r.id}
                    redemption={r}
                    onCancel={r.state === "reserved" ? () => handleCancel(r) : undefined}
                    cancelling={cancel.isPending}
                  />
                ))}
              </>
            )}
            {inactive.length > 0 && (
              <>
                <SectionHeader title={t("loyalty.pastOrders")} />
                {inactive.map((r) => (
                  <RedemptionCard key={r.id} redemption={r} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Redemption card ─────────────────────────────────────────────────────────

interface RedemptionCardProps {
  redemption: GiftRedemption;
  onCancel?:  () => void;
  cancelling?: boolean;
}

function RedemptionCard({ redemption: r, onCancel, cancelling }: RedemptionCardProps) {
  const { t } = useTranslation();
  const reservedDate  = new Date(r.reserved_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  const fulfilledDate = r.fulfilled_at
    ? new Date(r.fulfilled_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const expiryDate = new Date(r.expires_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });

  return (
    <View
      style={[styles.card, r.state === "cancelled" || r.state === "expired" ? styles.cardMuted : null]}
      accessibilityRole="text"
      accessibilityLabel={t("loyalty.redemptionA11y", {
        points: r.points_spent.toLocaleString("ar-EG"),
        state:  getStateLabel(r.state, t),
        date:   reservedDate,
      })}
    >
      <View style={styles.cardTop}>
        <View style={[styles.stateIcon, { backgroundColor: stateColor(r.state) + "18" }]}>
          <Ionicons name={stateIcon(r.state)} size={18} color={stateColor(r.state)} />
        </View>

        <View style={{ flex: 1, gap: 3 }}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.pointsText} maxFontSizeMultiplier={1.3}>
              {r.points_spent.toLocaleString("ar-EG")} {t("loyalty.pointsUnit")}
            </Text>
            <View style={[styles.statePill, { backgroundColor: stateColor(r.state) + "18" }]}>
              <Text style={[styles.statePillText, { color: stateColor(r.state) }]}>
                {getStateLabel(r.state, t)}
              </Text>
            </View>
          </View>

          <Text style={styles.metaText} maxFontSizeMultiplier={1.4}>
            {t("loyalty.orderedOn", { date: reservedDate })}
          </Text>
          {fulfilledDate && (
            <Text style={styles.metaText} maxFontSizeMultiplier={1.4}>
              {t("loyalty.deliveredOn", { date: fulfilledDate })}
            </Text>
          )}
          {r.state === "reserved" && (
            <Text style={styles.expiryText} maxFontSizeMultiplier={1.4}>
              {t("loyalty.reservationEnds", { date: expiryDate })}
            </Text>
          )}
          {r.tracking_number && (
            <View style={styles.trackingRow}>
              <Ionicons name="cube-outline" size={12} color={theme.colors.brand[700]} />
              <Text style={styles.trackingText} maxFontSizeMultiplier={1.3} selectable>
                {r.tracking_number}
              </Text>
            </View>
          )}
          {r.cancellation_reason && (
            <Text style={styles.cancelReason} maxFontSizeMultiplier={1.4}>
              {r.cancellation_reason}
            </Text>
          )}
        </View>
      </View>

      {onCancel && (
        <Pressable
          onPress={onCancel}
          disabled={cancelling}
          accessibilityRole="button"
          accessibilityLabel={t("loyalty.cancelOrderA11y")}
          accessibilityState={{ disabled: !!cancelling, busy: !!cancelling }}
          style={({ pressed }) => [
            styles.cancelBtn,
            pressed && { opacity: 0.85 },
            cancelling && { opacity: 0.5 },
          ]}
        >
          <Ionicons name="close-circle-outline" size={14} color={theme.colors.rose[600]} />
          <Text style={styles.cancelBtnText}>{t("loyalty.cancelOrder")}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStateLabel(state: GiftRedemptionState, t: TFunc): string {
  switch (state) {
    case "reserved":  return t("loyalty.stateReserved");
    case "fulfilled": return t("loyalty.stateFulfilled");
    case "cancelled": return t("loyalty.stateCancelled");
    case "expired":   return t("loyalty.stateExpired");
    default:          return state;
  }
}

function stateColor(state: GiftRedemptionState): string {
  switch (state) {
    case "reserved":  return theme.colors.amber[600];
    case "fulfilled": return theme.colors.brand[700];
    case "cancelled": return theme.colors.rose[600];
    case "expired":   return theme.colors.slate[500];
    default:          return theme.colors.slate[500];
  }
}

function stateIcon(state: GiftRedemptionState): IoniconsName {
  switch (state) {
    case "reserved":  return "time-outline";
    case "fulfilled": return "checkmark-circle";
    case "cancelled": return "close-circle-outline";
    case "expired":   return "timer-outline";
    default:          return "ellipse-outline";
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {title}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },

  sectionHeader: {
    marginTop:    18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      14,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    marginBottom:    10,
    gap:             12,
    ...theme.shadow.card,
  },
  cardMuted: {
    opacity: 0.75,
  },
  skeletonCard: {
    backgroundColor: theme.colors.surfaceSunken,
    minHeight:       110,
  },
  cardTop: {
    flexDirection: "row-reverse",
    gap:           12,
    alignItems:    "flex-start",
  },
  stateIcon: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },
  cardTitleRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    gap:            8,
  },
  pointsText: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
    color:      theme.colors.text.primary,
  },
  statePill: {
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   3,
  },
  statePillText: {
    fontFamily: theme.fonts.black,
    fontSize:   10,
  },
  metaText: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
  },
  expiryText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.amber[700],
    textAlign:  "right",
  },
  trackingRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           4,
  },
  trackingText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.brand[700],
    letterSpacing: 0.5,
  },
  cancelReason: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
    fontStyle:  "italic",
  },

  cancelBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      10,
    backgroundColor:   theme.colors.rose[50],
    borderWidth:       1,
    borderColor:       theme.colors.rose[100],
    alignSelf:         "flex-end",
  },
  cancelBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.rose[600],
  },

  centerPanel: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               10,
    paddingTop:        60,
  },
  errorTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
    color:      theme.colors.text.primary,
    marginTop:  8,
  },
  emptyTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
    color:      theme.colors.text.primary,
    marginTop:  8,
  },
  emptyBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               8,
    backgroundColor:   theme.colors.brand[600],
    borderRadius:      12,
    paddingHorizontal: 18,
    paddingVertical:   11,
    marginTop:         8,
    ...theme.shadow.brand,
  },
  primaryBtnText: {
    fontFamily: theme.fonts.black,
    fontSize:   13,
    color:      "#fff",
  },
});

export default RedemptionHistoryScreen;
