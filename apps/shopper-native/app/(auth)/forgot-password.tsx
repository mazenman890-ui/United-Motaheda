/**
 * Forgot Password — sends a password-reset email via Supabase.
 *
 * Flow:
 *   1. User enters their email address.
 *   2. `requestPasswordReset(email)` sends a PKCE reset link.
 *   3. Success state shows confirmation; user opens their email app.
 *   4. Tapping the link in the email opens the app at /reset-password.
 */

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { requestPasswordReset, getAuthError } from "@/features/auth";
import { track } from "@/lib/analytics";
import { captureError } from "@/lib/crashReporter";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { authStyles } from "@/features/auth/styles/auth.styles";

export default function ForgotPasswordScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [sent,    setSent]    = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError(t("forgotPassword.emailRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError(t("forgotPassword.invalidEmail"));
      return;
    }
    setLoading(true);
    track("forgot_password_submitted");
    try {
      await requestPasswordReset(trimmed);
      track("forgot_password_email_sent");
      setSent(true);
    } catch (e) {
      if (__DEV__) console.warn("[forgot-password] failed:", e);
      captureError(e, { surface: "forgot-password" });
      setError(getAuthError(e, i18n.language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={authStyles.screen}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={theme.gradients.heroPrimary as [string, string, string]}
          style={[authStyles.hero, { paddingTop: insets.top + 20 }]}>

          <Pressable onPress={() => router.back()} style={authStyles.closeBtn} hitSlop={10}
            accessibilityRole="button" accessibilityLabel={t("forgotPassword.backLabel")}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>

          <Animated.View
            entering={FadeInDown.duration(420).delay(60).springify().damping(18)}
            style={authStyles.iconWrap}>
            <View style={styles.iconTile}>
              <Ionicons name="key-outline" size={40} color={theme.colors.brand.base} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(420).delay(140)} style={authStyles.heroTextWrap}>
            <Text variant="screen-title" color="inverse" align="center" style={authStyles.heroTitle}>
              {sent ? t("forgotPassword.titleSent") : t("forgotPassword.title")}
            </Text>
            <Text variant="body" color="inverse-muted" align="center" style={{ marginTop: 6 }}>
              {sent ? t("forgotPassword.subtitleSent") : t("forgotPassword.subtitle")}
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* ── Form / Success card ──────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.duration(460).delay(180)} style={[authStyles.formCard, { gap: 16 }]}>

          {!sent ? (
            <>
              {error && (
                <Animated.View entering={FadeInDown.duration(200)} style={authStyles.errorBox}>
                  <View style={authStyles.errorIcon}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.error.base} />
                  </View>
                  <Text variant="body-sm" align="right" style={authStyles.errorText}>{error}</Text>
                </Animated.View>
              )}

              <Text variant="body" color="secondary" align="right" style={styles.hint}>
                {t("forgotPassword.hint")}
              </Text>

              <Input
                label={t("forgotPassword.emailLabel")}
                placeholder="example@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon={<Ionicons name="mail-outline" size={18} color={theme.colors.text.tertiary} />}
              />

              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                onPress={handleSubmit}
                gradient
                style={{ marginTop: 4 }}>
                {t("forgotPassword.sendBtn")}
              </Button>
            </>
          ) : (
            <Animated.View entering={FadeInUp.duration(380)} style={styles.successContent}>
              <View style={styles.successIcon}>
                <Ionicons name="mail-open-outline" size={36} color={theme.colors.brand.base} />
              </View>
              <Text variant="sheet-title" align="center" style={styles.successTitle}>
                {t("forgotPassword.successTitle")}
              </Text>
              <Text variant="body" color="secondary" align="center" style={styles.successBody}>
                {t("forgotPassword.successBodyPre")}{"\n"}
                <Text variant="body" weight="bold" color="primary">{email}</Text>
                {"\n"}{t("forgotPassword.successBodyPost")}
              </Text>
              <View style={styles.tipBox}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.brand.base} />
                <Text variant="caption" color="secondary" style={{ flex: 1, textAlign: "right" }}>
                  {t("forgotPassword.spamTip")}
                </Text>
              </View>
              <Button
                variant="outline"
                size="md"
                fullWidth
                onPress={() => { setSent(false); setEmail(""); }}
                style={{ marginTop: 8 }}>
                {t("forgotPassword.resend")}
              </Button>
            </Animated.View>
          )}

          {/* Back to login */}
          <View style={[authStyles.footer, { paddingTop: theme.spacing.sm }]}>
            <Text variant="body-sm" color="secondary">{t("forgotPassword.rememberPassword")}</Text>
            <Pressable hitSlop={6} onPress={() => router.replace("/(auth)/login")}>
              <Text variant="body-sm" weight="extrabold" color="brand">{t("forgotPassword.signIn")}</Text>
            </Pressable>
          </View>

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Icon tile — key icon, smaller than logoTile (96×96 vs 116×116)
  iconTile: {
    width:           96,
    height:          96,
    borderRadius:    24,
    backgroundColor: theme.colors.surface,  // was: "#fff"
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.lg,
  },
  hint: {
    lineHeight: 22,
  },
  successContent: {
    alignItems: "center",
    gap:        12,
    paddingTop: 8,
  },
  successIcon: {
    width:           80,
    height:          80,
    borderRadius:    theme.radius["2xl"],
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.brand.light,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    4,
    ...theme.shadow.brandGlow,
  },
  successTitle: {
    letterSpacing: -0.3,
  },
  successBody: {
    lineHeight: 24,
    maxWidth:   300,
  },
  tipBox: {
    flexDirection:   "row-reverse",
    alignItems:      "flex-start",
    gap:             8,
    backgroundColor: theme.colors.brand.lighter,
    borderRadius:    theme.radius.lg,
    borderWidth:     1,
    borderColor:     theme.colors.brand.light,
    padding:         12,
    marginTop:       4,
  },
});
