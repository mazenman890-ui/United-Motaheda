/**
 * RxCard — prescription summary card.
 *
 * Spec: HANDOFF.md §3.1 + SPEC §9.2.
 *
 * Two variants:
 *   - "active" (hero card on home above-the-fold) — large, with NEXT REFILL
 *     row and full-width refill CTA.
 *   - "list" (compact row inside Prescriptions list / Profile) — single row,
 *     small "Refill" button on the trailing edge.
 *
 * All copy is Arabic (per project override on HANDOFF §8.4).
 *
 * Performance:
 *   - Wrapped in React.memo with a custom props-equality comparator that ignores
 *     onPress / onRefill reference churn (parent should still useCallback-wrap
 *     these, but the card is protected either way).
 *   - All inline style objects hoisted into StyleSheet.create — zero per-render
 *     object allocations.
 *   - Internal handlers stabilised with useCallback to avoid propagating new
 *     function references into child Pressable / Button components.
 */

import React, { memo, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { theme } from "@/shared/theme";
import { Card, Text } from "@/shared/ui";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type {
  Prescription,
  RxStatus,
} from "@/stores/prescriptionsStore";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

export type { Prescription, RxStatus };

export interface RxCardProps {
  prescription: Prescription;
  variant?:     "active" | "list";
  onRefill?:    (rx: Prescription) => void;
  onPress?:     (rx: Prescription) => void;
}

const STATUS_TONE: Record<RxStatus, "success" | "neutral" | "warning" | "error"> = {
  ready:    "success",
  active:   "neutral",
  expiring: "warning",
  expired:  "error",
};

function statusLabel(rx: Prescription, t: TFunction): string {
  switch (rx.status) {
    case "ready":    return t("rx.statusReady");
    case "active":   return rx.refills > 0 ? t("rx.statusRefills", { count: rx.refills }) : t("rx.statusActive");
    case "expiring": return t("rx.statusExpiring");
    case "expired":  return t("rx.statusExpired");
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RxCard = memo(
  function RxCard({
    prescription: rx,
    variant = "list",
    onRefill,
    onPress,
  }: RxCardProps): React.ReactElement {
    const { t }       = useTranslation();
    const tone        = STATUS_TONE[rx.status];
    const isExpiring  = rx.status === "expiring";
    const isExpired   = rx.status === "expired";
    const refillLabel = t("rx.refillLabel");

    // Stable handlers — no inline arrows so Button / Pressable memo is effective
    const handlePress  = useCallback(() => onPress?.(rx),  [onPress,  rx]);
    const handleRefill = useCallback(() => onRefill?.(rx), [onRefill, rx]);

    if (variant === "active") {
      return (
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`${rx.name} — ${statusLabel(rx, t)}`}>
          <Card radius={theme.layout.cardRadius}>
            <View style={s.activeTopRow}>
              <View style={s.activeIconWrap}>
                <Ionicons name="medkit" size={22} color={theme.colors.brand.base} />
              </View>
              <View style={s.flex1}>
                <Text variant="card-title" numberOfLines={1}>{rx.name}</Text>
                <Text variant="caption" color="secondary" style={s.doseText} numberOfLines={1}>
                  {rx.dose}
                </Text>
              </View>
              <Badge variant={tone} size="md">{statusLabel(rx, t)}</Badge>
            </View>

            <View style={s.activeDivider} />

            <View style={s.activeMetaRow}>
              <View>
                <Text variant="eyebrow" color="tertiary" style={s.textRight}>{t("rx.nextRefill")}</Text>
                <Text variant="body-sm" weight="bold" style={s.nextRefillValue}>
                  {rx.nextRefill}
                </Text>
              </View>
              <Button
                variant={isExpiring ? "dark" : "primary"}
                size="sm"
                disabled={isExpired}
                onPress={handleRefill}>
                {refillLabel}
              </Button>
            </View>
          </Card>
        </Pressable>
      );
    }

    // ── List variant ─────────────────────────────────────────────────────────
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${rx.name} — ${statusLabel(rx, t)}`}
        style={s.listCard}>
        <View style={s.listIconWrap}>
          <Ionicons name="medkit-outline" size={20} color={theme.colors.brand.base} />
        </View>
        <View style={s.listContent}>
          <Text variant="body" weight="bold" numberOfLines={1} align="right">{rx.name}</Text>
          <Text variant="caption" color="secondary" numberOfLines={1} align="right">
            {rx.dose} · {rx.doctor}
          </Text>
          <Text variant="eyebrow" color="tertiary" align="right" style={s.listNextRefill}>
            {rx.nextRefill}
          </Text>
        </View>
        <Button
          size="sm"
          variant={isExpiring ? "dark" : "secondary"}
          disabled={isExpired}
          onPress={handleRefill}>
          {refillLabel}
        </Button>
      </Pressable>
    );
  },
  // Custom comparator — ignore onPress/onRefill reference churn.
  // The prescription reference and variant are the meaningful change signals.
  // Parents should still useCallback-wrap handlers for correctness, but this
  // protects against accidental re-renders if they don't.
  (prev, next) =>
    prev.prescription === next.prescription &&
    prev.variant      === next.variant,
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  flex1:    { flex: 1 },
  textRight:{ textAlign: textAlignStart(isRtl()) },

  // ── Active variant ─────────────────────────────────────────────────────────
  activeTopRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           theme.spacing[1.5],
  },
  activeIconWrap: {
    width:           48,
    height:          48,
    borderRadius:    theme.radius.lg,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
  },
  doseText: {
    marginTop: 2,
    textAlign: textAlignStart(isRtl()),
  },
  activeDivider: {
    height:          1,
    backgroundColor: theme.colors.border.default,
    marginVertical:  theme.spacing[1.5],
  },
  activeMetaRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  nextRefillValue: {
    marginTop: 2,
    textAlign: textAlignStart(isRtl()),
  },

  // ── List variant ───────────────────────────────────────────────────────────
  listCard: {
    flexDirection: flexRow(isRtl()),
    alignItems:        "center",
    gap:               theme.spacing[1.5],
    paddingVertical:   14,
    paddingHorizontal: theme.spacing[2],
    backgroundColor:   theme.colors.surface,
    borderRadius:      theme.layout.cardRadius,
    borderWidth:       1,
    borderColor:       theme.colors.border.default,
  },
  listIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    theme.radius.md,
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
  },
  listContent: {
    flex:     1,
    minWidth: 0,
  },
  listNextRefill: {
    marginTop: 2,
  },
});
