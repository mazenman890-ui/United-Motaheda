/**
 * ChangePasswordScreen — in-app password change for authenticated users.
 *
 * Unlike reset-password.tsx (which requires a PKCE email recovery link),
 * this screen is accessible from the Security settings row for any signed-in
 * user. It calls the same underlying `updatePassword()` API function.
 *
 * Validation:
 *   - Minimum 8 characters
 *   - New password and confirm must match
 *
 * On success: shows a confirmation state then navigates back after 1.5 s.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { updatePassword, getAuthError } from "@/features/auth";
import { captureError } from "@/lib/crashReporter";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

const MIN_PASSWORD_LENGTH = 8;

type Phase = "form" | "success";

export default function ChangePasswordScreen() {
  const { t, i18n } = useTranslation();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();

  const [phase,       setPhase]       = useState<Phase>("form");
  const [newPass,     setNewPass]     = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const handleSave = useCallback(async () => {
    setError(null);
    // Inline validation — avoids stale-closure lint warning from a separate
    // `validate` helper that would need its own dep array.
    if (newPass.length < MIN_PASSWORD_LENGTH) { setError(t("changePassword.errorShort"));   return; }
    if (newPass !== confirm)                  { setError(t("changePassword.errorMismatch")); return; }

    setSaving(true);
    try {
      await updatePassword(newPass);
      if (mountedRef.current) setPhase("success");
    } catch (e) {
      if (__DEV__) console.warn("[change-password] updatePassword failed:", e);
      captureError(e, { surface: "change-password" });
      // getAuthError always returns a string; no nullish fallback needed.
      if (mountedRef.current) setError(getAuthError(e, i18n.language));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [newPass, confirm, t, i18n.language]);

  // Auto-dismiss success state
  useEffect(() => {
    if (phase !== "success") return;
    const id = setTimeout(() => { if (mountedRef.current) router.back(); }, 1500);
    return () => clearTimeout(id);
  }, [phase, router]);

  // ── Password strength (reused from reset-password) ─────────────────────────
  const strength = getPasswordStrength(newPass);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.screen, { paddingTop: insets.top }]}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
            <Ionicons name="arrow-forward" size={18} color={theme.colors.text.primary} />
          </Pressable>
          <UIText style={s.headerTitle}>{t("changePassword.title")}</UIText>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Success ──────────────────────────────────────────────────────── */}
          {phase === "success" && (
            <Animated.View entering={FadeIn.duration(260)} style={s.successWrap}>
              <View style={s.successIcon}>
                <Ionicons name="checkmark-circle" size={52} color={theme.colors.success.base} />
              </View>
              <UIText style={s.successTitle}>{t("changePassword.successTitle")}</UIText>
              <UIText style={s.successBody}>{t("changePassword.successBody")}</UIText>
            </Animated.View>
          )}

          {/* ── Form ─────────────────────────────────────────────────────────── */}
          {phase === "form" && (
            <Animated.View entering={FadeInUp.duration(300)} style={s.form}>

              {/* Icon header */}
              <Animated.View entering={FadeInDown.duration(320).delay(40)} style={s.iconWrap}>
                <View style={s.iconTile}>
                  <Ionicons name="lock-closed-outline" size={36} color={theme.colors.brand[600]} />
                </View>
              </Animated.View>

              {/* Error banner */}
              {error && (
                <Animated.View entering={FadeInDown.duration(200)} style={s.errorBox}>
                  <View style={s.errorIcon}>
                    <Ionicons name="alert-circle" size={16} color={theme.colors.error.base} />
                  </View>
                  <UIText style={s.errorText}>{error}</UIText>
                </Animated.View>
              )}

              {/* New password */}
              <Input
                label={t("changePassword.newLabel")}
                placeholder={t("changePassword.newPlaceholder")}
                value={newPass}
                onChangeText={(v) => { setNewPass(v); setError(null); }}
                secureTextEntry={!showNew}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.colors.text.tertiary} />}
                rightIcon={
                  <Pressable onPress={() => setShowNew((p) => !p)} hitSlop={8}>
                    <Ionicons
                      name={showNew ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={theme.colors.text.tertiary}
                    />
                  </Pressable>
                }
              />

              {/* Strength meter */}
              {newPass.length > 0 && (
                <Animated.View entering={FadeInDown.duration(200)} style={s.strengthWrap}>
                  <View style={s.strengthBarRow}>
                    {[0, 1, 2, 3].map((i) => (
                      <View
                        key={i}
                        style={[
                          s.strengthSegment,
                          i < strength.score && { backgroundColor: strength.color },
                        ]}
                      />
                    ))}
                  </View>
                  <UIText style={[s.strengthLabel, { color: strength.color }]}>
                    {t(strength.labelKey)}
                  </UIText>
                </Animated.View>
              )}

              {/* Confirm password */}
              <Input
                label={t("changePassword.confirmLabel")}
                placeholder={t("changePassword.confirmPlaceholder")}
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setError(null); }}
                secureTextEntry={!showConfirm}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.colors.text.tertiary} />}
                rightIcon={
                  <Pressable onPress={() => setShowConfirm((p) => !p)} hitSlop={8}>
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={theme.colors.text.tertiary}
                    />
                  </Pressable>
                }
                onSubmitEditing={handleSave}
                returnKeyType="done"
              />

              {/* Match indicator */}
              {confirm.length > 0 && (
                <Animated.View entering={FadeIn.duration(180)} style={s.matchRow}>
                  <Ionicons
                    name={newPass === confirm ? "checkmark-circle" : "close-circle"}
                    size={14}
                    color={newPass === confirm ? theme.colors.success.base : theme.colors.error.base}
                  />
                  <UIText
                    style={[
                      s.matchText,
                      { color: newPass === confirm ? theme.colors.success.base : theme.colors.error.base },
                    ]}>
                    {newPass === confirm
                      ? t("resetPassword.passwordsMatch")
                      : t("changePassword.errorMismatch")}
                  </UIText>
                </Animated.View>
              )}

              {/* Save button */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                gradient
                loading={saving}
                onPress={handleSave}
                style={{ marginTop: 8 }}>
                {saving ? t("changePassword.saving") : t("changePassword.saveBtn")}
              </Button>

            </Animated.View>
          )}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Password strength (shared logic with reset-password.tsx) ─────────────────

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

