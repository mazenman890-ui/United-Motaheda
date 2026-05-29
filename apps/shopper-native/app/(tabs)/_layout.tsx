/**
 * Tab Layout — Floating Glass Tab Bar
 *
 * A premium pill-shaped floating tab bar that hovers above the content with
 * a glass-morphism blur, gradient active dot, and elastic spring animations.
 * Each active tab pops with an electric brand-glow indicator.
 */

import React, { useEffect, useCallback } from "react";
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

interface TabConfig {
  active:   IoniconsName;
  inactive: IoniconsName;
  grad:     [string, string];
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index:    {
    active: "home",           inactive: "home-outline",
    grad:   ["#0DB8A8", "#0891B2"],
  },
  products: {
    active: "grid",           inactive: "grid-outline",
    grad:   ["#6366F1", "#4F46E5"],
  },
  orders:   {
    active: "cube",           inactive: "cube-outline",
    grad:   ["#F59E0B", "#D97706"],
  },
  profile:  {
    active: "person-circle",  inactive: "person-circle-outline",
    grad:   ["#EC4899", "#BE185D"],
  },
};

const TAB_I18N_KEY: Record<string, string> = {
  index:    "tabs.home",
  products: "tabs.products",
  orders:   "tabs.orders",
  profile:  "tabs.profile",
};

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
  const label = t(TAB_I18N_KEY[name] ?? "tabs.home");

  const progress = useSharedValue(focused ? 1 : 0);
  const scale    = useSharedValue(focused ? 1.0 : 0.92);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 18, stiffness: 360, mass: 0.75 });
    scale.value    = withSpring(focused ? 1.0 : 0.92, { damping: 16, stiffness: 380, mass: 0.8 });
  }, [focused, progress, scale]);

  // The pill "active container" — expands from a dot to a full pill
  const pillAnim = useAnimatedStyle(() => ({
    opacity:   interpolate(progress.value, [0, 1], [0, 1],      Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) },
      { scaleY: interpolate(progress.value, [0, 1], [0.6, 1], Extrapolation.CLAMP) },
    ],
  }));

  // Icon lifts slightly when active
  const iconAnim = useAnimatedStyle(() => ({
    transform: [
      { scale:       scale.value },
      { translateY:  interpolate(progress.value, [0, 1], [0, -1], Extrapolation.CLAMP) },
    ],
  }));

  // Label fades in when focused
  const labelAnim = useAnimatedStyle(() => ({
    opacity:   interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [4, 0], Extrapolation.CLAMP) },
    ],
  }));

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.tabItem} hitSlop={8}>
      {/* Active pill container */}
      <Animated.View style={[styles.pillContainer, pillAnim]}>
        <LinearGradient
          colors={cfg.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Icon */}
      <Animated.View style={iconAnim}>
        <Ionicons
          name={focused ? cfg.active : cfg.inactive}
          size={focused ? 22 : 21}
          color={focused ? "#FFFFFF" : "rgba(100,116,139,0.85)"}
        />
      </Animated.View>

      {/* Label — only visible when focused */}
      <Animated.Text
        style={[styles.label, { color: "#fff" }, labelAnim]}
        numberOfLines={1}>
        {label}
      </Animated.Text>

      {/* Notification badge */}
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
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    },
    [navigation],
  );

  const visibleRoutes = state.routes.filter((r) => r.name in TAB_CONFIG);
  const pb = Math.max(insets.bottom + 6, 20);

  return (
    <View style={[styles.floatWrap, { paddingBottom: pb }]}>
      <View style={styles.tabBar}>
        {/* Glass-white overlay */}
        <View style={styles.glassOverlay} />

        {visibleRoutes.map((route) => {
          const realIndex = state.routes.findIndex((r) => r.key === route.key);
          const focused   = state.index === realIndex;
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

      {/* Hidden routes */}
      <Tabs.Screen name="cart"   options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BAR_HEIGHT  = 62;
const PILL_H      = 44;
const PILL_W      = 68;
const BAR_RADIUS  = 32;

const styles = StyleSheet.create({
  // The floating wrapper that positions the bar above the safe-area
  floatWrap: {
    position:       "absolute",
    bottom:         0,
    left:           0,
    right:          0,
    paddingHorizontal: 16,
    alignItems:     "center",
  },

  // The actual floating pill bar
  tabBar: {
    flexDirection:        "row",
    width:                "100%",
    maxWidth:             500,
    height:               BAR_HEIGHT,
    borderRadius:         BAR_RADIUS,
    backgroundColor:      "rgba(15, 23, 42, 0.94)",
    borderWidth:          1,
    borderColor:          "rgba(255, 255, 255, 0.10)",
    overflow:             "hidden",
    alignItems:           "center",
    paddingHorizontal:    8,
    // Elevation/shadow
    shadowColor:          "#000",
    shadowOffset:         { width: 0, height: 8 },
    shadowOpacity:        0.35,
    shadowRadius:         24,
    elevation:            20,
  },

  // Subtle white glass sheen on top half
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius:   BAR_RADIUS,
    backgroundColor: "rgba(255,255,255,0.02)",
  },

  tabItem: {
    flex:           1,
    height:         BAR_HEIGHT,
    alignItems:     "center",
    justifyContent: "center",
    gap:            2,
    position:       "relative",
  },

  // Gradient pill behind the icon when active
  pillContainer: {
    position:     "absolute",
    width:        PILL_W,
    height:       PILL_H,
    borderRadius: PILL_H / 2,
    overflow:     "hidden",
  },

  label: {
    fontSize:    9.5,
    fontFamily:  theme.fonts.bold,
    letterSpacing: 0.3,
    textAlign:   "center",
  },

  badge: {
    position:          "absolute",
    top:               8,
    right:             "18%",
    minWidth:          15,
    height:            15,
    borderRadius:      8,
    backgroundColor:   theme.colors.error.base,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 3,
    borderWidth:       1.5,
    borderColor:       "rgba(15,23,42,0.94)",
  },
  badgeText: {
    color:      "#fff",
    fontSize:   8,
    fontFamily: theme.fonts.black,
    lineHeight: 11,
  },
});
