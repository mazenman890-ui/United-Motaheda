/**
 * ProfileGuestHero — premium hero for unauthenticated users.
 *
 * Previous design used a pill-tab side-by-side layout that rendered as a
 * single merged element in Arabic RTL. Replaced with:
 *   1. Teal-gradient primary "Sign In" button
 *   2. Outlined secondary "Create Account" button
 *   3. Three feature-benefit rows (same colours as OrdersScreen benefits)
 *
 * This pattern is standard in Arabic pharmacy / e-commerce apps and reads
 * cleanly in both RTL and LTR without any flexDirection confusion.
 */
import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { styles as sharedStyles, HERO_GLASS } from "./profile.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface ProfileGuestHeroProps {
  insetsTop: number;
}

// Feature rows — what the user gets by signing in
const FEATURES: { icon: IoniconsName; labelKey: string; color: string; bg: string }[] = [
  { icon: "bag-handle-outline",     labelKey: "profile.featureOrders",   color: theme.colors.brand[400],   bg: "rgba(13,184,168,0.18)"  },
  { icon: "diamond-outline",        labelKey: "profile.featureLoyalty",  color: theme.colors.purple[400],  bg: "rgba(147,51,234,0.18)"  },
  { icon: "heart-outline",          labelKey: "profile.featureWishlist", color: theme.colors.rose[400],    bg: "rgba(244,63,94,0.18)"   },
];

export const ProfileGuestHero = memo(function ProfileGuestHero({
  insetsTop,
}: ProfileGuestHeroProps) {
  const router = useRouter();
  const { t }  = useTranslation();

  return (
    <LinearGradient
      colors={theme.gradients.heroPrimary as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[sharedStyles.guestHero, { paddingTop: insetsTop + 24 }]}>

      {/* Decorative elements */}
      <View style={sharedStyles.heroDecor1} />
      <View style={sharedStyles.heroDecor2} />

      {/* Avatar */}
      <View style={s.avatarWrap}>
        <View style={s.avatarInner}>
          <Ionicons name="person" size={38} color={HERO_GLASS.w65} />
        </View>
      </View>

      {/* Title + description */}
      <View style={s.textBlock}>
        <UIText variant="sheet-title" color="inverse" align="center" style={s.title}>
          {t("profile.guestTitle")}
        </UIText>
        <UIText variant="body-sm" color="inverse-muted" align="center" style={s.desc}>
          {t("profile.guestDesc")}
        </UIText>
      </View>

      {/* ── Actions ── */}
      <View style={s.actions}>
        {/* Primary — Sign In */}
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          style={({ pressed }) => [s.loginBtn, pressed && { opacity: 0.90 }]}>
          <LinearGradient
            colors={[theme.colors.teal[400], theme.colors.brand[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.loginGrad}>
            <Ionicons name="log-in-outline" size={18} color={theme.colors.surface} />
            <UIText variant="body-sm" weight="black" style={s.loginText}>
              {t("auth.login")}
            </UIText>
          </LinearGradient>
        </Pressable>

        {/* Secondary — Create Account */}
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          accessibilityRole="button"
          style={({ pressed }) => [s.registerBtn, pressed && { opacity: 0.80 }]}>
          <UIText variant="body-sm" weight="bold" style={s.registerText}>
            {t("auth.createAccount")}
          </UIText>
        </Pressable>
      </View>

      {/* ── Feature rows (what you get) ── */}
      <View style={s.featuresWrap}>
        {FEATURES.map((f) => (
          <View key={f.labelKey} style={s.featureRow}>
            <View style={[s.featureIcon, { backgroundColor: f.bg }]}>
              <Ionicons name={f.icon} size={15} color={f.color} />
            </View>
            <UIText variant="caption" style={s.featureLabel} align="right">
              {t(f.labelKey)}
            </UIText>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
});

const s = StyleSheet.create({
  avatarWrap: {
    marginBottom: theme.spacing.sm,
  },
  avatarInner: {
    width:           78,
    height:          78,
    borderRadius:    26,
    backgroundColor: HERO_GLASS.w10,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1.5,
    borderColor:     HERO_GLASS.w18,
  },

  textBlock: {
    alignItems: "center",
    gap:        6,
    width:      "100%",
  },
  title: {
    letterSpacing: -0.4,
  },
  desc: {
    lineHeight: 20,
    maxWidth:   300,
  },

  actions: {
    width: "100%",
    gap:   10,
  },
  loginBtn: {
    borderRadius: 16,
    overflow:     "hidden",
    width:        "100%",
  },
  loginGrad: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             10,
    paddingVertical: 16,
    borderRadius:    16,
  },
  loginText: {
    color:         theme.colors.surface,
    fontSize:      15,
    letterSpacing: 0.2,
  },
  registerBtn: {
    width:           "100%",
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 14,
    borderRadius:    16,
    borderWidth:     1.5,
    borderColor:     HERO_GLASS.w25,
    backgroundColor: HERO_GLASS.w10,
  },
  registerText: {
    color:         HERO_GLASS.w90,
    fontSize:      14,
    letterSpacing: 0.1,
  },

  featuresWrap: {
    width:         "100%",
    gap:           8,
    paddingTop:    4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
  },
  featureIcon: {
    width:          30,
    height:         30,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  featureLabel: {
    flex:       1,
    color:      HERO_GLASS.w70,
    fontSize:   12.5,
    lineHeight: 18,
  },
});
