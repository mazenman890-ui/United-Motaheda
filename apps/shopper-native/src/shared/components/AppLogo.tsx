/**
 * AppLogo — reusable brand-mark renderer.
 *
 * Renders the bare square "UP" mark from assets/brand-mark.png. Strict
 * aspect ratio enforced via a fixed square container + contentFit="contain"
 * → zero distortion regardless of where it's placed.
 *
 * Uses expo-image (not the raw RN Image) so the brand mark benefits from
 * memory-disk caching — it appears on the auth screens, home hero, and
 * DeliveryHeader, and should never decode more than once per session.
 *
 * Use sites:
 *   - auth screens (login / register): size="xl"
 *   - home hero topbar: size="sm"
 *   - about / settings: size="lg"
 *   - inline copy / list rows: size="xs"
 *
 * Never use the old `assets/logo.png` (wide lockup with social icons) inline.
 * That file is the marketing artboard, not an icon.
 */

import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";

const SIZE: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 24,
  sm: 40,
  md: 64,
  lg: 96,
  xl: 140,
};

// Static local asset — decoded once, kept in memory for the session lifetime.
const BRAND_MARK = require("../../../assets/brand-mark.png");

export type AppLogoSize = keyof typeof SIZE;

export interface AppLogoProps {
  size?:  AppLogoSize;
  style?: StyleProp<ViewStyle>;
}

export function AppLogo({ size = "md", style }: AppLogoProps): React.ReactElement {
  const px = SIZE[size];
  return (
    <View style={[{ width: px, height: px }, style]} accessibilityIgnoresInvertColors>
      <Image
        source={BRAND_MARK}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        cachePolicy="memory-disk"
        transition={200}
        accessibilityLabel="United Pharmacy"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
