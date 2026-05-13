import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";
import type { NativeCategory } from "@/services/productsApi";

const CAT_ICONS: Record<string, string> = {
  default:              "💊",
  "أدوية":             "💊",
  "الأدوية والعلاجات": "💊",
  "الصحة العامة":      "🩺",
  "الأجهزة الطبية":    "🏥",
  "الأم والطفل":        "🍼",
  "الفيتامينات":        "🌿",
  "العناية بالبشرة":   "✨",
  "الإسعافات":         "🚑",
  "العناية الشخصية":   "🪥",
  "العناية بالفم":     "🦷",
};

interface CategoryCardProps {
  category:    NativeCategory;
  gradientIdx: number;
  lang?:       "ar" | "en";
  onPress?:    () => void;
}

export function CategoryCard({ category, gradientIdx, lang = "ar", onPress }: CategoryCardProps) {
  const [c1, c2] = theme.catGradients[gradientIdx % theme.catGradients.length];
  const emoji    = Object.entries(CAT_ICONS).find(([k]) => category.name.includes(k))?.[1] ?? CAT_ICONS.default;
  const label    = lang === "ar" ? category.name : category.nameEn;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width:     108,
        height:    168,
        borderRadius: theme.radius["2xl"],
        overflow:  "hidden",
        opacity:   pressed ? 0.92 : 1,
        transform: [{ translateY: pressed ? 0 : 0 }],
        ...theme.shadow.md,
      })}>
      <LinearGradient
        colors={[c1, c2]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 20, paddingBottom: 16 }}>

        {/* Glow circle */}
        <View style={{
          position: "absolute", top: -20, right: -20,
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: "rgba(255,255,255,0.15)",
        }} />
        <View style={{
          position: "absolute", bottom: -16, left: -16,
          width: 60, height: 60, borderRadius: 30,
          backgroundColor: "rgba(255,255,255,0.12)",
        }} />

        {/* Icon bubble */}
        <View style={{
          width: 52, height: 52, borderRadius: 16,
          backgroundColor: "rgba(255,255,255,0.25)",
          alignItems: "center", justifyContent: "center",
          shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 3,
        }}>
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
        </View>

        {/* Label + count */}
        <View style={{ alignItems: "center", paddingHorizontal: 8, gap: 2 }}>
          <Text
            numberOfLines={2}
            style={{
              color: "#fff", fontSize: 11, fontWeight: "800",
              textAlign: "center", lineHeight: 15,
              textShadowColor: "rgba(0,0,0,0.20)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}>
            {label}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 9.5, fontWeight: "600" }}>
            {category.count} {lang === "ar" ? "منتج" : "items"}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
