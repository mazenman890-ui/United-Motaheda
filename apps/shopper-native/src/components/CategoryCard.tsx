import React from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/theme";
import type { NativeCategory } from "@/services/productsApi";
import { Text } from "react-native";

type IconEntry =
  | { lib: "Ionicons"; name: React.ComponentProps<typeof Ionicons>["name"] }
  | { lib: "MCI";      name: React.ComponentProps<typeof MaterialCommunityIcons>["name"] };

const CAT_ICONS: Record<string, IconEntry> = {
  default:               { lib: "MCI",      name: "pill" },
  "أدوية":              { lib: "MCI",      name: "pill" },
  "الأدوية والعلاجات":  { lib: "MCI",      name: "pill" },
  "الصحة العامة":        { lib: "Ionicons", name: "fitness-outline" },
  "الأجهزة الطبية":      { lib: "Ionicons", name: "pulse-outline" },
  "الأم والطفل":          { lib: "Ionicons", name: "heart-circle-outline" },
  "الفيتامينات":          { lib: "Ionicons", name: "leaf-outline" },
  "العناية بالبشرة":     { lib: "Ionicons", name: "sparkles-outline" },
  "الإسعافات":           { lib: "Ionicons", name: "medkit-outline" },
  "العناية الشخصية":     { lib: "Ionicons", name: "body-outline" },
  "العناية بالفم":       { lib: "Ionicons", name: "water-outline" },
};

interface CategoryCardProps {
  category:    NativeCategory;
  gradientIdx: number;
  lang?:       "ar" | "en";
  onPress?:    () => void;
}

export function CategoryCard({ category, gradientIdx, lang = "ar", onPress }: CategoryCardProps) {
  const [c1, c2] = theme.catGradients[gradientIdx % theme.catGradients.length];
  const iconEntry = Object.entries(CAT_ICONS).find(([k]) => category.name.includes(k))?.[1] ?? CAT_ICONS.default;
  const label     = lang === "ar" ? category.name : category.nameEn;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width:        100,
        height:       168,
        borderRadius: theme.radius["2xl"],
        overflow:     "hidden",
        opacity:      pressed ? 0.9 : 1,
        ...theme.shadow.md,
      })}>
      <LinearGradient
        colors={[c1, c2]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ flex: 1, alignItems: "center", justifyContent: "space-between", paddingTop: 20, paddingBottom: 16 }}>

        {/* Decorative circles */}
        <View style={{ position: "absolute", top: -18, right: -18, width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.12)" }} />
        <View style={{ position: "absolute", bottom: -14, left: -14, width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.10)" }} />

        {/* Icon bubble */}
        <View style={{
          width:           50,
          height:          50,
          borderRadius:    16,
          backgroundColor: "rgba(255,255,255,0.22)",
          alignItems:      "center",
          justifyContent:  "center",
          shadowColor:     "#000",
          shadowOpacity:   0.15,
          shadowRadius:    6,
          elevation:       3,
        }}>
          {iconEntry.lib === "MCI" ? (
            <MaterialCommunityIcons name={iconEntry.name} size={24} color="#fff" />
          ) : (
            <Ionicons name={iconEntry.name} size={24} color="#fff" />
          )}
        </View>

        {/* Label + count */}
        <View style={{ alignItems: "center", paddingHorizontal: 8, gap: 2 }}>
          <Text
            numberOfLines={2}
            style={{
              color:              "#fff",
              fontSize:           11,
              fontWeight:         "800",
              textAlign:          "center",
              lineHeight:         15,
              textShadowColor:    "rgba(0,0,0,0.18)",
              textShadowOffset:   { width: 0, height: 1 },
              textShadowRadius:   3,
            }}>
            {label}
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 9.5, fontWeight: "600" }}>
            {category.count} {lang === "ar" ? "منتج" : "items"}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
