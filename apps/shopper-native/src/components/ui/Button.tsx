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

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size    = "xs" | "sm" | "md" | "lg";

interface ButtonProps {
  children:   React.ReactNode;
  onPress?:   () => void;
  variant?:   Variant;
  size?:      Size;
  loading?:   boolean;
  disabled?:  boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  style?:     StyleProp<ViewStyle>;
  gradient?:  boolean;
}

const SIZE_MAP: Record<Size, { height: number; px: number; fontSize: number; radius: number; gap: number }> = {
  xs: { height: 32, px: 12, fontSize: 12, radius: theme.radius.sm,    gap: 4 },
  sm: { height: 40, px: 16, fontSize: 13, radius: theme.radius.md,    gap: 6 },
  md: { height: 50, px: 20, fontSize: 15, radius: theme.radius.xl,    gap: 8 },
  lg: { height: 56, px: 24, fontSize: 16, radius: theme.radius['2xl'], gap: 8 },
};

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: theme.colors.brand[600], text: "#fff" },
  secondary: { bg: theme.colors.subtle,     text: theme.colors.text.primary },
  outline:   { bg: "transparent",           text: theme.colors.brand[700], border: theme.colors.brand[300] },
  ghost:     { bg: "transparent",           text: theme.colors.text.secondary },
  danger:    { bg: theme.colors.error.base, text: "#fff" },
  success:   { bg: theme.colors.success.base, text: "#fff" },
};

const AnimPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  children,
  onPress,
  variant   = "primary",
  size      = "md",
  loading   = false,
  disabled  = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  gradient  = false,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const sz    = SIZE_MAP[size];
  const vs    = VARIANTS[variant];
  const off   = disabled || loading;

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn  = () => { scale.value = withSpring(0.96, theme.animation.spring.snappy); };
  const onPressOut = () => { scale.value = withSpring(1,    theme.animation.spring.snappy); };

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
        <ActivityIndicator size="small" color={variant === "outline" || variant === "ghost" ? theme.colors.brand[600] : "#fff"} />
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

  return (
    <AnimPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={handlePress}
      disabled={off}
      style={[
        animStyle,
        {
          borderRadius: sz.radius,
          overflow:     "hidden",
          alignSelf:    fullWidth ? "stretch" : "auto",
          opacity:      off ? 0.6 : 1,
          ...(vs.border ? { borderWidth: 1.5, borderColor: vs.border } : {}),
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
