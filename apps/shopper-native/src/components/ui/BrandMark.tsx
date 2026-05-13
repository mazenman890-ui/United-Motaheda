import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/theme";

type BrandMarkSize    = "sm" | "md" | "lg" | "xl";
type BrandMarkVariant = "onHero" | "onLight";

interface BrandMarkProps {
  size?:     BrandMarkSize;
  variant?:  BrandMarkVariant;
  showText?: boolean;
  showSlogan?: boolean;
}

const SIZE_MAP: Record<BrandMarkSize, { icon: number; inner: number; outer: number; gap: number; titleSize: number; }> = {
  sm: { icon: 24, inner: 56,  outer: 72,  gap: 8,  titleSize: 14 },
  md: { icon: 36, inner: 78,  outer: 96,  gap: 10, titleSize: 18 },
  lg: { icon: 46, inner: 96,  outer: 118, gap: 12, titleSize: 22 },
  xl: { icon: 58, inner: 118, outer: 146, gap: 14, titleSize: 26 },
};

export function BrandMark({
  size      = "md",
  variant   = "onHero",
  showText  = false,
  showSlogan = false,
}: BrandMarkProps) {
  const s          = SIZE_MAP[size];
  const isOnHero   = variant === "onHero";
  const textColor  = isOnHero ? "#fff"                    : theme.colors.slate[900];
  const subtleColor = isOnHero ? "rgba(255,255,255,0.50)" : theme.colors.slate[400];

  return (
    <View style={{ alignItems: "center", gap: s.gap }}>
      {/* Outer glow ring */}
      <View
        style={{
          width:           s.outer,
          height:          s.outer,
          borderRadius:    s.outer / 2,
          alignItems:      "center",
          justifyContent:  "center",
          backgroundColor: isOnHero
            ? "rgba(255,255,255,0.06)"
            : theme.colors.brand[50],
          borderWidth:     1.5,
          borderColor:     isOnHero
            ? "rgba(255,255,255,0.14)"
            : theme.colors.brand[100],
        }}>

        {/* Inner gradient core */}
        <LinearGradient
          colors={["#06b6d4", "#0891b2", "#0e7490"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            width:           s.inner,
            height:          s.inner,
            borderRadius:    s.inner / 2,
            alignItems:      "center",
            justifyContent:  "center",
            borderWidth:     1.5,
            borderColor:     "rgba(255,255,255,0.22)",
          }}>

          {/* Decorative highlight arc */}
          <View
            style={{
              position:        "absolute",
              top:             s.inner * 0.1,
              left:            s.inner * 0.15,
              width:           s.inner * 0.55,
              height:          s.inner * 0.28,
              borderRadius:    s.inner,
              backgroundColor: "rgba(255,255,255,0.18)",
            }}
          />

          <Ionicons name="medical-outline" size={s.icon} color="#fff" />
        </LinearGradient>
      </View>

      {showText && (
        <View style={{ alignItems: "center", gap: 3 }}>
          <Text
            style={{
              color:         textColor,
              fontSize:      s.titleSize,
              fontWeight:    "900",
              letterSpacing: 0.3,
            }}>
            United Motaheda
          </Text>
          {showSlogan && (
            <Text
              style={{
                color:         subtleColor,
                fontSize:      11,
                fontWeight:    "700",
                letterSpacing: 1.8,
              }}>
              لكل داء دواء
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
