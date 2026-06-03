import React, { memo } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { styles, HERO_GLASS } from "./profile.styles";

interface ProfileGuestHeroProps {
  insetsTop: number;
}

export const ProfileGuestHero = memo(function ProfileGuestHero({
  insetsTop,
}: ProfileGuestHeroProps) {
  const router = useRouter();
  const { t }  = useTranslation();

  return (
    <LinearGradient
      colors={theme.gradients.heroPrimary as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[styles.guestHero, { paddingTop: insetsTop + 28 }]}>
      <View style={styles.heroDecor1} />
      <View style={styles.heroDecor2} />

      <View style={styles.guestAvatar}>
        <Ionicons name="person" size={34} color={HERO_GLASS.w45} />
      </View>
      <UIText variant="sheet-title" color="inverse" align="center" style={styles.guestTitleNew}>
        {t("profile.guestTitle")}
      </UIText>
      <UIText variant="body-sm" color="inverse-muted" align="center" style={styles.guestDescNew}>
        {t("profile.guestDesc")}
      </UIText>
      <View style={styles.guestActions}>
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [
            styles.guestPrimaryBtn,
            pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
          ]}>
          <UIText variant="body-sm" weight="black" style={{ color: theme.colors.heroMid }}>
            {t("auth.login")}
          </UIText>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={({ pressed }) => [
            styles.guestSecondaryBtn,
            pressed && { opacity: 0.85 },
          ]}>
          <UIText variant="body-sm" weight="extrabold" color="inverse">
            {t("auth.createAccount")}
          </UIText>
        </Pressable>
      </View>
    </LinearGradient>
  );
});
