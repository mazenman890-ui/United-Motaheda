import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";

type Variant =
  | "primary"
  | "secondary"
  | "subtle"     // brand-tinted bg + brand text, no border (clinical / modern SaaS)
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "dark";
type Size    = "xs" | "sm" | "md" | "lg";

interface ButtonProps {
  children:            React.ReactNode;
  onPress?:            () => void;
  variant?:            Variant;
  size?:               Size;
  loading?:            boolean;
  disabled?:           boolean;
  fullWidth?:          boolean;
  leftIcon?:           React.ReactNode;
  rightIcon?:          React.ReactNode;
  style?:              StyleProp<ViewStyle>;
  gradient?:           boolean;
  /** Overrides the accessible label read by TalkBack / VoiceOver. Defaults to visible text. */
  accessibilityLabel?: string;
  /** Additional context read after the label (TalkBack / VoiceOver). */
  accessibilityHint?:  string;
}

const SIZE_MAP: Record<Size, { height: number; px: number; fontSize: number; radius: number; gap: number }> = {
  xs: { height: 32, px: 12, fontSize: 12, radius: theme.radius.sm,    gap: 4 },
  sm: { height: 40, px: 16, fontSize: 13, radius: theme.radius.md,    gap: 6 },
  md: { height: 50, px: 20, fontSize: 15, radius: theme.radius.xl,    gap: 8 },
  lg: { height: 56, px: 24, fontSize: 16, radius: theme.radius['2xl'], gap: 8 },
};

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: theme.colors.brand[600],          text: "#fff" },
  secondary: { bg: theme.colors.subtle,              text: theme.colors.text.primary },
  subtle:    { bg: theme.colors.brand.lighter,       text: theme.colors.brand[700] },
  outline:   { bg: "transparent",                    text: theme.colors.brand[700], border: theme.colors.brand[300] },
  ghost:     { bg: "transparent",                    text: theme.colors.text.secondary },
  danger:    { bg: theme.colors.error.base,          text: "#fff" },
  success:   { bg: theme.colors.success.base,        text: "#fff" },
  dark:      { bg: theme.colors.hero,                text: "#fff" },
};

const AnimPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  children,
  onPress,
  variant            = "primary",
  size               = "md",
  loading            = false,
  disabled           = false,
  fullWidth          = false,
  leftIcon,
  rightIcon,
  style,
  gradient           = false,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const sz    = SIZE_MAP[size];
  const vs    = VARIANTS[variant];
  const off   = disabled || loading;

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Refined press: 0.97 (subtler than the old 0.96) on the new `press`
  // spring — feels expensive, like a hardware switch rather than a toy.
  const onPressIn  = () => { scale.value = withSpring(0.97, theme.animation.spring.press); };
  const onPressOut = () => { scale.value = withSpring(1,    theme.animation.spring.press); };

  const handlePress = () => {
    if (off) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress?.();
  };

  const textColor = off
    ? (variant === "outline" || variant === "ghost") ? theme.colors.text.disabled : "rgba(255,255,255,0.55)"
    : vs.text;

  const content = (
    <View style={[styles.row, { height: sz.height, paddingHorizontal: sz.px, gap: sz.gap }]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost" || variant === "subtle"
              ? theme.colors.brand[600]
              : "#fff"
          }
        />
      ) : (
        <>
          {leftIcon}
          <Text style={{ fontSize: sz.fontSize, fontFamily: theme.fonts.bold, color: textColor }} numberOfLines={1}>
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </View>
  );

  // Primary + danger + success carry a soft, brand-tinted shadow ("clinical
  // glow") to read as the dominant action. Subtle/secondary/outline/ghost
  // stay flat — the page rhythm needs quieter buttons for them to support
  // the primary, not compete.
  // Variant-tinted shadows use the new `boxShadow` string directly — overriding
  // legacy shadowColor on top of theme.shadow.* would trigger the RN 0.78+
  // deprecation warning for every render.
  const elevation =
    off ? null
    : variant === "primary" ? theme.shadow.brand
    : variant === "danger"  ? { elevation: 8, boxShadow: `0px 6px 16px ${theme.colors.error.base}4D` }
    : variant === "success" ? { elevation: 8, boxShadow: `0px 6px 16px ${theme.colors.success.base}4D` }
    : variant === "dark"    ? theme.shadow.md
    : null;

  return (
    <AnimPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[
        animStyle,
        {
          borderRadius: sz.radius,
          overflow:     "hidden",
          alignSelf:    fullWidth ? "stretch" : "auto",
          opacity:      off ? 0.6 : 1,
          ...(vs.border ? { borderWidth: 1.5, borderColor: vs.border } : {}),
          ...(elevation ?? {}),
        },
        style,
      ]}>
      {gradient && variant === "primary" ? (
        <LinearGradient colors={[theme.colors.brand[500], theme.colors.brand[700]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {content}
        </LinearGradient>
      ) : (
        <View style={{ backgroundColor: vs.bg }}>{content}</View>
      )}
    </AnimPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
