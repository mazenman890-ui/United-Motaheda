/**
 * DeliveryHeader — premium dark-gradient hero for the home screen.
 *
 * Redesign (2026):
 *   — Logo tile: dark glass style (rgba white) instead of teal-tinted light bg;
 *     blends into the navy gradient instead of breaking the dark canvas.
 *   — Decorative geometry: four layered translucent orbs + a diagonal stripe
 *     give the hero real dimensional depth without animation overhead.
 *   — Hero title: 38 px / -1.2 letterSpacing for stronger billboard presence
 *     with textShadow for depth perception.
 *   — Search bar: white interior with teal accent focus ring; elevated with a
 *     heavier shadow for more visual lift. Includes a hairline separator between
 *     the icon wrap and the text placeholder.
 *   — Chip row: square-ish corners (borderRadius 14) — more modern than full
 *     pill; each chip gets a more distinctive accent treatment.
 *
 * Performance: zero animations — static render, no withRepeat loops.
 */

import React, { memo, useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { AppLogo } from "@/shared/components/AppLogo";
import { flexRow, isRtl } from "@/utils/layout";

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
    <LinearGradient
      colors={["#020D1A", "#032840", "#053C5A"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[s.hero, { paddingTop: insets.top + 20 }]}>

      {/* ── Layered decorative geometry ────────────────────────────────── */}
      {/* Large diffused orb — top-right corner bloom */}
      <View style={s.decorOrbMain} />
      {/* Medium orb — bottom-left ambient */}
      <View style={s.decorOrbSecondary} />
      {/* Small bright orb — top-right accent point */}
      <View style={s.decorOrbAccent} />
      {/* 4th orb — large faint center orb for additional depth */}
      <View style={s.decorOrbCenter} />
      {/* Diagonal stripe — subtle scan line across the gradient */}
      <View style={s.decorStripe} />

      {/* ── Top bar: logo  ←→  cart ─────────────────────────────────────── */}
      <View style={s.topBar}>
        <View style={s.logoWrap}>
          <AppLogo size="sm" />
        </View>
        <View style={s.topBarRight}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              onCartPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("tabs.cart")}
            style={s.headerBtn}>
            <Ionicons name="bag-outline" size={18} color="rgba(255,255,255,0.90)" />
            {cartCount > 0 && (
              <View style={s.cartBadge}>
                <UIText style={s.cartBadgeText}>{cartCount > 9 ? "9+" : cartCount}</UIText>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Headline ──────────────────────────────────────────────────────── */}
      <View style={s.headingStack}>
        {/* Greeting row — time icon + contextual greeting */}
        <View style={s.greetingRow}>
          {/* 26×26 icon wrap — brighter teal tint for stronger identity */}
          <View style={s.greetingIconWrap}>
            <Ionicons name={timeIcon} size={11} color={theme.colors.teal[200]} />
          </View>
          <UIText variant="eyebrow" align="right" style={s.greetingText}>
            {greeting}
          </UIText>
        </View>

        {/* Billboard title — textShadow adds perceived depth against the gradient */}
        <UIText align="right" style={s.heroTitle}>
          {t("home.heroTaglineTitle")}
        </UIText>

        <UIText variant="body-sm" align="right" style={s.heroSub}>
          {t("home.heroTaglineSub")}
        </UIText>
      </View>

      {/* ── Search bar — white interior, teal-branded, heavily elevated ──── */}
      <Pressable
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel={t("search.placeholder")}
        style={s.searchBar}>
        {/* Teal icon box — anchors brand identity */}
        <View style={s.searchIconWrap}>
          <Ionicons name="search" size={15} color={theme.colors.teal[600]} />
        </View>
        {/* Hairline separator between icon wrap and text */}
        <View style={s.searchSeparator} />
        <UIText variant="body-sm" align="right" style={s.searchPlaceholder}>
          {t("search.placeholder")}
        </UIText>
        {/* Sparkle badge — signals AI / premium search without cluttering */}
        <View style={s.searchBadge}>
          <Ionicons name="sparkles" size={12} color={theme.colors.teal[400]} />
        </View>
      </Pressable>

      {/* ── Quick-access chips — Deals + Featured + All ──────────────────── */}
      {/*
        Square-ish corners (borderRadius 14) — more modern than full pill;
        increased paddingHorizontal and fontSize for stronger visual weight.
      */}
      <View style={s.chipRow}>
        <Pressable
          onPress={() => router.push("/deals")}
          style={s.dealChip}
          accessibilityRole="button">
          <Ionicons name="flame" size={12} color="#FCA5A5" />
          <UIText style={s.dealChipText}>{t("home.flashTitle")}</UIText>
        </Pressable>

        <Pressable
          onPress={() => router.push("/featured")}
          style={s.featChip}
          accessibilityRole="button">
          <Ionicons name="star" size={12} color={theme.colors.amber[300]} />
          <UIText style={s.featChipText}>{t("home.featuredTitle")}</UIText>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(tabs)/products")}
          style={s.allChip}
          accessibilityRole="button">
          <Ionicons name="grid-outline" size={12} color="rgba(255,255,255,0.60)" />
          <UIText style={s.allChipText}>{t("products.allProducts")}</UIText>
        </Pressable>
      </View>
    </LinearGradient>
  );
});

