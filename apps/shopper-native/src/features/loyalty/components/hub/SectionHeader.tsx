import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { sectionStyles as s } from "./hub.styles";
import type { IoniconsName } from "./HubHelpers";

interface SectionHeaderProps {
  icon:         IoniconsName;
  title:        string;
  ctaLabel?:    string;
  onCta?:       () => void;
  accentColor?: string;
}

export const SectionHeader = React.memo(function SectionHeader({
  icon, title, ctaLabel, onCta, accentColor,
}: SectionHeaderProps) {
  const iconColor = accentColor ?? theme.colors.brand.base;
  return (
    <View style={s.header}>
      <View style={s.titleRow}>
        <View style={[s.iconDot, { backgroundColor: iconColor + "20" }]}>
          <Ionicons name={icon} size={14} color={iconColor} />
        </View>
        <Text style={s.title}>{title}</Text>
      </View>
      {ctaLabel && onCta && (
        <Pressable onPress={onCta} hitSlop={8} accessibilityRole="button" accessibilityLabel={ctaLabel}>
          <Text style={s.cta}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});
