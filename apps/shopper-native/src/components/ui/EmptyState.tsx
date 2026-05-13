import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/theme";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?:        string;
  title:        string;
  description?: string;
  actionLabel?: string;
  onAction?:    () => void;
}

export function EmptyState({ icon = "📦", title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: 32, gap: 12 }}>
      <Text style={{ fontSize: 56 }}>{icon}</Text>
      <Text style={{ fontSize: 17, fontWeight: "800", color: theme.colors.slate[900], textAlign: "center" }}>
        {title}
      </Text>
      {description && (
        <Text style={{ fontSize: 14, color: theme.colors.slate[500], textAlign: "center", lineHeight: 21 }}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onPress={onAction} style={{ marginTop: 8 }}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