const s = StyleSheet.create({
  hero: {
    paddingBottom:     40,
    paddingHorizontal: theme.layout.pagePaddingH,
    overflow:          "hidden",
  },

  // ── Decorative geometry ────────────────────────────────────────────────────
  // Teal bloom — large, diffused, upper-right
  decorOrbMain: {
    position:        "absolute",
    right:           -70,
    top:             -60,
    width:           220,
    height:          220,
    borderRadius:    110,
    backgroundColor: "rgba(13,184,168,0.09)",
  },
  // Deep navy ambient — lower-left
  decorOrbSecondary: {
    position:        "absolute",
    left:            -70,
    bottom:          -40,
    width:           180,
    height:          180,
    borderRadius:    90,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  // Bright teal accent — small, upper-right quadrant
  decorOrbAccent: {
    position:        "absolute",
    right:           40,
    top:             50,
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: "rgba(13,184,168,0.12)",
  },
  // 4th orb — large faint center-right orb for layered depth
  decorOrbCenter: {
    position:        "absolute",
    right:           -80,
    top:             60,
    width:           300,
    height:          300,
    borderRadius:    150,
    backgroundColor: "rgba(13,184,168,0.04)",
  },
  // Diagonal scan line — 8° tilt across the upper band
  decorStripe: {
    position:        "absolute",
    top:             -30,
    left:            -100,
    right:           -100,
    height:          1.5,
    backgroundColor: "rgba(255,255,255,0.05)",
    transform:       [{ rotate: "-8deg" }],
  },

  // ── Top bar ────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   30,
  },
  topBarRight: {
    flexDirection: flexRow(isRtl()),
    gap:           10,
  },

  // Dark-glass logo tile — blends into the gradient, no tinted-light contrast break
  // Slightly larger (54×54) with heavier shadow for more visual presence
  logoWrap: {
    width:           54,
    height:          54,
    borderRadius:    18,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.18)",
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.30,
    shadowRadius:    8,
    elevation:       5,
  },

  // Slightly larger touch target (44×44) with tighter radius
  headerBtn: {
    position:        "relative",
    width:           44,
    height:          44,
    borderRadius:    15,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.16)",
  },
  // Badge uses `end` instead of `left` so it sits at the logical trailing-top
  // on both LTR and RTL layouts — always visible at the visual trailing corner.
  cartBadge: {
    position:          "absolute",
    top:               -5,
    end:               -5,
    backgroundColor:   theme.colors.red[500],
    borderRadius:      9,
    minWidth:          18,
    height:            18,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 4,
    borderWidth:       1.5,
    borderColor:       "#020D1A",
  },
  cartBadgeText: {
    color:               "#fff",
    fontSize:            9,
    lineHeight:          9,
    fontFamily:          theme.fonts.black,
    includeFontPadding:  false,
    textAlign:           "center",
    textAlignVertical:   "center",
  },

  // ── Heading ────────────────────────────────────────────────────────────────
  // gap: 10 — tighter grouping reads as one cohesive unit
  headingStack: {
    gap:          10,
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "flex-start",
    gap:            8,
  },
  // 26×26 — slightly larger, brighter teal background for stronger brand imprint
  greetingIconWrap: {
    width:           26,
    height:          26,
    borderRadius:    9,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(13,184,168,0.22)",
    borderWidth:     1,
    borderColor:     "rgba(13,184,168,0.28)",
  },
  // teal[200] — brighter than teal[300] for more contrast on the dark hero
  greetingText: {
    color:         theme.colors.teal[200],
    letterSpacing: 0.5,
  },
  // Billboard title: 38 px / -1.2 tracking + textShadow for depth
  heroTitle: {
    color:              "#FFFFFF",
    fontFamily:         theme.fonts.black,
    fontSize:           38,
    lineHeight:         46,
    letterSpacing:      -1.2,
    includeFontPadding: false,
    textAlignVertical:  "center",
    textShadowColor:    "rgba(0,0,0,0.2)",
    textShadowOffset:   { width: 0, height: 2 },
    textShadowRadius:   6,
  },
  // Slightly more visible subtitle
  heroSub: {
    color:      "rgba(255,255,255,0.56)",
    lineHeight: 18,
  },

  // ── Search bar — elevated premium white interior ──────────────────────────
  // height: 56, borderRadius: 20, heavier shadow for more visual lift
  searchBar: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               0,
    backgroundColor:   "rgba(255,255,255,0.97)",
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.20)",
    paddingHorizontal: 6,
    paddingVertical:   4,
    height:            56,
    shadowColor:       "#021D2E",
    shadowOffset:      { width: 0, height: 8 },
    shadowOpacity:     0.20,
    shadowRadius:      20,
    elevation:         10,
  },
  // 44×44 icon box — larger with rounded-rect treatment
  searchIconWrap: {
    width:           44,
    height:          44,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: theme.colors.teal[50],
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
  },
  // Hairline separator between icon box and text input
  searchSeparator: {
    width:           StyleSheet.hairlineWidth,
    height:          24,
    backgroundColor: theme.colors.border.default,
    marginHorizontal: 10,
  },
  // Slightly larger font with semibold weight for premium feel
  searchPlaceholder: {
    flex:       1,
    fontSize:   14,
    color:      theme.colors.text.secondary,
    fontFamily: theme.fonts.semibold,
  },
  // Sparkle badge — signals AI / premium search without cluttering
  searchBadge: {
    width:           36,
    height:          36,
    borderRadius:    11,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(13,184,168,0.10)",
    borderWidth:     1,
    borderColor:     "rgba(13,184,168,0.20)",
    marginRight:     2,
  },

  // ── Quick-access chip row ──────────────────────────────────────────────────
  chipRow: {
    flexDirection:  flexRow(isRtl()),
    justifyContent: "flex-start",
    gap:            8,
    marginTop:      14,
  },

  // 🔥 Deals chip — vivid red bloom; square-ish borderRadius 14 (more modern)
  dealChip: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   "rgba(239,68,68,0.16)",
    borderRadius:      14,
    paddingHorizontal: 16,
    paddingVertical:   9,
    borderWidth:       1,
    borderColor:       "rgba(252,165,165,0.25)",
  },
  dealChipText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      "#FCA5A5",
  },

  // ⭐ Featured chip — warm amber glow; square-ish corners
  featChip: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   "rgba(245,158,11,0.14)",
    borderRadius:      14,
    paddingHorizontal: 16,
    paddingVertical:   9,
    borderWidth:       1,
    borderColor:       "rgba(251,191,36,0.22)",
  },
  featChipText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.amber[300],
  },

  // 🔲 All products chip — pure glass; square-ish corners
  allChip: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   "rgba(255,255,255,0.07)",
    borderRadius:      14,
    paddingHorizontal: 16,
    paddingVertical:   9,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.12)",
  },
  allChipText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      "rgba(255,255,255,0.62)",
  },
});
