/**
 * PharmacistCard — premium feature card, vertical stack layout.
 *
 * Architecture: gradient card → [decorative orbs] → [text stack] → [pill CTA]
 * Micro-interaction: Reanimated spring scale (0.97 on press) on WhatsApp pill.
 * Spacing: uniform theme.spacing.lg (16px) padding, 12px internal gap.
 */

import React, { memo } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
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

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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

        {/* Text stack — eyebrow → title → subtitle, all right-aligned RTL */}
        <View style={s.textStack}>
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
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <UIText variant="body-sm" weight="black" style={s.ctaLabel}>
              {t("home.chatWhatsapp")}
            </UIText>
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
    padding:      theme.spacing.lg,  // 16 — uniform padding per mandate
    gap:          12,                // 12px vertical gap standard
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

  // ── Text stack ──────────────────────────────────────────────────────────────
  textStack: { gap: 4 },
  eyebrow: {
    color:         "#5EEAD4",
    letterSpacing: 0.5,
    textAlign:     "right",
  },
  title: {
    color:         "#FFFFFF",
    textAlign:     "right",
    letterSpacing: -0.3,
  },
  sub: {
    color:      "rgba(255,255,255,0.55)",
    lineHeight: 18,
    textAlign:  "right",
  },

  // ── WhatsApp pill CTA ───────────────────────────────────────────────────────
  ctaBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               8,
    backgroundColor:   "#FFFFFF",
    borderRadius:      999,           // pill
    paddingHorizontal: theme.spacing.lg,
    paddingVertical:   13,
    ...theme.shadow.sm,
  },
  ctaLabel: {
    color:    theme.colors.slate[800],
    fontSize: 13,
  },
});
