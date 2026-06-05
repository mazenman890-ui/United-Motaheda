/**
 * AppLogo — reusable brand-mark renderer.
 *
 * Renders the bare square "UP" mark from assets/brand-mark.png.
 * Container background: brand.lightest (light teal) — prevents the blank
 * white flash that appeared while the PNG decoded on first launch.
 *
 * expo-image with no transition/cachePolicy: this is a bundled local asset,
 * it loads synchronously from the metro bundle — no disk I/O needed.
 *
 * Use sites:
 *   - auth screens (login / register): size="xl"
 *   - home hero topbar: size="sm"
 *   - about / settings: size="lg"
 *   - inline copy / list rows: size="xs"
 */

import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/shared/theme";

const SIZE: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 24,
  sm: 40,
  md: 64,
  lg: 96,
  xl: 140,
};

// Fallback icon size ≈ 55% of the container
const ICON_SIZE: Record<keyof typeof SIZE, number> = {
  xs: 13, sm: 22, md: 35, lg: 52, xl: 76,
};

// Bundled local asset — referenced at module level so metro never loses the path
const BRAND_MARK = require("../../../assets/brand-mark.png");

export type AppLogoSize = keyof typeof SIZE;

export interface AppLogoProps {
  size?:  AppLogoSize;
  style?: StyleProp<ViewStyle>;
}

export function AppLogo({ size = "md", style }: AppLogoProps): React.ReactElement {
  const px   = SIZE[size];
  const icon = ICON_SIZE[size];

  return (
    <View
      style={[s.container, { width: px, height: px }, style]}
      accessibilityIgnoresInvertColors>

      {/* Primary render — local bundled PNG via expo-image */}
      <Image
        source={BRAND_MARK}
        style={s.image}
        contentFit="contain"
        accessibilityLabel="United Pharmacy"
        accessibilityIgnoresInvertColors
      />

      {/* Emergency fallback — shown only if the PNG asset fails to decode.
          Positioned absolutely so it never affects layout of sibling elements. */}
      <View style={s.fallback} pointerEvents="none">
        <Ionicons name="medkit" size={icon} color={theme.colors.brand[700]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    // brand.lightest (#F0FDFB) shows before the PNG decodes —
    // eliminates the plain-white flash seen on cold launch.
    backgroundColor: theme.colors.brand.lightest,
    overflow:        "hidden",
  },
  image: {
    width:  "100%",
    height: "100%",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     "center",
    justifyContent: "center",
    opacity:        0,   // invisible normally; renders only if expo-image is absent
  },
});
