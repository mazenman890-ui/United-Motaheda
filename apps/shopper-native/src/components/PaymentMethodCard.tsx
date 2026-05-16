import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { theme } from "@/theme";
import type { PaymentMethod } from "@/types/payment";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface Props {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
}

const TYPE_COLORS: Record<string, { accent: string; bg: string; ring: string }> = {
  cod:           { accent: theme.colors.green[600],  bg: theme.colors.green[50],  ring: theme.colors.green[200] },
  instapay:      { accent: theme.colors.purple[600], bg: theme.colors.purple[50], ring: theme.colors.purple[200] },
  vodafone_cash: { accent: theme.colors.red[500],    bg: theme.colors.red[50],    ring: theme.colors.red[200] },
};

export function PaymentMethodCard({ method, selected, onSelect }: Props) {
  const colors = TYPE_COLORS[method.type] ?? TYPE_COLORS.cod;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    scale.value = withSpring(0.97, { damping: 18, stiffness: 400 });
    setTimeout(() => { scale.value = withSpring(1, { damping: 14, stiffness: 300 }); }, 100);
    onSelect();
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.card,
          selected && { borderColor: colors.ring, borderWidth: 2, backgroundColor: colors.bg + "30" },
        ]}>
        {/* Radio indicator */}
        <View style={[styles.radio, selected && { borderColor: colors.accent }]}>
          {selected && (
            <Animated.View entering={FadeIn.duration(150)} style={[styles.radioDot, { backgroundColor: colors.accent }]} />
          )}
        </View>

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
          <Ionicons name={method.icon as IoniconsName} size={20} color={colors.accent} />
        </View>

        {/* Text */}
        <View style={styles.textWrap}>
          <Text style={[styles.label, selected && { color: theme.colors.text.primary, fontFamily: theme.fonts.black }]}>
            {method.label}
          </Text>
          <Text style={styles.desc}>{method.description}</Text>
        </View>

        {/* Security badge */}
        {selected && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.secureBadge}>
            <Ionicons name="shield-checkmark" size={10} color={theme.colors.green[600]} />
            <Text style={styles.secureText}>آمن</Text>
          </Animated.View>
        )}
      </Pressable>

      {/* Expanded details when selected */}
      {selected && method.details && (
        <Animated.View entering={FadeIn.duration(250)} style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.slate[400]} />
            <Text style={styles.detailText}>{method.details}</Text>
          </View>
          {method.phone && (
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={14} color={colors.accent} />
              <Text style={[styles.detailText, { color: colors.accent, fontFamily: theme.fonts.bold }]}>
                {method.phone}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: theme.colors.border.default,
    ...theme.shadow.xs,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.slate[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[700],
    textAlign: "right",
  },
  desc: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[400],
    textAlign: "right",
  },
  secureBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.green[50],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  secureText: {
    fontSize: 9,
    fontFamily: theme.fonts.bold,
    color: theme.colors.green[700],
  },
  detailsCard: {
    marginTop: 6,
    marginRight: 32,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.slate[50],
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  detailRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: theme.colors.slate[500],
    textAlign: "right",
  },
});
