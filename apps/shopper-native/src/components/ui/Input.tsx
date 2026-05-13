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
  label?:      string;
  error?:      string;
  leftIcon?:   React.ReactNode;
  rightIcon?:  React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ gap: 5 }, containerStyle]}>
      {label && (
        <Text style={{ fontSize: 12, fontWeight: "700", color: focused ? theme.colors.brand[600] : theme.colors.slate[600], textAlign: "right" }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection:   "row",
          alignItems:      "center",
          backgroundColor: theme.colors.slate[50],
          borderRadius:    theme.radius.lg,
          borderWidth:     1.5,
          borderColor:     error
            ? theme.colors.error
            : focused
            ? theme.colors.brand[500]
            : theme.colors.slate[200],
          paddingHorizontal: 12,
          gap: 8,
        }}>
        {leftIcon}
        <TextInput
          {...rest}
          onFocus={(e) => { setFocused(true);  rest.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); rest.onBlur?.(e);  }}
          style={[
            {
              flex:            1,
              paddingVertical: 12,
              fontSize:        14,
              color:           theme.colors.slate[900],
              textAlign:       "right",
            },
            style,
          ]}
          placeholderTextColor={theme.colors.slate[400]}
        />
        {rightIcon}
      </View>
      {error && (
        <Text style={{ fontSize: 12, color: theme.colors.error }}>{error}</Text>
      )}
    </View>
  );
}
