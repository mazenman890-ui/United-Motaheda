/**
 * HomeSectionHeader — elite section title bar.
 *
 * Design changes (ground-up rewrite):
 *   • Title: 22 px Cairo Black, tight tracking (-0.5) — was ~16-17 px
 *   • Icon tile: 40 px with gradient fill, slightly larger (was 34 px)
 *   • "See All" pill: brand.lighter bg + brandSoft border — not a bare text link
 */
import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { shStyles as base } from "./home.styles";
import { flexRow, isRtl, FORWARD_CHEVRON } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export interface HomeSectionHeaderProps {
  eyebrow?:   string;
  title:      string;
  icon:       IoniconsName;
  accent?:    string;
  onMore?:    () => void;
  rightSlot?: React.ReactNode;
}

export const HomeSectionHeader = memo(function HomeSectionHeader({
  eyebrow, title, icon,
  accent    = theme.colors.brand[700],
  onMore,
  rightSlot,
}: HomeSectionHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={base.row}>
      {/* Left cluster — icon + text (RTL: appears on RIGHT side) */}
      <View style={base.left}>
        <LinearGradient
          colors={[accent + "30", accent + "14"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[sh.iconTile, { borderColor: accent + "28" }]}>
          <Ionicons name={icon} size={17} color={accent} />
        </LinearGradient>

        <View style={sh.textStack}>
          {eyebrow && (
            <UIText variant="eyebrow" color="tertiary" align="right" style={sh.eyebrow}>
              {eyebrow}
            </UIText>
          )}
          <UIText align="right" style={sh.title}>
            {title}
          </UIText>
        </View>
      </View>

      {/* Right slot — "See All" pill (RTL: appears on LEFT side) */}
      {rightSlot ?? (onMore && (
        <Pressable onPress={onMore} style={sh.pill} hitSlop={10}>
          <UIText style={sh.pillText}>{t("home.viewAll")}</UIText>
          <Ionicons name={FORWARD_CHEVRON} size={12} color={theme.colors.brand[600]} />
        </Pressable>
      ))}
    </View>
  );
});

const sh = StyleSheet.create({
  iconTile: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    overflow:       "hidden",
  },
  textStack: { gap: 1 },
  eyebrow: {
    fontSize:      10,
    letterSpacing: 0.4,
  },
  title: {
    fontSize:      22,
    fontFamily:    theme.fonts.black,
    color:         theme.colors.text.primary,
    letterSpacing: -0.5,
    lineHeight:    28,
  },
  // "See All" pill
  pill: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               3,
    backgroundColor:   theme.colors.brand.lighter,
    borderRadius:      999,
    paddingHorizontal: 12,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
  },
  pillText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.brand[700],
  },
});
