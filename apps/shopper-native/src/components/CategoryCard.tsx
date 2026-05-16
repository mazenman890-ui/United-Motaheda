import React, { memo } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
  default:              { lib: "MCI",      name: "pill"                  },
  "أدوية":              { lib: "MCI",      name: "pill"                  },
  "الأدوية":            { lib: "MCI",      name: "pill"                  },
  "الصحة":             { lib: "Ionicons", name: "fitness-outline"        },
  "الأجهزة":            { lib: "Ionicons", name: "pulse-outline"          },
  "الأم":               { lib: "Ionicons", name: "heart-circle-outline"   },
  "الفيتامينات":        { lib: "Ionicons", name: "leaf-outline"           },
  "مكملات":             { lib: "Ionicons", name: "nutrition-outline"      },
  "البشرة":             { lib: "Ionicons", name: "sparkles-outline"       },
  "الإسعافات":          { lib: "Ionicons", name: "medkit-outline"         },
  "الشخصية":            { lib: "Ionicons", name: "body-outline"           },
  "الفم":               { lib: "Ionicons", name: "water-outline"          },
  "مستلزمات":           { lib: "Ionicons", name: "thermometer-outline"    },
};

function getIcon(name: string): IconEntry {
  const key = Object.keys(CAT_ICONS).find((k) => k !== "default" && name.includes(k));
  return key ? CAT_ICONS[key] : CAT_ICONS.default;
}

interface CategoryCardProps {
  category:    NativeCategory;
  gradientIdx: number;
  lang?:       "ar" | "en";
  onPress?:    () => void;
  variant?:    "pill" | "tile";
}

const AnimPressable = Animated.createAnimatedComponent(Pressable);

export const CategoryCard = memo(function CategoryCard({
  category,
  gradientIdx,
  lang    = "ar",
  onPress,
  variant = "pill",
}: CategoryCardProps) {
  const [c1, c2] = theme.catGradients[gradientIdx % theme.catGradients.length];
  const icon      = getIcon(category.name);
  const label     = lang === "ar" ? category.name : category.nameEn;

  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn  = () => { scale.value = withSpring(0.93, theme.animation.spring.snappy); };
  const onPressOut = () => { scale.value = withSpring(1,    theme.animation.spring.default); };

  const isPill = variant === "pill";

  return (
    <AnimPressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync();
        onPress?.();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        anim,
        {
          width:        isPill ? 100 : undefined,
          height:       isPill ? 168 : 130,
          borderRadius: theme.radius['2xl'],
          overflow:     "hidden",
          ...theme.shadow.md,
        },
      ]}>
      <LinearGradient
        colors={[c1, c2]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={{
          flex:           1,
          alignItems:     "center",
          justifyContent: isPill ? "space-between" : "center",
          paddingTop:     isPill ? 20 : 0,
          paddingBottom:  isPill ? 16 : 0,
          gap:            isPill ? 0 : 8,
        }}>

        {/* Decorative circles */}
        <View style={{ position: "absolute", top: -18, right: -18, width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(255,255,255,0.10)" }} />
        <View style={{ position: "absolute", bottom: -14, left: -14, width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.07)" }} />

        {/* Icon bubble */}
        <View
          style={{
            width:           isPill ? 50 : 54,
            height:          isPill ? 50 : 54,
            borderRadius:    isPill ? 16 : 17,
            backgroundColor: "rgba(255,255,255,0.20)",
            alignItems:      "center",
            justifyContent:  "center",
            borderWidth:     1,
            borderColor:     "rgba(255,255,255,0.28)",
          }}>
          {icon.lib === "MCI" ? (
            <MaterialCommunityIcons name={icon.name} size={24} color="#fff" />
          ) : (
            <Ionicons name={icon.name} size={24} color="#fff" />
          )}
        </View>

        {/* Label */}
        <View style={{ alignItems: "center", paddingHorizontal: 6, gap: 3 }}>
          <Text
            numberOfLines={2}
            style={{
              color:            "#fff",
              fontSize:         isPill ? 11 : 12,
              fontFamily:       theme.fonts.bold,
              textAlign:        "center",
              lineHeight:       isPill ? 15 : 16,
              textShadowColor:  "rgba(0,0,0,0.18)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}>
            {label}
          </Text>
          {category.count > 0 && (
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 9, fontFamily: theme.fonts.semibold }}>
              {category.count} منتج
            </Text>
          )}
        </View>
      </LinearGradient>
    </AnimPressable>
  );
});
