import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style"> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  style?:    StyleProp<ViewStyle>;
  children:  React.ReactNode;
}

const sizeStyles: Record<Size, { px: number; py: number; fontSize: number }> = {
  sm: { px: 14, py: 8,  fontSize: 12 },
  md: { px: 18, py: 11, fontSize: 14 },
  lg: { px: 22, py: 15, fontSize: 15 },
};

export function Button({
  variant   = "primary",
  size      = "md",
  loading   = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const ss         = sizeStyles[size];
  const isDisabled = disabled || loading;
  const textColor  = variant === "secondary" || variant === "outline" || variant === "ghost"
    ? (variant === "ghost" ? theme.colors.slate[700] : theme.colors.brand[variant === "secondary" ? 700 : 600])
    : "#fff";

  const innerContent = loading ? (
    <ActivityIndicator size="small" color={textColor} />
  ) : (
    <>
      {leftIcon}
      <Text style={{ fontSize: ss.fontSize, fontWeight: "800", letterSpacing: 0.2, color: textColor }}>
        {children as string}
      </Text>
      {rightIcon}
    </>
  );

  if (variant === "primary") {
    return (
      <Pressable
        {...rest}
        disabled={isDisabled}
        style={({ pressed }) => [
          {
            borderRadius: theme.radius.lg,
            overflow:     "hidden",
            alignSelf:    fullWidth ? undefined : "flex-start",
            width:        fullWidth ? "100%" : undefined,
            opacity:      isDisabled ? 0.5 : pressed ? 0.87 : 1,
            ...theme.shadow.brand,
          },
          style,
        ]}>
        <LinearGradient
          colors={["#059669", "#047857"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection:     "row",
            alignItems:        "center",
            justifyContent:    "center",
            gap:               6,
            paddingHorizontal: ss.px,
            paddingVertical:   ss.py,
          }}>
          {innerContent}
        </LinearGradient>
      </Pressable>
    );
  }

  const bgMap: Record<Variant, string> = {
    primary:   theme.colors.brand[600],
    secondary: theme.colors.brand[50],
    outline:   "transparent",
    ghost:     "transparent",
    danger:    theme.colors.error,
  };

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          flexDirection:     "row",
          alignItems:        "center",
          justifyContent:    "center",
          gap:               6,
          backgroundColor:   bgMap[variant],
          borderRadius:      theme.radius.lg,
          paddingHorizontal: ss.px,
          paddingVertical:   ss.py,
          borderWidth:       variant === "outline" ? 1.5 : 0,
          borderColor:       variant === "outline" ? theme.colors.brand[600] : undefined,
          alignSelf:         fullWidth ? undefined : "flex-start",
          width:             fullWidth ? "100%" : undefined,
          opacity:           isDisabled ? 0.5 : pressed ? 0.82 : 1,
          ...theme.shadow.xs,
        },
        style,
      ]}>
      {innerContent}
    </Pressable>
  );
}
