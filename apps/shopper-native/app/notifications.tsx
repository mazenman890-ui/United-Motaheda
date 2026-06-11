import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Text as UIText } from "@/shared/ui";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import { useNotifications, type AppNotification, type NotifType } from "@/features/notifications";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/shared/theme";
import { flexRow, isRtl, textAlignStart, BACK_CHEVRON } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Type config ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<NotifType, { icon: IoniconsName; color: string; bg: string; labelKey: string }> = {
  order:  { icon: "bag-handle",       color: theme.colors.brand[600],  bg: theme.colors.brand[50],  labelKey: "notifications.typeOrder"  },
  offer:  { icon: "pricetag",         color: theme.colors.amber[600],  bg: theme.colors.amber[50],  labelKey: "notifications.typeOffer"  },
  health: { icon: "heart",            color: theme.colors.rose[500],   bg: theme.colors.rose[50],   labelKey: "notifications.typeHealth" },
  system: { icon: "settings-outline", color: theme.colors.slate[600],  bg: theme.colors.slate[100], labelKey: "notifications.typeSystem" },
};

type Filter = "all" | NotifType;

const FILTER_CONFIGS: { key: Filter; labelKey: string }[] = [
  { key: "all",    labelKey: "notifications.filterAll"   },
  { key: "order",  labelKey: "notifications.typeOrder"   },
  { key: "offer",  labelKey: "notifications.typeOffer"   },
  { key: "health", labelKey: "notifications.typeHealth"  },
  { key: "system", labelKey: "notifications.typeSystem"  },
];

// ─── Time ago ─────────────────────────────────────────────────────────────

function timeAgo(dateStr: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return t("notifications.timeNow");
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return m === 1 ? t("notifications.timeMinuteAgo") : t("notifications.timeMinutesAgo", { count: m });
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return h === 1 ? t("notifications.timeHourAgo") : t("notifications.timeHoursAgo", { count: h });
  }
  if (diff < 172800) return t("notifications.timeYesterday");
  if (diff < 604800) {
    const d = Math.floor(diff / 86400);
    return t("notifications.timeDaysAgo", { count: d });
  }
  const w = Math.floor(diff / 604800);
  return w === 1 ? t("notifications.timeWeekAgo") : t("notifications.timeWeeksAgo", { count: w });
}

// ─── Notification row ─────────────────────────────────────────────────────

