import React, { useState } from "react";
import {
  Text,
  TextInput,
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
import { theme } from "@/shared/theme";

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
  multiline,
  numberOfLines,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const progress              = useSharedValue(0);

  // Single-line layout uses a fixed inputHeight and vertically-centered
  // content. Multi-line needs a min-height proportional to numberOfLines,
  // top-aligned text on Android (textAlignVertical), and real vertical
  // padding so the placeholder/cursor don't float in the middle.
  const lineCount   = numberOfLines ?? 1;
  const lineHeight  = 22; // matches theme.typography.size.lg line height
  const verticalPad = 12;
  const minHeight   = multiline
    ? lineHeight * lineCount + verticalPad * 2
    : theme.layout.inputHeight;

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

      {/* Input box — soft brand glow when focused gives the "trust" UX
          signal without being loud. Error state overrides with no glow. */}
      <AnimView
        style={[
          {
            flexDirection:     "row-reverse",
            alignItems:        multiline ? "flex-start" : "center",
            minHeight,
            borderRadius:      theme.radius.lg,
            backgroundColor:   focused ? theme.colors.surface : theme.colors.muted,
            paddingHorizontal: 14,
            paddingVertical:   multiline ? verticalPad : 0,
            gap:               10,
            ...(focused && !error ? theme.shadow.brandGlow : theme.shadow.xs),
          },
          borderAnim,
        ]}>
        {/* Right icon (RTL: left side) */}
        {leftIcon && (
          <View style={{ opacity: focused ? 1 : 0.55, marginTop: multiline ? 2 : 0 }}>
            {leftIcon}
          </View>
        )}

        <TextInput
          style={{
            flex:           1,
            fontSize:       theme.fontSize.md,
            fontFamily:     theme.fonts.regular,
            color:          theme.colors.text.primary,
            textAlign:      "right",
            // Android: pin cursor + text to the top of the textarea.
            // iOS ignores this prop (already top-aligns by default).
            textAlignVertical: multiline ? "top" : "center",
            // Set lineHeight + paddingVertical:0 so the textarea height
            // exactly matches our minHeight calculation above (no double
            // padding from the platform default).
            lineHeight:     multiline ? lineHeight : undefined,
            paddingVertical: 0,
          }}
          multiline={multiline}
          numberOfLines={numberOfLines}
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
