/**
 * PharmacistCard — premium feature card, vertical stack layout.
 *
 * Architecture: gradient card → [decorative orbs] → [text stack] → [pill CTA]
 * Micro-interaction: Reanimated spring scale (0.97 on press) on WhatsApp pill.
 * Spacing: uniform theme.spacing.lg (16px) padding, 12px internal gap.
 */

import React, { memo, useEffect } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { isRtl, textAlignStart } from "@/utils/layout";
import { useAppLanguage } from "@/i18n/LanguageProvider";

const WA_NUMBER = "201112343212";

/** Pre-filled message localised to the active app language. */
function getWaUrl(lang: string): string {
  const msg =
    lang === "en"
      ? "Hello, I need help with a specific medicine or order."
      : "مرحباً، أحتاج مساعدة بخصوص دواء أو طلب معين.";
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export const PharmacistCard = memo(function PharmacistCard() {
  const { t }          = useTranslation();
  const { language }   = useAppLanguage();
  const scale          = useSharedValue(1);

  // Pulsing ring around the availability dot — runs on UI thread, no JS work
  const pulseScale = useSharedValue(1);
  const pulseOp    = useSharedValue(0.7);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.8, { duration: 900 }),
        withTiming(1.0, { duration: 700 }),
      ),
      -1,
      false,
    );
    pulseOp.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 900 }),
        withTiming(0.7, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [pulseScale, pulseOp]);

  const animStyle  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity:   pulseOp.value,
  }));

  const handlePress = () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Linking.openURL(getWaUrl(language)).catch(() => {});
  };

  return (
    <View style={s.wrap}>
      <LinearGradient
        colors={[theme.colors.hero, "#032840", "#053C5A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.card}>

        {/* Decorative teal glow orbs — depth on dark background */}
        <View style={s.glowLarge} />
        <View style={s.glowSmall} />
        <View style={s.glowRing} />
        <View style={s.glowMesh} />

        <View style={s.heroRow}>
          {/* Text stack — eyebrow → title → subtitle, all right-aligned RTL */}
          <View style={s.textStack}>
            {/* "Available now" badge with pulsing ring */}
            <View style={s.availableRow}>
              {/* Pulse ring (larger, fades out) */}
              <Animated.View style={[s.pulseDot, pulseStyle]} />
              {/* Solid dot (always visible) */}
              <View style={s.solidDot} />
              <UIText style={s.availableText}>{t("home.pharmacistAvailable")}</UIText>
            </View>

            <UIText variant="eyebrow" style={s.eyebrow}>
              {t("home.pharmacistCard")}
            </UIText>
            <UIText variant="section-head" style={s.title}>
              {t("home.needAdvice")}
            </UIText>
            <UIText variant="body-sm" style={s.sub}>
              {t("home.pharmacistReply")}
            </UIText>
          </View>

          <View style={s.heroBadge}>
            <View style={s.heroBadgeInner}>
              <Ionicons name="medkit-outline" size={28} color="#7DD3FC" />
            </View>
            <UIText style={s.heroBadgeText}>24/7</UIText>
          </View>
        </View>

        <View style={s.infoRail}>
          <View style={s.infoPill}>
            <Ionicons name="time-outline" size={14} color="#A7F3D0" />
            <UIText style={s.infoLabel}>رد سريع</UIText>
          </View>
          <View style={s.infoPill}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#BAE6FD" />
            <UIText style={s.infoLabel}>دعم موثوق</UIText>
          </View>
        </View>

        {/* WhatsApp pill CTA — full-width, Reanimated spring scale (0.97 → 1.0) */}
        <Animated.View style={animStyle}>
          <Pressable
            onPress={handlePress}
            onPressIn={() => {
              scale.value = withSpring(0.97, theme.animation.spring.press);
            }}
            onPressOut={() => {
              scale.value = withSpring(1.0, theme.animation.spring.press);
            }}
            style={s.ctaBtn}
            accessibilityRole="button"
            accessibilityLabel={t("home.chatWhatsapp")}>
            <View style={s.ctaIconWrap}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <View style={s.ctaCopy}>
              <UIText variant="body-sm" weight="black" style={s.ctaLabel}>
                {t("home.chatWhatsapp")}
              </UIText>
              <UIText style={s.ctaSubLabel}>ابدأ المحادثة الآن</UIText>
            </View>
            <Ionicons name={isRtl() ? "arrow-back" : "arrow-forward"} size={18} color={theme.colors.slate[700]} />
          </Pressable>
        </Animated.View>

      </LinearGradient>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,     // 16 — standard page indent
    paddingTop:        theme.spacing['3xl'],  // 32
    paddingBottom:     theme.spacing.lg,     // 16
  },
  card: {
    borderRadius: 20,
    padding:      18,
    gap:          14,
    overflow:     "hidden",
    ...theme.shadow.lg,
  },

  // ── Decorative background elements ─────────────────────────────────────────
  glowLarge: {
    position:        "absolute",
    top:             -60,
    right:           -60,
    width:           160,
    height:          160,
    borderRadius:    80,
    backgroundColor: "rgba(13,184,168,0.15)",
  },
  glowSmall: {
    position:        "absolute",
    bottom:          -40,
    left:            -40,
    width:           110,
    height:          110,
    borderRadius:    55,
    backgroundColor: "rgba(13,184,168,0.08)",
  },
  glowRing: {
    position:     "absolute",
    top:          -20,
    right:        -20,
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  1,
    borderColor:  "rgba(13,184,168,0.20)",
  },
  glowMesh: {
    position:     "absolute",
    bottom:       -50,
    right:        40,
    width:        180,
    height:       180,
    borderRadius: 90,
    borderWidth:  1,
    borderColor:  "rgba(125,211,252,0.08)",
  },

  // ── "Available now" pill ────────────────────────────────────────────────────
  heroRow: {
    flexDirection:  "row-reverse",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    gap:            12,
  },
  availableRow: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            7,
    marginBottom:   4,
    alignSelf:      "flex-end",  // right-aligned in RTL
  },
  // Outer pulsing ring — scales out and fades
  pulseDot: {
    position:        "absolute",
    width:           12,
    height:          12,
    borderRadius:    6,
    backgroundColor: "#4ADE80",   // green-400
    opacity:         0.5,
  },
  // Inner solid dot — always visible
  solidDot: {
    width:           9,
    height:          9,
    borderRadius:    5,
    backgroundColor: "#22C55E",   // green-500
  },
  availableText: {
    fontFamily:    theme.fonts.semibold,
    fontSize:      11,
    color:         "#86EFAC",     // green-300 — readable on dark bg
    letterSpacing: 0.2,
  },

  // ── Text stack ──────────────────────────────────────────────────────────────
  textStack: { gap: 5, flex: 1 },
  eyebrow: {
    color:         "#5EEAD4",
    letterSpacing: 0.5,
    textAlign:     textAlignStart(isRtl()),
  },
  title: {
    color:         "#FFFFFF",
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: -0.3,
    lineHeight:    38,
  },
  sub: {
    color:      "rgba(255,255,255,0.70)",
    lineHeight: 21,
    textAlign:  textAlignStart(isRtl()),
  },
  heroBadge: {
    width:           72,
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    paddingTop:      2,
  },
  heroBadgeInner: {
    width:           72,
    height:          72,
    borderRadius:    22,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth:     1,
    borderColor:     "rgba(125,211,252,0.24)",
  },
  heroBadgeText: {
    fontFamily: theme.fonts.black,
    fontSize:   12,
    color:      "#CFFAFE",
  },
  infoRail: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            10,
    flexWrap:       "wrap",
  },
  infoPill: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      999,
    backgroundColor:   "rgba(255,255,255,0.08)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.10)",
  },
  infoLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      "rgba(255,255,255,0.86)",
  },

  // ── WhatsApp pill CTA ───────────────────────────────────────────────────────
  ctaBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    gap:               10,
    backgroundColor:   "#FFFFFF",
    borderRadius:      22,
    paddingHorizontal: 14,
    paddingVertical:   12,
    ...theme.shadow.sm,
  },
  ctaIconWrap: {
    width:           42,
    height:          42,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#ECFDF3",
  },
  ctaCopy: {
    flex: 1,
    gap:  2,
  },
  ctaLabel: {
    color:    theme.colors.slate[800],
    fontSize: 14,
    textAlign: textAlignStart(isRtl()),
  },
  ctaSubLabel: {
    fontFamily: theme.fonts.semibold,
    fontSize:   11,
    color:      theme.colors.slate[500],
    textAlign:  textAlignStart(isRtl()),
  },
});
