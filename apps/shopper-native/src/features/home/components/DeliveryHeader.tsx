/**
 * DeliveryHeader — 2026 rebuild on the @/shared/kit design language.
 *
 * Replaces the dark navy gradient hero with a light editorial header:
 *   • Top bar: brand tile at the reading start, cart icon-button (badge) at
 *     the reading end.
 *   • Greeting row (time-of-day icon + contextual greeting), display title,
 *     and subtitle — all start-aligned, ink on canvas.
 *   • Floating white search pill (same family as the Search screen command
 *     bar) that routes to the search tab.
 *   • Quick-access chips as quiet tinted pills (deals / featured / all).
 *
 * Performance contract kept: memo'd, zero animations, stable callbacks.
 */

import React, { memo, useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { AppLogo } from "@/shared/components/AppLogo";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";
import { kit } from "@/shared/kit";

const IS_RTL = isRtl();
const TEXT_START = textAlignStart(IS_RTL);

// Returns an Ionicons name matching the current time of day
function getTimeIcon(): React.ComponentProps<typeof Ionicons>["name"] {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "sunny-outline";
  if (h >= 12 && h < 18) return "partly-sunny-outline";
  return "moon-outline";
}

interface DeliveryHeaderProps {
  insets:        { top: number };
  user:          { name?: string | null } | null;
  cartCount:     number;
  onCartPress:   () => void;
  onSearchPress: () => void;
}

export const DeliveryHeader = memo(function DeliveryHeader({
  insets,
  user,
  cartCount,
  onCartPress,
  onSearchPress,
}: DeliveryHeaderProps) {
  const { t }  = useTranslation();
  const router = useRouter();

  // Stable — computed once on mount, never re-evaluated
  const timeIcon = useMemo(() => getTimeIcon(), []);

  const greeting = user?.name
    ? t("home.greeting",      { name: user.name.split(" ")[0] })
    : t("home.greetingGuest");

  return (
    <View style={[s.header, { paddingTop: insets.top + 14 }]}>

      {/* ── Top bar: brand ←→ cart ── */}
      <View style={s.topBar}>
        <View style={s.logoWrap}>
          <AppLogo size={40} />
        </View>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
            onCartPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("tabs.cart")}
          style={s.cartBtn}>
          <Ionicons name="bag-outline" size={19} color={kit.color.inkSoft} />
          {cartCount > 0 && (
            <View style={s.cartBadge}>
              <UIText style={s.cartBadgeText}>{cartCount > 9 ? "9+" : cartCount}</UIText>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Headline ── */}
      <View style={s.headingStack}>
        <View style={s.greetingRow}>
          <View style={s.greetingIconWrap}>
            <Ionicons name={timeIcon} size={12} color={kit.color.accentDeep} />
          </View>
          <UIText style={s.greetingText}>{greeting}</UIText>
        </View>

        <UIText style={s.heroTitle}>{t("home.heroTaglineTitle")}</UIText>
        <UIText style={s.heroSub}>{t("home.heroTaglineSub")}</UIText>
      </View>

      {/* ── Search pill — floating, routes to search ── */}
      <Pressable
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel={t("search.placeholder")}
        style={s.searchBar}>
        <View style={s.searchIconWrap}>
          <Ionicons name="search" size={17} color={kit.color.inkFaint} />
        </View>
        <UIText style={s.searchPlaceholder} numberOfLines={1}>
          {t("search.placeholder")}
        </UIText>
        <View style={s.searchBadge}>
          <Ionicons name="sparkles" size={13} color={kit.color.accentDeep} />
        </View>
      </Pressable>

      {/* ── Quick-access chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipScroll}
        contentContainerStyle={s.chipRow}>

        <Pressable
          onPress={() => router.push("/deals")}
          style={[s.chip, { backgroundColor: kit.color.dangerTint }]}
          accessibilityRole="button">
          <Ionicons name="flame" size={13} color={kit.color.danger} />
          <UIText numberOfLines={1} style={[s.chipText, { color: kit.color.danger }]}>
            {t("home.flashTitle")}
          </UIText>
        </Pressable>

        <Pressable
          onPress={() => router.push("/featured")}
          style={[s.chip, { backgroundColor: kit.color.warnTint }]}
          accessibilityRole="button">
          <Ionicons name="star" size={13} color={kit.color.warn} />
          <UIText numberOfLines={1} style={[s.chipText, { color: kit.color.warn }]}>
            {t("home.featuredTitle")}
          </UIText>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/products")}
          style={[s.chip, s.chipNeutral]}
          accessibilityRole="button">
          <Ionicons name="grid-outline" size={13} color={kit.color.inkSoft} />
          <UIText numberOfLines={1} style={[s.chipText, { color: kit.color.inkSoft }]}>
            {t("products.allProducts")}
          </UIText>
        </Pressable>
      </ScrollView>
    </View>
  );
});

const s = StyleSheet.create({
  header: {
    paddingBottom:     kit.sp(5),
    paddingHorizontal: theme.layout.pagePaddingH,
    backgroundColor:   kit.color.canvas,
  },

  // ── Top bar ──
  topBar: {
    flexDirection:  flexRow(IS_RTL),
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   kit.sp(5),
  },
  logoWrap: {
    width:           48,
    height:          48,
    borderRadius:    16,
    backgroundColor: kit.color.surface,
    borderWidth:     1,
    borderColor:     kit.color.line,
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
    ...kit.shadow.raised,
  },
  cartBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: kit.color.surface,
    borderWidth:     1,
    borderColor:     kit.color.line,
    alignItems:      "center",
    justifyContent:  "center",
  },
  cartBadge: {
    position:          "absolute",
    top:               -4,
    end:               -4,
    backgroundColor:   kit.color.accent,
    borderRadius:      9,
    minWidth:          18,
    height:            18,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 4,
    borderWidth:       1.5,
    borderColor:       kit.color.canvas,
  },
  cartBadgeText: {
    color:              kit.color.onInk,
    fontSize:           9,
    lineHeight:         12,
    fontFamily:         theme.fonts.black,
    includeFontPadding: false,
    textAlign:          "center",
  },

  // ── Heading ──
  headingStack: {
    gap:          kit.sp(2),
    marginBottom: kit.sp(5),
  },
  greetingRow: {
    flexDirection: flexRow(IS_RTL),
    alignItems:    "center",
    gap:           8,
  },
  greetingIconWrap: {
    width:           26,
    height:          26,
    borderRadius:    9,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: kit.color.accentTint,
  },
  greetingText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12, lineHeight: 18,
    color: kit.color.inkSoft,
    textAlign: TEXT_START,
    includeFontPadding: false,
  },
  heroTitle: {
    fontFamily: theme.fonts.black,
    fontSize: kit.type.display.fontSize,
    lineHeight: kit.type.display.lineHeight,
    color: kit.color.ink,
    textAlign: TEXT_START,
    includeFontPadding: false,
  },
  heroSub: {
    fontFamily: theme.fonts.regular,
    fontSize: 13, lineHeight: 20,
    color: kit.color.inkSoft,
    textAlign: TEXT_START,
    includeFontPadding: false,
  },

  // ── Search pill ──
  searchBar: {
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    gap:               4,
    height:            56,
    paddingHorizontal: 8,
    backgroundColor:   kit.color.surface,
    borderRadius:      kit.radius.pill,
    borderWidth:       1,
    borderColor:       kit.color.line,
    ...kit.shadow.floating,
  },
  searchIconWrap: {
    width: 40, height: 40,
    alignItems: "center", justifyContent: "center",
  },
  searchPlaceholder: {
    flex:       1,
    fontSize:   14,
    lineHeight: 20,
    fontFamily: theme.fonts.semibold,
    color:      kit.color.inkFaint,
    textAlign:  TEXT_START,
    includeFontPadding: false,
  },
  searchBadge: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: kit.color.accentTint,
  },

  // ── Quick-access chips ──
  chipScroll: { marginTop: kit.sp(3) },
  chipRow: {
    flexDirection: flexRow(IS_RTL),
    alignItems:    "center",
    gap:           8,
  },
  chip: {
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    gap:               6,
    height:            38,
    borderRadius:      kit.radius.pill,
    paddingHorizontal: 14,
  },
  chipNeutral: {
    backgroundColor: kit.color.surface,
    borderWidth:     1,
    borderColor:     kit.color.line,
  },
  chipText: {
    fontFamily: theme.fonts.bold,
    fontSize: 12, lineHeight: 18,
    includeFontPadding: false,
  },
});
