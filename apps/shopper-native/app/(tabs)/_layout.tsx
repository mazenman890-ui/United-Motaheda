import React, { useEffect, useCallback } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useCartStore } from "@/stores/cart";
import { useNotificationStore, selectUnreadCount } from "@/features/notifications";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  active:   IoniconsName;
  inactive: IoniconsName;
  label:    string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index:    { active: "home",           inactive: "home-outline",          label: "الرئيسية" },
  search:   { active: "search",         inactive: "search-outline",        label: "بحث"      },
  products: { active: "grid",           inactive: "grid-outline",          label: "الأصناف"  },
  cart:     { active: "bag",            inactive: "bag-outline",           label: "السلة"    },
  profile:  { active: "person-circle", inactive: "person-circle-outline", label: "حسابي"    },
};

// ─── Tab Item ─────────────────────────────────────────────────────────────────

interface TabItemProps {
  name:    string;
  focused: boolean;
  badge?:  number;
  onPress: () => void;
}

function TabItem({ name, focused, badge, onPress }: TabItemProps) {
  const cfg = TAB_CONFIG[name] ?? TAB_CONFIG.index;

  const scale      = useSharedValue(1);
  const pillOp     = useSharedValue(focused ? 1 : 0);
  const pillScaleX = useSharedValue(focused ? 1 : 0.6);
  const labelOp    = useSharedValue(focused ? 1 : 0.55);

  useEffect(() => {
    scale.value      = withSpring(focused ? 1.12 : 1, { damping: 14, stiffness: 360 });
    pillOp.value     = withTiming(focused ? 1 : 0, { duration: 160 });
    pillScaleX.value = withSpring(focused ? 1 : 0.6, { damping: 16, stiffness: 380 });
    labelOp.value    = withTiming(focused ? 1 : 0.55, { duration: 160 });
  }, [focused, scale, pillOp, pillScaleX, labelOp]);

  const iconAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pillAnim = useAnimatedStyle(() => ({
    opacity:   pillOp.value,
    transform: [{ scaleX: pillScaleX.value }],
  }));

  const labelAnim = useAnimatedStyle(() => ({
    opacity: labelOp.value,
  }));

  const color = focused ? theme.colors.brand[600] : theme.colors.slate[400];

  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.tabItem} hitSlop={6}>
      {/* Icon + pill chip */}
      <View style={styles.iconWrap}>
        {/* Pill chip */}
        <Animated.View style={[styles.pill, pillAnim]} />

        {/* Icon */}
        <Animated.View style={iconAnim}>
          <Ionicons
            name={focused ? cfg.active : cfg.inactive}
            size={20}
            color={color}
          />
        </Animated.View>

        {/* Badge */}
        {badge != null && badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        )}
      </View>

      {/* Label */}
      <Animated.Text
        style={[
          styles.label,
          { color, fontFamily: focused ? theme.fonts.bold : theme.fonts.regular },
          labelAnim,
        ]}
        numberOfLines={1}>
        {cfg.label}
      </Animated.Text>
    </Pressable>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────

function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets         = useSafeAreaInsets();
  const cartCount      = useCartStore((s) => s.itemCount());
  const unreadNotifs   = useNotificationStore(selectUnreadCount);

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

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        return (
          <TabItem
            key={route.key}
            name={route.name}
            focused={focused}
            badge={
              route.name === "cart"    ? (cartCount    || undefined) :
              route.name === "profile" ? (unreadNotifs || undefined) :
              undefined
            }
            onPress={() => onPress(route, focused)}
          />
        );
      })}
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
      <Tabs.Screen name="search"   />
      <Tabs.Screen name="products" />
      <Tabs.Screen name="cart"     />
      <Tabs.Screen name="profile"  />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    flexDirection:   "row",
    backgroundColor: theme.colors.surface,
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  theme.colors.border.medium,
    paddingTop:      6,
    shadowColor:     "#0C2240",
    shadowOffset:    { width: 0, height: -3 },
    shadowOpacity:   0.08,
    shadowRadius:    10,
    elevation:       10,
  },
  tabItem: {
    flex:           1,
    alignItems:     "center",
    gap:            2,
    paddingTop:     4,
  },
  iconWrap: {
    width:          44,
    height:         26,
    alignItems:     "center",
    justifyContent: "center",
    position:       "relative",
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.brand[50],
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     theme.colors.brand[100],
  },
  badge: {
    position:          "absolute",
    top:               -5,
    right:             -3,
    minWidth:          14,
    height:            14,
    borderRadius:      7,
    backgroundColor:   theme.colors.error.base,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 3,
    borderWidth:       1.5,
    borderColor:       theme.colors.surface,
  },
  badgeText: {
    color:      "#fff",
    fontSize:   7.5,
    fontFamily: theme.fonts.black,
    lineHeight: 10,
  },
  label: {
    fontSize:      9.5,
    letterSpacing: 0.2,
  },
});
