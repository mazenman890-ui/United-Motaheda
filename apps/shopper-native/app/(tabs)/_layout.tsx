/**
 * Tab Layout — Dark Bar with Top Indicator
 *
 * Pattern used by Linear, Stripe, Revolut, and other premium apps:
 *   • Dark background so the bar reads as distinct from content
 *   • Active tab: gradient top-indicator line + filled brand-color icon + bold label
 *   • Inactive tab: outline icon + muted label — no shapes, no backgrounds
 *   • Zero floating elements — everything contained within the bar bounds
 */

import React, { useCallback, useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { useUnreadCount } from "@/features/notifications";
import { useAuth } from "@/features/auth";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Tab configuration ────────────────────────────────────────────────────────

interface TabConfig {
  active:   IoniconsName;
  inactive: IoniconsName;
  color:    string;              // single color for icon + label when active
  grad:     [string, string];   // gradient for the indicator line
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index: {
    active:   "home",
    inactive: "home-outline",
    color:    "#0DB8A8",
    grad:     ["#0DB8A8", "#0891B2"],
  },
  products: {
    active:   "grid",
    inactive: "grid-outline",
    color:    "#818CF8",
    grad:     ["#818CF8", "#6366F1"],
  },
  orders: {
    active:   "cube",
    inactive: "cube-outline",
    color:    "#FCD34D",
    grad:     ["#FCD34D", "#F59E0B"],
  },
  profile: {
    active:   "person-circle",
    inactive: "person-circle-outline",
    color:    "#F472B6",
    grad:     ["#F472B6", "#EC4899"],
  },
};

const TAB_LABEL_KEY: Record<string, string> = {
  index:    "tabs.home",
  products: "tabs.products",
  orders:   "tabs.orders",
  profile:  "tabs.profile",
};

// ─── Animation preset ─────────────────────────────────────────────────────────

const SPRING = { damping: 22, stiffness: 320, mass: 0.7 } as const;

// ─── Tab Item ─────────────────────────────────────────────────────────────────

interface TabItemProps {
  name:    string;
  focused: boolean;
  badge?:  number;
  onPress: () => void;
}

function TabItem({ name, focused, badge, onPress }: TabItemProps) {
  const { t } = useTranslation();
  const cfg   = TAB_CONFIG[name] ?? TAB_CONFIG.index;
  const label = t(TAB_LABEL_KEY[name] ?? "tabs.home");

  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, progress]);

  // Top indicator: scaleX 0 → 1, opacity 0 → 1
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(progress.value, [0, 1], [0, 1],   Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP) },
    ],
  }));

  // Icon: scale up, slight lift
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale:      interpolate(progress.value, [0, 1], [0.88, 1.06], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [0, 1], [0, -2],      Extrapolation.CLAMP) },
    ],
  }));

  // Label: match icon lift
  const labelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -1], Extrapolation.CLAMP) },
    ],
  }));

  // Light bar — inactive tabs use dark slate at reduced opacity
  const iconColor  = focused ? cfg.color                   : "rgba(100,116,139,0.60)";
  const labelColor = focused ? cfg.color                   : "rgba(100,116,139,0.55)";
  const labelFont  = focused ? theme.fonts.black           : theme.fonts.regular;
  const iconSize   = focused ? 24 : 22;

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={styles.tabItem}>

      {/* ── Top indicator — gradient line, stays inside bounds ── */}
      <Animated.View style={[styles.indicatorWrap, indicatorStyle]}>
        <LinearGradient
          colors={cfg.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.indicatorLine}
        />
      </Animated.View>

      {/* ── Icon ── */}
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? cfg.active : cfg.inactive}
          size={iconSize}
          color={iconColor}
        />
      </Animated.View>

      {/* ── Label — always visible ── */}
      <Animated.View style={labelStyle}>
        <Text numberOfLines={1} style={[styles.label, { color: labelColor, fontFamily: labelFont }]}>
          {label}
        </Text>
      </Animated.View>

      {/* ── Notification badge ── */}
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────

function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets       = useSafeAreaInsets();
  const { user }     = useAuth();
  const unreadNotifs = useUnreadCount(user?.id);

  const onPress = useCallback(
    (route: { key: string; name: string }, focused: boolean) => {
      const event = navigation.emit({
        type:              "tabPress",
        target:            route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    },
    [navigation],
  );

  const visibleRoutes = state.routes.filter((r) => r.name in TAB_CONFIG);

  return (
    <View style={[styles.barOuter, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      {/* Hairline separator — 1px dark line at top of bar */}
      <View style={styles.topHairline} />
      <View style={styles.barInner}>
        {visibleRoutes.map((route) => {
          const realIdx = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === realIdx;
          return (
            <TabItem
              key={route.key}
              name={route.name}
              focused={focused}
              badge={route.name === "profile" ? (unreadNotifs || undefined) : undefined}
              onPress={() => onPress(route, focused)}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index"    />
      <Tabs.Screen name="products" />
      <Tabs.Screen name="orders"   />
      <Tabs.Screen name="profile"  />
      <Tabs.Screen name="cart"   options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BAR_H        = 62;
const INDICATOR_W  = 28;
const INDICATOR_H  = 3;

const styles = StyleSheet.create({

  // Outer bar: clean white, flush to bottom, upward shadow
  barOuter: {
    width:           "100%",
    backgroundColor: "#FFFFFF",
    shadowColor:     "#0C1A2E",
    shadowOffset:    { width: 0, height: -2 },
    shadowOpacity:   0.07,
    shadowRadius:    10,
    elevation:       12,
  },

  // Single-pixel separator between content and bar
  topHairline: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.10)",
  },

  // Inner row of tab items
  barInner: {
    flexDirection:    "row",
    height:           BAR_H,
    alignItems:       "center",
    paddingHorizontal: 4,
  },

  // Each tab fills equal space
  tabItem: {
    flex:           1,
    height:         BAR_H,
    alignItems:     "center",
    justifyContent: "center",
    gap:            3,
    paddingTop:     INDICATOR_H, // make room for the indicator at the very top
    position:       "relative",
  },

  // Gradient indicator line — INSIDE the bar, no overflow
  indicatorWrap: {
    position:     "absolute",
    top:          0,              // flush with the top edge of each tab item
    width:        INDICATOR_W,
    height:       INDICATOR_H,
    borderRadius: INDICATOR_H,
    overflow:     "hidden",
  },
  indicatorLine: {
    flex: 1,
  },

  // Label — always rendered
  label: {
    fontSize:      10,
    letterSpacing: 0.2,
    textAlign:     "center",
    lineHeight:    13,
  },

  // Notification badge
  badge: {
    position:          "absolute",
    top:               6,
    right:             "14%",
    minWidth:          16,
    height:            16,
    borderRadius:      8,
    backgroundColor:   theme.colors.error.base,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 3,
    borderWidth:       2,
    borderColor:       "#FFFFFF",
    shadowColor:       theme.colors.error.base,
    shadowOffset:      { width: 0, height: 2 },
    shadowOpacity:     0.55,
    shadowRadius:      4,
    elevation:         5,
  },
  badgeText: {
    color:      "#fff",
    fontSize:   8.5,
    fontFamily: theme.fonts.black,
    lineHeight: 11,
  },
});
