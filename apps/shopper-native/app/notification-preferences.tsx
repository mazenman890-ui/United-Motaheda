/**
 * Notification Preferences screen — Profile → الإشعارات → ⚙
 *
 * Edit:
 *  - Channels (push / email / sms)
 *  - Categories (order updates, promotions, etc.)
 *
 * Mutations are optimistic via useNotificationPreferences.
 */

import React, { useCallback } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import {
  useNotificationPreferences,
  type NotificationCategoryPrefs,
  type NotificationChannelPrefs,
} from "@/features/notifications";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const CHANNELS: Array<{
  key: keyof NotificationChannelPrefs;
  labelKey: string;
  descKey: string;
  icon: IoniconsName;
  color: string;
  bg: string;
}> = [
  {
    key:      "push",
    labelKey: "notifications.channelPushLabel",
    descKey:  "notifications.channelPushDesc",
    icon:     "notifications-outline",
    color:    theme.colors.brand[600],
    bg:       theme.colors.brand[50],
  },
  {
    key:      "email",
    labelKey: "notifications.channelEmailLabel",
    descKey:  "notifications.channelEmailDesc",
    icon:     "mail-outline",
    color:    theme.colors.purple[600],
    bg:       theme.colors.purple[50],
  },
  {
    key:      "sms",
    labelKey: "notifications.channelSmsLabel",
    descKey:  "notifications.channelSmsDesc",
    icon:     "chatbubble-outline",
    color:    theme.colors.amber[600],
    bg:       theme.colors.amber[50],
  },
];

const CATEGORIES: Array<{
  key: keyof NotificationCategoryPrefs;
  labelKey: string;
  descKey: string;
  icon: IoniconsName;
  color: string;
}> = [
  {
    key:      "order_updates",
    labelKey: "notifications.catOrderLabel",
    descKey:  "notifications.catOrderDesc",
    icon:     "bag-handle-outline",
    color:    theme.colors.brand[600],
  },
  {
    key:      "promotions",
    labelKey: "notifications.catPromoLabel",
    descKey:  "notifications.catPromoDesc",
    icon:     "pricetag-outline",
    color:    theme.colors.amber[600],
  },
  {
    key:      "security_alerts",
    labelKey: "notifications.catSecurityLabel",
    descKey:  "notifications.catSecurityDesc",
    icon:     "shield-checkmark-outline",
    color:    theme.colors.green[600],
  },
  {
    key:      "health_reminders",
    labelKey: "notifications.catHealthLabel",
    descKey:  "notifications.catHealthDesc",
    icon:     "heart-outline",
    color:    theme.colors.rose[500],
  },
  {
    key:      "new_arrivals",
    labelKey: "notifications.catNewArrivalsLabel",
    descKey:  "notifications.catNewArrivalsDesc",
    icon:     "sparkles-outline",
    color:    theme.colors.purple[600],
  },
  {
    key:      "account_updates",
    labelKey: "notifications.catAccountLabel",
    descKey:  "notifications.catAccountDesc",
    icon:     "person-outline",
    color:    theme.colors.slate[600],
  },
];

