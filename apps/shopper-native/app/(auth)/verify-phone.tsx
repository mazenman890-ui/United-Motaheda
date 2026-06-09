/**
 * /(auth)/verify-phone — full-screen phone-OTP step after email confirmation.
 *
 * When email-confirmation is enabled in Supabase, signUp doesn't return a
 * session, so we can't send the phone OTP at that moment (updateUser needs
 * a session). After the user taps the email link, /auth-callback exchanges
 * the code, and if the new user's metadata contains a `phone` that isn't yet
 * `phone_confirmed_at`, it routes them here. This screen:
 *
 *   1. Sends the OTP to that phone via `sendPhoneOtp`.
 *   2. Mounts PhoneVerifyModal in its already-open state.
 *   3. On verified → /(tabs). On cancel → /(tabs) too (the user can verify
 *      later from checkout or profile).
 *
 * Visual recipe: clinical "in-flight" surface — icon tile + heading +
 * subdued copy + spinner. No noise, no excessive motion. Reads as a
 * carefully-handled secure step, not a placeholder.
 */

import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { PhoneVerifyModal, sendPhoneOtp } from "@/features/auth";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { authStyles } from "@/features/auth/styles/auth.styles";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

export default function VerifyPhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const phoneStr = typeof phone === "string" ? phone : "";

  const [stage, setStage] = useState<"sending" | "modal" | "error">("sending");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!phoneStr) {
      router.replace("/(tabs)");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await sendPhoneOtp(phoneStr);
        if (!cancelled) setStage("modal");
      } catch (e) {
        if (__DEV__) console.warn("[verify-phone] sendPhoneOtp failed:", e);
        if (cancelled) return;
        setErrorMsg(t("verifyPhone.errorDefault"));
        setStage("error");
        setTimeout(() => router.replace("/(tabs)"), 2200);
      }
    })();
    return () => { cancelled = true; };
  }, [phoneStr, router]);

  if (stage === "sending" || stage === "error") {
    const isError = stage === "error";
    return (
      <View style={authStyles.screen}>
        <Animated.View
          entering={FadeIn.duration(360)}
          style={styles.centerStack}>
          <Animated.View
            entering={FadeInUp.duration(420).delay(80).springify().damping(18)}
            style={[
              styles.iconTile,
              isError && { backgroundColor: theme.colors.error.bg, borderColor: theme.colors.error.light },
            ]}>
            <Ionicons
              name={isError ? "alert-circle-outline" : "chatbubble-ellipses-outline"}
              size={30}
              color={isError ? theme.colors.error.base : theme.colors.brand.base}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(420).delay(160)}
            style={styles.textStack}>
            <Text variant="sheet-title" align="center" style={styles.title}>
              {isError ? t("verifyPhone.errorTitle") : t("verifyPhone.sendingTitle")}
            </Text>
            <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
              {isError ? errorMsg : t("verifyPhone.sendingSubtitle")}
            </Text>
          </Animated.View>

          {!isError && (
            <Animated.View entering={FadeIn.duration(300).delay(280)} style={{ marginTop: 28 }}>
              <ActivityIndicator size="large" color={theme.colors.brand.base} />
            </Animated.View>
          )}

          {/* Trust footnote — quiet, but reinforces "secure" framing */}
          <View style={styles.trustFootnote}>
            <Ionicons name="shield-checkmark" size={12} color={theme.colors.text.tertiary} />
            <Text variant="eyebrow" color="tertiary">
              {t("verifyPhone.trustNote")}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={authStyles.screen}>
      <PhoneVerifyModal
        visible
        initialPhone={phoneStr}
        onVerified={() => router.replace("/(tabs)")}
        onCancel={() => router.replace("/(tabs)")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerStack: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: theme.spacing['3xl'],  // 32
  },
  iconTile: {
    width:           76,
    height:          76,
    borderRadius:    theme.radius["2xl"],
    backgroundColor: theme.colors.brand.lighter,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    24,
    borderWidth:     1,
    borderColor:     theme.colors.brand.light,
    ...theme.shadow.brandGlow,
  },
  textStack: {
    alignItems: "center",
    gap:        8,
    maxWidth:   340,
  },
  title: {
    letterSpacing: -0.4,
  },
  subtitle: {
    lineHeight: 22,
  },
  trustFootnote: {
    position:      "absolute",
    bottom:        56,
    left:          0,
    right:         0,
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    justifyContent:"center",
    gap:           6,
  },
});
