import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/theme";

type BadgeVariant = "brand" | "success" | "warning" | "error" | "neutral";

interface BadgeProps {
  label:     string;
  variant?:  BadgeVariant;
  dot?:      boolean;
}

const styles: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  brand:   { bg: theme.colors.brand[50],   text: theme.colors.brand[700],  dot: theme.colors.brand[500]  },
  success: { bg: "#ecfdf5",                text: "#065f46",                dot: theme.colors.success     },
  warning: { bg: "#fffbeb",                text: "#92400e",                dot: theme.colors.warning     },
  error:   { bg: "#fef2f2",                text: "#991b1b",                dot: theme.colors.error       },
  neutral: { bg: theme.colors.slate[100],  text: theme.colors.slate[600],  dot: theme.colors.slate[400]  },
};

export function Badge({ label, variant = "neutral", dot }: BadgeProps) {
  const s = styles[variant];
  return (
    <View
      style={{
        flexDirection:    "row",
        alignItems:       "center",
        gap:              5,
        backgroundColor:  s.bg,
        borderRadius:     theme.radius.full,
        paddingHorizontal: 8,
        paddingVertical:  3,
        alignSelf:        "flex-start",
      }}>
      {dot && (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.dot }} />
      )}
      <Text style={{ fontSize: 11, fontWeight: "700", color: s.text }}>{label}</Text>
    </View>
  );
}
