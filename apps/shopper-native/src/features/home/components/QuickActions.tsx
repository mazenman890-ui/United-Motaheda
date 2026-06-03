import React, { memo, useCallback } from "react";
import { Platform, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { HomeSectionHeader } from "./HomeSectionHeader";
import { sectionStyles, quickStyles as qs } from "./home.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Action catalogue (module-level — zero re-allocation) ─────────────────────
const QUICK_ACTIONS: {
  icon:     IoniconsName;
  labelKey: string;
  grad:     [string, string];
  route:    string;
}[] = [
  { icon: "scan-outline",         labelKey: "home.qaRx",       grad: ["#6D28D9", "#7C3AED"],                                         route: "/(tabs)/search"   },
  { icon: "leaf-outline",         labelKey: "home.qaVitamins", grad: ["#065F46", "#059669"],                                         route: "/(tabs)/products" },
  { icon: "heart-circle-outline", labelKey: "home.qaMomBaby",  grad: ["#9D174D", "#DB2777"],                                         route: "/(tabs)/products" },
  { icon: "pricetag-outline",     labelKey: "home.qaOffers",   grad: [theme.colors.amber[700], theme.colors.amber[600]],             route: "/deals"           },
];

// ─── QuickActions section ─────────────────────────────────────────────────────

interface QuickActionsProps {
  onNavigate: (route: string) => void;
}

export const QuickActions = memo(function QuickActions({ onNavigate }: QuickActionsProps) {
  const { t } = useTranslation();
  return (
    <View style={sectionStyles.wrap}>
      <HomeSectionHeader
        eyebrow={t("home.catalogEyebrow")}
        title={t("home.quickSearch")}
        icon="apps-outline"
      />
      <View style={qs.row}>
        {QUICK_ACTIONS.map((qa) => (
          <QuickActionTile
            key={qa.labelKey}
            icon={qa.icon}
            label={t(qa.labelKey)}
            grad={qa.grad}
            route={qa.route}
            onNavigate={onNavigate}
          />
        ))}
      </View>
    </View>
  );
});

// ─── QuickActionTile — Reanimated press scale ─────────────────────────────────

interface TileProps {
  icon:       IoniconsName;
  label:      string;
  grad:       [string, string];
  route:      string;
  onNavigate: (route: string) => void;
}

const QuickActionTile = memo(function QuickActionTile({
  icon, label, grad, route, onNavigate,
}: TileProps) {
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleIn  = useCallback(() => { scale.value = withTiming(0.93, { duration: 90 }); }, [scale]);
  const handleOut = useCallback(() => { scale.value = withTiming(1.0,  { duration: 160 }); }, [scale]);
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onNavigate(route);
  }, [route, onNavigate]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={{ flex: 1, alignItems: "center", gap: theme.spacing[2] }}>
      <Animated.View style={[qs.shadow, anim]}>
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={qs.tile}>
          <View style={qs.shine} />
          <Ionicons name={icon} size={22} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </Animated.View>
      <UIText variant="caption" weight="bold" align="center" style={qs.label}>
        {label}
      </UIText>
    </Pressable>
  );
});
