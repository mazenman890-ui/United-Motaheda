import React, { memo } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import type { GiftRedemption } from "../../types";
import { cardStyles as cs } from "./wallet.styles";
import { EmptyCard, ErrorRow, ListSkeleton } from "./WalletCouponsSection";

interface WalletRedemptionsSectionProps {
  isLoading:   boolean;
  isError:     boolean;
  redemptions: GiftRedemption[];
  onRetry:     () => void;
  onViewAll?:  () => void;
}

export const WalletRedemptionsSection = memo(function WalletRedemptionsSection({
  isLoading,
  isError,
  redemptions,
  onRetry,
  onViewAll,
}: WalletRedemptionsSectionProps) {
  const { t } = useTranslation();

  if (isLoading) return <ListSkeleton rows={1} />;
  if (isError)   return <ErrorRow onRetry={onRetry} />;

  const active = redemptions.filter(
    (r) => r.state === "reserved" || r.state === "fulfilled",
  );

  if (active.length === 0) {
    return (
      <EmptyCard
        icon="gift-outline"
        title={t("loyalty.walletNoGifts")}
        body={t("loyalty.walletNoGiftsBody")}
        ctaLabel={onViewAll ? t("loyalty.walletAllGiftOrders") : undefined}
        onCta={onViewAll}
      />
    );
  }

  return (
    <View style={[cs.list, { marginBottom: 8 }]}>
      {active.slice(0, 3).map((r) => <RedemptionCard key={r.id} r={r} />)}
      {active.length > 3 && onViewAll && (
        <Pressable onPress={onViewAll} style={cs.showMoreBtn} accessibilityRole="button">
          <Text style={cs.showMoreText}>
            {t("loyalty.walletMoreOrders", { n: active.length - 3 })}
          </Text>
          <Ionicons name="chevron-back" size={14} color={theme.colors.brand[600]} />
        </Pressable>
      )}
    </View>
  );
});

// ─── RedemptionCard ───────────────────────────────────────────────────────────

const RedemptionCard = memo(function RedemptionCard({ r }: { r: GiftRedemption }) {
  const { t } = useTranslation();
  const isDelivered = r.state === "fulfilled";

  return (
    <View
      style={cs.redemptionCard}
      accessibilityRole="text"
      accessibilityLabel={t("loyalty.redemptionCardA11y", {
        points: r.points_spent.toLocaleString("ar-EG"),
        state:  isDelivered ? t("loyalty.redemptionDelivered") : t("loyalty.redemptionPending"),
      })}>
      <View style={[cs.redemptionIcon, isDelivered && cs.redemptionIconDone]}>
        <Ionicons
          name={isDelivered ? "checkmark-circle" : "time-outline"}
          size={20}
          color={isDelivered ? theme.colors.brand[600] : theme.colors.amber[600]}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={cs.redemptionPts} maxFontSizeMultiplier={1.2}>
          {r.points_spent.toLocaleString("ar-EG")} {t("loyalty.pointsUnit")}
        </Text>
        <Text style={cs.redemptionState} maxFontSizeMultiplier={1.3}>
          {isDelivered ? t("loyalty.redemptionDelivered") : t("loyalty.redemptionPending")}
        </Text>
      </View>
      <View style={[cs.stateChip, isDelivered ? cs.stateChipDone : cs.stateChipPending]}>
        <Text
          style={[
            cs.stateChipText,
            isDelivered ? cs.stateChipTextDone : cs.stateChipTextPending,
          ]}>
          {isDelivered
            ? t("loyalty.redemptionStateDelivered")
            : t("loyalty.redemptionStatePending")}
        </Text>
      </View>
    </View>
  );
});
