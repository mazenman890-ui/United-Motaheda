import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { theme } from "@/theme";
import { useCartStore } from "@/stores/cart";

interface HeaderProps {
  title:     string;
  showBack?: boolean;
  showCart?: boolean;
  right?:    React.ReactNode;
  rtl?:      boolean;
}

export function Header({ title, showBack, showCart, right, rtl }: HeaderProps) {
  const insets    = useSafeAreaInsets();
  const router    = useRouter();
  const cartCount = useCartStore((s) => s.itemCount());

  return (
    <View
      style={{
        paddingTop:        insets.top + 10,
        paddingBottom:     13,
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
            width:           38,
            height:          38,
            borderRadius:    12,
            backgroundColor: theme.colors.slate[50],
            alignItems:      "center",
            justifyContent:  "center",
            borderWidth:     1,
            borderColor:     theme.colors.slate[200],
          }}>
          <Ionicons
            name={rtl ? "arrow-forward" : "arrow-back"}
            size={18}
            color={theme.colors.slate[700]}
          />
        </Pressable>
      )}

      <Text
        numberOfLines={1}
        style={{
          flex:       1,
          fontSize:   17,
          fontFamily: theme.fonts.black,
          color:      theme.colors.slate[900],
          textAlign:  rtl ? "right" : "left",
        }}>
        {title}
      </Text>

      {right}

      {showCart && (
        <Pressable
          onPress={() => router.push("/(tabs)/cart")}
          style={{
            width:           40,
            height:          40,
            borderRadius:    12,
            backgroundColor: theme.colors.brand[50],
            alignItems:      "center",
            justifyContent:  "center",
            position:        "relative",
            borderWidth:     1,
            borderColor:     theme.colors.brand[100],
          }}>
          <Ionicons name="cart-outline" size={20} color={theme.colors.brand[600]} />
          {cartCount > 0 && (
            <View style={{
              position:          "absolute",
              top:               -4,
              right:             -4,
              backgroundColor:   theme.colors.amber[500],
              borderRadius:      8,
              minWidth:          17,
              height:            17,
              alignItems:        "center",
              justifyContent:    "center",
              paddingHorizontal: 3,
              borderWidth:       1.5,
              borderColor:       "#fff",
            }}>
              <Text style={{ color: "#fff", fontSize: 8, fontFamily: theme.fonts.black }}>{Math.min(cartCount, 99)}</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}
