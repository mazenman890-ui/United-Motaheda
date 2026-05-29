/**
 * /reset-password — handles the PKCE recovery link from Supabase.
 *
 * Flow:
 *   1. User taps the reset link in their email →
 *      OS opens `shopper://reset-password?code=<pkce_code>`
 *   2. This screen exchanges the code for a recovery session.
 *   3. User enters and confirms a new password.
 *   4. `supabase.auth.updateUser({ password })` commits the change.
 *   5. On success → navigate to the main app (tabs).
 *
 * Error paths:
 *   - No code / expired code → show "link expired" panel + "request again" CTA.
 *   - Weak password / mismatch → inline validation.
 *   - Network error → surface Arabic error message.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { updatePassword, authErrorToArabic } from "@/features/auth";
import { track } from "@/lib/analytics";
import { captureError } from "@/lib/crashReporter";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Text } from "@/shared/ui";
import { theme } from "@/theme";

type Phase = "exchanging" | "form" | "success" | "expired";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();

  const [phase,       setPhase]       = useState<Phase>("exchanging");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Exchange the PKCE code for a recovery session exactly once.
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = typeof params.code === "string" ? params.code.trim() : "";
    if (!code) {
      setPhase("expired");
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exErr }) => {
        if (exErr) {
          if (__DEV__) console.warn("[reset-password] exchange failed:", exErr.message);
          setPhase("expired");
        } else {
          track("reset_password_link_opened");
          setPhase("form");
        }
      })
      .catch(() => setPhase("expired"));
  }, [params.code]);

  // ── Validate locally before hitting the server ─────────────────────────────

  const validate = (): string | null => {
    if (password.length < MIN_PASSWORD_LENGTH)
      return t("resetPassword.minLengthError", { min: MIN_PASSWORD_LENGTH });
    if (!/[A-Za-z]/.test(password))
      return t("resetPassword.noLetterError");
    if (password !== confirm)
      return t("resetPassword.passwordsNoMatch");
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    track("reset_password_submitted");
    try {
      await updatePassword(password);
      track("reset_password_completed");
      setPhase("success");
    } catch (e) {
      if (__DEV__) console.warn("[reset-password] updatePassword failed:", e);
      captureError(e, { surface: "reset-password" });
      setError(authErrorToArabic(e));
    } finally {
      setLoading(false);
    }
  };

  // ── Password strength indicator ────────────────────────────────────────────

  const strength = getPasswordStrength(password);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const heroTitle = (() => {
    if (phase === "success") return t("resetPassword.titleSuccess");
    if (phase === "expired") return t("resetPassword.titleExpired");
    return t("resetPassword.titleDefault");
  })();

  const heroSubtitle = (() => {
    if (phase === "success") return t("resetPassword.subtitleSuccess");
    if (phase === "expired") return t("resetPassword.subtitleExpired");
    if (phase === "exchanging") return t("resetPassword.subtitleVerifying");
    return t("resetPassword.subtitleDefault");
  })();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={theme.gradients.heroPrimary as [string, string, string]}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}>

          <Animated.View
            entering={FadeInDown.duration(420).delay(60).springify().damping(18)}
            style={styles.iconWrap}>
            <View style={[
              styles.iconTile,
              phase === "success" && styles.iconTileSuccess,
              phase === "expired" && styles.iconTileError,
            ]}>
              <Ionicons
                name={phase === "success" ? "checkmark-circle-outline" : phase === "expired" ? "alert-circle-outline" : "lock-open-outline"}
                size={40}
                color={phase === "success" ? theme.colors.brand.base : phase === "expired" ? theme.colors.error.base : theme.colors.brand.base}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(420).delay(140)} style={styles.heroTextWrap}>
            <Text variant="screen-title" color="inverse" align="center" style={styles.heroTitle}>
              {heroTitle}
            </Text>
            <Text variant="body" color="inverse-muted" align="center" style={{ marginTop: 6 }}>
              {heroSubtitle}
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* ── Content card ────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.duration(460).delay(180)} style={styles.card}>

          {/* Exchanging — spinner while we call exchangeCodeForSession */}
          {phase === "exchanging" && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.centered}>
              <ActivityIndicator size="large" color={theme.colors.brand.base} />
              <Text variant="body" color="secondary" align="center" style={{ marginTop: 16 }}>
                {t("resetPassword.verifyingBody")}
              </Text>
            </Animated.View>
          )}

          {/* Expired / invalid link */}
          {phase === "expired" && (
            <Animated.View entering={FadeInUp.duration(380)} style={styles.stateContent}>
              <View style={styles.expiredIcon}>
                <Ionicons name="time-outline" size={36} color={theme.colors.error.base} />
              </View>
              <Text variant="sheet-title" align="center">{t("resetPassword.expiredTitle")}</Text>
              <Text variant="body" color="secondary" align="center" style={styles.stateBody}>
                {t("resetPassword.expiredBody")}
              </Text>
              <Button
                variant="primary"
                fullWidth
                gradient
                onPress={() => router.replace("/(auth)/forgot-password")}>
                {t("resetPassword.requestNew")}
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onPress={() => router.replace("/(auth)/login")}>
                {t("resetPassword.backToLogin")}
              </Button>
            </Animated.View>
          )}

          {/* New password form */}
          {phase === "form" && (
            <Animated.View entering={FadeInUp.duration(380)} style={styles.formContent}>
              {error && (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.errorBox}>
                  <View style={styles.errorIcon}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.error.base} />
                  </View>
                  <Text variant="body-sm" align="right" style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              <Input
                label={t("resetPassword.newPasswordLabel")}
                placeholder={t("resetPassword.newPasswordPlaceholder")}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                secureTextEntry={!showPass}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.colors.text.tertiary} />}
                rightIcon={
                  <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                    <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={theme.colors.text.tertiary} />
                  </Pressable>
                }
              />

              {/* Strength meter */}
              {password.length > 0 && (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.strengthWrap}>
                  <View style={styles.strengthBarRow}>
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.strengthSegment,
                          i < strength.score && { backgroundColor: strength.color },
                        ]}
                      />
                    ))}
                  </View>
                  <Text variant="eyebrow" style={{ color: strength.color }}>{t(strength.labelKey)}</Text>
                </Animated.View>
              )}

              <Input
                label={t("resetPassword.confirmPasswordLabel")}
                placeholder={t("resetPassword.confirmPlaceholder")}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setError(null); }}
                secureTextEntry={!showConfirm}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.colors.text.tertiary} />}
                rightIcon={
                  <Pressable onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
                    <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={theme.colors.text.tertiary} />
                  </Pressable>
                }
              />

              {/* Match indicator */}
              {confirm.length > 0 && (
                <Animated.View entering={FadeIn.duration(180)} style={styles.matchRow}>
                  <Ionicons
                    name={password === confirm ? "checkmark-circle" : "close-circle"}
                    size={14}
                    color={password === confirm ? theme.colors.success.base : theme.colors.error.base}
                  />
                  <Text
                    variant="eyebrow"
                    style={{ color: password === confirm ? theme.colors.success.base : theme.colors.error.base }}>
                    {password === confirm ? t("resetPassword.passwordsMatch") : t("resetPassword.passwordsNoMatch")}
                  </Text>
                </Animated.View>
              )}

              <Button
                variant="primary"
                size="lg"
                fullWidth
                gradient
                loading={loading}
                onPress={handleSubmit}
                style={{ marginTop: 8 }}>
                {t("resetPassword.saveBtn")}
              </Button>
            </Animated.View>
          )}

          {/* Success */}
          {phase === "success" && (
            <Animated.View entering={FadeInUp.duration(380)} style={styles.stateContent}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle-outline" size={40} color={theme.colors.brand.base} />
              </View>
              <Text variant="sheet-title" align="center">{t("resetPassword.successTitle")}</Text>
              <Text variant="body" color="secondary" align="center" style={styles.stateBody}>
                {t("resetPassword.successBody")}
              </Text>
              <Button
                variant="primary"
                fullWidth
                gradient
                onPress={() => router.replace("/(tabs)")}>
                {t("resetPassword.goToApp")}
              </Button>
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): { score: number; labelKey: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score += 1;
  if (pw.length >= 12) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { score: 1, labelKey: "resetPassword.strengthWeak",   color: theme.colors.error.base   };
  if (score === 2) return { score: 2, labelKey: "resetPassword.strengthFair",   color: theme.colors.warning.base  };
  if (score === 3) return { score: 3, labelKey: "resetPassword.strengthGood",   color: theme.colors.brand.base    };
  return              { score: 4, labelKey: "resetPassword.strengthStrong",  color: theme.colors.success.base  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  hero: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingBottom:     40,
    overflow:          "hidden",
  },
  iconWrap: {
    alignItems: "center",
    marginTop:  20,
  },
  iconTile: {
    width:           96,
    height:          96,
    borderRadius:    24,
    backgroundColor: "#fff",
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.lg,
  },
  iconTileSuccess: {
    backgroundColor: theme.colors.brand.lighter,
  },
  iconTileError: {
    backgroundColor: theme.colors.error.bg,
  },
  heroTextWrap: {
    alignItems: "center",
    marginTop:  22,
  },
  heroTitle: {
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor:      theme.colors.surface,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    marginTop:            -22,
    flex:                 1,
    padding:              theme.layout.pagePaddingH,
    paddingTop:           28,
    ...theme.shadow.lg,
  },
  centered: {
    alignItems:     "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  stateContent: {
    alignItems: "center",
    gap:        14,
    paddingTop: 8,
  },
  formContent: {
    gap: 12,
  },
  stateBody: {
    lineHeight: 24,
    maxWidth:   300,
  },
  expiredIcon: {
    width:           80,
    height:          80,
    borderRadius:    theme.radius["2xl"],
    backgroundColor: theme.colors.error.bg,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    4,
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
  errorBox: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             10,
    backgroundColor: theme.colors.error.bg,
    borderRadius:    theme.radius.lg,
    padding:         12,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
  },
  errorIcon: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  errorText: {
    flex: 1,
    color: theme.colors.error.text,
    fontFamily: theme.fonts.semibold,
  },
  strengthWrap: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    gap:            8,
    paddingHorizontal: 4,
  },
  strengthBarRow: {
    flex:          1,
    flexDirection: "row-reverse",
    gap:           4,
  },
  strengthSegment: {
    flex:         1,
    height:       4,
    borderRadius: 2,
    backgroundColor: theme.colors.border.default,
  },
  matchRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           6,
    paddingHorizontal: 4,
  },
});
