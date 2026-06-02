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
 */

import React from "react";
import { Pressable, View } from "react-native";
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

export function RxCard({
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

  if (variant === "active") {
    return (
      <Pressable
        onPress={() => onPress?.(rx)}
        accessibilityRole="button"
        accessibilityLabel={`${rx.name} — ${statusLabel(rx, t)}`}>
        <Card radius={theme.layout.cardRadius}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: theme.spacing[1.5] }}>
            <View style={{
              width: 48, height: 48, borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.brand.lighter,
              alignItems: "center", justifyContent: "center",
            }}>
              <Ionicons name="medkit" size={22} color={theme.colors.brand.base} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="card-title" numberOfLines={1}>{rx.name}</Text>
              <Text variant="caption" color="secondary" style={{ marginTop: 2, textAlign: "right" }} numberOfLines={1}>
                {rx.dose}
              </Text>
            </View>
            <Badge variant={tone} size="md">{statusLabel(rx, t)}</Badge>
          </View>

          <View style={{
            height: 1, backgroundColor: theme.colors.border.default,
            marginVertical: theme.spacing[1.5],
          }} />

          <View style={{
            flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
          }}>
            <View>
              <Text variant="eyebrow" color="tertiary" style={{ textAlign: "right" }}>{t("rx.nextRefill")}</Text>
              <Text variant="body-sm" weight="bold" style={{ marginTop: 2, textAlign: "right" }}>
                {rx.nextRefill}
              </Text>
            </View>
            <Button
              variant={isExpiring ? "dark" : "primary"}
              size="sm"
              disabled={isExpired}
              onPress={() => onRefill?.(rx)}>
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
      onPress={() => onPress?.(rx)}
      accessibilityRole="button"
      accessibilityLabel={`${rx.name} — ${statusLabel(rx, t)}`}
      style={{
        flexDirection:    "row-reverse",
        alignItems:       "center",
        gap:              theme.spacing[1.5],
        paddingVertical:  14,
        paddingHorizontal: theme.spacing[2],
        backgroundColor:  theme.colors.surface,
        borderRadius:     theme.layout.cardRadius,
        borderWidth:      1,
        borderColor:      theme.colors.border.default,
      }}>
      <View style={{
        width: 40, height: 40, borderRadius: theme.radius.md,
        backgroundColor: theme.colors.brand.lighter,
        alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name="medkit-outline" size={20} color={theme.colors.brand.base} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="body" weight="bold" numberOfLines={1} align="right">{rx.name}</Text>
        <Text variant="caption" color="secondary" numberOfLines={1} align="right">
          {rx.dose} · {rx.doctor}
        </Text>
        <Text variant="eyebrow" color="tertiary" align="right" style={{ marginTop: 2 }}>
          {rx.nextRefill}
        </Text>
      </View>
      <Button
        size="sm"
        variant={isExpiring ? "dark" : "secondary"}
        disabled={isExpired}
        onPress={() => onRefill?.(rx)}>
        {refillLabel}
      </Button>
    </Pressable>
  );
}
