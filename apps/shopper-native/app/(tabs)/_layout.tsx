import React, { useEffect, useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useCartStore } from "@/stores/cart";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface TabConfig {
  active:   IoniconsName;
  inactive: IoniconsName;
  label:    string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index:    { active: "home",   inactive: "home-outline",   label: "الرئيسية" },
  search:   { active: "search", inactive: "search-outline", label: "بحث" },
  products: { active: "grid",   inactive: "grid-outline",   label: "الأصناف" },
  cart:     { active: "cart",   inactive: "cart-outline",   label: "السلة" },
  profile:  { active: "person", inactive: "person-outline", label: "حسابي" },
};

interface TabItemProps {
  name:    string;
  focused: boolean;
  badge?:  number;
  onPress: () => void;
}

function TabItem({ name, focused, badge, onPress }: TabItemProps) {
  const cfg      = TAB_CONFIG[name] ?? TAB_CONFIG.index;
  const scale    = useSharedValue(1);
  const labelW   = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value  = withSpring(focused ? 1.1 : 1, { damping: 12, stiffness: 320, mass: 0.6 });
    labelW.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, labelW, scale]);

  const iconStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity:   labelW.value,
    maxWidth:  interpolate(labelW.value, [0, 1], [0, 52], Extrapolation.CLAMP),
    marginRight: interpolate(labelW.value, [0, 1], [0, 5], Extrapolation.CLAMP),
  }));

  const color = focused ? theme.colors.brand[600] : theme.colors.slate[400];

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        flex:            1,
        alignItems:      "center",
        justifyContent:  "center",
        paddingVertical: 8,
        position:        "relative",
      }}>

      {/* Active pill background */}
      {focused && (
        <Animated.View
          entering={undefined}
          style={{
            position:        "absolute",
            top:             4,
            bottom:          4,
            left:            8,
            right:           8,
            borderRadius:    16,
            backgroundColor: theme.colors.brand[50],
            borderWidth:     1,
            borderColor:     theme.colors.brand[100],
          }}
        />
      )}

      <View style={{ flexDirection: "row", alignItems: "center", zIndex: 1 }}>
        {/* Animated label (only on active, slides in) */}
        <Animated.Text
          numberOfLines={1}
          style={[{
            fontSize:   11,
            fontWeight: "800",
            color:      theme.colors.brand[700],
          }, labelStyle]}>
          {cfg.label}
        </Animated.Text>

        {/* Icon */}
        <Animated.View style={iconStyle}>
          <Ionicons
            name={focused ? cfg.active : cfg.inactive}
            size={22}
            color={color}
          />
        </Animated.View>

        {/* Cart badge */}
        {badge != null && badge > 0 && (
          <View
            style={{
              position:          "absolute",
              top:               -6,
              right:             -8,
              backgroundColor:   theme.colors.amber[500],
              borderRadius:      8,
              minWidth:          16,
              height:            16,
              alignItems:        "center",
              justifyContent:    "center",
              paddingHorizontal: 3,
              borderWidth:       1.5,
              borderColor:       "#fff",
            }}>
            <Text style={{ color: "#fff", fontSize: 8, fontWeight: "900" }}>
              {badge > 9 ? "9+" : badge}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets    = useSafeAreaInsets();
  const cartCount = useCartStore((s) => s.itemCount());

  const onPress = useCallback((route: { key: string; name: string }, focused: boolean) => {
    const event = navigation.emit({
      type:              "tabPress",
      target:            route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }, [navigation]);

  return (
    <View
      style={{
        position: "absolute",
        bottom:   insets.bottom + 8,
        left:     12,
        right:    12,
      }}
      pointerEvents="box-none">
      <BlurView
        intensity={72}
        tint="light"
        style={{
          borderRadius:  26,
          overflow:      "hidden",
          borderWidth:   1,
          borderColor:   "rgba(255,255,255,0.65)",
          ...theme.shadow.float,
        }}>
        <View
          style={{
            flexDirection:     "row",
            alignItems:        "center",
            paddingHorizontal: 4,
            paddingVertical:   4,
            backgroundColor:   "rgba(255,255,255,0.82)",
          }}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            return (
              <TabItem
                key={route.key}
                name={route.name}
                focused={focused}
                badge={route.name === "cart" ? cartCount : undefined}
                onPress={() => onPress(route, focused)}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index"    />
      <Tabs.Screen name="search"   />
      <Tabs.Screen name="products" />
      <Tabs.Screen name="cart"     />
      <Tabs.Screen name="profile"  />
    </Tabs>
  );
}
