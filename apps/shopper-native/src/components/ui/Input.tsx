import React, { useState } from "react";
import {
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { theme } from "@/theme";

interface InputProps extends TextInputProps {
  label?:          string;
  error?:          string;
  hint?:           string;
  leftIcon?:       React.ReactNode;
  rightIcon?:      React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : focused
    ? theme.colors.brand[500]
    : theme.colors.slate[200];

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && (
        <Text
          style={{
            fontSize:   12,
            fontWeight: "700",
            color:      focused ? theme.colors.brand[600] : theme.colors.slate[500],
            textAlign:  "right",
          }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection:     "row",
          alignItems:        "center",
          backgroundColor:   focused ? "#fff" : theme.colors.slate[50],
          borderRadius:      theme.radius.lg,
          borderWidth:       1.5,
          borderColor,
          paddingHorizontal: 14,
          gap:               8,
        }}>
        {leftIcon}
        <TextInput
          {...rest}
          onFocus={(e) => { setFocused(true);  rest.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
          style={[
            {
              flex:            1,
              paddingVertical: 13,
              fontSize:        14,
              color:           theme.colors.slate[900],
              textAlign:       "right",
              fontWeight:      "500",
            },
            style,
          ]}
          placeholderTextColor={theme.colors.slate[400]}
        />
        {rightIcon}
      </View>
      {(error || hint) && (
        <Text
          style={{
            fontSize:  12,
            color:     error ? theme.colors.error : theme.colors.slate[400],
            textAlign: "right",
          }}>
          {error ?? hint}
        </Text>
      )}
    </View>
  );
}
