import React from "react";
import { View, Text } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return (
    <Ionicons
      name={name}
      size={focused ? 24 : 22}
      color={focused ? theme.colors.brand[600] : theme.colors.slate[400]}
    />
  );
}

function CartTabIcon({ focused }: { focused: boolean }) {
  const count = useCartStore((s) => s.itemCount());
  return (
    <View style={{ position: "relative" }}>
      <Ionicons
        name={focused ? "cart" : "cart-outline"}
        size={focused ? 24 : 22}
        color={focused ? theme.colors.brand[600] : theme.colors.slate[400]}
      />
      {count > 0 && (
        <View style={{
          position:          "absolute",
          top:               -4,
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
            {Math.min(count, 99)}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const TAB_H  = insets.bottom > 0 ? 60 + insets.bottom : 66;

  return (
    <Tabs
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   theme.colors.brand[600],
        tabBarInactiveTintColor: theme.colors.slate[400],
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth:  1,
          borderTopColor:  theme.colors.slate[150],
          paddingBottom:   insets.bottom > 0 ? insets.bottom : 10,
          paddingTop:      8,
          height:          TAB_H,
          ...theme.shadow.lg,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: "700",
          marginTop:  2,
        },
        tabBarItemStyle: { paddingTop: 4 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title:      "الرئيسية",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "home" : "home-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title:      "المنتجات",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "medkit" : "medkit-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title:      "بحث",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "search" : "search-outline"} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title:      "السلة",
          tabBarIcon: ({ focused }) => <CartTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title:      "حسابي",
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? "person" : "person-outline"} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
