/**
 * QuickActions — Option A: Unified Floating Panel.
 *
 * A single premium surface card that floats over the bottom of the
 * PromoBanner via marginTop: -24, creating a layered depth effect.
 * Divided internally into 3 equal-width action zones, separated by
 * hairline dividers.
 *
 * Animation: Reanimated withSpring(0.97) scale-down on PressIn.
 * Runs exclusively as a UI-thread worklet — zero JS-bridge overhead.
 * Icons: LinearGradient tile + Ionicons — no <Image> usage anywhere.
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

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Panel action definitions (module-level — zero re-allocation per render) ──

type PanelAction = {
  icon:     IoniconsName;
  labelKey: string;
  gradient: [string, string];
  route:    string;
};

const PANEL_ACTIONS: PanelAction[] = [
  {
    icon:     "medical-outline",
    labelKey: "home.qaRx",
    gradient: ["#0891B2", "#0DB8A8"],
    route:    "/prescriptions",
  },
  {
    icon:     "pricetag-outline",
    labelKey: "home.qaOffers",
    gradient: ["#D97706", "#F59E0B"],
    route:    "/deals",
  },
  {
    icon:     "diamond-outline",
    labelKey: "home.qaLoyalty",
    gradient: ["#6D28D9", "#A855F7"],
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
    // Outer: shadow host. No overflow:hidden so the drop-shadow
    // bleeds cleanly outside the card edge on iOS/Android.
    <View style={cs.shadowHost}>
      {/* Inner: clips zone content and android ripple to borderRadius. */}
      <View style={cs.panel}>
        {PANEL_ACTIONS.map((action, index) => (
          <React.Fragment key={action.labelKey}>
            {index > 0 && <View style={cs.divider} />}
            <ActionZone
              icon={action.icon}
              label={t(action.labelKey)}
              gradient={action.gradient}
              route={action.route}
              onNavigate={onNavigate}
            />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
});

// ─── ActionZone — pressable zone with UI-thread spring scale ──────────────────

interface ActionZoneProps {
  icon:       IoniconsName;
  label:      string;
  gradient:   [string, string];
  route:      string;
  onNavigate: (route: string) => void;
}

const ActionZone = memo(function ActionZone({
  icon, label, gradient, route, onNavigate,
}: ActionZoneProps) {
  const scale = useSharedValue(1);

  // Reads only scale.value (a shared value) → worklet runs exclusively on
  // the UI thread; no JS-frame object allocations on press events.
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleIn = useCallback(
    () => { scale.value = withSpring(0.97, theme.animation.spring.press); },
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
    <Pressable
      onPress={handlePress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{ color: "rgba(0,0,0,0.05)", borderless: false }}
      style={cs.zone}>
      <Animated.View style={[cs.zoneInner, anim]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={cs.iconTile}>
          <Ionicons name={icon} size={20} color="#fff" />
        </LinearGradient>
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
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  // Shadow host: pulls the panel up to overlap the PromoBanner bottom by 24px,
  // creating the "floating card emerges from behind hero" depth effect.
  // No overflow:hidden — lets the box-shadow bleed outside the card boundary.
  shadowHost: {
    marginTop:        -24,
    marginHorizontal: theme.layout.pagePaddingH,  // 20
    marginBottom:     theme.spacing['2xl'],        // 24
    zIndex:           theme.zIndex.raised,         // 10
    borderRadius:     16,
    shadowColor:      "#021D2E",
    shadowOffset:     { width: 0, height: 8 },
    shadowOpacity:    0.13,
    shadowRadius:     20,
    elevation:        10,
  },

  // Panel surface: the visible white card. overflow:'hidden' clips zone
  // press highlights and android ripple to the rounded card shape.
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    flexDirection:   "row",
    overflow:        "hidden",
  },

  // One of three equal-width clickable zones. flex:1 ensures exact thirds.
  zone: {
    flex: 1,
  },

  // Animated content block that scales on press. Centered icon + label.
  zoneInner: {
    paddingVertical:   22,
    paddingHorizontal: 8,
    alignItems:        "center",
    gap:               10,
  },

  // Vertical hairline between zones. marginVertical keeps it from spanning
  // the full card height — reads as a refined separator, not a hard wall.
  divider: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.default,
    marginVertical:  16,
  },

  // Gradient icon badge — 46×46 rounded tile.
  iconTile: {
    width:          46,
    height:         46,
    borderRadius:   13,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },

  // Zone label — secondary text, centered, max 2 lines.
  label: {
    color:             theme.colors.text.secondary,
    fontFamily:        theme.fonts.bold,
    fontSize:          11,
    lineHeight:        15,
    textAlign:         "center",
    paddingHorizontal: 4,
  },
});
