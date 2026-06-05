/**
 * ProfileGuestHero — premium static hero for unauthenticated users.
 *
 * Auth actions are presented as a side-by-side pill toggle:
 *   [ تسجيل الدخول | إنشاء حساب ]
 * The active (primary) tab gets a white pill + shadow; the inactive tab is
 * transparent. This pattern reads as a cohesive unit rather than two separate
 * stacked buttons, matching premium iOS app conventions.
 */
import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { styles as sharedStyles, HERO_GLASS } from "./profile.styles";

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
      style={[sharedStyles.guestHero, { paddingTop: insetsTop + 28 }]}>
      <View style={sharedStyles.heroDecor1} />
      <View style={sharedStyles.heroDecor2} />

      {/* Avatar placeholder */}
      <View style={sharedStyles.guestAvatar}>
        <Ionicons name="person" size={34} color={HERO_GLASS.w45} />
      </View>

      <UIText variant="sheet-title" color="inverse" align="center" style={sharedStyles.guestTitleNew}>
        {t("profile.guestTitle")}
      </UIText>
      <UIText variant="body-sm" color="inverse-muted" align="center" style={sharedStyles.guestDescNew}>
        {t("profile.guestDesc")}
      </UIText>

      {/* ── Pill-tab auth row ──────────────────────────────────────────────── */}
      <View style={s.pillContainer}>
        {/* Login — primary active tab: white pill with shadow */}
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [s.pillTab, s.pillTabActive, pressed && { opacity: 0.92 }]}>
          <UIText variant="body-sm" weight="black" style={s.activeTabText}>
            {t("auth.login")}
          </UIText>
        </Pressable>

        {/* Register — secondary inactive tab: transparent */}
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={({ pressed }) => [s.pillTab, pressed && { opacity: 0.80 }]}>
          <UIText variant="body-sm" weight="bold" color="inverse">
            {t("auth.createAccount")}
          </UIText>
        </Pressable>
      </View>
    </LinearGradient>
  );
});

const s = StyleSheet.create({
  // Outer pill container — glass surface, both tabs side by side
  pillContainer: {
    flexDirection:   "row",
    width:           "100%",
    marginTop:       theme.spacing.lg,       // 16
    backgroundColor: HERO_GLASS.w10,
    borderRadius:    theme.radius.full,      // 9999 — pill
    padding:         4,
    borderWidth:     1,
    borderColor:     HERO_GLASS.w15,
  },
  // Base tab — fills 50% of the pill, vertically centered
  pillTab: {
    flex:           1,
    borderRadius:   theme.radius.full,
    paddingVertical: 13,
    alignItems:     "center",
    justifyContent: "center",
  },
  // Active (Login) tab — white fill + soft shadow to lift it
  pillTabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor:     theme.colors.hero,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.18,
    shadowRadius:    8,
    elevation:       4,
  },
  activeTabText: {
    color: theme.colors.heroMid,
  },
});
