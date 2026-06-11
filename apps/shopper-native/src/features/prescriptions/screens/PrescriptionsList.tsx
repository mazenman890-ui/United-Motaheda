/**
 * PrescriptionsList — the user's prescription roster.
 *
 * Header: AppHeader title="الوصفات الطبية" (cart badge stays).
 * Body:
 * - Active section: RxCards sorted expiring → ready → active.
 * - Expired section: collapsed behind a disclosure row.
 * - Empty state when no active rxs.
 * Sticky CTA: "إضافة وصفة" → /prescriptions/add.
 * Pull-to-refresh: usePrescriptionsQuery().refetch().
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// Direct imports (not the barrel) to break a require cycle:
// shared/components/index → PharmacyBootstrap → features/prescriptions → here.
import { AppHeader } from "@/shared/components/AppHeader";
import { RxCard }    from "@/shared/components/RxCard";
import { Text } from "@/shared/ui";
import { flexRow, isRtl, FORWARD_CHEVRON } from "@/utils/layout";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/features/auth";
import { theme } from "@/shared/theme";
import { usePrescriptions } from "../hooks/usePrescriptions";
import { usePrescriptionsQuery } from "../hooks/usePrescriptionsQuery";
import { sortActiveByStatus } from "../lib/statusSort";
import type { Prescription } from "@/stores/prescriptionsStore";

interface Row {
  kind:    "rx";
  rx:      Prescription;
}
interface DisclosureRow {
  kind: "disclosure";
  count: number;
  open: boolean;
}
type ListItem = Row | DisclosureRow;

export function PrescriptionsList(): React.ReactElement {
  const router        = useRouter();
  const insets        = useSafeAreaInsets();
  const { user }      = useAuth();
  const all           = usePrescriptions();
  const { refetch, isRefetching, isLoading, isError } = usePrescriptionsQuery(user?.id);

  const [showExpired, setShowExpired] = useState(false);

  const { active, expired } = useMemo(() => {
    const expired = all.filter((p) => p.status === "expired");
    const active  = sortActiveByStatus(all.filter((p) => p.status !== "expired"));
    return { active, expired };
  }, [all]);

  const data = useMemo<ListItem[]>(() => {
    const out: ListItem[] = active.map((rx) => ({ kind: "rx", rx }));
    if (expired.length > 0) {
      out.push({ kind: "disclosure", count: expired.length, open: showExpired });
      if (showExpired) {
        for (const rx of expired) out.push({ kind: "rx", rx });
      }
    }
    return out;
  }, [active, expired, showExpired]);

  const goToAdd     = useCallback(() => router.push("/prescriptions/add"      as never), [router]);
  const goToDetail  = useCallback((rx: Prescription) =>
    router.push(`/prescriptions/${rx.id}` as never), [router]);
  const goToRefill  = useCallback((rx: Prescription) =>
    router.push(`/prescriptions/${rx.id}/refill` as never), [router]);

  const renderItem = useCallback(({ item }: { item: ListItem }): React.ReactElement => {
    if (item.kind === "disclosure") {
      return (
        <Pressable
          onPress={() => setShowExpired((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: item.open }}
          accessibilityLabel={`عرض المنتهية (${item.count})`}
          style={styles.disclosureRow}>
          <View style={{ flexDirection: flexRow(isRtl()), alignItems: "center", gap: theme.spacing[1] }}>
            <Ionicons
              name={item.open ? "chevron-down" : FORWARD_CHEVRON}
              size={16}
              color={theme.colors.text.tertiary}
            />
            <Text variant="caption" color="tertiary">
              {item.open ? "إخفاء المنتهية" : `عرض المنتهية (${item.count})`}
            </Text>
          </View>
        </Pressable>
      );
    }
    return (
      <RxCard
        prescription={item.rx}
        variant="list"
        onPress={goToDetail}
        onRefill={goToRefill}
      />
    );
  }, [goToDetail, goToRefill]);

  const keyExtractor = useCallback(
    (item: ListItem) => item.kind === "disclosure" ? "__disclosure__" : item.rx.id,
    [],
  );

  return (
    <View style={styles.screen}>
      <AppHeader title="الوصفات الطبية" showBack />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.brand.base} />
        </View>
      ) : isError && active.length === 0 && expired.length === 0 ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="تعذّر تحميل الوصفات"
          description="حدث خطأ أثناء جلب وصفاتك الطبية. تحقق من اتصالك بالإنترنت وأعد المحاولة."
          actionLabel="إعادة المحاولة"
          onAction={refetch}
        />
      ) : active.length === 0 && expired.length === 0 ? (
        <EmptyState
          icon="medkit-outline"
          title="لا توجد وصفات طبية بعد"
          description="أرسل وصفتك عبر واتساب وسيضيفها فريق الصيدلية إلى حسابك، أو أضفها برقم الوصفة"
          actionLabel="إضافة وصفة"
          onAction={goToAdd}
        />
      ) : (
        <>
          <FlatList
            data={data}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: theme.spacing[1] }} />}
            contentContainerStyle={{
              padding:       theme.layout.pagePaddingH,
              paddingBottom: insets.bottom + theme.layout.buttonHeight + theme.spacing[3],
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={theme.colors.brand.base}
                colors={[theme.colors.brand.base]}
              />
            }
            showsVerticalScrollIndicator={false}
          />

          {/* Sticky bottom CTA */}
          <View
            style={[
              styles.ctaBar,
              { paddingBottom: Math.max(insets.bottom, theme.spacing[1.5]) },
              , { pointerEvents: "box-none" } ]}
            >
            <Button variant="primary" fullWidth onPress={goToAdd}>
              إضافة وصفة
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  centered: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  disclosureRow: {
    paddingVertical:   theme.spacing[1.5],
    paddingHorizontal: theme.spacing[2],
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "flex-start",
  },
  ctaBar: {
    position:          "absolute",
    left:              0,
    right:             0,
    bottom:            0,
    paddingHorizontal: theme.layout.pagePaddingH,
    paddingTop:        theme.spacing[1.5],
    backgroundColor:   theme.colors.bg,
    borderTopWidth:    StyleSheet.hairlineWidth,
    borderTopColor:    theme.colors.border.default,
  },
});