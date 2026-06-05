/**
 * DeliveryHeader — navy-gradient hero at the top of the home screen.
 *
 * Static, no animations. Previously held two infinite withRepeat beacon-pulse
 * loops (beaconScale + beaconOp) and two FadeInUp entering wrappers; all
 * removed as they were choking the UI thread on every home-screen mount.
 */

import React, { memo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { AppLogo } from "@/shared/components/AppLogo";

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
  const { t } = useTranslation();

  const greeting = user?.name
    ? t("home.greeting",      { name: user.name.split(" ")[0] })
    : t("home.greetingGuest");

  return (
    <LinearGradient
      colors={[theme.colors.hero, "#032840", "#053C5A"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[s.hero, { paddingTop: insets.top + 18 }]}>

      {/* Top bar: logo  ←→  cart */}
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

      {/* Headline */}
      <View style={s.headingStack}>
        <UIText variant="eyebrow" align="right" style={s.greetingText}>
          {greeting}
        </UIText>
        <UIText variant="screen-title" align="right" style={s.heroTitle}>
          {t("home.heroTaglineTitle")}
        </UIText>
        <UIText variant="body-sm" align="right" style={s.heroSub}>
          {t("home.heroTaglineSub")}
        </UIText>
      </View>

      {/* Search bar — tappable shortcut */}
      <Pressable onPress={onSearchPress} style={s.searchBar}>
        <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.65)" />
        <UIText variant="body-sm" align="right" style={s.searchPlaceholder}>
          {t("search.placeholder")}
        </UIText>
        <LinearGradient
          colors={["rgba(13,184,168,0.5)", "rgba(8,145,178,0.5)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.searchKbd}>
          <UIText variant="caption" weight="bold" style={{ color: "#fff" }}>
            {t("tabs.search")}
          </UIText>
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
});

const s = StyleSheet.create({
  hero: {
    paddingBottom:     52,
    paddingHorizontal: theme.layout.pagePaddingH,
    overflow:          "hidden",
  },
  topBar: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   28,
  },
  topBarRight: {
    flexDirection: "row-reverse",
    gap:           10,
  },
  logoWrap: {
    width:           54,
    height:          54,
    borderRadius:    16,
    backgroundColor: theme.colors.brand.lightest,  // brand-tinted bg; AppLogo PNG sits on this colour
    alignItems:      "center",
    justifyContent:  "center",
    overflow:        "hidden",               // clips the brand-teal placeholder to rounded corners
    shadowColor:     "#000",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.20,
    shadowRadius:    10,
    elevation:       6,
  },
  headerBtn: {
    position:        "relative",
    width:           42,
    height:          42,
    borderRadius:    14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.16)",
  },
  cartBadge: {
    position:          "absolute",
    top:               -5,
    left:              -5,
    backgroundColor:   theme.colors.red[500],
    borderRadius:      9,
    minWidth:          18,
    height:            18,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 4,
    borderWidth:       1.5,
    borderColor:       theme.colors.hero,
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
  headingStack: {
    gap:          theme.spacing.lg,
    marginBottom: 22,
  },
  greetingText: {
    color:         "#5EEAD4",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color:         "#FFFFFF",
    fontSize:      34,
    lineHeight:    42,
    letterSpacing: -1.0,
  },
  heroSub: {
    color:      "rgba(255,255,255,0.55)",
    lineHeight: 18,
  },
  searchBar: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               12,
    backgroundColor:   "rgba(255,255,255,0.08)",
    borderRadius:      20,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.14)",
  },
  searchPlaceholder: {
    flex:   1,
    color:  "rgba(255,255,255,0.45)",
  },
  searchKbd: {
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   7,
    overflow:          "hidden",
  },
});
