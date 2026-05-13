import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { theme } from "@/theme";
import type { NativeCategory } from "@/services/productsApi";

type IconEntry =
  | { lib: "Ionicons"; name: React.ComponentProps<typeof Ionicons>["name"] }
  | { lib: "MCI";      name: React.ComponentProps<typeof MaterialCommunityIcons>["name"] };

const CAT_ICONS: Record<string, IconEntry> = {
  default:               { lib: "MCI",      name: "pill" },
  "أدوية":              { lib: "MCI",      name: "pill" },
  "الأدوية":            { lib: "MCI",      name: "pill" },
  "الصحة العامة":        { lib: "Ionicons", name: "fitness-outline" },
  "الأجهزة الطبية":      { lib: "Ionicons", name: "pulse-outline" },
  "الأم والطفل":          { lib: "Ionicons", name: "heart-circle-outline" },
  "الفيتامينات":          { lib: "Ionicons", name: "leaf-outline" },
  "العناية بالبشرة":     { lib: "Ionicons", name: "sparkles-outline" },
  "الإسعافات":           { lib: "Ionicons", name: "medkit-outline" },
  "العناية الشخصية":     { lib: "Ionicons", name: "body-outline" },
  "العناية بالفم":       { lib: "Ionicons", name: "water-outline" },
  "مستلزمات طبية":       { lib: "Ionicons", name: "thermometer-outline" },
  "مكملات":             { lib: "Ionicons", name: "leaf-outline" },
};

function getIcon(name: string): IconEntry {
  const key = Object.keys(CAT_ICONS).find((k) => name.includes(k));
  return key ? CAT_ICONS[key] : CAT_ICONS.default;
}

interface CategoryCardProps {
  category:    NativeCategory;
  gradientIdx: number;
  lang?:       "ar" | "en";
  onPress?:    () => void;
  /** horizontal scroll pill style (default) vs grid tile */
  variant?:    "pill" | "tile";
}

export function CategoryCard({
  category,
  gradientIdx,
  lang = "ar",
  onPress,
  variant = "pill",
}: CategoryCardProps) {
  const [c1, c2] = theme.catGradients[gradientIdx % theme.catGradients.length];
  const iconEntry = getIcon(category.name);
  const label     = lang === "ar" ? category.name : category.nameEn;

  const scale = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isPill = variant === "pill";

  return (
    <Animated.View style={cardStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.95, { damping: 12, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1,    { damping: 12, stiffness: 300 }); }}
        style={{
          width:        isPill ? 102 : undefined,
          height:       isPill ? 172 : 140,
          borderRadius: theme.radius["2xl"],
          overflow:     "hidden",
          ...theme.shadow.md,
        }}>
        <LinearGradient
          colors={[c1, c2]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{
            flex:           1,
            alignItems:     "center",
            justifyContent: isPill ? "space-between" : "center",
            paddingTop:     isPill ? 22 : 0,
            paddingBottom:  isPill ? 18 : 0,
            gap:            isPill ? 0 : 10,
          }}>

          {/* Decorative circles */}
          <View
            style={{
              position:        "absolute",
              top:    -20,
              right:  -20,
              width:  72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          />
          <View
            style={{
              position:        "absolute",
              bottom: -16,
              left:   -16,
              width:  54,
              height: 54,
              borderRadius: 27,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          />

          {/* Icon bubble */}
          <View
            style={{
              width:           isPill ? 52 : 56,
              height:          isPill ? 52 : 56,
              borderRadius:    isPill ? 17 : 18,
              backgroundColor: "rgba(255,255,255,0.22)",
              alignItems:      "center",
              justifyContent:  "center",
              borderWidth:     1,
              borderColor:     "rgba(255,255,255,0.30)",
            }}>
            {iconEntry.lib === "MCI" ? (
              <MaterialCommunityIcons name={iconEntry.name} size={26} color="#fff" />
            ) : (
              <Ionicons name={iconEntry.name} size={26} color="#fff" />
            )}
          </View>

          {/* Label */}
          <View style={{ alignItems: "center", paddingHorizontal: 8, gap: 2 }}>
            <Text
              numberOfLines={2}
              style={{
                color:           "#fff",
                fontSize:        isPill ? 11 : 12,
                fontWeight:      "800",
                textAlign:       "center",
                lineHeight:      isPill ? 15 : 16,
                textShadowColor: "rgba(0,0,0,0.15)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}>
              {label}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
