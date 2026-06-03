import React, { useCallback } from "react";
import { FlatList, Platform, Pressable, RefreshControl, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { AppHeader } from "@/shared/components";
import { theme } from "@/shared/theme";
import { formatPrice } from "@/utils/format";
import { useAuth } from "@/features/auth";
import type { Order } from "@/stores/orders";
import { useOrders } from "../hooks/useOrders";
import { UnauthenticatedState } from "../components/UnauthenticatedState";
import { EmptyOrdersState }     from "../components/EmptyOrdersState";
import { OrderCard, SkeletonCard } from "../components/OrderCard";
import { listS, INDIGO_GRAD, EMERALD_GRAD } from "../components/orders.styles";

// ─── OrdersList — virtualized populated list ──────────────────────────────────

function OrdersList({
  orders, isRefetching, onRefresh, onOrderPress, showBack,
}: {
  orders:       Order[];
  isRefetching: boolean;
  onRefresh:    () => void;
  onOrderPress: (id: string) => void;
  showBack:     boolean;
}): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const activeCount    = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

  // Stable renderItem — no inline arrow on every FlatList render
  const renderItem = useCallback(
    ({ item, index }: { item: Order; index: number }) => (
      <OrderCard order={item} index={index} onPress={onOrderPress} />
    ),
    [onOrderPress],
  );

  const listHeader = (
    <Animated.View entering={FadeInDown.duration(380)} style={listS.statsRow}>
      <View style={listS.statCard}>
        <LinearGradient colors={[theme.colors.teal[500], theme.colors.brand[600]]} style={listS.statIcon}>
          <Ionicons name="bag-outline" size={16} color={theme.colors.surface} />
        </LinearGradient>
        <View>
          <UIText style={listS.statValue}>{orders.length}</UIText>
          <UIText style={listS.statLabel}>{t("orders.countOrders", { count: orders.length })}</UIText>
        </View>
      </View>
      <View style={listS.statCard}>
        <LinearGradient colors={INDIGO_GRAD} style={listS.statIcon}>
          <Ionicons name="refresh-outline" size={16} color={theme.colors.surface} />
        </LinearGradient>
        <View>
          <UIText style={listS.statValue}>{activeCount}</UIText>
          <UIText style={listS.statLabel}>{t("orders.processing")}</UIText>
        </View>
      </View>
      <View style={listS.statCard}>
        <LinearGradient colors={EMERALD_GRAD} style={listS.statIcon}>
          <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.surface} />
        </LinearGradient>
        <View>
          <UIText style={listS.statValue}>{deliveredCount}</UIText>
          <UIText style={listS.statLabel}>{t("orders.delivered")}</UIText>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AppHeader title={t("orders.title")} showBack={showBack} />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[listS.listContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            colors={[theme.colors.brand[600]]}
          />
        }
        ListHeaderComponent={listHeader}
        renderItem={renderItem}
      />
    </View>
  );
}

// ─── OrdersScreen — root ──────────────────────────────────────────────────────

export interface OrdersScreenProps {
  showBack?: boolean;
}

export function OrdersScreen({ showBack = true }: OrdersScreenProps): React.ReactElement {
  const router   = useRouter();
  const { t }    = useTranslation();
  const { user } = useAuth();

  const {
    data:        orders        = [],
    isLoading,
    isRefetching,
    refetch,
    isSuccess,
  } = useOrders(user?.id);

  const handleOrderPress = useCallback(
    (orderId: string) => router.push(`/order/${orderId}`),
    [router],
  );
  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!user) return <UnauthenticatedState showBack={showBack} />;

  // ── Loading — static skeleton, no map() ─────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <AppHeader title={t("orders.title")} showBack={showBack} />
        <View style={listS.skeletonContainer}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (isSuccess && orders.length === 0) return <EmptyOrdersState showBack={showBack} />;

  // ── Populated ────────────────────────────────────────────────────────────────
  return (
    <OrdersList
      orders={orders}
      isRefetching={isRefetching}
      onRefresh={handleRefresh}
      onOrderPress={handleOrderPress}
      showBack={showBack}
    />
  );
}

