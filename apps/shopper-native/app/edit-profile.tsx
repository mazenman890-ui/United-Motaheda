/**
 * EditProfileScreen — lets an authenticated user update their display name
 * and phone number.
 *
 * Architecture:
 *   - Loads current values from supabase.auth.getUser() (user_metadata)
 *   - On save: calls updateProfile() which writes to both auth.users.user_metadata
 *     AND public.profiles (full_name / phone).
 *   - The auth context listens to onAuthStateChange(USER_UPDATED) and refreshes
 *     the displayed name in the profile hero automatically — no manual reload needed.
 *   - Email is shown read-only with a hint explaining it cannot be changed here.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { updateProfile, getAuthError, useAuth } from "@/features/auth";
import { captureError } from "@/lib/crashReporter";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

type Phase = "loading" | "form" | "success";

export default function EditProfileScreen() {
  const { t, i18n } = useTranslation();
  const router      = useRouter();
  const insets      = useSafeAreaInsets();
  const { user }    = useAuth();

  const [phase,   setPhase]   = useState<Phase>("loading");
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [email,   setEmail]   = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  // Load current user values from auth metadata once on mount.
  // Intentionally empty deps — we only want to read the initial values.
  // Keeping `user` in the dep array would cause this effect to re-run after
  // updateProfile() fires USER_UPDATED, which would overwrite "success" with
  // "form" and break the auto-back flow.
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!mountedRef.current) return;
      setName(u?.user_metadata?.name  ?? "");
      setPhone(u?.user_metadata?.phone ?? "");
      setEmail(u?.email ?? "");
      setPhase("form");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("editProfile.errorRequired"));
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ name: trimmedName, phone: phone.trim() });
      if (mountedRef.current) setPhase("success");
    } catch (e) {
      if (__DEV__) console.warn("[edit-profile] updateProfile failed:", e);
      captureError(e, { surface: "edit-profile" });
      if (mountedRef.current) setError(getAuthError(e, i18n.language));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [name, phone, t, i18n.language]);

  // Auto-dismiss success state after 1.5 s
  useEffect(() => {
    if (phase !== "success") return;
    const id = setTimeout(() => { if (mountedRef.current) router.back(); }, 1500);
    return () => clearTimeout(id);
  }, [phase, router]);

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
          <UIText style={s.headerTitle}>{t("editProfile.title")}</UIText>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Loading ──────────────────────────────────────────────────────── */}
          {phase === "loading" && (
            <View style={s.centered}>
              <ActivityIndicator size="large" color={theme.colors.brand.base} />
            </View>
          )}

          {/* ── Success ──────────────────────────────────────────────────────── */}
          {phase === "success" && (
            <Animated.View entering={FadeIn.duration(260)} style={s.successWrap}>
              <View style={s.successIcon}>
                <Ionicons name="checkmark-circle" size={52} color={theme.colors.success.base} />
              </View>
              <UIText style={s.successTitle}>{t("editProfile.saved")}</UIText>
            </Animated.View>
          )}

          {/* ── Form ─────────────────────────────────────────────────────────── */}
          {phase === "form" && (
            <Animated.View entering={FadeInUp.duration(300)} style={s.form}>

              {/* Avatar placeholder */}
              <Animated.View entering={FadeInDown.duration(320).delay(40)} style={s.avatarWrap}>
                <View style={s.avatarTile}>
                  <Ionicons name="person" size={36} color={theme.colors.brand[600]} />
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

              {/* Name */}
              <Input
                label={t("editProfile.nameLabel")}
                placeholder={t("editProfile.namePlaceholder")}
                value={name}
                onChangeText={(v) => { setName(v); setError(null); }}
                leftIcon={<Ionicons name="person-outline" size={18} color={theme.colors.text.tertiary} />}
                autoCapitalize="words"
                returnKeyType="next"
              />

              {/* Phone */}
              <Input
                label={t("editProfile.phoneLabel")}
                placeholder={t("editProfile.phonePlaceholder")}
                value={phone}
                onChangeText={(v) => setPhone(v)}
                leftIcon={<Ionicons name="call-outline" size={18} color={theme.colors.text.tertiary} />}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              {/* Email — read-only */}
              <View style={s.emailBlock}>
                <UIText style={s.fieldLabel}>{t("editProfile.emailLabel")}</UIText>
                <View style={s.emailRow}>
                  <Ionicons name="mail-outline" size={16} color={theme.colors.text.tertiary} />
                  <UIText style={s.emailValue} numberOfLines={1}>{email}</UIText>
                </View>
                <View style={s.emailHintRow}>
                  <Ionicons name="lock-closed-outline" size={11} color={theme.colors.text.disabled} />
                  <UIText style={s.emailHint}>{t("editProfile.emailHint")}</UIText>
                </View>
              </View>

              {/* Save */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                gradient
                loading={saving}
                onPress={handleSave}
                style={{ marginTop: 8 }}>
                {saving ? t("editProfile.saving") : t("editProfile.saveBtn")}
              </Button>

            </Animated.View>
          )}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
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
  centered: {
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 80,
  },
  successWrap: {
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 80,
    gap:             16,
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
  form: {
    gap:       16,
    marginTop: 8,
  },
  avatarWrap: {
    alignItems:    "center",
    marginBottom:  8,
  },
  avatarTile: {
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
  // Email read-only block
  emailBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize:   theme.fontSize.sm,
    fontFamily: theme.fonts.semibold,
    color:      theme.colors.text.secondary,
    textAlign:  textAlignStart(isRtl()),
    marginBottom: 2,
  },
  emailRow: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             10,
    backgroundColor: theme.colors.subtle,
    borderRadius:    theme.radius.lg,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth:     1,
    borderColor:     theme.colors.border.default,
  },
  emailValue: {
    flex:       1,
    fontSize:   theme.fontSize.base,
    fontFamily: theme.fonts.semibold,
    color:      theme.colors.text.secondary,
    textAlign:  textAlignStart(isRtl()),
  },
  emailHintRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           5,
  },
  emailHint: {
    fontSize:   theme.fontSize.xs,
    fontFamily: theme.fonts.regular,
    color:      theme.colors.text.disabled,
    textAlign:  textAlignStart(isRtl()),
  },
});
