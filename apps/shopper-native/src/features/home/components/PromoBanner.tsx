/**
 * PromoBanner — trust strip + static bento-grid hero section.
 *
 * Carousel removed: the auto-swiping FlatList (+ auto-advance timer,
 * pagination dots, PromoSlide scale interpolation) is gone entirely.
 *
 * Replaced with a bento-grid HeroSection:
 *   • Primary card (Deals)   — 60 % width, full height, rich copy
 *   • Secondary stack        — 40 % width, two stacked cards (Products + Loyalty)
 *   RTL: primary card on the logical start (RIGHT in Arabic) via row-reverse.
 *
 * Each card has a Reanimated withSpring(0.96) press scale on the UI thread.
 * The QuickActions panel's marginTop: -24 still works — the HeroSection
 * provides a consistent bottom edge for the overlap effect.
 */

import React, { memo, useCallback } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Hero destination data ────────────────────────────────────────────────────
// Same three destinations the carousel used — now displayed as spatial cards.

const HERO_CARDS = [
  {
    id:       "deals",
    gradient: [theme.colors.hero, "#053348", "#0A4A65"] as [string, string, string],
    tagKey:   "home.heroTag1",
    titleKey: "home.heroTitle1",
    subKey:   "home.heroSub1",
    icon:     "ticket"  as IoniconsName,
    accent:   theme.colors.teal[400],
    glowColor:"rgba(13,184,168,0.22)",
    route:    "/deals",
  },
  {
    id:       "products",
    gradient: ["#064E3B", theme.colors.teal[800], theme.colors.teal[600]] as [string, string, string],
    tagKey:   "home.heroTag2",
    titleKey: "home.heroTitle2",
    subKey:   "home.heroSub2",
    icon:     "bicycle" as IoniconsName,
    accent:   "#34D399",
    glowColor:"rgba(52,211,153,0.22)",
    route:    "/(tabs)/products",
  },
  {
    id:       "loyalty",
    gradient: ["#3B0764", "#5B21B6", "#6D28D9"] as [string, string, string],
    tagKey:   "home.heroTag3",
    titleKey: "home.heroTitle3",
    subKey:   "home.heroSub3",
    icon:     "diamond" as IoniconsName,
    accent:   "#C084FC",
    glowColor:"rgba(192,132,252,0.22)",
    route:    "/loyalty",
  },
] as const;

// ─── Trust badges data ────────────────────────────────────────────────────────

const useTrustBadges = () => {
  const { t } = useTranslation();
  return [
    { icon: "flash-outline"            as IoniconsName, label: t("cart.fastDelivery"),       grad: [theme.colors.amber[600], theme.colors.amber[500]] as [string, string] },
    { icon: "shield-checkmark-outline" as IoniconsName, label: t("home.origMedicines"),      grad: ["#059669", "#10B981"]                             as [string, string] },
    { icon: "wallet-outline"           as IoniconsName, label: t("checkout.methodCodTitle"), grad: [theme.colors.brand[600], theme.colors.teal[500]]  as [string, string] },
    { icon: "refresh-outline"          as IoniconsName, label: t("cart.guaranteedReturns"),  grad: ["#6D28D9", "#7C3AED"]                             as [string, string] },
  ];
};

// ─── HeroCard — single destination card with Reanimated press scale ───────────

interface HeroCardProps {
  item:    typeof HERO_CARDS[number];
  size:    "primary" | "secondary";
  onPress: (route: string) => void;
}

