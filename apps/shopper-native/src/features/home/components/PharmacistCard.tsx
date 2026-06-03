import React, { memo } from "react";
import { Linking, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { supportStyles as s } from "./home.styles";

const WHATSAPP_URL =
  "https://wa.me/201112343212?text=مرحباً،%20أود%20الاستفسار";

export const PharmacistCard = memo(function PharmacistCard() {
  const { t } = useTranslation();

  return (
    <View style={s.wrap}>
      <LinearGradient
        colors={[theme.colors.hero, "#032840", "#053C5A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.card}>
        {/* Decorative elements */}
        <View style={s.glow} />
        <View style={s.ring} />

        {/* Content row */}
        <View style={s.row}>
          <LinearGradient
            colors={[theme.colors.teal[500], theme.colors.brand[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.iconTile}>
            <Ionicons name="medkit-outline" size={22} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <UIText variant="eyebrow" align="right" style={{ color: "#5EEAD4", letterSpacing: 0.5 }}>
              {t("home.pharmacistCard")}
            </UIText>
            <UIText variant="section-head" align="right" style={s.title}>
              {t("home.needAdvice")}
            </UIText>
            <UIText variant="body-sm" align="right" style={s.sub}>
              {t("home.pharmacistReply")}
            </UIText>
          </View>
        </View>

        {/* WhatsApp CTA */}
        <Pressable
          onPress={() => Linking.openURL(WHATSAPP_URL).catch(() => {})}
          style={({ pressed }) => [s.cta, { opacity: pressed ? 0.92 : 1 }]}>
          <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          <UIText variant="body-sm" weight="extrabold" style={s.ctaText}>
            {t("home.chatWhatsapp")}
          </UIText>
          <View style={s.ctaArrow}>
            <Ionicons name="chevron-back" size={12} color={theme.colors.slate[500]} />
          </View>
        </Pressable>
      </LinearGradient>
    </View>
  );
});
