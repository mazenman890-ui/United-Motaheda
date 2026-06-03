import React from "react";
import { ScrollView, View } from "react-native";
import { useTranslation } from "react-i18next";

import type { LoyaltyBalance, RewardTier } from "../../types";
import { getTierColor, getTierIcon } from "./HubHelpers";
import { TierNode } from "./LoyaltyPointsCard";
import { SectionHeader } from "./SectionHeader";
import { sectionStyles, tierStyles as ts } from "./hub.styles";

interface TierProgressProps {
  tiers:       RewardTier[];
  balance:     LoyaltyBalance;
  currentTier: RewardTier | null;
  nextTier:    RewardTier | null;
  onGoToTiers?: () => void;
}

export const TierProgress = React.memo(function TierProgress({
  tiers, balance, currentTier, nextTier, onGoToTiers,
}: TierProgressProps) {
  const { t } = useTranslation();
  if (!tiers.length) return null;

  return (
    <View style={sectionStyles.wrap}>
      <SectionHeader
        icon="trophy-outline"
        title={t("loyalty.tierJourney")}
        ctaLabel={t("loyalty.tierDetails")}
        onCta={onGoToTiers}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ts.railContent}
        style={ts.rail}>
        {tiers.map((tier, idx) => {
          const isReached = balance.lifetime_earned >= tier.min_lifetime_points;
          const isCurrent = tier.id === currentTier?.id;
          const isNext    = tier.id === nextTier?.id;
          const color     = getTierColor(tier.name);
          const icon      = getTierIcon(tier.name);
          const isLast    = idx === tiers.length - 1;

          return (
            <React.Fragment key={tier.id}>
              <TierNode
                tier={tier}
                color={color}
                icon={icon}
                isReached={isReached}
                isCurrent={isCurrent}
                isNext={isNext}
              />
              {!isLast && (
                <View style={[ts.connector, isReached && ts.connectorDone]} />
              )}
            </React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
});
