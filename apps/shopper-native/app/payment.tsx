/**
 * Payment methods — settings screen where the user picks their default payment
 * method. Not the checkout flow's payment step (which lives in app/checkout).
 *
 * Layout decisions (2026 rebuild):
 *   • Single dark gradient header — back button, eyebrow, title, subtitle.
 *     No floating shield, no overlapping pill. Visual hierarchy reads top-down
 *     without competing focal points.
 *   • A "current method" callout sits cleanly below the header — one ring of
 *     teal accent so users know what's saved without ambiguity.
 *   • The PaymentMethodSelector renders each method as its own card. Selection
 *     state is owned by the card; we don't duplicate the indicator.
 *   • Trust badges live in ONE inline strip at the bottom (lock + 4 attributes)
 *     instead of a full-width white card that previously visually overlapped
 *     the gradient header.
 *   • An info note explains the per-order override; final CTA is implicit
 *     (saving is automatic via the store) so no footer button is needed.
 */

import React, { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { PaymentMethodSelector, usePaymentStore, hydratePaymentStore } from "@/features/payment";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart, BACK_CHEVRON } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TRUST_ITEMS: { icon: IoniconsName; labelKey: string }[] = [
  { icon: "lock-closed-outline",      labelKey: "payment.trustEncrypted" },
  { icon: "shield-checkmark-outline", labelKey: "payment.trustSecure"    },
  { icon: "eye-off-outline",          labelKey: "payment.trustPrivacy"   },
  { icon: "flash-outline",            labelKey: "payment.trustInstant"   },
];

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  useEffect(() => {
    hydratePaymentStore();
  }, []);

  const selectedLabelKey = usePaymentStore((s) =>
    s.methods.find((m) => m.type === s.selected)?.labelKey ?? ""
  );
  const selectedLabel = selectedLabelKey ? t(selectedLabelKey) : "";

  return (
    <View style={styles.screen}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerOrb} pointerEvents="none" />

        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
            <Ionicons name={BACK_CHEVRON} size={20} color="#FFFFFF" />
          </Pressable>

          <View style={styles.titleStack}>
            <UIText style={styles.eyebrow}>{t("payment.eyebrow")}</UIText>
            <UIText style={styles.title} accessibilityRole="header">
              {t("payment.title")}
            </UIText>
            <UIText style={styles.subtitle}>{t("payment.subtitle")}</UIText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>

        {/* ─── Current method callout ─────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(220)} style={styles.currentCard}>
          <View style={styles.currentBadge}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <UIText style={styles.currentLabel}>{t("payment.savedTitle")}</UIText>
            <UIText style={styles.currentValue} numberOfLines={2}>
              {selectedLabel || "—"}
            </UIText>
          </View>
        </Animated.View>

        {/* ─── Method cards ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)}>
          <PaymentMethodSelector />
        </Animated.View>

        {/* ─── Trust strip — single inline row, no overlap ───────────── */}
        <Animated.View entering={FadeInDown.delay(180).duration(280)} style={styles.trustStrip}>
          {TRUST_ITEMS.map((item) => (
            <View key={item.labelKey} style={styles.trustItem}>
              <Ionicons name={item.icon} size={14} color={theme.colors.brand[600]} />
              <UIText style={styles.trustText} numberOfLines={1}>
                {t(item.labelKey)}
              </UIText>
            </View>
          ))}
        </Animated.View>

        {/* ─── Info note ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(240).duration(280)} style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={theme.colors.brand[700]}
            style={styles.infoIcon}
          />
          <UIText style={styles.infoText}>{t("payment.infoNote")}</UIText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingBottom:     22,
    overflow:          "hidden",
  },
  headerOrb: {
    position:        "absolute",
    end:             -50,
    top:             -50,
    width:           170,
    height:          170,
    borderRadius:    85,
    backgroundColor: "rgba(13,184,168,0.10)",
  },
  headerRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "flex-start",
    gap:           14,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    13,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
    marginTop:       2,
  },
  titleStack: {
    flex: 1,
    gap:  3,
  },
  eyebrow: {
    fontFamily:    theme.fonts.bold,
    fontSize:      11,
    color:         "rgba(255,255,255,0.55)",
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: 0.5,
  },
  title: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    lineHeight:    34,
    color:         "#FFFFFF",
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: -0.6,
    marginTop:     2,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    lineHeight: 19,
    color:      "rgba(255,255,255,0.72)",
    textAlign:  textAlignStart(isRtl()),
    marginTop:  2,
  },

  // ── Content ──
  content: {
    padding: 20,
    gap:     18,
  },

  // ── Current method callout ──
  currentCard: {
    flexDirection:    flexRow(isRtl()),
    alignItems:       "center",
    gap:              12,
    padding:          14,
    borderRadius:     16,
    backgroundColor:  theme.colors.brand.lighter,
    borderWidth:      1,
    borderColor:      theme.colors.border.brandSoft,
  },
  currentBadge: {
    width:           28,
    height:          28,
    borderRadius:    9,
    backgroundColor: theme.colors.brand[600],
    alignItems:      "center",
    justifyContent:  "center",
  },
  currentLabel: {
    fontFamily:    theme.fonts.bold,
    fontSize:      10,
    color:         theme.colors.brand[700],
    textAlign:     textAlignStart(isRtl()),
    letterSpacing: 0.5,
  },
  currentValue: {
    fontFamily:  theme.fonts.black,
    fontSize:    14,
    color:       theme.colors.text.primary,
    textAlign:   textAlignStart(isRtl()),
    marginTop:   1,
    lineHeight:  19,
  },

  // ── Trust strip ──
  trustStrip: {
    flexDirection:    flexRow(isRtl()),
    alignItems:       "center",
    justifyContent:   "space-between",
    paddingVertical:  12,
    paddingHorizontal: 8,
    borderRadius:     14,
    backgroundColor:  theme.colors.surface,
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
  },
  trustItem: {
    flex:          1,
    alignItems:    "center",
    gap:           5,
  },
  trustText: {
    fontFamily: theme.fonts.bold,
    fontSize:   10,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
  },

  // ── Info note ──
  infoNote: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "flex-start",
    gap:             10,
    padding:         12,
    borderRadius:    12,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex:       1,
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    lineHeight: 18,
    color:      theme.colors.brand[800],
    textAlign:  textAlignStart(isRtl()),
  },
});
