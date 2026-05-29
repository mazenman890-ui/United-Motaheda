import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { PaymentMethodCard } from "./PaymentMethodCard";
import { usePaymentStore } from "../store";
import { theme } from "@/theme";

interface Props {
  compact?: boolean;
}

export function PaymentMethodSelector({ compact }: Props) {
  const { t } = useTranslation();
  const methods = usePaymentStore((s) => s.methods);
  const selected = usePaymentStore((s) => s.selected);
  const setSelected = usePaymentStore((s) => s.setSelected);

  return (
    <View style={styles.container}>
      {!compact && (
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.brand[600]} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{t("payment.paymentMethod")}</Text>
            <Text style={styles.headerDesc}>{t("payment.selectMethod")}</Text>
          </View>
        </View>
      )}

      <View style={styles.list}>
        {methods.filter((m) => m.is_active).map((method, index) => (
          <Animated.View key={method.id} entering={FadeInDown.delay(index * 70).duration(250)}>
            <PaymentMethodCard
              method={method}
              selected={selected === method.type}
              onSelect={() => setSelected(method.type)}
            />
          </Animated.View>
        ))}
      </View>

      {/* Trust footer */}
      {!compact && (
        <Animated.View entering={FadeInDown.delay(250).duration(250)} style={styles.trustRow}>
          <Ionicons name="lock-closed" size={12} color={theme.colors.slate[400]} />
          <Text style={styles.trustText}>{t("payment.allTransactionsSecure")}</Text>
          <Ionicons name="shield-checkmark" size={12} color={theme.colors.green[500]} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
    textAlign: "right",
  },
  headerDesc: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[400],
    textAlign: "right",
  },
  list: { gap: 10 },
  trustRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.slate[50],
  },
  trustText: {
    fontSize: 10,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[400],
  },
});
