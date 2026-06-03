/**
 * WalletQuickActions — 2-row quick-action grid for the loyalty wallet.
 *
 * Press animation migration (C-1 extension):
 *   BEFORE: RNAnimated.Value + RNAnimated.spring (JS-thread path)
 *   AFTER:  Reanimated useSharedValue + withSpring (UI thread)
 */

import React, { memo, useCallback } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { quickStyles as s } from "./wallet.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface WalletQuickActionsProps {
  onEarn?:        () => void;
  onCoupons?:     () => void;
  onGifts?:       () => void;
  onHistory?:     () => void;
  onRedemptions?: () => void;
}

export const WalletQuickActions = memo(function WalletQuickActions({
  onEarn,
  onCoupons,
  onGifts,
  onHistory,
  onRedemptions,
}: WalletQuickActionsProps) {
  const { t } = useTranslation();
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <QuickActionTile icon="bag-handle-outline" label={t("loyalty.quickEarnPoints")}   onPress={onEarn}    color="#3B82F6" />
        <QuickActionTile icon="pricetag-outline"   label={t("loyalty.quickCoupons")}       onPress={onCoupons} color="#8B5CF6" />
        <QuickActionTile icon="gift-outline"       label={t("loyalty.quickGifts")}         onPress={onGifts}   color="#EC4899" />
      </View>
      <View style={s.row}>
        <QuickActionTile icon="receipt-outline"    label={t("loyalty.quickPointsHistory")} onPress={onHistory}      color="#10B981" />
        <QuickActionTile icon="cube-outline"       label={t("loyalty.quickGiftOrders")}    onPress={onRedemptions}  color={theme.colors.amber[500]} />
        <QuickActionTile icon="storefront-outline" label={t("loyalty.quickShopNow")}       onPress={onEarn}         color={theme.colors.brand[500]} />
      </View>
    </View>
  );
});

// ─── QuickActionTile — Reanimated press scale ─────────────────────────────────

interface QuickActionTileProps {
  icon:     IoniconsName;
  label:    string;
  onPress?: () => void;
  color:    string;
}

const QuickActionTile = memo(function QuickActionTile({
  icon,
  label,
  onPress,
  color,
}: QuickActionTileProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn  = useCallback(() => { scale.value = withSpring(0.93, { damping: 14 }); }, [scale]);
  const onPressOut = useCallback(() => { scale.value = withSpring(1,    { damping: 14 }); }, [scale]);

  return (
    <Animated.View style={[s.tileOuter, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !onPress }}
        style={[s.tile, !onPress && s.tileDisabled]}>
        <View style={[s.iconWrap, { backgroundColor: color + "18" }]}>
          <Ionicons
            name={icon}
            size={22}
            color={onPress ? color : theme.colors.text.disabled}
          />
        </View>
        <Text
          style={[s.label, !onPress && { color: theme.colors.text.disabled }]}
          numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
});