const HeroCard = memo(function HeroCard({ item, size, onPress }: HeroCardProps) {
  const { t }  = useTranslation();
  const scale  = useSharedValue(1);
  const anim   = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleIn    = useCallback(() => { scale.value = withSpring(0.96, theme.animation.spring.press); }, [scale]);
  const handleOut   = useCallback(() => { scale.value = withSpring(1,    theme.animation.spring.press); }, [scale]);
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress(item.route);
  }, [item.route, onPress]);

  const isPrimary = size === "primary";

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      accessibilityRole="button"
      accessibilityLabel={t(item.titleKey)}
      style={isPrimary ? hc.primaryOuter : hc.secondaryOuter}>
      <Animated.View style={[isPrimary ? hc.primaryInner : hc.secondaryInner, anim]}>
        <LinearGradient
          colors={item.gradient}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[hc.gradient, isPrimary ? hc.primaryGrad : hc.secondaryGrad]}>

          {/* Decorative glow orb */}
          <View style={[hc.glowOrb, { backgroundColor: item.glowColor }]} />

          {/* Icon badge */}
          <View style={[hc.iconBadge, { borderColor: `${item.accent}44` }]}>
            <LinearGradient
              colors={[`${item.accent}28`, `${item.accent}10`]}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name={item.icon} size={isPrimary ? 22 : 16} color={item.accent} />
          </View>

          {/* Copy — full on primary, tag-only on secondary */}
          <View style={hc.copy}>
            <View style={hc.tagRow}>
              <View style={[hc.tagPill, { backgroundColor: `${item.accent}20`, borderColor: `${item.accent}44` }]}>
                <UIText variant="eyebrow" style={[hc.tagText, { color: item.accent }]}>
                  {t(item.tagKey)}
                </UIText>
              </View>
            </View>

            {isPrimary && (
              <>
                <UIText
                  variant="card-title"
                  color="inverse"
                  align="right"
                  style={hc.primaryTitle}>
                  {t(item.titleKey)}
                </UIText>
                <UIText
                  variant="caption"
                  color="inverse-muted"
                  align="right"
                  style={hc.primarySub}>
                  {t(item.subKey)}
                </UIText>
              </>
            )}
          </View>

          {/* Bottom-right chevron on secondary — signals tappability */}
          {!isPrimary && (
            <View style={hc.chevronWrap}>
              <Ionicons name="chevron-back" size={12} color={`${item.accent}90`} />
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

// ─── HeroSection — bento-grid layout ─────────────────────────────────────────

interface HeroSectionProps {
  onNavigate: (route: string) => void;
}

const HeroSection = memo(function HeroSection({ onNavigate }: HeroSectionProps) {
  return (
    <View style={hs.container}>
      {/*
        row-reverse → in RTL (Arabic): primary card on the visual RIGHT (start),
        secondary stack on the LEFT. In LTR: primary LEFT, secondary RIGHT.
      */}
      <View style={hs.primarySlot}>
        <HeroCard item={HERO_CARDS[0]} size="primary" onPress={onNavigate} />
      </View>
      <View style={hs.secondarySlot}>
        <HeroCard item={HERO_CARDS[1]} size="secondary" onPress={onNavigate} />
        <HeroCard item={HERO_CARDS[2]} size="secondary" onPress={onNavigate} />
      </View>
    </View>
  );
});

// ─── TrustStrip ───────────────────────────────────────────────────────────────

const TrustStrip = memo(function TrustStrip() {
  const badges = useTrustBadges();
  return (
    <View style={ts.trustWrap}>
      <View style={ts.trustCard}>
        {badges.map((b, i) => (
          <View
            key={b.icon}
            style={[ts.trustCell, i < badges.length - 1 && ts.trustDivider]}>
            <LinearGradient
              colors={b.grad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={ts.trustIcon}>
              <Ionicons name={b.icon} size={13} color="#fff" />
            </LinearGradient>
            <UIText variant="eyebrow" align="center" style={ts.trustLabel}>
              {b.label}
            </UIText>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── PromoBanner ──────────────────────────────────────────────────────────────

interface PromoBannerProps {
  onSlidePress: (route: string) => void;
}

export const PromoBanner = memo(function PromoBanner({ onSlidePress }: PromoBannerProps) {
  return (
    <>
      <TrustStrip />
      <HeroSection onNavigate={onSlidePress} />
    </>
  );
});

// ─── HeroCard styles ──────────────────────────────────────────────────────────

const hc = StyleSheet.create({
  // Outer Pressable — shadow host (no overflow:hidden so shadow bleeds cleanly)
  primaryOuter: {
    flex:          1,   // fills primarySlot (which is flex:6 of bento row)
    borderRadius:  20,
    shadowColor:   "#021D2E",
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius:  14,
    elevation:     8,
  },
  secondaryOuter: {
    flex:          1,   // equal halves inside the secondary stack (flex:4)
    borderRadius:  16,
    shadowColor:   "#021D2E",
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius:  10,
    elevation:     5,
  },

  // Animated.View — carries the Reanimated scale, clips gradient corners.
  // Separate radii per variant to match the outer shadow host exactly.
  primaryInner: {
    flex:         1,
    borderRadius: 20,
    overflow:     "hidden",
  },
  secondaryInner: {
    flex:         1,
    borderRadius: 16,
    overflow:     "hidden",
  },

  // LinearGradient fills the card
  gradient: {
    flex:    1,
    padding: 14,
  },
  primaryGrad: {
    justifyContent: "flex-end",
    gap:            6,
  },
  secondaryGrad: {
    justifyContent: "space-between",
  },

  // Decorative soft glow blob (top-right absolute)
  glowOrb: {
    position:     "absolute",
    top:          -36,
    right:        -36,
    width:        90,
    height:       90,
    borderRadius: 45,
  },

  // Icon tile — frosted glass pill
  iconBadge: {
    width:          38,
    height:         38,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    overflow:       "hidden",
    marginBottom:   4,
  },

  copy: { gap: 4 },

  tagRow: { flexDirection: "row-reverse" },
  tagPill: {
    borderRadius:      999,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderWidth:       1,
  },
  tagText: {
    fontSize:      9,
    fontWeight:    "700",
    letterSpacing: 0.4,
  },

  primaryTitle: {
    fontSize:      15,
    fontWeight:    "800",
    letterSpacing: -0.3,
    lineHeight:    20,
  },
  primarySub: {
    fontSize:   11,
    lineHeight: 15,
    opacity:    0.80,
  },

  chevronWrap: {
    alignSelf: "flex-end",
  },
});

// ─── HeroSection layout ───────────────────────────────────────────────────────

const hs = StyleSheet.create({
  // Outer container: row-reverse for RTL awareness, fixed height
  container: {
    flexDirection:    "row-reverse",
    marginHorizontal: theme.layout.pagePaddingH,
    marginTop:        theme.spacing["2xl"],   // 24 — space below TrustStrip
    marginBottom:     theme.spacing.lg,       // 16 — space above QuickActions
    gap:              10,
    height:           180,
  },
  primarySlot: {
    flex: 6,
  },
  secondarySlot: {
    flex:          4,
    flexDirection: "column",
    gap:           10,
  },
});

// ─── TrustStrip styles ────────────────────────────────────────────────────────

const ts = StyleSheet.create({
  trustWrap: {
    marginTop:        -28,
    marginHorizontal: theme.spacing[4],   // 32 — intentional inset for floating card
    marginBottom:     theme.spacing.lg,   // 16
  },
  trustCard: {
    backgroundColor:   "#fff",
    borderRadius:      22,
    paddingVertical:   14,
    paddingHorizontal: 4,
    flexDirection:     "row-reverse",
    shadowColor:       "#0C2240",
    shadowOffset:      { width: 0, height: 6 },
    shadowOpacity:     0.12,
    shadowRadius:      18,
    elevation:         8,
  },
  trustCell: {
    flex:              1,
    alignItems:        "center",
    gap:               7,
    paddingHorizontal: 4,
  },
  trustDivider: {
    borderRightWidth:  StyleSheet.hairlineWidth,
    borderRightColor:  "rgba(15,23,42,0.08)",
  },
  trustIcon: {
    width:          32,
    height:         32,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  trustLabel: {
    color:      theme.colors.slate[600],
    fontSize:   9.5,
    fontFamily: theme.fonts.bold,
    lineHeight: 13,
  },
});
