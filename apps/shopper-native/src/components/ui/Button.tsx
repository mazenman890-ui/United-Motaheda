import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
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

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: theme.colors.brand[600], text: "#fff" },
  secondary: { bg: theme.colors.brand[50],  text: theme.colors.brand[700] },
  outline:   { bg: "transparent",           text: theme.colors.brand[600], border: theme.colors.brand[600] },
  ghost:     { bg: "transparent",           text: theme.colors.slate[700] },
  danger:    { bg: theme.colors.error,       text: "#fff" },
};

const sizeStyles: Record<Size, { px: number; py: number; fontSize: number; iconSize: number }> = {
  sm: { px: 12, py: 7,  fontSize: 12, iconSize: 14 },
  md: { px: 16, py: 11, fontSize: 14, iconSize: 16 },
  lg: { px: 20, py: 14, fontSize: 16, iconSize: 18 },
};

export function Button({
  variant  = "primary",
  size     = "md",
  loading  = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const vs = variantStyles[variant];
  const ss = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          flexDirection:   "row",
          alignItems:      "center",
          justifyContent:  "center",
          gap:             6,
          backgroundColor: vs.bg,
          borderRadius:    theme.radius.lg,
          paddingHorizontal: ss.px,
          paddingVertical:   ss.py,
          borderWidth:     vs.border ? 1.5 : 0,
          borderColor:     vs.border,
          opacity:         isDisabled ? 0.5 : pressed ? 0.88 : 1,
          alignSelf:       fullWidth ? undefined : "flex-start",
          width:           fullWidth ? "100%" : undefined,
          ...theme.shadow.sm,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <>
          {leftIcon}
          <Text
            style={{
              color:      vs.text,
              fontSize:   ss.fontSize,
              fontWeight: "700",
              letterSpacing: 0.2,
            }}>
            {children as string}
          </Text>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}
