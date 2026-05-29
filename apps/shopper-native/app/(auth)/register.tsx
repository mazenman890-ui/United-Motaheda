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
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import {
  signUp,
  authErrorToArabic,
  sendPhoneOtp,
  PhoneVerifyModal,
  PHONE_VERIFICATION_ENABLED,
} from "@/features/auth";
import { AppLogo } from "@/shared/components/AppLogo";
import { track } from "@/lib/analytics";
import { captureError } from "@/lib/crashReporter";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Text } from "@/shared/ui";
import { theme } from "@/theme";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [phone,    setPhone]    = useState("");
  const [skipPhone, setSkipPhone] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  // OTP modal state — opens after a successful email signup if the user
  // supplied a phone. The modal handles resend + verify internally; we just
  // hand it the E.164-normalized phone and a "verified → go to tabs" handler.
  const [otpPhone, setOtpPhone] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!name.trim()) { setError(t("auth.nameRequired")); return; }
    if (!email.trim()) { setError(t("auth.emailRequired")); return; }
    if (password.length < 6) { setError(t("auth.passwordMinLength")); return; }
    // Phone is optional. If provided, validate EG format.
    const phoneClean = phone.replace(/\D/g, "");
    if (!skipPhone && phoneClean && !/^01[0125]\d{8}$/.test(phoneClean)) {
      setError(t("auth.invalidPhone"));
      return;
    }
    const hasPhone = !skipPhone && phoneClean.length > 0;
    setLoading(true);
    track("signup_attempted", { has_phone: hasPhone });
    try {
      const result = await signUp(
        email.trim().toLowerCase(),
        password,
        name.trim(),
        skipPhone ? undefined : phoneClean || undefined,
      );
      track("signup_completed");

      // If the Supabase dashboard has "Confirm email" enabled, signUp
      // returns no session — the user must click the email link first.
      // We CAN'T send a phone OTP yet because updateUser requires a
      // session. Show a clear "check your email" state instead of failing
      // silently with "Auth session missing!".
      if (!result.hasSession) {
        setError(
          hasPhone
            ? t("auth.emailConfirmationWithPhone")
            : t("auth.emailConfirmationNoPhone"),
        );
        // Don't navigate to tabs — the user has no session and would just
        // see a signed-out home screen. Stay on this screen so they can see
        // the message + tap "تسجيل الدخول" once they've confirmed.
        return;
      }

      // Has session → proceed to phone OTP if a phone was provided AND
      // phone verification is currently enabled. While the feature flag is
      // off (Twilio not yet provisioned for prod), we skip the OTP step
      // and drop the user into the app with phone stored but unverified.
      if (hasPhone && PHONE_VERIFICATION_ENABLED) {
        try {
          const e164 = await sendPhoneOtp(phoneClean);
          setOtpPhone(e164);
        } catch (e) {
          captureError(e, { surface: "register", step: "send_otp" });
          if (__DEV__) console.warn("[register] sendPhoneOtp failed:", e);
          // Surface the failure instead of silently navigating to tabs.
          // The user can still finish their phone verification later from
          // the profile screen, but they should know it didn't happen now.
          setError(t("auth.otpSendFailedContinue"));
          // Brief delay so the message is readable before navigating.
          setTimeout(() => router.replace("/(tabs)"), 2200);
        }
      } else {
        router.replace("/(tabs)");
      }
    } catch (e) {
      if (__DEV__) console.warn("[register] signUp failed:", e);
      captureError(e, { surface: "register" });
      track("signup_failed", { reason: e instanceof Error ? e.message.slice(0, 80) : "unknown" });
      setError(authErrorToArabic(e));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = (_verifiedPhone: string) => {
    track("signup_completed", { phone_verified: true });
    setOtpPhone(null);
    router.replace("/(tabs)");
  };

  const handleOtpCancel = () => {
    // User dismissed the OTP modal. Account already exists; they can verify
    // the phone later. Send them into the app.
    setOtpPhone(null);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={theme.gradients.heroPrimary as [string, string, string]}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>

          <Animated.View
            entering={FadeInDown.duration(420).delay(60).springify().damping(18)}
            style={styles.logoWrap}>
            <View style={styles.logoTile}>
              <AppLogo size="lg" />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(420).delay(140)}
            style={styles.heroTextWrap}>
            <Text variant="screen-title" color="inverse" align="center" style={styles.heroTitle}>
              {t("auth.registerWelcome")}
            </Text>
            <Text
              variant="body"
              color="inverse-muted"
              align="center"
              style={{ marginTop: 6 }}>
              {t("auth.registerSubtitleFull")}
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* ── Form card ────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.duration(460).delay(180)}
          style={styles.formCard}>
          {error && (
            <Animated.View entering={FadeInDown.duration(200)} style={styles.errorBox}>
              <View style={styles.errorIcon}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error.base} />
              </View>
              <Text variant="body-sm" align="right" style={styles.errorText}>
                {error}
              </Text>
            </Animated.View>
          )}

          <Input
            label={t("auth.fullName")}
            placeholder={t("auth.namePlaceholder")}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            leftIcon={<Ionicons name="person-outline" size={18} color={theme.colors.text.tertiary} />}
          />

          <Input
            label={t("auth.email")}
            placeholder="example@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Ionicons name="mail-outline" size={18} color={theme.colors.text.tertiary} />}
          />

          <View>
            <Input
              label={t("auth.phone")}
              placeholder="01xxxxxxxxx"
              value={phone}
              onChangeText={(v) => { setPhone(v); if (v) setSkipPhone(false); }}
              keyboardType="phone-pad"
              optional
              editable={!skipPhone}
              leftIcon={<Ionicons name="call-outline" size={18} color={theme.colors.text.tertiary} />}
              hint={t("auth.phoneHint")}
            />
            <Pressable
              onPress={() => { setSkipPhone((v) => !v); if (!skipPhone) setPhone(""); }}
              hitSlop={6}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: skipPhone }}
              style={styles.skipRow}>
              <View style={[styles.skipCheck, skipPhone && styles.skipCheckActive]}>
                {skipPhone && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text variant="caption" color={skipPhone ? "brand" : "secondary"} weight="semibold">
                {t("auth.skipPhone")}
              </Text>
            </Pressable>
          </View>

          <Input
            label={t("auth.password")}
            placeholder={t("auth.passwordPlaceholderHint")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={theme.colors.text.tertiary} />}
            rightIcon={
              <Pressable onPress={() => setShowPass(!showPass)} hitSlop={8}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={theme.colors.text.tertiary} />
              </Pressable>
            }
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleRegister}
            gradient
            style={{ marginTop: 6 }}>
            {t("auth.registerBtn")}
          </Button>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text variant="caption" color="tertiary" style={{ paddingHorizontal: 4 }}>
              {t("auth.or")}
            </Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.footer}>
            <Text variant="body-sm" color="secondary">
              {t("auth.alreadyAccount")}
            </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable hitSlop={6}>
                <Text variant="body-sm" weight="extrabold" color="brand">
                  {t("auth.login")}
                </Text>
              </Pressable>
            </Link>
          </View>

          <Text variant="eyebrow" color="tertiary" align="center" style={styles.terms}>
            {t("auth.termsNote")}
          </Text>
        </Animated.View>
      </ScrollView>

      <PhoneVerifyModal
        visible={otpPhone !== null}
        initialPhone={otpPhone ?? ""}
        onVerified={handleOtpVerified}
        onCancel={handleOtpCancel}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  hero: {
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingBottom:     40,
    overflow:          "hidden",
    position:          "relative",
  },
  closeBtn: {
    position:        "absolute",
    top:             16,
    left:            theme.layout.pagePaddingH,
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: theme.colors.glass,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     theme.colors.glassBorder,
  },
  logoWrap: {
    alignItems: "center",
    marginTop:  20,
  },
  logoTile: {
    width:           116,
    height:          116,
    borderRadius:    28,
    backgroundColor: "#fff",
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.lg,
  },
  heroTextWrap: {
    alignItems: "center",
    marginTop:  22,
  },
  heroTitle: {
    letterSpacing: -0.5,
  },
  formCard: {
    backgroundColor:      theme.colors.surface,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    marginTop:            -22,
    flex:                 1,
    padding:              theme.layout.pagePaddingH,
    paddingTop:           28,
    gap:                  14,
    ...theme.shadow.lg,
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
  dividerRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
    marginTop:     6,
  },
  divider: {
    flex:            1,
    height:          1,
    backgroundColor: theme.colors.border.hairline,
  },
  footer: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    justifyContent:"center",
    gap:           6,
    marginTop:     2,
  },
  terms: {
    lineHeight: 16,
    paddingTop: 8,
    textTransform: "none",   // disable widest tracking that eyebrow normally has
    letterSpacing: 0,
  },
  // Skip-phone toggle — refined "premium checkbox"
  skipRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           8,
    marginTop:     8,
    paddingHorizontal: 2,
  },
  skipCheck: {
    width:          18,
    height:         18,
    borderRadius:   6,
    borderWidth:    1.5,
    borderColor:    theme.colors.border.medium,
    alignItems:     "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  skipCheckActive: {
    backgroundColor: theme.colors.brand[600],
    borderColor:     theme.colors.brand[600],
  },
});
