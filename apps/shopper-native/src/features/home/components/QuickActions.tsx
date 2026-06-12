/**
 * QuickActions — 2026 rebuild on the @/shared/kit design language.
 *
 * Three quiet white cards below DeliveryHeader (Rx / Offers / Loyalty):
 * tinted icon tile + label, hairline border, raised shadow. Replaces the
 * gradient-tile + glow-halo cards. Press feedback via PressableScale
 * (reduced-motion aware) instead of hand-rolled shared values.
 *
 * Layout: flexRow(isRtl) keeps logical leading-to-trailing order in both
 * Arabic and English (forceRTL active: "row" flows RTL automatically).
 */

import React, { memo, useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { flexRow, isRtl } from "@/utils/layout";
import { PressableScale } from "@/shared/motion";
import { kit } from "@/shared/kit";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Action card definitions (module-level — zero re-allocation per render) ───

type ActionCardDef = {
  icon:     IoniconsName;
  labelKey: string;
  tint:     string;
  fg:       string;
  route:    string;
};

const ACTION_CARDS: ActionCardDef[] = [
  {
    icon:     "medical-outline",
    labelKey: "home.qaRx",
    tint:     kit.color.accentTint,
    fg:       kit.color.accentDeep,
    route:    "/prescriptions",
  },
  {
    icon:     "pricetag-outline",
    labelKey: "home.qaOffers",
    tint:     kit.color.warnTint,
    fg:       kit.color.warn,
    route:    "/deals",
  },
  {
    icon:     "diamond-outline",
    labelKey: "home.qaLoyalty",
    tint:     kit.color.well,
    fg:       kit.color.ink,
    route:    "/loyalty",
  },
];

// ─── QuickActions ─────────────────────────────────────────────────────────────

interface QuickActionsProps {
  onNavigate: (route: string) => void;
}

export const QuickActions = memo(function QuickActions({ onNavigate }: QuickActionsProps) {
  const { t } = useTranslation();
  return (
    <View style={cs.row}>
      {ACTION_CARDS.map((card) => (
        <ActionCard
          key={card.labelKey}
          def={card}
          label={t(card.labelKey)}
          onNavigate={onNavigate}
        />
      ))}
    </View>
  );
});

// ─── ActionCard ───────────────────────────────────────────────────────────────

const ActionCard = memo(function ActionCard({
  def, label, onNavigate,
}: {
  def:        ActionCardDef;
  label:      string;
  onNavigate: (route: string) => void;
}) {
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onNavigate(def.route);
  }, [def.route, onNavigate]);

  return (
    <PressableScale
      onPress={handlePress}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={cs.card}>
      <View style={[cs.iconTile, { backgroundColor: def.tint }]}>
        <Ionicons name={def.icon} size={22} color={def.fg} />
      </View>
      <UIText numberOfLines={2} style={cs.label}>{label}</UIText>
    </PressableScale>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  row: {
    flexDirection:     flexRow(isRtl()),
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop:        kit.sp(4),
    paddingBottom:     kit.sp(2),
    gap:               10,
  },
  card: {
    flex:            1,
    alignItems:      "center",
    gap:             10,
    paddingVertical: kit.sp(4),
    backgroundColor: kit.color.surface,
    borderRadius:    kit.radius.card,
    borderWidth:     1,
    borderColor:     kit.color.line,
    ...kit.shadow.raised,
  },
  iconTile: {
    width:          52,
    height:         52,
    borderRadius:   16,
    alignItems:     "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: theme.fonts.bold,
    fontSize: 11, lineHeight: 16,
    color: kit.color.inkSoft,
    textAlign: "center",
    paddingHorizontal: 4,
    includeFontPadding: false,
  },
});
