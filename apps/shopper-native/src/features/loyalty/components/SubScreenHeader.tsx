/**
 * SubScreenHeader — shared header used by every loyalty sub-screen.
 *
 * Layout (RTL):
 *   [ title + optional subtitle ]  |  [ optional right action ]  |  [ ← back ]
 *   rightmost ────────────────────────────────────────────────── leftmost
 *
 * The back button calls router.back() internally so callers never have to
 * wire a prop for it. Pass `rightElement` for screen-specific actions
 * (e.g. the tour button on the wallet screen).
 */

import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { theme } from "@/theme";

interface SubScreenHeaderProps {
  title:         string;
  subtitle?:     string;
  /** Optional action rendered on the visual-right side (after the title). */
  rightElement?: React.ReactNode;
}

export function SubScreenHeader({
  title,
  subtitle,
  rightElement,
}: SubScreenHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {/* ── Title block — grows, text pinned right (RTL start) ── */}
      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>

      {/* ── Optional right-side action ── */}
      {rightElement ? (
        <View style={styles.rightSlot}>{rightElement}</View>
      ) : (
        /* Invisible spacer keeps title centred when there is no right element */
        <View style={styles.sideSlotSpacer} />
      )}

      {/* ── Back button — visual left (RTL end) ── */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        style={({ pressed }) => [
          styles.backBtn,
          pressed && styles.backBtnPressed,
        ]}
      >
        {/* chevron-forward (→) = "back" in RTL navigation */}
        <Ionicons name="chevron-forward" size={22} color={theme.colors.text.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    paddingHorizontal: 12,
    paddingVertical:   10,
    gap:               4,
  },

  titleBlock: {
    flex:       1,
    alignItems: "flex-end",   // text stays flush-right in RTL
    gap:        1,
  },
  title: {
    fontFamily:    theme.fonts.black,
    fontSize:      20,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
  },

  rightSlot: {
    alignItems:     "center",
    justifyContent: "center",
  },
  /** matches backBtn width so title stays visually centred */
  sideSlotSpacer: {
    width: 40,
  },

  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: theme.colors.subtle,
    alignItems:      "center",
    justifyContent:  "center",
  },
  backBtnPressed: {
    backgroundColor: theme.colors.border.default,
  },
});

export default SubScreenHeader;
