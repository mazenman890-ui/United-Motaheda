import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/theme";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?:        React.ReactNode;
  title:        string;
  description?: string;
  actionLabel?: string;
  onAction?:    () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: 40, gap: 0 }}>
      {icon && (
        <View style={{ width: 90, height: 90, borderRadius: 28, backgroundColor: theme.colors.brand[50], alignItems: "center", justifyContent: "center", marginBottom: 20, borderWidth: 1, borderColor: theme.colors.brand[100] }}>
          {icon}
        </View>
      )}
      <Text style={{ fontSize: 17, fontWeight: "900", color: theme.colors.slate[800], textAlign: "center", marginBottom: 8 }}>
        {title}
      </Text>
      {description && (
        <Text style={{ fontSize: 13, color: theme.colors.slate[400], textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onPress={onAction}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
