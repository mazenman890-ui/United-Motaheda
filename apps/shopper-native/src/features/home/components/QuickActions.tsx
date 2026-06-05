import React, { memo, useCallback } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
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
import { HomeSectionHeader } from "./HomeSectionHeader";
import { sectionStyles } from "./home.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── 3 feature card definitions (module-level — zero re-allocation) ──────────
const FEATURE_CARDS: {
  icon:       IoniconsName;
  labelKey:   string;
  iconBg:     string;
  iconColor:  string;
  route:      string;
}[] = [
  {
    icon:      "medical-outline",
    labelKey:  "home.qaRx",
    iconBg:    theme.colors.brand.lighter,
    iconColor: theme.colors.brand[700],
    route:     "/(tabs)/search",
  },
  {
    icon:      "leaf-outline",
    labelKey:  "home.qaVitamins",
    iconBg:    theme.colors.success.bg,
    iconColor: theme.colors.success.strong,
    route:     "/(tabs)/products",
  },
  {
    icon:      "pricetag-outline",
    labelKey:  "home.qaOffers",
    iconBg:    theme.colors.amber[50],
    iconColor: theme.colors.amber[700],
    route:     "/deals",
  },
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
      <View style={cs.row}>
        {FEATURE_CARDS.map((card) => (
          <FeatureCard
            key={card.labelKey}
            icon={card.icon}
            label={t(card.labelKey)}
            iconBg={card.iconBg}
            iconColor={card.iconColor}
            route={card.route}
            onNavigate={onNavigate}
          />
        ))}
      </View>
    </View>
  );
});

// ─── FeatureCard — UI-thread spring scale (withSpring runs as worklet) ────────

interface FeatureCardProps {
  icon:       IoniconsName;
  label:      string;
  iconBg:     string;
  iconColor:  string;
  route:      string;
  onNavigate: (route: string) => void;
}

const FeatureCard = memo(function FeatureCard({
  icon, label, iconBg, iconColor, route, onNavigate,
}: FeatureCardProps) {
  const scale = useSharedValue(1);

  // Reads only scale.value (a shared value) → worklet runs exclusively on the
  // UI thread; no JS-frame object allocations.
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // 0.97 — canonical press value from design system (Button, ProductCard, CategoryCard).
  const handleIn    = useCallback(() => { scale.value = withSpring(0.97, theme.animation.spring.press); }, [scale]);
  const handleOut   = useCallback(() => { scale.value = withSpring(1,    theme.animation.spring.press); }, [scale]);
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
      style={cs.cardOuter}>
      <Animated.View style={[cs.card, anim]}>
        <View style={[cs.iconTile, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <UIText
          variant="caption"
          weight="bold"
          align="center"
          numberOfLines={2}
          style={[cs.label, { color: iconColor }]}>
          {label}
        </UIText>
      </Animated.View>
    </Pressable>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const cs = StyleSheet.create({
  // 3-card row: flex:1 children guarantee mathematically identical widths.
  // justifyContent:'space-between' distributes remaining space (redundant when
  // all children have flex:1, but explicit for design-system clarity).
  row: {
    flexDirection:     "row",
    justifyContent:    "space-between",
    gap:               8,
    paddingHorizontal: theme.layout.pagePaddingH,
  },

  // Outer Pressable — flex:1 = exact 1/3 of available row width
  cardOuter: {
    flex: 1,
  },

  // Inner Animated.View — aspectRatio:1 enforces a perfect square regardless
  // of screen width. theme.radius.xl = 18 px.
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    theme.radius.xl,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    aspectRatio:     1,
    alignItems:      "center",
    justifyContent:  "center",
    gap:             10,
    ...theme.shadow.card,
  },

  iconTile: {
    width:          44,
    height:         44,
    borderRadius:   13,
    alignItems:     "center",
    justifyContent: "center",
  },

  label: {
    fontFamily:        theme.fonts.bold,
    fontSize:          11,
    lineHeight:        15,
    textAlign:         "center",
    paddingHorizontal: 4,
  },
});
