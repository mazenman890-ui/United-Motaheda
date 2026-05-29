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
import { theme } from "@/theme";

const TRUST_ITEMS: {
  icon:     React.ComponentProps<typeof Ionicons>["name"];
  labelKey: string;
  accent:   string;
  bg:       string;
}[] = [
  { icon: "lock-closed",      labelKey: "payment.trustEncrypted", accent: theme.colors.success.strong, bg: theme.colors.success.bg      },
  { icon: "shield-checkmark", labelKey: "payment.trustSecure",    accent: theme.colors.brand[700],     bg: theme.colors.brand.lighter   },
  { icon: "eye-off",          labelKey: "payment.trustPrivacy",   accent: theme.colors.purple[700],    bg: theme.colors.purple[50]      },
  { icon: "flash",            labelKey: "payment.trustInstant",   accent: theme.colors.amber[700],     bg: theme.colors.amber[50]       },
];

export default function PaymentScreen() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { t }    = useTranslation();

  useEffect(() => {
    hydratePaymentStore();
  }, []);

  const selectedLabel = usePaymentStore((s) =>
    s.methods.find((m) => m.type === s.selected)?.label ?? ""
  );

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.decoCircle} />

        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <UIText variant="eyebrow" align="right" style={styles.headerEyebrowNew}>
              {t("payment.eyebrow")}
            </UIText>
            <UIText variant="sheet-title" color="inverse" align="right" style={styles.headerTitleNew}>
              {t("payment.title")}
            </UIText>
            <UIText variant="body-sm" color="inverse-muted" align="right" style={styles.headerSubNew}>
              {t("payment.subtitle")}
            </UIText>
          </View>
          <View style={styles.shieldIcon}>
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.success.base} />
          </View>
        </View>

        {/* Active method badge */}
        <Animated.View entering={FadeIn.duration(220)} style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={13} color={theme.colors.success.base} />
          <UIText variant="caption" weight="bold" style={styles.activeBadgeTextNew}>
            {t("payment.currentMethod", { method: selectedLabel })}
          </UIText>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}>

        <Animated.View entering={FadeInDown.duration(220)} style={styles.savedPaymentBanner}>
          <UIText variant="body-sm" style={styles.savedPaymentTitle} align="right">
            {t("payment.savedTitle")}
          </UIText>
          <UIText variant="caption" color="secondary" align="right" style={styles.savedPaymentText}>
            {t("payment.savedDesc")}
          </UIText>
        </Animated.View>

        {/* Trust banner */}
        <Animated.View entering={FadeInDown.duration(320)} style={styles.trustBanner}>
          {TRUST_ITEMS.map((item, i, arr) => (
            <View
              key={item.labelKey}
              style={[
                styles.trustItem,
                i < arr.length - 1 && styles.trustItemDivider,
              ]}>
              <View style={[styles.trustIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={15} color={item.accent} />
              </View>
              <UIText variant="eyebrow" color="secondary" align="center">{t(item.labelKey)}</UIText>
            </View>
          ))}
        </Animated.View>

        {/* Payment selector */}
        <Animated.View entering={FadeInDown.delay(120).duration(320)}>
          <PaymentMethodSelector />
        </Animated.View>

        {/* Info note */}
        <Animated.View entering={FadeInDown.delay(220).duration(320)} style={styles.infoNote}>
          <View style={styles.infoNoteIcon}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.brand[700]} />
          </View>
          <UIText variant="caption" color="secondary" align="right" style={styles.infoNoteTextNew}>
            {t("payment.infoNote")}
          </UIText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 12, overflow: "hidden" },
  decoCircle: {
    position:        "absolute",
    right:           -30,
    top:             -30,
    width:           120,
    height:          120,
    borderRadius:    60,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  headerTopRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
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
  shieldIcon: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.10)",
  },
  activeBadge: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             6,
    alignSelf:       "flex-end",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius:    999,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.10)",
  },
  content: { padding: 20, gap: 18 },

  headerEyebrowNew: {
    color:     "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  headerTitleNew: {
    letterSpacing: -0.4,
    marginTop:     2,
  },
  headerSubNew: {
    marginTop: 4,
  },
  activeBadgeTextNew: {
    color: "rgba(255,255,255,0.85)",
  },

  trustBanner: {
    backgroundColor:   theme.colors.surface,
    borderRadius:      18,
    paddingVertical:   16,
    paddingHorizontal: 4,
    flexDirection:     "row-reverse",
    ...theme.shadow.card,
  },
  trustItem: {
    flex:              1,
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 4,
  },
  trustItemDivider: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: theme.colors.border.hairline,
  },
  trustIcon: {
    width:          36,
    height:         36,
    borderRadius:   11,
    alignItems:     "center",
    justifyContent: "center",
  },

  savedPaymentBanner: {
    marginBottom:    18,
    padding:         18,
    borderRadius:    18,
    backgroundColor: theme.colors.slate[50],
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
  },
  savedPaymentTitle: {
    fontSize:        12,
    fontFamily:      theme.fonts.bold,
    color:           theme.colors.text.primary,
    textAlign:       "right",
    marginBottom:    6,
  },
  savedPaymentText: {
    fontSize:   11,
    fontFamily: theme.fonts.regular,
    color:      theme.colors.slate[500],
    textAlign:  "right",
    lineHeight: 18,
  },

  infoNote: {
    flexDirection:   "row-reverse",
    alignItems:      "flex-start",
    gap:             12,
    padding:         14,
    borderRadius:    14,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
  },
  infoNoteIcon: {
    width:           28,
    height:          28,
    borderRadius:    9,
    backgroundColor: "rgba(13,184,168,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
    marginTop:       -2,
  },
  infoNoteTextNew: {
    flex:       1,
    lineHeight: 18,
    color:      theme.colors.brand[800],
  },
});
