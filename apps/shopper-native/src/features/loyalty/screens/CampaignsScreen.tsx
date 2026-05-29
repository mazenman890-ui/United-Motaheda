/**
 * CampaignsScreen — displays active reward campaigns with live countdown,
 * multiplier badges, and minimum-purchase info.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { theme } from "@/theme";
import { useScreenTrace } from "@/features/observability";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { useActiveCampaigns } from "../hooks/useActiveCampaigns";
import type { RewardCampaign } from "../types";

export function CampaignsScreen() {
  useScreenTrace("loyalty-campaigns");
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const campaigns = useActiveCampaigns();

  const refreshing = campaigns.isFetching && !campaigns.isLoading;

  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void campaigns.refetch();
  }, [campaigns]);

  if (campaigns.isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title={t("loyalty.campaignsTitle")} subtitle={t("loyalty.campaignsSubtitle")} />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.card, styles.skeletonCard]} accessibilityLabel={t("common.loading")} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (campaigns.isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title={t("loyalty.campaignsTitle")} subtitle={t("loyalty.campaignsSubtitle")} />
        <View style={styles.centerPanel}>
          <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.slate[400]} />
          <Text style={styles.errorTitle} maxFontSizeMultiplier={1.4}>{t("loyalty.campaignsErrorTitle")}</Text>
          <Pressable
            onPress={() => void campaigns.refetch()}
            accessibilityRole="button"
            accessibilityLabel={t("common.retry")}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={styles.primaryBtnText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const list = campaigns.data ?? [];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <SubScreenHeader title={t("loyalty.campaignsTitle")} subtitle={t("loyalty.campaignsSubtitle")} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            accessibilityLabel={t("loyalty.campaignsRefreshA11y")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 ? (
          <View style={styles.centerPanel}>
            <Ionicons name="megaphone-outline" size={36} color={theme.colors.slate[300]} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
              {t("loyalty.campaignsEmpty")}
            </Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={1.5}>
              {t("loyalty.campaignsEmptyBody")}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 4 }}>
            {list.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Campaign card ───────────────────────────────────────────────────────────

function CampaignCard({ campaign }: { campaign: RewardCampaign }) {
  const { t } = useTranslation();
  const countdown = useCountdown(campaign.ends_at);

  return (
    <View
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`${campaign.name}، ${t("loyalty.tierEarnMultiplier", { n: campaign.multiplier })}`}
    >
      <View style={styles.cardHead}>
        <View style={styles.multiplierBadge}>
          <Ionicons name="star" size={14} color="#fff" />
          <Text style={styles.multiplierBadgeText} maxFontSizeMultiplier={1.2}>
            {campaign.multiplier}×
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.campaignName} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {campaign.name}
          </Text>
          {campaign.description ? (
            <Text style={styles.campaignDesc} numberOfLines={3} maxFontSizeMultiplier={1.4}>
              {campaign.description}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.cardFoot}>
        {campaign.min_purchase_cents != null && campaign.min_purchase_cents > 0 && (
          <View style={styles.metaChip}>
            <Ionicons name="cart-outline" size={12} color={theme.colors.text.tertiary} />
            <Text style={styles.metaText} maxFontSizeMultiplier={1.3}>
              {t("loyalty.minSpend", { amount: (campaign.min_purchase_cents / 100).toLocaleString("ar-EG") })}
            </Text>
          </View>
        )}
        {countdown && (
          <View style={[styles.metaChip, { backgroundColor: theme.colors.rose[50], borderColor: theme.colors.rose[100] }]}>
            <Ionicons name="timer-outline" size={12} color={theme.colors.rose[600]} />
            <Text style={[styles.metaText, { color: theme.colors.rose[700] }]} maxFontSizeMultiplier={1.3}>
              {countdown}
            </Text>
          </View>
        )}
        {campaign.category_restrictions && campaign.category_restrictions.length > 0 && (
          <View style={styles.metaChip}>
            <Ionicons name="pricetag-outline" size={12} color={theme.colors.text.tertiary} />
            <Text style={styles.metaText} maxFontSizeMultiplier={1.3} numberOfLines={1}>
              {campaign.category_restrictions.join(" · ")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(endsAt: string | null): string | null {
  const { t } = useTranslation();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel(t("loyalty.countdownEnded"));
        return;
      }
      const d = Math.floor(diff / 86_400_000);
      const h = Math.floor((diff % 86_400_000) / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      if (d > 0)      setLabel(t("loyalty.countdownDays",  { d }));
      else if (h > 0) setLabel(t("loyalty.countdownHours", { h }));
      else            setLabel(t("loyalty.countdownMins",  { m }));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [endsAt, t]);

  return label;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    gap:             12,
    ...theme.shadow.card,
  },
  skeletonCard: {
    backgroundColor: theme.colors.surfaceSunken,
    minHeight:       130,
  },
  cardHead: {
    flexDirection: "row-reverse",
    gap:           12,
    alignItems:    "flex-start",
  },
  multiplierBadge: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             4,
    backgroundColor: theme.colors.brand[700],
    borderRadius:    10,
    paddingHorizontal: 10,
    paddingVertical:   8,
    minWidth:        52,
    justifyContent:  "center",
  },
  multiplierBadgeText: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      "#fff",
  },
  campaignName: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      theme.colors.text.primary,
    textAlign:  "right",
    lineHeight: 20,
  },
  campaignDesc: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    textAlign:  "right",
    marginTop:  4,
    lineHeight: 17,
  },
  cardFoot: {
    flexDirection:  "row-reverse",
    flexWrap:       "wrap",
    gap:            6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.hairline,
    paddingTop:     10,
  },
  metaChip: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              4,
    backgroundColor:  theme.colors.surfaceSunken,
    borderRadius:     8,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
  },
  metaText: {
    fontFamily: theme.fonts.bold,
    fontSize:   11,
    color:      theme.colors.text.secondary,
  },

  centerPanel: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               10,
    paddingTop:        60,
  },
  errorTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   16,
    color:      theme.colors.text.primary,
    marginTop:  8,
  },
  emptyTitle: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
    color:      theme.colors.text.primary,
    marginTop:  8,
  },
  emptyBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      theme.colors.text.secondary,
    textAlign:  "center",
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               8,
    backgroundColor:   theme.colors.brand[600],
    borderRadius:      12,
    paddingHorizontal: 18,
    paddingVertical:   11,
    marginTop:         8,
    ...theme.shadow.brand,
  },
  primaryBtnText: {
    fontFamily: theme.fonts.black,
    fontSize:   13,
    color:      "#fff",
  },
});

export default CampaignsScreen;
