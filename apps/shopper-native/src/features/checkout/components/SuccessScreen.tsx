import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { kit, Button } from "@/shared/kit";
import { formatPrice } from "@/utils/format";
import { flexRow, isRtl } from "@/utils/layout";

interface SuccessScreenProps {
  orderId:      string;
  total:        number;
  insets:       { top: number; bottom: number };
  onContinue:   () => void;
  onViewOrders: () => void;
}

export const SuccessScreen = React.memo(function SuccessScreen({
  orderId,
  total,
  insets,
  onContinue,
  onViewOrders,
}: SuccessScreenProps) {
  const { t } = useTranslation();

  return (
    <View style={[s.screen, { paddingTop: insets.top + 40 }]}>
      <Animated.View
        entering={FadeInDown.duration(460).springify().damping(18)}
        style={s.iconWrap}>
        <View style={s.icon}>
          <Ionicons name="checkmark" size={34} color={kit.color.accentDeep} />
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(420)}
        style={s.headingStack}>
        <UIText variant="screen-title" align="center" style={{ letterSpacing: -0.5 }}>
          {t("checkout.orderReceived")}
        </UIText>
        <UIText variant="body" color="secondary" align="center" style={{ lineHeight: 22 }}>
          {t("checkout.orderReceivedDesc")}
        </UIText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(420)} style={s.totalStack}>
        <UIText variant="eyebrow" color="tertiary" align="center">
          {t("checkout.orderTotalLabel")}
        </UIText>
        <UIText variant="metric" align="center" style={{ color: kit.color.ink, letterSpacing: -0.8 }}>
          {formatPrice(total)}
        </UIText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).duration(420)} style={s.card}>
        <View style={s.cardRow}>
          <UIText variant="body-sm" color="secondary">{t("checkout.orderNumberLabel")}</UIText>
          <UIText variant="body-sm" weight="extrabold">
            {orderId ? orderId.slice(-8).toUpperCase() : "—"}
          </UIText>
        </View>
        <View style={s.divider} />
        <View style={s.cardRow}>
          <UIText variant="body-sm" color="secondary">{t("checkout.estimatedDelivery")}</UIText>
          <View style={s.etaPill}>
            <Ionicons name="time-outline" size={12} color={kit.color.accentDeep} />
            <UIText variant="eyebrow" style={{ color: kit.color.accentDeep }}>
              30–60 {t("delivery.minUnit")}
            </UIText>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.cardRow}>
          <UIText variant="body-sm" color="secondary">{t("checkout.orderStatusLabel")}</UIText>
          <View style={s.statusPill}>
            <View style={s.statusDot} />
            <UIText variant="eyebrow" style={{ color: kit.color.success }}>
              {t("checkout.preparingStatus")}
            </UIText>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(340).duration(360)} style={s.trustRow}>
        <Ionicons name="shield-checkmark" size={12} color={kit.color.inkFaint} />
        <UIText variant="eyebrow" color="tertiary">
          {t("checkout.trustSeal")}
        </UIText>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(380).duration(420)}
        style={[s.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={t("checkout.trackOrderBtn")}
          icon="receipt-outline"
          iconEnd
          size="lg"
          full
          onPress={onViewOrders}
        />
        <Button
          label={t("checkout.continueShoppingBtn")}
          variant="ghost"
          size="md"
          full
          onPress={onContinue}
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
    paddingHorizontal: 24,
  },
  iconWrap:     { marginBottom: 24 },
  icon: {
    width:           80,
    height:          80,
    borderRadius:    26,
    backgroundColor: kit.color.accentTint,
    borderWidth:     1,
    borderColor:     kit.color.line,
    alignItems:      "center",
    justifyContent:  "center",
    ...theme.shadow.brandGlow,
  },
  headingStack: { alignItems: "center", gap: 8, maxWidth: 340 },
  totalStack:   { alignItems: "center", marginTop: 28, gap: 4 },
  card: {
    backgroundColor: kit.color.surface,
    borderRadius:    18,
    padding:         18,
    marginTop:       28,
    alignSelf:       "stretch",
    ...theme.shadow.card,
  },
  cardRow: {
    flexDirection:  flexRow(isRtl()),
    justifyContent: "space-between",
    alignItems:     "center",
  },
  divider: {
    height:          StyleSheet.hairlineWidth,
    backgroundColor: kit.color.line,
    marginVertical:  12,
  },
  etaPill: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   kit.color.accentTint,
    borderWidth:       1,
    borderColor:       kit.color.line,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
  },
  statusPill: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   kit.color.successTint,
    borderWidth:       1,
    borderColor:       kit.color.line,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
  },
  statusDot: {
    width:           6,
    height:          6,
    borderRadius:    3,
    backgroundColor: kit.color.success,
  },
  trustRow: {
    flexDirection: flexRow(isRtl()),
    alignItems:    "center",
    gap:           6,
    marginTop:     16,
  },
  actions: {
    marginTop:         "auto",
    alignSelf:         "stretch",
    paddingHorizontal: 24,
    gap:               10,
  },
});
