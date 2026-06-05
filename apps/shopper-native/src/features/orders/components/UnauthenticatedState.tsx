/**
 * UnauthenticatedState — premium ground-up redesign.
 *
 * Replaces the generic AppHeader + separate gradient hero with a unified
 * full-bleed dark gradient header matching every other screen in the app
 * (Home / Profile / Search / Payment / Addresses).
 *
 * Feature rows now have distinct semantic colours per row instead of all-teal.
 */

import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { HERO_GRAD, AUTH_TEAL, ORDER_DARK } from "./orders.styles";

// ─── Feature rows — distinct colour per semantic intent ──────────────────────

const FEATURES = [
  {
    icon:     "location-outline"      as const,
    labelKey: "orders.featureTrack",
    color:    theme.colors.success.strong,   // green  — location
    bg:       theme.colors.success.bg,
  },
  {
    icon:     "notifications-outline" as const,
    labelKey: "orders.featureAlerts",
    color:    theme.colors.amber[600],       // amber  — bell
    bg:       theme.colors.amber[50],
  },
  {
    icon:     "reload-outline"        as const,
    labelKey: "orders.featureReorder",
    color:    "#2563EB",                     // blue   — reorder
    bg:       "#EFF6FF",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function UnauthenticatedState({ showBack }: { showBack: boolean }): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  // Pulse ring animation
  const pulseScale = useSharedValue(1);
  const pulseOp    = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 1600 }), withTiming(1.0, { duration: 1200 })),
      -1, false,
    );
    pulseOp.value = withRepeat(
      withSequence(withTiming(0, { duration: 1600 }), withTiming(0.4, { duration: 1200 })),
      -1, false,
    );
  }, [pulseScale, pulseOp]);

  const pulseAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity:   pulseOp.value,
  }));

  const handleSignIn = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push("/(auth)/login");
  };
  const handleCreate = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push("/(auth)/register");
  };

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        bounces>

        {/* ── Premium gradient hero — replaces AppHeader ─── */}
        <LinearGradient
          colors={HERO_GRAD}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[s.hero, { paddingTop: insets.top + 16 }]}>

          {/* Decorative elements */}
          <View style={s.glowOrb} />
          <Animated.View style={[s.pulseRing, pulseAnim]} />
          <View style={s.staticRing} />

          {/* Top bar — back button + page label */}
          <View style={s.topBar}>
            {showBack ? (
              <Pressable
                onPress={() => router.back()}
                style={s.backBtn}
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.80)" />
              </Pressable>
            ) : (
              /* Transparent spacer — keeps title centred without showing a ghost button */
              <View style={s.backBtnSpacer} />
            )}
            <UIText style={s.pageEyebrow}>{t("orders.eyebrow")}</UIText>
            <View style={s.headerIconTile}>
              <Ionicons name="bag-handle-outline" size={17} color="rgba(255,255,255,0.75)" />
            </View>
          </View>

          {/* Bag icon */}
          <Animated.View entering={FadeInUp.duration(480).delay(80)}>
            <LinearGradient
              colors={[theme.colors.teal[500], theme.colors.brand[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.iconTile}>
              <Ionicons name="bag-outline" size={42} color={theme.colors.surface} />
            </LinearGradient>
          </Animated.View>

          {/* Hero text */}
          <Animated.View entering={FadeInUp.duration(460).delay(160)} style={s.heroText}>
            <UIText style={s.heroTitle}>{t("orders.authTitle")}</UIText>
            <UIText style={s.heroSub}>{t("orders.authSub")}</UIText>
          </Animated.View>
        </LinearGradient>

        {/* ── Action card ───────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={s.card}>

          {/* Sign-in CTA — pill shape, teal gradient */}
          <Pressable
            onPress={handleSignIn}
            style={s.signInBtn}
            accessibilityRole="button">
            <LinearGradient
              colors={[theme.colors.teal[500], theme.colors.brand[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.signInGrad}>
              <Ionicons name="log-in-outline" size={18} color={theme.colors.surface} />
              <UIText style={s.signInText}>{t("auth.signIn")}</UIText>
            </LinearGradient>
          </Pressable>

          {/* Create account — outlined */}
          <Pressable
            onPress={handleCreate}
            style={s.createBtn}
            accessibilityRole="button">
            <UIText style={s.createText}>{t("auth.createAccount")}</UIText>
          </Pressable>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <UIText style={s.dividerText}>{t("auth.or")}</UIText>
            <View style={s.dividerLine} />
          </View>

          {/* Feature rows — distinct icon colours */}
          {FEATURES.map((feat) => (
            <View key={feat.labelKey} style={s.feature}>
              <View style={[s.featureIcon, { backgroundColor: feat.bg }]}>
                <Ionicons name={feat.icon} size={15} color={feat.color} />
              </View>
              <UIText style={s.featureLabel}>{t(feat.labelKey)}</UIText>
            </View>
          ))}

          {/* Privacy note */}
          <View style={s.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={theme.colors.slate[400]} />
            <UIText style={s.privacyText}>{t("orders.privacyNote")}</UIText>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // ── Hero — unified gradient from top of screen ──────────────────────────────
  hero: {
    alignItems:        "center",
    paddingBottom:     52,
    paddingHorizontal: theme.layout.pagePaddingH,
    gap:               theme.spacing[3],
  },
  glowOrb: {
    position:        "absolute",
    top:             -60,
    right:           -60,
    width:           180,
    height:          180,
    borderRadius:    90,
    backgroundColor: AUTH_TEAL.r10,
  },
  pulseRing: {
    position:     "absolute",
    width:        160,
    height:       160,
    borderRadius: 80,
    borderWidth:  1.5,
    borderColor:  AUTH_TEAL.r35,
  },
  staticRing: {
    position:     "absolute",
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  1,
    borderColor:  AUTH_TEAL.r18,
  },

  // Top bar — back button + eyebrow label (matches other screens)
  topBar: {
    width:          "100%",
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   theme.spacing[3],
  },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
  },
  // Invisible spacer — same dimensions as backBtn so title stays centred,
  // but no background/border so it doesn't render as a ghost button.
  backBtnSpacer: {
    width:  38,
    height: 38,
  },
  pageEyebrow: {
    fontSize:      13,
    fontFamily:    theme.fonts.black,
    color:         "#FFFFFF",
    letterSpacing: -0.2,
  },
  headerIconTile: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.10)",
  },

  // Icon tile
  iconTile: {
    width:          88,
    height:         88,
    borderRadius:   26,
    alignItems:     "center",
    justifyContent: "center",
    ...theme.shadow.lg,
  },

  // Hero text
  heroText:  { alignItems: "center", gap: theme.spacing.sm },
  heroTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         theme.colors.surface,
    textAlign:     "center",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      "rgba(255,255,255,0.55)",
    textAlign:  "center",
    lineHeight: 20,
    maxWidth:   280,
  },

  // ── Action card ─────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor:  theme.colors.surface,
    borderRadius:     24,
    paddingVertical:  theme.spacing.xl,
    paddingHorizontal: theme.layout.pagePaddingH,
    gap:              theme.spacing.lg,
    ...theme.shadow.lg,
    shadowOpacity:    0.10,
  },

  // Login button — pill
  signInBtn: {
    borderRadius: 999,
    overflow:     "hidden",
  },
  signInGrad: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    justifyContent:  "center",
    gap:             10,
    paddingVertical: 16,
    borderRadius:    999,
  },
  signInText: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         theme.colors.surface,
    letterSpacing: 0.2,
  },

  // Register button — outlined
  createBtn: {
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 14,
    borderRadius:    999,
    borderWidth:     1.5,
    borderColor:     AUTH_TEAL.r30,
    backgroundColor: AUTH_TEAL.r05,
  },
  createText: {
    fontFamily:    theme.fonts.bold,
    fontSize:      14,
    color:         theme.colors.brand[700],
    letterSpacing: 0.1,
  },

  // Divider
  divider: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  dividerLine: {
    flex:            1,
    height:          StyleSheet.hairlineWidth,
    backgroundColor: ORDER_DARK.d10,
  },
  dividerText: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.slate[400],
  },

  // Feature rows — distinct icon backgrounds per row
  feature: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  featureIcon: {
    width:          34,
    height:         34,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
  },
  featureLabel: {
    flex:       1,
    fontFamily: theme.fonts.semibold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    textAlign:  "right",
  },

  // Privacy note
  privacyRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "center",
    gap:            5,
  },
  privacyText: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.slate[400],
  },
});
