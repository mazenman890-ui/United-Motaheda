import React, { memo } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { shStyles as s } from "./home.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export interface HomeSectionHeaderProps {
  eyebrow?:  string;
  title:     string;
  icon:      IoniconsName;
  accent?:   string;
  onMore?:   () => void;
  rightSlot?: React.ReactNode;
}

export const HomeSectionHeader = memo(function HomeSectionHeader({
  eyebrow,
  title,
  icon,
  accent = theme.colors.brand[700],
  onMore,
  rightSlot,
}: HomeSectionHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={s.row}>
      <View style={s.left}>
        <LinearGradient
          colors={[accent + "28", accent + "12"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.icon, { borderColor: accent + "30" }]}>
          <Ionicons name={icon} size={14} color={accent} />
        </LinearGradient>
        <View>
          {eyebrow && (
            <UIText variant="eyebrow" color="tertiary" align="right" style={{ letterSpacing: 0.3 }}>
              {eyebrow}
            </UIText>
          )}
          <UIText variant="section-head" align="right" style={s.title}>
            {title}
          </UIText>
        </View>
      </View>
      {rightSlot ?? (onMore && (
        <Pressable onPress={onMore} style={s.moreBtn} hitSlop={6}>
          <UIText variant="caption" weight="bold" color="brand">{t("home.viewAll")}</UIText>
          <Ionicons name="chevron-back" size={12} color={theme.colors.brand[700]} />
        </Pressable>
      ))}
    </View>
  );
});