const NotificationRow = React.memo(function NotificationRow({
  item, onPress,
}: { item: AppNotification; onPress: () => void }) {
  const { t } = useTranslation();
  const cfg   = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}`}
      accessibilityState={{ selected: !item.isRead }}
      style={({ pressed }) => [
        styles.notifRow,
        !item.isRead && styles.notifRowUnread,
        item.isRead && styles.notifRowRead,
        pressed && { backgroundColor: theme.colors.slate[50] },
      ]}>

      {/* Type icon */}
      <View style={[
        styles.notifIcon,
        { backgroundColor: cfg.bg, borderColor: cfg.bg === theme.colors.brand[50] ? theme.colors.border.brandSoft : "rgba(0,0,0,0.04)" }
      ]}>
        <Ionicons name={cfg.icon} size={17} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <View style={styles.notifTitleRow}>
          <UIText
            style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}
            numberOfLines={1}>
            {item.title}
          </UIText>
          <UIText style={styles.notifTime}>{timeAgo(item.createdAt, t)}</UIText>
        </View>
        <UIText style={styles.notifBody} numberOfLines={2}>
          {item.body}
        </UIText>
        <View style={[styles.notifTypePill, { backgroundColor: cfg.bg }]}>
          <View style={[styles.notifTypeDot, { backgroundColor: cfg.color }]} />
          <UIText style={[styles.notifTypeText, { color: cfg.color }]}>{t(cfg.labelKey)}</UIText>
        </View>
      </View>
    </Pressable>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const { t }     = useTranslation();
  const { user }  = useAuth();

  const {
    items: notifications,
    unreadCount,
    isLoading: loading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    markRead,
    markAllRead,
  } = useNotifications(user?.id);

  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const handleMarkAllRead = useCallback(() => {
    if (!user?.id) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    markAllRead();
  }, [user?.id, markAllRead]);

  const handleNotifPress = useCallback((item: AppNotification) => {
    if (!item.isRead) markRead(item.id);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    if (item.actionUrl) {
      router.push(item.actionUrl as any);
    }
  }, [markRead, router]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(({ item, index }: { item: AppNotification; index: number }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(200)}>
      <NotificationRow item={item} onPress={() => handleNotifPress(item)} />
    </Animated.View>
  ), [handleNotifPress]);

  const keyExtractor = useCallback((item: AppNotification) => item.id, []);

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>

        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}>
            <Ionicons name={BACK_CHEVRON} size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <UIText style={styles.headerTitle}>{t("notifications.title")}</UIText>
          {unreadCount > 0 && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.headerBadge}>
              <UIText style={styles.headerBadgeText}>{t("notifications.newBadge", { count: unreadCount })}</UIText>
            </Animated.View>
          )}
          <Pressable
            onPress={() => router.push("/notification-preferences")}
            style={styles.backBtn}
            hitSlop={6}>
            <Ionicons name="settings-outline" size={17} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </View>

        {/* Filter chips + mark all */}
        <View style={styles.headerActions}>
          <View style={styles.filterRow}>
            {FILTER_CONFIGS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.filterChip, active && styles.filterChipActive]}>
                  <UIText style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {t(f.labelKey)}
                  </UIText>
                </Pressable>
              );
            })}
          </View>
          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllRead}
              hitSlop={8}
              accessibilityRole="button">
              <UIText style={styles.markAllText}>{t("notifications.markAll")}</UIText>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ── List ── */}
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.brand[500]} />
          <UIText style={styles.loadingText}>{t("common.loading")}</UIText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          removeClippedSubviews
          maxToRenderPerBatch={12}
          initialNumToRender={10}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => refetch()}
              tintColor={theme.colors.brand[500]}
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={theme.colors.brand[500]} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ paddingTop: 60 }}>
              <EmptyState
                icon="notifications-off-outline"
                title={t("notifications.empty")}
                description={filter !== "all" ? t("notifications.emptyFiltered") : t("notifications.empty")}
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  headerTopRow: {
    flexDirection: flexRow(isRtl()),
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: theme.fonts.black,
    color: "#fff",
    textAlign: textAlignStart(isRtl()),
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerBadgeText: { fontSize: 10, fontFamily: theme.fonts.black, color: "#fff" },
  headerActions: {
    flexDirection: flexRow(isRtl()),
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterRow: { flexDirection: flexRow(isRtl()), gap: 5 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  filterChipActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  filterChipText: { fontSize: 10.5, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.65)" },
  filterChipTextActive: { color: theme.colors.heroMid, fontFamily: theme.fonts.black },
  markAllText: { fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.teal[200] },

  // Loading
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 13, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400] },

  // Row
  notifRow: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "flex-start",
    gap:               14,
    paddingHorizontal: 18,
    paddingVertical:   16,
    backgroundColor:   "#fff",
    position:          "relative",
  },
  // Unread: brand.lightest tint + brand left-border accent
  notifRowUnread: {
    backgroundColor:  theme.colors.brand.lightest,
    borderStartWidth: 3,
    borderStartColor: theme.colors.brand[500],
  },
  // Read: explicit pure white surface
  notifRowRead: { backgroundColor: theme.colors.surface },
  notifIcon: {
    width:          46,
    height:         46,
    borderRadius:   14,
    alignItems:     "center",
    justifyContent: "center",
    marginTop:      1,
    flexShrink:     0,
    borderWidth:    1,
  },
  notifContent: { flex: 1, gap: 5 },
  notifTitleRow: {
    flexDirection: flexRow(isRtl()),
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  notifTitle: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[700],
    textAlign: textAlignStart(isRtl()),
  },
  notifTitleUnread: { fontFamily: theme.fonts.black, color: theme.colors.slate[900] },
  notifTime: { fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400] },
  notifBody: {
    fontSize: 12.5,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: textAlignStart(isRtl()),
    lineHeight: 19,
  },
  notifTypePill: {
    alignSelf:         "flex-start",
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               4,
    borderRadius:      8,
    paddingHorizontal: 8,
    paddingVertical:   3,
    marginTop:         3,
    borderWidth:       1,
    borderColor:       "rgba(0,0,0,0.04)",
  },
  notifTypeDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  notifTypeText: { fontSize: 9, fontFamily: theme.fonts.bold },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border.hairline, marginHorizontal: 0 },
});
