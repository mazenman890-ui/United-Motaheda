import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import { theme } from "@/theme";

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
        pressed && { backgroundColor: theme.colors.slate[50] },
      ]}>
      {/* Unread dot */}
      {!item.isRead && <View style={styles.unreadDot} />}

      {/* Type icon */}
      <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={17} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <View style={styles.notifTitleRow}>
          <Text
            style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}
            numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifTime}>{timeAgo(item.createdAt, t)}</Text>
        </View>
        <Text style={styles.notifBody} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={styles.notifTypePill}>
          <Text style={[styles.notifTypeText, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
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
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <Text style={styles.headerTitle}>{t("notifications.title")}</Text>
          {unreadCount > 0 && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{t("notifications.newBadge", { count: unreadCount })}</Text>
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
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {t(f.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllRead}
              hitSlop={8}
              accessibilityRole="button">
              <Text style={styles.markAllText}>{t("notifications.markAll")}</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ── List ── */}
      {loading && notifications.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.brand[500]} />
          <Text style={styles.loadingText}>{t("common.loading")}</Text>
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
    flexDirection: "row-reverse",
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
    textAlign: "right",
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
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterRow: { flexDirection: "row-reverse", gap: 5 },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
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
  markAllText: { fontSize: 11, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.65)" },

  // Loading
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 13, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400] },

  // Row
  notifRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    position: "relative",
  },
  notifRowUnread: { backgroundColor: theme.colors.brand[50] + "40" },
  unreadDot: {
    position: "absolute",
    top: 18,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.brand[600],
  },
  notifIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  notifContent: { flex: 1, gap: 4 },
  notifTitleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  notifTitle: {
    flex: 1,
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[700],
    textAlign: "right",
  },
  notifTitleUnread: { fontFamily: theme.fonts.black, color: theme.colors.slate[900] },
  notifTime: { fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400] },
  notifBody: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[500],
    textAlign: "right",
    lineHeight: 18,
  },
  notifTypePill: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.slate[50],
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  notifTypeText: { fontSize: 9, fontFamily: theme.fonts.bold },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.slate[100], marginHorizontal: 16 },
});
