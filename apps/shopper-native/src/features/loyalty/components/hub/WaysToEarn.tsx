/**
 * WaysToEarn — static earn-method info cards.
 * Press animations run on the UI thread via Reanimated withSpring.
 */

import React, { useCallback, useMemo } from "react";
import { Platform, Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";

import { SectionHeader } from "./SectionHeader";
import { sectionStyles, earnStyles as es } from "./hub.styles";
import type { IoniconsName } from "./HubHelpers";

interface WaysToEarnProps {
  onInvite?:    () => void;
  onShop?:      () => void;
  onCampaigns?: () => void;
}

export const WaysToEarn = React.memo(function WaysToEarn({
  onInvite, onShop, onCampaigns,
}: WaysToEarnProps) {
  const { t } = useTranslation();

  // useMemo prevents recreating the tips array on every render
  const tips = useMemo(() => [
    {
      icon:    "bag-handle-outline" as IoniconsName,
      color:   theme.colors.brand[600],
      title:   t("loyalty.earnShopTitle"),
      body:    t("loyalty.earnShopBody"),
      onPress: onShop,
      cta:     t("loyalty.earnShopCta"),
    },
    {
      icon:    "people-outline" as IoniconsName,
      color:   "#8B5CF6",
      title:   t("loyalty.earnInviteTitle"),
      body:    t("loyalty.earnInviteBody"),
      onPress: onInvite,
      cta:     t("loyalty.earnInviteCta"),
    },
    {
      icon:    "flame-outline" as IoniconsName,
      color:   theme.colors.amber[500],
      title:   t("loyalty.earnCampaignsTitle"),
      body:    t("loyalty.earnCampaignsBody"),
      onPress: onCampaigns,
      cta:     t("loyalty.earnCampaignsCta"),
    },
  ], [t, onShop, onInvite, onCampaigns]);

  return (
    <View style={sectionStyles.wrap}>
      <SectionHeader icon="bulb-outline" title={t("loyalty.waysToEarn")} />
      <View style={es.list}>
        {tips.map((tip, i) => (
          <EarnCard key={i} {...tip} />
        ))}
      </View>
    </View>
  );
});

interface EarnCardProps {
  icon:     IoniconsName;
  color:    string;
  title:    string;
  body:     string;
  cta:      string;
  onPress?: () => void;
}

const EarnCard = React.memo(function EarnCard({
  icon, color, title, body, cta, onPress,
}: EarnCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn  = useCallback(() => { scale.value = withSpring(0.97, { damping: 14 }); }, [scale]);
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
        accessibilityLabel={title}
        style={[es.card, onPress && es.cardTappable]}>
        <View style={[es.iconBox, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={es.textWrap}>
          <Text style={es.title}>{title}</Text>
          <Text style={es.body}>{body}</Text>
        </View>
        {onPress && (
          <View style={[es.ctaChip, { backgroundColor: color + "14", borderColor: color + "30" }]}>
            <Text style={[es.ctaText, { color }]}>{cta}</Text>
            <Ionicons name="chevron-back" size={11} color={color} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
});
