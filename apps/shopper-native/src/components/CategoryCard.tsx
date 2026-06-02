import React, { memo } from "react";
import { Platform, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
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
  const { t } = useTranslation();
  const [c1, c2] = theme.catGradients[gradientIdx % theme.catGradients.length];
  const icon      = getIcon(category.name);
  const label     = lang === "ar" ? category.name : category.nameEn;

  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Refined hardware-switch press — restrained, never bouncy
  const onPressIn  = () => { scale.value = withSpring(0.96, theme.animation.spring.press); };
  const onPressOut = () => { scale.value = withSpring(1,    theme.animation.spring.press); };

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
          width:        isPill ? 104 : undefined,
          height:       isPill ? 168 : 132,
          borderRadius: theme.radius['2xl'],
          overflow:     "hidden",
          ...theme.shadow.card,
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
          paddingBottom:  isPill ? 18 : 0,
          gap:            isPill ? 0 : 10,
        }}>

        {/* Single soft "lens-flare" — refined, no template circles */}
        <View style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.10)" }} />

        {/* Icon bubble */}
        <View
          style={{
            width:           isPill ? 52 : 56,
            height:          isPill ? 52 : 56,
            borderRadius:    isPill ? 16 : 17,
            backgroundColor: "rgba(255,255,255,0.18)",
            alignItems:      "center",
            justifyContent:  "center",
            borderWidth:     1,
            borderColor:     "rgba(255,255,255,0.26)",
          }}>
          {icon.lib === "MCI" ? (
            <MaterialCommunityIcons name={icon.name} size={24} color="#fff" />
          ) : (
            <Ionicons name={icon.name} size={24} color="#fff" />
          )}
        </View>

        {/* Label */}
        <View style={{ alignItems: "center", paddingHorizontal: 8, gap: 4 }}>
          <UIText
            variant="caption"
            weight="bold"
            color="inverse"
            align="center"
            numberOfLines={2}
            style={{ lineHeight: isPill ? 15 : 17 }}>
            {label}
          </UIText>
        </View>
      </LinearGradient>
    </AnimPressable>
  );
});
