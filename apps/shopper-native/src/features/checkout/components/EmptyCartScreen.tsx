import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { kit, Button } from "@/shared/kit";

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
        <Ionicons name="cart-outline" size={36} color={kit.color.accent} />
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
        <Button
          label={t("checkout.browseBtn")}
          icon="storefront-outline"
          size="lg"
          full
          onPress={onBrowse}
        />
      </Animated.View>
    </View>
  );
});

const s = StyleSheet.create({
  screen: {
    flex:              1,
    backgroundColor:   kit.color.canvas,
    alignItems:        "center",
    paddingHorizontal: 32,
  },
  iconBox: {
    width:           96,
    height:          96,
    borderRadius:    28,
    backgroundColor: kit.color.accentTint,
    borderWidth:     1,
    borderColor:     kit.color.line,
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
