/**
 * LedgerHistoryScreen — paginated point transaction history.
 *
 * Shows all ledger entries (earn, redeem, cashback, bonus, referral, etc.)
 * in reverse-chronological order with infinite scroll. Each row shows the
 * delta (+ / -), kind label, source, and running balance.
 */

import React, { useCallback } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { theme } from "@/theme";
import { useScreenTrace } from "@/features/observability";
import { SubScreenHeader } from "../components/SubScreenHeader";
import { useLoyaltyHistory } from "../hooks/useLoyaltyHistory";
import type { LedgerEntry } from "../types";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

export function LedgerHistoryScreen() {
  useScreenTrace("loyalty-history");
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useLoyaltyHistory();

  const allEntries = data?.pages.flatMap((p) => p.entries) ?? [];

  const refreshing = false;
  const onRefresh = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title="سجل النقاط" subtitle="كل معاملاتك في مكان واحد" />
        <View style={{ padding: 16 }}>
          <ListSkeleton rows={5} />
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubScreenHeader title="سجل النقاط" subtitle="كل معاملاتك في مكان واحد" />
        <View style={styles.centerPanel}>
          <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.slate[400]} />
          <Text style={styles.errorTitle} maxFontSizeMultiplier={1.4}>تعذر تحميل السجل</Text>
          <Text style={styles.errorBody} maxFontSizeMultiplier={1.5}>
            تحقق من اتصالك وحاول مرة أخرى.
          </Text>
          <Pressable
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel="إعادة المحاولة"
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={styles.primaryBtnText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <SubScreenHeader title="سجل النقاط" subtitle="كل معاملاتك في مكان واحد" />
      <FlatList
        data={allEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EntryRow entry={item} />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            accessibilityLabel="تحديث السجل"
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centerPanel}>
            <Ionicons name="time-outline" size={36} color={theme.colors.slate[300]} />
            <Text style={styles.emptyTitle} maxFontSizeMultiplier={1.4}>
              لا توجد معاملات بعد
            </Text>
            <Text style={styles.emptyBody} maxFontSizeMultiplier={1.5}>
              ستظهر هنا نقاطك المكتسبة والمستبدلة عند كل طلب.
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader} accessibilityLabel="جارٍ تحميل المزيد">
              <ActivityIndicator size="small" color={theme.colors.brand[600]} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ─── Entry row ───────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.delta > 0;
  const date = new Date(entry.created_at).toLocaleDateString("ar-EG", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
  const time = new Date(entry.created_at).toLocaleTimeString("ar-EG", {
    hour:   "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${kindLabel(entry.kind)} ${isCredit ? "+" : ""}${entry.delta} نقطة، ${date}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: isCredit ? theme.colors.green[50] : theme.colors.rose[50] }]}>
        <Ionicons
          name={kindIcon(entry.kind)}
          size={16}
          color={isCredit ? theme.colors.green[700] : theme.colors.rose[600]}
        />
      </View>

      <View style={styles.rowBody}>
        <Text style={styles.rowKind} maxFontSizeMultiplier={1.3} numberOfLines={1}>
          {kindLabel(entry.kind)}
        </Text>
        {entry.source_ref && (
          <Text style={styles.rowRef} maxFontSizeMultiplier={1.4} numberOfLines={1}>
            {entry.source_ref}
          </Text>
        )}
        <Text style={styles.rowDate} maxFontSizeMultiplier={1.4}>
          {date} · {time}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Text
          style={[styles.rowDelta, { color: isCredit ? theme.colors.green[700] : theme.colors.rose[600] }]}
          maxFontSizeMultiplier={1.3}
        >
          {isCredit ? "+" : ""}{entry.delta.toLocaleString("ar-EG")}
        </Text>
        <Text style={styles.rowBalance} maxFontSizeMultiplier={1.4}>
          {entry.balance_after.toLocaleString("ar-EG")} نقطة
        </Text>
      </View>
    </View>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function kindLabel(kind: LedgerEntry["kind"]): string {
  switch (kind) {
    case "earn":     return "نقاط مكتسبة";
    case "redeem":   return "استبدال نقاط";
    case "adjust":   return "تعديل يدوي";
    case "reverse":  return "استرداد نقاط";
    case "expire":   return "نقاط منتهية";
    case "bonus":    return "نقاط إضافية";
    case "referral": return "مكافأة الإحالة";
    case "cashback": return "كاش باك";
    default:         return "معاملة";
  }
}

function kindIcon(kind: LedgerEntry["kind"]): IoniconsName {
  switch (kind) {
    case "earn":     return "add-circle-outline";
    case "redeem":   return "pricetag-outline";
    case "adjust":   return "create-outline";
    case "reverse":  return "return-up-back-outline";
    case "expire":   return "timer-outline";
    case "bonus":    return "gift-outline";
    case "referral": return "people-outline";
    case "cashback": return "cash-outline";
    default:         return "ellipse-outline";
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, styles.skeletonRow]} accessibilityLabel="جارٍ التحميل" />
      ))}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },

  row: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    14,
    padding:         14,
    marginBottom:    8,
    ...theme.shadow.card,
  },
  iconWrap: {
    width:           40,
    height:          40,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
  },
  rowBody: {
    flex:      1,
    gap:       2,
  },
  rowKind: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    textAlign:  "right",
  },
  rowRef: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
  },
  rowDate: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
    marginTop:  1,
  },
  rowRight: {
    alignItems: "flex-start",
    gap:        2,
  },
  rowDelta: {
    fontFamily:    theme.fonts.black,
    fontSize:      16,
    letterSpacing: -0.3,
  },
  rowBalance: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      theme.colors.text.tertiary,
  },

  skeletonRow: {
    backgroundColor: theme.colors.surfaceSunken,
    minHeight:       72,
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
  errorBody: {
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

  footerLoader: {
    paddingVertical: 16,
    alignItems:      "center",
  },
});

export default LedgerHistoryScreen;
