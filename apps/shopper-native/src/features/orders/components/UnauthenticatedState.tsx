import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { AppHeader } from "@/shared/components";
import { theme } from "@/shared/theme";
import { authS, HERO_GRAD } from "./orders.styles";

export function UnauthenticatedState({ showBack }: { showBack: boolean }): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const pulseScale = useSharedValue(1);
  const pulseOp    = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 1600 }), withTiming(1.0, { duration: 1200 })),
      -1, false,
    );
    pulseOp.value = withRepeat(
      withSequence(withTiming(0, { duration: 1600 }), withTiming(0.4, { duration: 1200 })),
      -1, false,
    );
  }, [pulseScale, pulseOp]);

  const pulseAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity:   pulseOp.value,
  }));

  const handleSignIn = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push("/(auth)/login");
  };
  const handleCreate = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.push("/(auth)/register");
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AppHeader title={t("orders.title")} showBack={showBack} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        bounces>

        <LinearGradient
          colors={HERO_GRAD}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[authS.hero, { paddingBottom: 48 }]}>

          <Animated.View style={[authS.pulseRing, pulseAnim]} />
          <View style={authS.staticRing} />
          <View style={authS.glowOrb} />

          <Animated.View entering={FadeInUp.duration(500).delay(80)}>
            <LinearGradient
              colors={[theme.colors.teal[500], theme.colors.brand[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={authS.iconTile}>
              <View style={authS.iconInner}>
                <Ionicons name="bag-outline" size={40} color={theme.colors.surface} />
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(480).delay(160)} style={authS.heroText}>
            <UIText style={authS.heroTitle}>{t("orders.authTitle")}</UIText>
            <UIText style={authS.heroSub}>{t("orders.authSub")}</UIText>
          </Animated.View>
        </LinearGradient>

        <Animated.View entering={FadeInDown.duration(420).delay(200)} style={authS.card}>
          <Pressable onPress={handleSignIn} style={authS.signInBtn}>
            <LinearGradient
              colors={[theme.colors.teal[500], theme.colors.brand[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={authS.signInGrad}>
              <Ionicons name="log-in-outline" size={18} color={theme.colors.surface} />
              <UIText style={authS.signInText}>{t("auth.signIn")}</UIText>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleCreate} style={authS.createBtn}>
            <UIText style={authS.createText}>{t("auth.createAccount")}</UIText>
          </Pressable>

          <View style={authS.divider}>
            <View style={authS.dividerLine} />
            <UIText style={authS.dividerText}>{t("auth.or")}</UIText>
            <View style={authS.dividerLine} />
          </View>

          {(
            [
              { icon: "location-outline"      as const, labelKey: "orders.featureTrack"   },
              { icon: "notifications-outline" as const, labelKey: "orders.featureAlerts"  },
              { icon: "reload-outline"        as const, labelKey: "orders.featureReorder" },
            ] as const
          ).map((feat) => (
            <View key={feat.labelKey} style={authS.feature}>
              <View style={authS.featureIcon}>
                <Ionicons name={feat.icon} size={15} color={theme.colors.brand[600]} />
              </View>
              <UIText style={authS.featureLabel}>{t(feat.labelKey)}</UIText>
            </View>
          ))}

          <View style={authS.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={theme.colors.slate[400]} />
            <UIText style={authS.privacyText}>{t("orders.privacyNote")}</UIText>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
