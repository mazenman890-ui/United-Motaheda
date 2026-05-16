import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { theme } from "@/theme";

interface InputProps extends TextInputProps {
  label?:       string;
  error?:       string;
  hint?:        string;
  leftIcon?:    React.ReactNode;
  rightIcon?:   React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  optional?:    boolean;
}

const AnimView = Animated.createAnimatedComponent(View);

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  optional,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const progress              = useSharedValue(0);

  const borderAnim = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [
        error ? theme.colors.error.base : theme.colors.border.default,
        error ? theme.colors.error.base : theme.colors.brand[600],
      ],
    ),
    borderWidth: withTiming(focused ? 1.5 : 1, { duration: 150 }),
  }));

  const handleFocus: TextInputProps["onFocus"] = (e) => {
    setFocused(true);
    progress.value = withTiming(1, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur: TextInputProps["onBlur"] = (e) => {
    setFocused(false);
    progress.value = withTiming(0, { duration: 200 });
    onBlur?.(e);
  };

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {/* Label row */}
      {label && (
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{
            fontSize:   theme.fontSize.sm,
            fontFamily: theme.fonts.semibold,
            color:      error ? theme.colors.error.text : theme.colors.text.primary,
            textAlign:  "right",
          }}>
            {label}
          </Text>
          {optional && (
            <Text style={{ fontSize: theme.fontSize.xs, color: theme.colors.text.tertiary }}>اختياري</Text>
          )}
        </View>
      )}

      {/* Input box */}
      <AnimView
        style={[
          {
            flexDirection:   "row-reverse",
            alignItems:      "center",
            height:          theme.layout.inputHeight,
            borderRadius:    theme.radius.lg,
            backgroundColor: focused ? theme.colors.surface : theme.colors.muted,
            paddingHorizontal: 14,
            gap:             10,
            ...theme.shadow.xs,
          },
          borderAnim,
        ]}>
        {/* Right icon (RTL: left side) */}
        {leftIcon && (
          <View style={{ opacity: focused ? 1 : 0.55 }}>
            {leftIcon}
          </View>
        )}

        <TextInput
          style={{
            flex:        1,
            fontSize:    theme.fontSize.md,
            fontFamily:  theme.fonts.regular,
            color:       theme.colors.text.primary,
            textAlign:   "right",
            paddingVertical: 0,
          }}
          placeholderTextColor={theme.colors.text.tertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {/* Left icon (RTL: right side) */}
        {rightIcon && (
          <View style={{ opacity: focused ? 1 : 0.55 }}>
            {rightIcon}
          </View>
        )}
      </AnimView>

      {/* Error / Hint */}
      {(error || hint) && (
        <Text style={{
          fontSize:  theme.fontSize.xs,
          fontFamily: theme.fonts.regular,
          color:     error ? theme.colors.error.base : theme.colors.text.tertiary,
          textAlign: "right",
          marginTop: 2,
        }}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
