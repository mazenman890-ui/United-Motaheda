import React from "react";
import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
    </View>
  );
}

function CartIcon({ focused }: { focused: boolean }) {
  const count = useCartStore((s) => s.itemCount());
  return (
    <View style={{ position: "relative" }}>
      <TabIcon emoji="🛒" focused={focused} />
      {count > 0 && (
        <View style={{
          position: "absolute", top: -4, right: -6,
          backgroundColor: theme.colors.brand[600],
          borderRadius: 8, minWidth: 15, height: 15,
          alignItems: "center", justifyContent: "center",
          paddingHorizontal: 2,
          borderWidth: 1.5,
          borderColor: "#fff",
        }}>
          <Text style={{ color: "#fff", fontSize: 8, fontWeight: "900" }}>{Math.min(count, 99)}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown:     false,
        tabBarActiveTintColor:   theme.colors.brand[600],
        tabBarInactiveTintColor: theme.colors.slate[400],
        tabBarStyle: {
          backgroundColor:  "#fff",
          borderTopColor:   theme.colors.slate[200],
          borderTopWidth:   1,
          paddingBottom:    insets.bottom > 0 ? insets.bottom : 8,
          paddingTop:       8,
          height:           insets.bottom > 0 ? 60 + insets.bottom : 66,
          elevation:        8,
          shadowColor:      "#000",
          shadowOffset:     { width: 0, height: -2 },
          shadowOpacity:    0.06,
          shadowRadius:     8,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: "700",
          marginTop:  2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title:    "الرئيسية",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title:    "المنتجات",
          tabBarIcon: ({ focused }) => <TabIcon emoji="💊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title:    "بحث",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title:    "السلة",
          tabBarIcon: ({ focused }) => <CartIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title:    "حسابي",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
