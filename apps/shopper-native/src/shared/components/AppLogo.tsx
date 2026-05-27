/**
 * AppLogo — reusable brand-mark renderer.
 *
 * Renders the bare square "UP" mark from assets/brand-mark.png. Strict
 * aspect ratio enforced via a fixed square container + resizeMode="contain"
 * → zero distortion regardless of where it's placed.
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
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const SIZE: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 24,
  sm: 40,
  md: 64,
  lg: 96,
  xl: 140,
};

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
        source={require("../../../assets/brand-mark.png")}
        style={styles.img}
        resizeMode="contain"
        accessibilityLabel="United Pharmacy"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    width:  "100%",
    height: "100%",
  },
});