export default function NotificationPreferencesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { preferences, isLoading, update } = useNotificationPreferences(user?.id);

  const haptic = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  const toggleChannel = useCallback(
    (key: keyof NotificationChannelPrefs, value: boolean) => {
      haptic();
      update({ channels: { ...preferences.channels, [key]: value } });
    },
    [haptic, preferences.channels, update],
  );

  const toggleCategory = useCallback(
    (key: keyof NotificationCategoryPrefs, value: boolean) => {
      haptic();
      update({ categories: { ...preferences.categories, [key]: value } });
    },
    [haptic, preferences.categories, update],
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <UIText style={styles.headerTitle}>{t("notifications.prefTitle")}</UIText>
            <UIText style={styles.headerSub}>{t("notifications.prefSubtitle")}</UIText>
          </View>
          <View style={styles.shieldIcon}>
            <Ionicons name="options-outline" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30 }}>
        {!user && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.signedOutBanner}>
            <Ionicons name="lock-closed-outline" size={14} color={theme.colors.amber[700]} />
            <UIText style={styles.signedOutText}>
              {t("notifications.signInToSave")}
            </UIText>
          </Animated.View>
        )}

        {/* ── Channels ── */}
        <Animated.View entering={FadeInDown.duration(280)}>
          <SectionHeader icon="megaphone-outline" title={t("notifications.channelsTitle")} />
          <View style={styles.card}>
            {CHANNELS.map((ch, i) => (
              <View key={ch.key} style={[styles.row, i < CHANNELS.length - 1 && styles.rowBorder]}>
                <View style={[styles.rowIcon, { backgroundColor: ch.bg }]}>
                  <Ionicons name={ch.icon} size={17} color={ch.color} />
                </View>
                <View style={styles.rowText}>
                  <UIText style={styles.rowLabel}>{t(ch.labelKey)}</UIText>
                  <UIText style={styles.rowDesc}>{t(ch.descKey)}</UIText>
                </View>
                <Switch
                  value={preferences.channels[ch.key]}
                  onValueChange={(v) => toggleChannel(ch.key, v)}
                  disabled={isLoading}
                  trackColor={{ false: theme.colors.slate[200], true: theme.colors.brand[400] }}
                  thumbColor={preferences.channels[ch.key] ? theme.colors.brand[600] : "#fff"}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Categories ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(280)} style={{ marginTop: 18 }}>
          <SectionHeader icon="grid-outline" title={t("notifications.categoriesTitle")} />
          <View style={styles.card}>
            {CATEGORIES.map((cat, i) => (
              <View key={cat.key} style={[styles.row, i < CATEGORIES.length - 1 && styles.rowBorder]}>
                <View style={[styles.rowIcon, { backgroundColor: cat.color + "18" }]}>
                  <Ionicons name={cat.icon} size={16} color={cat.color} />
                </View>
                <View style={styles.rowText}>
                  <UIText style={styles.rowLabel}>{t(cat.labelKey)}</UIText>
                  <UIText style={styles.rowDesc}>{t(cat.descKey)}</UIText>
                </View>
                <Switch
                  value={preferences.categories[cat.key]}
                  onValueChange={(v) => toggleCategory(cat.key, v)}
                  disabled={isLoading}
                  trackColor={{ false: theme.colors.slate[200], true: theme.colors.brand[400] }}
                  thumbColor={preferences.categories[cat.key] ? theme.colors.brand[600] : "#fff"}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(280)} style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={14} color={theme.colors.brand[600]} />
          <UIText style={styles.footerText}>
            {t("notifications.securityNote")}
          </UIText>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: IoniconsName; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={13} color={theme.colors.brand[600]} />
      </View>
      <UIText style={styles.sectionTitle}>{title}</UIText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 16, overflow: "hidden" },
  headerRow: { flexDirection: flexRow(isRtl()), alignItems: "center", gap: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: { fontSize: 18, fontFamily: theme.fonts.black, color: "#fff", textAlign: textAlignStart(isRtl()) },
  headerSub: { fontSize: 11, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.50)", textAlign: textAlignStart(isRtl()) },
  shieldIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },

  // Signed-out banner
  signedOutBanner: {
    flexDirection: flexRow(isRtl()), alignItems: "center", gap: 8,
    backgroundColor: theme.colors.amber[50],
    borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.amber[100],
  },
  signedOutText: {
    flex: 1, fontSize: 11, fontFamily: theme.fonts.bold,
    color: theme.colors.amber[800], textAlign: textAlignStart(isRtl()),
  },

  // Sections
  sectionHead: { flexDirection: flexRow(isRtl()), alignItems: "center", gap: 8, marginBottom: 10 },
  sectionIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, fontFamily: theme.fonts.black, color: theme.colors.text.primary },

  // Card — white surface, soft shadow, no heavy border
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    overflow:        "hidden",
    ...theme.shadow.sm,
  },
  row: {
    flexDirection: flexRow(isRtl()),
    alignItems:      "center",
    gap:             12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  // Circular pastel icon bubble — matches Profile MenuRow style
  rowIcon: {
    width:          38,
    height:         38,
    borderRadius:   99,
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     0,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: textAlignStart(isRtl()) },
  rowDesc: { fontSize: 10, fontFamily: theme.fonts.regular, color: theme.colors.slate[400], textAlign: textAlignStart(isRtl()) },

  // Footer
  footerNote: {
    flexDirection: flexRow(isRtl()), alignItems: "flex-start", gap: 8,
    backgroundColor: theme.colors.brand[50],
    borderRadius: 12, padding: 12, marginTop: 18,
    borderWidth: 1, borderColor: theme.colors.brand[100],
  },
  footerText: {
    flex: 1, fontSize: 11, fontFamily: theme.fonts.regular,
    color: theme.colors.brand[700], textAlign: textAlignStart(isRtl()), lineHeight: 18,
  },
});
