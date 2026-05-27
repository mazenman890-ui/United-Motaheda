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
import { signIn, authErrorToArabic } from "@/features/auth";
import { AppLogo } from "@/shared/components/AppLogo";
import { track } from "@/lib/analytics";
import { captureError } from "@/lib/crashReporter";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Text } from "@/shared/ui";
import { theme } from "@/theme";

export default function LoginScreen() {
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
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    track("login_attempted");
    try {
      await signIn(email.trim().toLowerCase(), password);
      track("login_completed");
      router.replace("/(tabs)");
    } catch (e) {
      if (__DEV__) console.warn("[login] signIn failed:", e);
      captureError(e, { surface: "login" });
      track("login_failed", { reason: e instanceof Error ? e.message.slice(0, 80) : "unknown" });
      setError(authErrorToArabic(e));
    } finally {
      setLoading(false);
    }
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
          {/* Close — kept as a "glass" tile for premium signal */}
          <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.85)" />
          </Pressable>

          {/* Brand mark */}
          <Animated.View
            entering={FadeInDown.duration(420).delay(60).springify().damping(18)}
            style={styles.logoWrap}>
            <View style={styles.logoTile}>
              <AppLogo size="lg" />
            </View>
          </Animated.View>

          {/* Headline + subhead */}
          <Animated.View
            entering={FadeInDown.duration(420).delay(140)}
            style={styles.heroTextWrap}>
            <Text variant="screen-title" color="inverse" align="center" style={styles.heroTitle}>
              مرحباً بعودتك
            </Text>
            <Text
              variant="body"
              color="inverse-muted"
              align="center"
              style={{ marginTop: 6 }}>
              سجّل دخولك للمتابعة
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
            label="البريد الإلكتروني"
            placeholder="example@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Ionicons name="mail-outline" size={18} color={theme.colors.text.tertiary} />}
          />

          <Input
            label="كلمة المرور"
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
                نسيت كلمة المرور؟
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
            تسجيل الدخول
          </Button>

          {/* Divider — refined hairline */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text variant="caption" color="tertiary" style={{ paddingHorizontal: 4 }}>
              أو
            </Text>
            <View style={styles.divider} />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="body-sm" color="secondary">
              ليس لديك حساب؟
            </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable hitSlop={6}>
                <Text variant="body-sm" weight="extrabold" color="brand">
                  إنشاء حساب جديد
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
    // Softer shadow than xl — clinical lift, not a billboard
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
  forgotRow: {
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    marginTop:      -2,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           12,
    marginTop:     8,
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
    marginTop:     4,
  },
});
