import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";

import type { LedgerEntry } from "../../types";
import { getLedgerIcon, getLedgerLabel } from "./HubHelpers";
import { SectionHeader } from "./SectionHeader";
import { sectionStyles, activityStyles as as_ } from "./hub.styles";

interface RecentActivityProps {
  entries:   LedgerEntry[];
  isLoading: boolean;
  isError:   boolean;
  onSeeAll?: () => void;
  onRetry:   () => void;
}

export const RecentActivity = React.memo(function RecentActivity({
  entries, isLoading, isError, onSeeAll, onRetry,
}: RecentActivityProps) {
  const { t } = useTranslation();

  return (
    <View style={sectionStyles.wrap}>
      <SectionHeader
        icon="receipt-outline"
        title={t("loyalty.recentActivity")}
        ctaLabel={t("loyalty.recentSeeAll")}
        onCta={entries.length > 0 ? onSeeAll : undefined}
      />

      {isLoading ? (
        <View style={as_.list}>
          {[0, 1, 2].map((i) => <View key={i} style={as_.skeleton} />)}
        </View>
      ) : isError ? (
        <View style={as_.inlineError}>
          <Text style={as_.inlineErrorText}>{t("loyalty.recentLoadError")}</Text>
          <Pressable
            onPress={onRetry}
            style={as_.retryBtn}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}>
            <Ionicons name="refresh" size={12} color={theme.colors.brand.base} />
            <Text style={as_.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      ) : entries.length === 0 ? (
        <View style={as_.empty}>
          <Ionicons name="receipt-outline" size={28} color={theme.colors.text.disabled} />
          <Text style={as_.emptyText}>{t("loyalty.recentEmpty")}</Text>
          <Text style={as_.emptySub}>{t("loyalty.recentEmptySub")}</Text>
        </View>
      ) : (
        <View style={as_.list}>
          {entries.map((e) => <ActivityRow key={e.id} entry={e} />)}
        </View>
      )}
    </View>
  );
});

const ActivityRow = React.memo(function ActivityRow({ entry }: { entry: LedgerEntry }) {
  const { t } = useTranslation();
  const isEarn  = entry.delta > 0;
  const icon    = getLedgerIcon(entry.kind);
  const color   = isEarn ? theme.colors.brand.base : theme.colors.rose[500];
  const bgColor = isEarn ? theme.colors.brand.lighter : theme.colors.rose[50];
  const sign    = isEarn ? "+" : "";

  const date = new Date(entry.created_at).toLocaleDateString("ar-EG", {
    day: "numeric", month: "short",
  });

  return (
    <View style={as_.row}>
      <View style={[as_.iconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={as_.meta}>
        <Text style={as_.source} numberOfLines={1}>
          {getLedgerLabel(entry.kind, entry.source, t)}
        </Text>
        <Text style={as_.date}>{date}</Text>
      </View>
      <View style={as_.deltaWrap}>
        <Text style={[as_.delta, { color }]}>
          {sign}{Math.abs(entry.delta).toLocaleString("ar-EG")}
        </Text>
        <Text style={as_.unit}>{t("loyalty.pointsUnit")}</Text>
      </View>
    </View>
  );
});
