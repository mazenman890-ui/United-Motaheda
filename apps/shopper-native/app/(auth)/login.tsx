/**
 * Login screen — clinical/trust evolution.
 *
 * Visual recipe:
 *   - Deep navy hero with brand-tile logo (lifted, premium shadow)
 *   - Display-tier Arabic headline + muted inverse subhead
 *   - Pull-up form card (top-rounded, soft elevation, NOT heavy xl shadow)
 *   - Staged entrance via the new `emphasize` easing
 *   - Inline error banner using subtle brand-tinted background
 *   - Refined divider (hairline) and footer link rhythm
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
import { Link, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { signIn, getAuthError } from "@/features/auth";
import { AppLogo } from "@/shared/components/AppLogo";
import { track } from "@/lib/analytics";
import { captureError } from "@/lib/crashReporter";
import { requestAndStoreLocation } from "@/lib/requestLocation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { authStyles } from "@/features/auth/styles/auth.styles";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

export default function LoginScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError(t("auth.emailPasswordRequired"));
      return;
    }
    setLoading(true);
    track("login_attempted");
    try {
      await signIn(email.trim().toLowerCase(), password);
      track("login_completed");
      requestAndStoreLocation(); // triggers GPS permission prompt, non-blocking
      router.replace("/(tabs)");
    } catch (e) {
      if (__DEV__) console.warn("[login] signIn failed:", e);
      captureError(e, { surface: "login" });
      track("login_failed", { reason: e instanceof Error ? e.message.slice(0, 80) : "unknown" });
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
          {/* Close — kept as a "glass" tile for premium signal */}
          <Pressable onPress={() => router.back()} style={authStyles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>

          {/* Brand mark */}
          <Animated.View
            entering={FadeInDown.duration(420).delay(60).springify().damping(18)}
            style={authStyles.iconWrap}>
            <View style={authStyles.logoTile}>
              <AppLogo size="lg" />
            </View>
          </Animated.View>

          {/* Headline + subhead */}
          <Animated.View
            entering={FadeInDown.duration(420).delay(140)}
            style={authStyles.heroTextWrap}>
            <Text variant="screen-title" color="inverse" align="center" style={authStyles.heroTitle}>
              {t("auth.loginWelcome")}
            </Text>
            <Text
              variant="body"
              color="inverse-muted"
              align="center"
              style={{ marginTop: 6 }}>
              {t("auth.loginSubtitle")}
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* ── Form card ────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.duration(460).delay(180)}
          style={authStyles.formCard}>

          {error && (
            <Animated.View entering={FadeInDown.duration(200)} style={authStyles.errorBox}>
              <View style={authStyles.errorIcon}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error.base} />
              </View>
              <Text variant="body-sm" align="right" style={authStyles.errorText}>
                {error}
              </Text>
            </Animated.View>
          )}

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

          <Input
            label={t("auth.password")}
            placeholder="••••••••"
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

          {/* Forgot password — quiet alignment, brand color text */}
          <View style={styles.forgotRow}>
            <Pressable hitSlop={8} onPress={() => router.push("/(auth)/forgot-password")}>
              <Text variant="caption" color="brand" weight="bold">
                {t("auth.forgotPassword")}
              </Text>
            </Pressable>
          </View>

          {/* Primary CTA — gradient + new brand-glow shadow on the variant */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleLogin}
            gradient
            style={{ marginTop: 4 }}>
            {t("auth.login")}
          </Button>

          {/* Divider — refined hairline */}
          <View style={[authStyles.dividerRow, { marginTop: theme.spacing.sm }]}>
            <View style={authStyles.divider} />
            <Text variant="caption" color="tertiary" style={{ paddingHorizontal: 4 }}>
              {t("auth.or")}
            </Text>
            <View style={authStyles.divider} />
          </View>

          {/* Footer */}
          <View style={[authStyles.footer, { marginTop: theme.spacing.xs }]}>
            <Text variant="body-sm" color="secondary">
              {t("auth.noAccount")}
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={6}>
                <Text variant="body-sm" weight="extrabold" color="brand">
                  {t("auth.createAccount")}
                </Text>
              </Pressable>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  forgotRow: {
    flexDirection: flexRow(isRtl()),
    justifyContent: "flex-start",
    marginTop:      -2,
  },
});
