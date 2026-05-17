/**
 * Card — elevated white surface with rounded corners.
 *
 * Replaces the inline `{ backgroundColor: "#fff", borderRadius: 18,
 * borderWidth: 1, borderColor: theme.colors.border.default, ...theme.shadow.xs }`
 * pattern found in 10+ screens.
 */

import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/shared/theme";

type CardVariant = "default" | "raised" | "flat" | "outlined";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  /** Padding inside the card. Defaults to 16. Pass 0 for none. */
  padding?: number;
  /** Border radius override. Defaults to 18. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = "default",
  padding = 16,
  radius = 18,
  style,
}: CardProps) {
  return (
    <View style={[styles.base, variantStyles[variant], { padding, borderRadius: radius }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
});

const variantStyles: Record<CardVariant, StyleProp<ViewStyle>> = {
  default:  theme.shadow.xs,
  raised:   theme.shadow.lg,
  flat:     { borderColor: theme.colors.slate[100] },
  outlined: { backgroundColor: "transparent", borderColor: theme.colors.border.medium },
};
