/**
 * QuickActions — Elite 2026 redesign.
 *
 * Three gradient-tile cards below DeliveryHeader (Rx / Offers / Loyalty):
 * LinearGradient icon tile with shimmer shine, label, raised shadow.
 * PressableScale (reduced-motion aware) for press feedback.
 *
 * RTL: flexRow(isRtl) keeps logical leading-to-trailing order in both
 * Arabic and English (forceRTL active: "row" flows RTL automatically).
 */

import React, { memo, useCallback } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { flexRow, isRtl } from "@/utils/layout";
import { PressableScale } from "@/shared/motion";
import { kit } from "@/shared/kit";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Action card definitions ──────────────────────────────────────────────────

type ActionCardDef = {
  icon:     IoniconsName;
  labelKey: string;
  grad:     readonly [string, string];
  route:    string;
};

const ACTION_CARDS: ActionCardDef[] = [
  {
    icon:     "medical-outline",
    labelKey: "home.qaRx",
    grad:     [kit.color.accent, kit.color.accentDeep],
    route:    "/prescriptions",
  },
  {
    icon:     "pricetag-outline",
    labelKey: "home.qaOffers",
    grad:     ["#D97706", "#B45309"],
    route:    "/deals",
  },
  {
    icon:     "diamond-outline",
    labelKey: "home.qaLoyalty",
    grad:     ["#7C3AED", "#6D28D9"],
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
      {/* Gradient icon tile with shine */}
      <View style={cs.iconShadow}>
        <LinearGradient
          colors={def.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cs.iconTile}>
          {/* Shine overlay */}
          <View style={cs.shine} />
          <Ionicons name={def.icon} size={22} color={kit.color.onInk} />
        </LinearGradient>
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
  // Shadow wrapper outside the overflow:hidden tile
  iconShadow: {
    borderRadius:  20,
    shadowColor:   "#000",
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius:  10,
    elevation:     5,
  },
  iconTile: {
    width:          56,
    height:         56,
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  shine: {
    position:             "absolute",
    top:                  0,
    left:                 0,
    right:                0,
    height:               "45%",
    backgroundColor:      "rgba(255,255,255,0.18)",
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
  },
  label: {
    fontFamily:         theme.fonts.bold,
    fontSize:           11,
    lineHeight:         16,
    color:              kit.color.inkSoft,
    textAlign:          "center",
    paddingHorizontal:  4,
    includeFontPadding: false,
  },
});
