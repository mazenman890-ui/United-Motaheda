/**
 * QuickDestinations — 2×2 grid of loyalty sub-screen shortcuts.
 * Press animations run on the UI thread via Reanimated withSpring.
 */

import React, { useCallback } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";

import { SectionHeader } from "./SectionHeader";
import { sectionStyles, destStyles as ds } from "./hub.styles";
import { FORWARD_CHEVRON } from "@/utils/layout";
import type { IoniconsName } from "./HubHelpers";

interface QuickDestinationsProps {
  onWallet?:  () => void;
  onCoupons?: () => void;
  onGifts?:   () => void;
  onHistory?: () => void;
}

export const QuickDestinations = React.memo(function QuickDestinations({
  onWallet, onCoupons, onGifts, onHistory,
}: QuickDestinationsProps) {
  const { t } = useTranslation();

  return (
    <View style={sectionStyles.wrap}>
      <SectionHeader icon="apps-outline" title={t("loyalty.servicesTitle")} />
      <View style={ds.grid}>
        <DestCard
          icon="wallet-outline"
          label={t("loyalty.destWallet")}
          sub={t("loyalty.destWalletSub")}
          gradient={[theme.colors.brand[600], theme.colors.teal[500]]}
          onPress={onWallet}
        />
        <DestCard
          icon="pricetag-outline"
          label={t("loyalty.destCoupons")}
          sub={t("loyalty.destCouponsSub")}
          gradient={["#7C3AED", "#9333EA"]}
          onPress={onCoupons}
        />
        <DestCard
          icon="gift-outline"
          label={t("loyalty.destGifts")}
          sub={t("loyalty.destGiftsSub")}
          gradient={["#DB2777", "#EC4899"]}
          onPress={onGifts}
        />
        <DestCard
          icon="bar-chart-outline"
          label={t("loyalty.destHistory")}
          sub={t("loyalty.destHistorySub")}
          gradient={["#059669", "#10B981"]}
          onPress={onHistory}
        />
      </View>
    </View>
  );
});

interface DestCardProps {
  icon:     IoniconsName;
  label:    string;
  sub:      string;
  gradient: [string, string];
  onPress?: () => void;
}

const DestCard = React.memo(function DestCard({
  icon, label, sub, gradient, onPress,
}: DestCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn  = useCallback(() => { scale.value = withSpring(0.95, { damping: 14 }); }, [scale]);
  const onPressOut = useCallback(() => { scale.value = withSpring(1.00, { damping: 14 }); }, [scale]);
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress?.();
  }, [onPress]);

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={ds.card}>
        <LinearGradient colors={gradient} style={ds.iconGrad}>
          <Ionicons name={icon} size={22} color="#fff" />
        </LinearGradient>
        <View style={ds.textWrap}>
          <Text style={ds.label} numberOfLines={1}>{label}</Text>
          <Text style={ds.sub}   numberOfLines={1}>{sub}</Text>
        </View>
        <Ionicons name={FORWARD_CHEVRON} size={14} color={theme.colors.text.disabled} />
      </Pressable>
    </Animated.View>
  );
});
