import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { ctaStyles } from "./checkout.styles";

interface EmptyCartScreenProps {
  onBrowse: () => void;
  insets:   { top: number };
}

export const EmptyCartScreen = React.memo(function EmptyCartScreen({
  onBrowse,
  insets,
}: EmptyCartScreenProps) {
  const { t } = useTranslation();

  return (
    <View style={[s.screen, { paddingTop: insets.top + 80 }]}>
      <Animated.View
        entering={FadeInDown.duration(420).springify().damping(18)}
        style={s.iconBox}>
        <Ionicons name="cart-outline" size={36} color={theme.colors.brand[600]} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(380).delay(80)} style={s.textStack}>
        <UIText variant="sheet-title" align="center">
          {t("checkout.emptyCartTitle")}
        </UIText>
        <UIText variant="body" color="secondary" align="center" style={{ lineHeight: 22 }}>
          {t("checkout.emptyCartDesc")}
        </UIText>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.duration(380).delay(180)}
        style={s.btnWrap}>
        <Button variant="primary" size="lg" fullWidth gradient onPress={onBrowse}>
          <View style={ctaStyles.btnInner}>
            <UIText style={ctaStyles.btnText}>{t("checkout.browseBtn")}</UIText>
            <Ionicons name="arrow-back" size={16} color="#fff" />
          </View>
        </Button>
      </Animated.View>
    </View>
  );
});

const s = StyleSheet.create({
  screen: {
    flex:              1,
    backgroundColor:   theme.colors.bg,
    alignItems:        "center",
    paddingHorizontal: 32,
  },
  iconBox: {
    width:           96,
    height:          96,
    borderRadius:    28,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    20,
    ...theme.shadow.brandGlow,
    shadowOpacity:   0.12,
  },
  textStack: {
    alignItems: "center",
    gap:        8,
    maxWidth:   320,
  },
  btnWrap: {
    marginTop:         32,
    alignSelf:         "stretch",
    paddingHorizontal: 32,
  },
});
