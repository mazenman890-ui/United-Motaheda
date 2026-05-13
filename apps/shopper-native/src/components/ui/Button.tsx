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

const SIZE_MAP: Record<Size, { px: number; py: number; fs: number; r: number }> = {
  sm: { px: 16, py: 9,  fs: 12, r: theme.radius.md },
  md: { px: 20, py: 12, fs: 14, r: theme.radius.lg },
  lg: { px: 24, py: 15, fs: 15, r: theme.radius.xl },
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
  const ss         = SIZE_MAP[size];
  const isDisabled = disabled || loading;

  const textColor =
    variant === "primary" || variant === "danger" ? "#fff"
    : variant === "secondary" ? theme.colors.brand[700]
    : variant === "outline"   ? theme.colors.brand[600]
    : theme.colors.slate[700];

  const inner = loading ? (
    <ActivityIndicator size="small" color={textColor} />
  ) : (
    <>
      {leftIcon}
      <Text
        style={{
          fontSize:      ss.fs,
          fontWeight:    "800",
          color:         textColor,
          letterSpacing: 0.1,
        }}>
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
            borderRadius: ss.r,
            overflow:     "hidden",
            alignSelf:    fullWidth ? undefined : "flex-start",
            width:        fullWidth ? "100%" : undefined,
            opacity:      isDisabled ? 0.5 : pressed ? 0.88 : 1,
            ...theme.shadow.brand,
          },
          style,
        ]}>
        <LinearGradient
          colors={["#0891b2", "#0e7490"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection:     "row",
            alignItems:        "center",
            justifyContent:    "center",
            gap:               7,
            paddingHorizontal: ss.px,
            paddingVertical:   ss.py,
          }}>
          {inner}
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
          gap:               7,
          backgroundColor:   pressed && variant === "ghost" ? theme.colors.slate[100] : bgMap[variant],
          borderRadius:      ss.r,
          paddingHorizontal: ss.px,
          paddingVertical:   ss.py,
          borderWidth:       variant === "outline" ? 1.5 : 0,
          borderColor:       variant === "outline" ? theme.colors.brand[600] : undefined,
          alignSelf:         fullWidth ? undefined : "flex-start",
          width:             fullWidth ? "100%" : undefined,
          opacity:           isDisabled ? 0.5 : pressed && variant !== "ghost" ? 0.82 : 1,
          ...(variant === "secondary" || variant === "danger" ? theme.shadow.xs : {}),
        },
        style,
      ]}>
      {inner}
    </Pressable>
  );
}
