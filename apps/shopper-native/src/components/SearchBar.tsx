import React, { useRef } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { theme } from "@/theme";

interface SearchBarProps extends TextInputProps {
  lang?:      "ar" | "en";
  onClear?:   () => void;
  compact?:   boolean;
}

export function SearchBar({ lang = "ar", onClear, compact, value, ...rest }: SearchBarProps) {
  const ref = useRef<TextInput>(null);

  return (
    <Pressable
      onPress={() => ref.current?.focus()}
      style={{
        flexDirection:   "row",
        alignItems:      "center",
        backgroundColor: theme.colors.slate[100],
        borderRadius:    theme.radius["2xl"],
        paddingHorizontal: 14,
        paddingVertical:   compact ? 9 : 12,
        gap:               8,
        borderWidth:       1.5,
        borderColor:       theme.colors.slate[200],
      }}>
      <Text style={{ fontSize: 16 }}>🔍</Text>
      <TextInput
        ref={ref}
        value={value}
        {...rest}
        placeholder={lang === "ar" ? "ابحث عن دواء أو منتج…" : "Search medicines & products…"}
        placeholderTextColor={theme.colors.slate[400]}
        style={{
          flex:     1,
          fontSize: 14,
          color:    theme.colors.slate[900],
          textAlign: lang === "ar" ? "right" : "left",
          writingDirection: lang === "ar" ? "rtl" : "ltr",
        }}
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value ? (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={{
            width: 20, height: 20, borderRadius: 10,
            backgroundColor: theme.colors.slate[400],
            alignItems: "center", justifyContent: "center",
          }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800", lineHeight: 14 }}>✕</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
