import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";

interface HeaderProps {
  title:      string;
  showBack?:  boolean;
  showCart?:  boolean;
  right?:     React.ReactNode;
  rtl?:       boolean;
}

export function Header({ title, showBack, showCart, right, rtl }: HeaderProps) {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const cartCount = useCartStore((s) => s.itemCount());

  return (
    <View
      style={{
        paddingTop:        insets.top + 8,
        paddingBottom:     12,
        paddingHorizontal: 16,
        backgroundColor:   "#fff",
        flexDirection:     rtl ? "row-reverse" : "row",
        alignItems:        "center",
        gap:               12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.slate[100],
        ...theme.shadow.sm,
      }}>

      {showBack && (
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={{
            width: 36, height: 36, borderRadius: 12,
            backgroundColor: theme.colors.slate[100],
            alignItems: "center", justifyContent: "center",
          }}>
          <Text style={{ fontSize: 18, color: theme.colors.slate[700] }}>{rtl ? "→" : "←"}</Text>
        </Pressable>
      )}

      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize:   17,
          fontWeight: "900",
          color:      theme.colors.slate[950],
          textAlign:  rtl ? "right" : "left",
        }}>
        {title}
      </Text>

      {right}

      {showCart && (
        <Pressable
          onPress={() => router.push("/(tabs)/cart")}
          style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: theme.colors.brand[50],
            alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
          <Text style={{ fontSize: 20 }}>🛒</Text>
          {cartCount > 0 && (
            <View style={{
              position: "absolute", top: -2, right: -2,
              backgroundColor: theme.colors.brand[600],
              borderRadius: 8, minWidth: 16, height: 16,
              alignItems: "center", justifyContent: "center",
              paddingHorizontal: 3,
            }}>
              <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{cartCount}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}