const s = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingVertical:   14,
    backgroundColor:   theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.default,
    ...theme.shadow.xs,
  },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: theme.colors.subtle,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
  },
  headerTitle: {
    fontSize:   theme.fontSize["2xl"],
    fontFamily: theme.fonts.black,
    color:      theme.colors.text.primary,
  },
  content: {
    padding: theme.layout.pagePaddingH,
    gap:     0,
  },
  successWrap: {
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 80,
    gap:             14,
  },
  successIcon: {
    width:           88,
    height:          88,
    borderRadius:    theme.radius["2xl"],
    backgroundColor: theme.colors.success.bg,
    borderWidth:     1,
    borderColor:     theme.colors.success.light,
    alignItems:      "center",
    justifyContent:  "center",
  },
  successTitle: {
    fontSize:   20,
    fontFamily: theme.fonts.black,
    color:      theme.colors.success.strong,
  },
  successBody: {
    fontSize:   theme.fontSize.base,
    fontFamily: theme.fonts.regular,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 22,
    maxWidth:   280,
  },
  form: {
    gap:       16,
    marginTop: 8,
  },
  iconWrap: {
    alignItems:   "center",
    marginBottom: 8,
  },
  iconTile: {
    width:           84,
    height:          84,
    borderRadius:    26,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.brandGlow,
  },
  errorBox: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             10,
    backgroundColor: theme.colors.error.bg,
    borderRadius:    theme.radius.lg,
    padding:         12,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
  },
  errorIcon: {
    width:           24,
    height:          24,
    borderRadius:    8,
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
  },
  errorText: {
    flex:       1,
    color:      theme.colors.error.text,
    fontFamily: theme.fonts.semibold,
    fontSize:   theme.fontSize.sm,
    textAlign:  textAlignStart(isRtl()),
  },
  strengthWrap: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: 4,
  },
  strengthBarRow: {
    flex:          1,
    flexDirection: flexRow(isRtl()),
    gap:           4,
  },
  strengthSegment: {
    flex:             1,
    height:           4,
    borderRadius:     2,
    backgroundColor:  theme.colors.border.default,
  },
  strengthLabel: {
    fontSize:   theme.fontSize.xs,
    fontFamily: theme.fonts.semibold,
  },
  matchRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 4,
  },
  matchText: {
    fontSize:   theme.fontSize.xs,
    fontFamily: theme.fonts.semibold,
  },
});
