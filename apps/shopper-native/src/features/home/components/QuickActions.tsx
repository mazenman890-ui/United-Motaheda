/**
 * QuickActions — Premium inline action row.
 *
 * Three distinct gradient cards sitting directly below DeliveryHeader,
 * each occupying flex:1 of a row. No negative margin, no overlap shadow.
 *
 * Layout: flexRow(isRtl) ensures logical leading-to-trailing order in
 * both Arabic (row-reverse) and English (row).
 *
 * Animation: Reanimated withSpring(0.96) per-card press scale — UI thread only.
 * Icons: LinearGradient 56×56 tile + Ionicons.
 */

import React, { memo, useCallback } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { flexRow, isRtl } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Action card definitions (module-level — zero re-allocation per render) ───

type ActionCard = {
  icon:      IoniconsName;
  labelKey:  string;
  gradient:  readonly [string, string, ...string[]];
  glow:      string;
  route:     string;
};

const ACTION_CARDS: ActionCard[] = [
  {
    icon:     "medical-outline",
    labelKey: "home.qaRx",
    gradient: ["#0E7490", "#0891B2", "#06B6D4"],
    glow:     "rgba(8,145,178,0.22)",
    route:    "/prescriptions",
  },
  {
    icon:     "pricetag-outline",
    labelKey: "home.qaOffers",
    gradient: ["#B45309", "#D97706", "#F59E0B"],
    glow:     "rgba(217,119,6,0.22)",
    route:    "/deals",
  },
  {
    icon:     "diamond-outline",
    labelKey: "home.qaLoyalty",
    gradient: ["#5B21B6", "#7C3AED", "#A855F7"],
    glow:     "rgba(124,58,237,0.22)",
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
          icon={card.icon}
          label={t(card.labelKey)}
          gradient={card.gradient}
          glow={card.glow}
          route={card.route}
          onNavigate={onNavigate}
        />
      ))}
    </View>
  );
});

// ─── ActionCard — individual gradient card with press scale ───────────────────

interface ActionCardProps {
  icon:       IoniconsName;
  label:      string;
  gradient:   readonly [string, string, ...string[]];
  glow:       string;
  route:      string;
  onNavigate: (route: string) => void;
}

const ActionCard = memo(function ActionCard({
  icon, label, gradient, glow, route, onNavigate,
}: ActionCardProps) {
  const scale = useSharedValue(1);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleIn  = useCallback(
    () => { scale.value = withSpring(0.96, theme.animation.spring.press); },
    [scale],
  );
  const handleOut = useCallback(
    () => { scale.value = withSpring(1, theme.animation.spring.press); },
    [scale],
  );
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onNavigate(route);
  }, [route, onNavigate]);

  return (
    // Shadow host: no overflow:hidden so drop-shadow bleeds outside card edge
    <View style={[cs.cardShadow, { shadowColor: glow }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{ color: "rgba(0,0,0,0.06)", borderless: false }}
        style={cs.cardPressable}>
        <Animated.View style={[cs.cardInner, anim]}>
          {/* Glow halo behind icon tile */}
          <View style={[cs.gloHalo, { backgroundColor: glow }]} />

          {/* Gradient icon tile */}
          <LinearGradient
            colors={gradient}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={cs.iconTile}>
            <Ionicons name={icon} size={24} color="#fff" />
          </LinearGradient>

          {/* Label */}
          <UIText
            variant="caption"
            weight="bold"
            align="center"
            numberOfLines={2}
            style={cs.label}>
            {label}
          </UIText>
        </Animated.View>
      </Pressable>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const _isRtl = isRtl();

const cs = StyleSheet.create({
  // Outer row — logical direction so card order is Arabic-natural (RTL) or LTR
  row: {
    flexDirection:     flexRow(_isRtl),
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop:        16,
    paddingBottom:     8,
    gap:               12,
  },

  // Per-card shadow host (no overflow:hidden — lets shadow bleed outside)
  cardShadow: {
    flex:          1,
    borderRadius:  20,
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius:  14,
    elevation:     6,
  },

  // Pressable clips ripple to card radius; also the visual card surface
  cardPressable: {
    flex:            1,
    borderRadius:    20,
    backgroundColor: theme.colors.surface,
    overflow:        "hidden",
    borderWidth:     1,
    borderColor:     theme.colors.border.subtle,
  },

  // Animated.View carries scale — centred column layout inside card
  cardInner: {
    paddingVertical: 18,
    alignItems:      "center",
    gap:             10,
  },

  // Soft glow circle behind icon tile — positioned absolutely so it doesn't
  // affect layout flow
  gloHalo: {
    position:     "absolute",
    top:          14,
    width:        60,
    height:       60,
    borderRadius: 30,
    opacity:      0.7,
  },

  // 56×56 gradient icon badge
  iconTile: {
    width:          56,
    height:         56,
    borderRadius:   16,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },

  // Label text — secondary colour, centred, 2 lines max
  label: {
    color:             theme.colors.text.secondary,
    fontSize:          11,
    lineHeight:        15,
    textAlign:         "center",
    paddingHorizontal: 4,
    includeFontPadding: false,
  },
});
