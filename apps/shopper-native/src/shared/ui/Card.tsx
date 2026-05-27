/**
 * Card — canonical elevated surface primitive.
 *
 * Replaces the inline `{ backgroundColor: "#fff", borderRadius: 18,
 * borderWidth: 1, ...theme.shadow.xs }` pattern found across 10+ screens.
 *
 * Variants (clinical/trust language):
 *   default     — hairline border + theme.shadow.xs. Everyday card.
 *   elevated    — no border, theme.shadow.card. More refined; reads as
 *                 "lifted off the page" without the noisy 1px border.
 *   raised      — no border, theme.shadow.lg. For hero / callout cards.
 *   flat        — softer hairline border, no shadow. Use inside another
 *                 card to avoid stacking elevation.
 *   outlined    — transparent bg, medium border, no shadow. Quiet card.
 *   interactive — elevated at rest, lifts subtly on press. Pair with
 *                 `onPress` for the primary tap target on a screen.
 *
 * Padding: pass a number (defaults to 16). Use the named semantic
 * helpers below for consistency: Card.padding.{sm, md, lg, xl}.
 */

import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { theme } from "@/shared/theme";

type CardVariant = "default" | "elevated" | "raised" | "flat" | "outlined" | "interactive";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  /** Padding inside the card. Defaults to 16. Pass 0 for none. */
  padding?: number;
  /** Border radius override. Defaults to 18. */
  radius?: number;
  /** Optional background-color override (e.g. brand-tinted callout). */
  background?: string;
  /** Wraps content in a Pressable + adds press-lift animation. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const AnimPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  variant = "default",
  padding = 16,
  radius = 18,
  background,
  onPress,
  style,
}: CardProps) {
  const scale = useSharedValue(1);
  const interactive = variant === "interactive" || !!onPress;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn  = () => {
    if (!interactive) return;
    scale.value = withSpring(0.985, theme.animation.spring.press);
  };
  const onPressOut = () => {
    if (!interactive) return;
    scale.value = withSpring(1, theme.animation.spring.press);
  };
  const handlePress = () => {
    if (!onPress) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  const composed: StyleProp<ViewStyle> = [
    styles.base,
    variantStyles[variant],
    { padding, borderRadius: radius },
    background ? { backgroundColor: background } : null,
    style,
  ];

  if (interactive) {
    return (
      <AnimPressable
        onPress={onPress ? handlePress : undefined}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[composed, animStyle]}>
        {children}
      </AnimPressable>
    );
  }

  return <View style={composed}>{children}</View>;
}

// ─── Semantic padding helpers ────────────────────────────────────────────────
// Use as `<Card padding={Card.padding.lg}>` so screens stop sprinkling
// magic numbers like `padding={20}`.
Card.padding = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#fff",
  },
});

const variantStyles: Record<CardVariant, StyleProp<ViewStyle>> = {
  // Existing: hairline border + theme.shadow.xs. Kept identical so old
  // callers don't visually shift.
  default: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    ...theme.shadow.xs,
  },
  // New premium tier — no border, soft card shadow. Reads as "lifted off
  // the page" without the heaviness of the 1px border.
  elevated: theme.shadow.card,
  // Existing — for hero callouts.
  raised: {
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    ...theme.shadow.lg,
  },
  // Existing — quiet card.
  flat: {
    borderWidth: 1,
    borderColor: theme.colors.slate[100],
  },
  // Existing — transparent bg.
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border.medium,
  },
  // New — elevated at rest, animates lift on press (via animStyle above).
  interactive: theme.shadow.card,
};
