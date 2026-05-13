import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const cfg   = TAB_CONFIG[name] ?? TAB_CONFIG.index;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = withSpring(focused ? 1.18 : 1, { damping: 10, stiffness: 320 });
  }, [focused, scale]);

  const color = focused ? theme.colors.brand[600] : theme.colors.slate[400];

  return (
    <View style={{ alignItems: "center", gap: 3 }}>
      <Animated.View style={animStyle}>
        <Ionicons
          name={focused ? cfg.active : cfg.inactive}
          size={22}
          color={color}
        />
      </Animated.View>
      <Text style={{ fontSize: 9, fontWeight: focused ? "800" : "500", color }}>
        {cfg.label}
      </Text>
      {focused && (
        <View
          style={{
            width:           4,
            height:          4,
            borderRadius:    2,
            backgroundColor: theme.colors.brand[500],
            marginTop:       -2,
          }}
        />
      )}
    </View>
  );
}

function CartTabIcon({ focused }: { focused: boolean }) {
  const cartCount = useCartStore((s) => s.itemCount());
  return (
    <View>
      <TabIcon name="cart" focused={focused} />
      {cartCount > 0 && (
        <View
          style={{
            position:          "absolute",
            top:               -4,
            right:             focused ? 2 : 4,
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
            {cartCount > 9 ? "9+" : cartCount}
          </Text>
        </View>
      )}
    </View>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position:          "absolute",
        bottom:            insets.bottom + 10,
        left:              14,
        right:             14,
        backgroundColor:   "#fff",
        borderRadius:      28,
        paddingHorizontal: 6,
        paddingVertical:   10,
        flexDirection:     "row",
        alignItems:        "center",
        justifyContent:    "space-around",
        ...theme.shadow.float,
      }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type:              "tabPress",
            target:            route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            hitSlop={8}
            style={{
              flex:            1,
              alignItems:      "center",
              justifyContent:  "center",
              paddingVertical: 4,
            }}>
            {route.name === "cart" ? (
              <CartTabIcon focused={focused} />
            ) : (
              <TabIcon name={route.name} focused={focused} />
            )}
          </Pressable>
        );
      })}
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
