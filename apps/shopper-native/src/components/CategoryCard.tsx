/**
 * CategoryCard — supports three variants:
 *   "pill"   — tall vertical pill (legacy, used in strip rails)
 *   "tile"   — square gradient tile (categories screen, original)
 *   "pastel" — soft pastel background, dark text, isolated icon
 *              (elite 2-col grid, Apple / Noon aesthetic)
 *
 * All variants share Reanimated 0.97 spring press interaction.
 */
import React, { memo } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
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

// ─── Icon catalogue ───────────────────────────────────────────────────────────

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

// ─── Pastel palette — 10 tones, stable from index ────────────────────────────

const PASTEL: { bg: string; iconBg: string; iconColor: string }[] = [
  { bg: "#EFF6FF", iconBg: "#BFDBFE", iconColor: "#1D4ED8" },  // blue
  { bg: "#F5F3FF", iconBg: "#DDD6FE", iconColor: "#6D28D9" },  // violet
  { bg: "#F0FDF4", iconBg: "#BBF7D0", iconColor: "#15803D" },  // green
  { bg: "#FFFBEB", iconBg: "#FDE68A", iconColor: "#B45309" },  // amber
  { bg: "#FFF1F2", iconBg: "#FECDD3", iconColor: "#BE123C" },  // rose
  { bg: "#ECFEFF", iconBg: "#A5F3FC", iconColor: "#0E7490" },  // cyan
  { bg: "#FEF3C7", iconBg: "#FDE68A", iconColor: "#92400E" },  // warm amber
  { bg: "#F7FEE7", iconBg: "#D9F99D", iconColor: "#3F6212" },  // lime
  { bg: "#F0F4FF", iconBg: "#C7D2FE", iconColor: "#3730A3" },  // indigo
  { bg: "#FDF4FF", iconBg: "#F5D0FE", iconColor: "#86198F" },  // fuchsia
];

// ─── Component ────────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category:    NativeCategory;
  gradientIdx: number;
  lang?:       "ar" | "en";
  onPress?:    () => void;
  variant?:    "pill" | "tile" | "pastel";
}

const AnimPressable = Animated.createAnimatedComponent(Pressable);

export const CategoryCard = memo(function CategoryCard({
  category, gradientIdx,
  lang    = "ar",
  onPress,
  variant = "pill",
}: CategoryCardProps) {
  const { t: _t } = useTranslation();
  const [c1, c2]  = theme.catGradients[gradientIdx % theme.catGradients.length];
  const pastel    = PASTEL[gradientIdx % PASTEL.length];
  const icon      = getIcon(category.name);
  const label     = lang === "ar" ? category.name : category.nameEn;

  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn  = () => { scale.value = withSpring(0.97, theme.animation.spring.press); };
  const onPressOut = () => { scale.value = withSpring(1,    theme.animation.spring.press); };

  const iconNode = icon.lib === "MCI"
    ? <MaterialCommunityIcons name={icon.name} size={24} color={variant === "pastel" ? pastel.iconColor : "#fff"} />
    : <Ionicons               name={icon.name} size={24} color={variant === "pastel" ? pastel.iconColor : "#fff"} />;

  // ── Pastel variant — clean, Apple-store aesthetic ────────────────────────────
  if (variant === "pastel") {
    return (
      <AnimPressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
          onPress?.();
        }}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[anim, ps.card, { backgroundColor: pastel.bg }]}>

        {/* Isolated icon bubble */}
        <View style={[ps.iconBubble, { backgroundColor: pastel.iconBg }]}>
          {iconNode}
        </View>

        {/* Bold label */}
        <UIText
          variant="caption"
          weight="black"
          align="center"
          numberOfLines={2}
          style={[ps.label, { color: theme.colors.text.primary }]}>
          {label}
        </UIText>

        {/* Subtle product count */}
        {category.count > 0 && (
          <UIText
            variant="eyebrow"
            align="center"
            style={[ps.count, { color: pastel.iconColor }]}>
            {category.count}
          </UIText>
        )}
      </AnimPressable>
    );
  }

  // ── Gradient tile / pill (unchanged, backward-compat) ────────────────────────
  const isPill = variant === "pill";

  return (
    <AnimPressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
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
        <View style={{ position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.10)" }} />
        <View style={{
          width:           isPill ? 52 : 56,
          height:          isPill ? 52 : 56,
          borderRadius:    isPill ? 16 : 17,
          backgroundColor: "rgba(255,255,255,0.18)",
          alignItems:      "center",
          justifyContent:  "center",
          borderWidth:     1,
          borderColor:     "rgba(255,255,255,0.26)",
        }}>
          {iconNode}
        </View>
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

// ─── Pastel-variant styles ────────────────────────────────────────────────────

const ps = StyleSheet.create({
  card: {
    borderRadius:   20,
    alignItems:     "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 10,
    gap:            10,
    // Soft shadow — no heavy border
    shadowColor:    "#0C2240",
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.05,
    shadowRadius:   8,
    elevation:      2,
  },
  iconBubble: {
    width:          56,
    height:         56,
    borderRadius:   18,
    alignItems:     "center",
    justifyContent: "center",
  },
  label: {
    fontSize:      13,
    lineHeight:    18,
    paddingHorizontal: 4,
  },
  count: {
    fontSize:      10,
    letterSpacing: 0.3,
    opacity:       0.7,
  },
});
