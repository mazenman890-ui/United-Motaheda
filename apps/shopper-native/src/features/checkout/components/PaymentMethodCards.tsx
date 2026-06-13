import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text as UIText } from "@/shared/ui";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { theme } from "@/shared/theme";
import { kit } from "@/shared/kit";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";
import { PAYMENT_METHOD_CONFIGS } from "../constants";
import type { CheckoutPaymentMethod } from "../constants";

interface PaymentMethodCardsProps {
  selected:  CheckoutPaymentMethod;
  subtotal:  number;
  onChange:  (m: CheckoutPaymentMethod) => void;
}

export const PaymentMethodCards = React.memo(function PaymentMethodCards({
  selected,
  subtotal,
  onChange,
}: PaymentMethodCardsProps) {
  const { t } = useTranslation();
  const recommended: CheckoutPaymentMethod = subtotal >= 500 ? "instapay" : "cod";

  const methods = PAYMENT_METHOD_CONFIGS.map((cfg) => ({
    ...cfg,
    title:       t(cfg.titleKey),
    description: t(cfg.descKey),
  }));

  return (
    <View style={s.wrapper}>
      {methods.map((m, idx) => {
        const active = selected === m.id;
        const isRec  = m.id === recommended && !active;

        return (
          <Animated.View
            key={m.id}
            entering={FadeInDown.delay(idx * 70).duration(320).springify().damping(22)}>
            <Pressable
              onPress={() => onChange(m.id)}
              style={[
                s.card,
                active && {
                  borderColor:     m.color,
                  borderWidth:     2,
                  backgroundColor: m.bg + "28",
                },
              ]}>
              {isRec && (
                <View
                  style={[
                    s.badge,
                    { backgroundColor: m.color + "18", borderColor: m.color + "40" },
                  ]}>
                  <Ionicons name="star" size={8} color={m.color} />
                  <UIText style={[s.badgeText, { color: m.color }]}>
                    {t("checkout.methodRecommended")}
                  </UIText>
                </View>
              )}

              <View style={s.row}>
                <View style={[s.check, active && { backgroundColor: m.color, borderColor: m.color }]}>
                  {active && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <View style={s.meta}>
                  <View style={s.textBlock}>
                    <UIText style={[s.title, active && { color: m.color }]}>{m.title}</UIText>
                    <UIText style={s.sub}>{m.description}</UIText>
                  </View>
                  <View style={[s.iconBox, { backgroundColor: m.bg }]}>
                    <Ionicons name={m.icon} size={22} color={m.color} />
                  </View>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
});

const s = StyleSheet.create({
  wrapper:   { gap: 10 },
  card: {
    borderRadius:    16,
    borderWidth:     1.5,
    borderColor:     kit.color.line,
    backgroundColor: "#fff",
    overflow:        "hidden",
  },
  badge: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               4,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderBottomWidth: 1,
  },
  badgeText: { fontSize: 9, fontFamily: theme.fonts.black, letterSpacing: 0.4, textAlign: textAlignStart(isRtl()) },
  row: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               12,
    paddingHorizontal: 14,
    paddingVertical:   14,
  },
  meta: {
    flex:          1,
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           12,
  },
  iconBox: {
    width:          44,
    height:         44,
    borderRadius:   13,
    alignItems:     "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontFamily: theme.fonts.bold,    color: kit.color.ink,     textAlign: textAlignStart(isRtl()) },
  sub:   { fontSize: 11, fontFamily: theme.fonts.regular, color: kit.color.inkFaint, textAlign: textAlignStart(isRtl()) },
  check: {
    width:           22,
    height:          22,
    borderRadius:    11,
    borderWidth:     2,
    borderColor:     kit.color.lineStrong,
    alignItems:      "center",
    justifyContent:  "center",
  },
});
