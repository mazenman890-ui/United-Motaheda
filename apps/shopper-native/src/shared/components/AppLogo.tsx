/**
 * AppLogo — reusable brand-mark renderer.
 *
 * Renders the "UP" mark from assets/brand-mark.png as a self-contained app
 * tile: white background, proportional squircle radius, glyph inset.
 *
 * Geometry rationale (do not "simplify"):
 *   - brand-mark.png is a fully opaque 196×196 RGB square (no alpha) whose
 *     glyph bleeds to the image edges. Rendering it edge-to-edge inside a
 *     rounded container clips the glyph and exposes square white edges —
 *     the component must own clipping and inset the art itself.
 *   - GLYPH_INSET scales the image to 76% so the mark clears the rounded
 *     corners at every size.
 *   - The container background is white to match the art's baked background,
 *     so the inset region blends seamlessly (also removes the decode flash).
 *   - Call sites may still wrap with their own radius; the white tile
 *     composes cleanly under any outer clip.
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

import React, { useState } from "react";
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

/** Image occupies this fraction of the tile so corners never clip the glyph. */
const GLYPH_INSET = 0.82;

/** Squircle-ish corner ratio (iOS app-icon ≈ 0.2237). */
const RADIUS_RATIO = 0.24;

// Bundled local asset — referenced at module level so metro never loses the path
const BRAND_MARK = require("../../../assets/brand-mark.png");

export type AppLogoSize = keyof typeof SIZE;

export interface AppLogoProps {
  /** Token size, or an exact pixel size for slots the tokens don't cover. */
  size?:  AppLogoSize | number;
  style?: StyleProp<ViewStyle>;
}

export function AppLogo({ size = "md", style }: AppLogoProps): React.ReactElement {
  const px   = typeof size === "number" ? size : SIZE[size];
  const icon = typeof size === "number" ? Math.round(size * 0.55) : ICON_SIZE[size];
  const [failed, setFailed] = useState(false);

  return (
    <View
      style={[
        s.container,
        { width: px, height: px, borderRadius: Math.round(px * RADIUS_RATIO) },
        style,
      ]}
      accessibilityIgnoresInvertColors>

      {failed ? (
        // Shown only if the bundled PNG fails to decode (effectively never).
        <Ionicons name="medkit" size={icon} color={theme.colors.brand[700]} />
      ) : (
        <Image
          source={BRAND_MARK}
          style={{ width: px * GLYPH_INSET, height: px * GLYPH_INSET }}
          contentFit="contain"
          onError={() => setFailed(true)}
          accessibilityLabel="United Pharmacy"
          accessibilityIgnoresInvertColors
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    // White matches the art's baked background — the inset blends seamlessly
    // and no flash is visible while the PNG decodes.
    backgroundColor: "#FFFFFF",
    overflow:        "hidden",
    alignItems:      "center",
    justifyContent:  "center",
  },
});
