import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { showConfirmSheet, showErrorSheet } from "@/shared/store/appSheetStore";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth";
import {
  useAddressStore,
  AddressCard,
  AddressFormDrawer,
  type Address,
  type AddressFormData,
} from "@/features/addresses";
import { EmptyState } from "@/components/ui/EmptyState";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";

// ─── Skeleton shimmer component ──────────────────────────────────────────────
function ShimmerCard() {
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.skeletonCard, animatedStyle]} />
  );
}

// ─── AddressCardRow — hoisted at module scope so React never sees a new
//     component type on re-renders of AddressesScreen, preventing unmount/remount
//     of every row.  Internal useCallbacks stabilise the item-bound handlers.
const AddressCardRow = React.memo(function AddressCardRow({
  item,
  index,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  item:         Address;
  index:        number;
  onEdit:       (a: Address) => void;
  onDelete:     (a: Address) => void;
  onSetDefault: (a: Address) => void;
}) {
  const handleEdit       = useCallback(() => onEdit(item),       [onEdit, item]);
  const handleDelete     = useCallback(() => onDelete(item),     [onDelete, item]);
  const handleSetDefault = useCallback(() => onSetDefault(item), [onSetDefault, item]);

  return (
    <Animated.View entering={FadeInDown.duration(280).delay(index * 60)}>
      <AddressCard
        address={item}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
      />
    </Animated.View>
  );
});

// ─── Addresses Screen ───────────────────────────────────────────────────────
export default function AddressesScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t }   = useTranslation();
  const { user } = useAuth();

  const addresses      = useAddressStore((s) => s.addresses);
  const loading        = useAddressStore((s) => s.loading);
  const fetchAddresses = useAddressStore((s) => s.fetch);
  const addAddress     = useAddressStore((s) => s.add);
  const updateAddress  = useAddressStore((s) => s.update);
  const removeAddress  = useAddressStore((s) => s.remove);
  const setDefault     = useAddressStore((s) => s.setDefault);

  const [drawerVisible, setDrawerVisible]   = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const [refreshing, setRefreshing]         = useState(false);

  // Fetch on mount / user change
  useEffect(() => {
    if (user?.id) fetchAddresses(user.id);
  }, [user?.id, fetchAddresses]);

  const defaultAddr = useMemo(
    () => addresses.find((a) => a.is_default),
    [addresses]
  );

  // ── Pull to refresh ──
  const handleRefresh = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    await fetchAddresses(user.id);
    setRefreshing(false);
  }, [user?.id, fetchAddresses]);

  // ── Actions ──
  const handleAdd = useCallback(() => {
    setEditingAddress(null);
    setDrawerVisible(true);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleEdit = useCallback((addr: Address) => {
    setEditingAddress(addr);
    setDrawerVisible(true);
  }, []);

  const handleDelete = useCallback(
    (addr: Address) => {
      showConfirmSheet(
        t("addresses.deleteTitle"),
        t("addresses.deleteMessage", { name: addr.recipient_name }),
        () => {
          if (Platform.OS !== "web")
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          removeAddress(addr.id);
        },
        { confirmLabel: t("addresses.deleteConfirm"), danger: true },
      );
    },
    [removeAddress, t]
  );

  const handleSetDefault = useCallback(
    (addr: Address) => {
      if (!user?.id) return;
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setDefault(addr.id, user.id);
    },
    [user?.id, setDefault]
  );

  const handleSubmit = useCallback(
    async (data: AddressFormData) => {
      if (!user?.id) return;
      setSubmitting(true);
      try {
        if (editingAddress) {
          await updateAddress(editingAddress.id, user.id, data);
        } else {
          await addAddress(user.id, data);
        }
        setDrawerVisible(false);
      } catch {
        showErrorSheet(t("addresses.saveError"), t("addresses.saveErrorDesc"));
      } finally {
        setSubmitting(false);
      }
    },
    [user?.id, editingAddress, updateAddress, addAddress, t]
  );

  const renderAddress = useCallback(
    ({ item, index }: { item: Address; index: number }) => (
      <AddressCardRow
        item={item}
        index={index}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
      />
    ),
    [handleEdit, handleDelete, handleSetDefault],
  );

  // ── Content states ──
  const showInitialSkeleton = loading && addresses.length === 0;
  const showEmpty = !loading && addresses.length === 0;

  return (
    <View style={styles.screen}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        {/* Decorative blobs */}
        <View style={styles.decoCircle} />
        <View style={styles.decoCircle2} />

        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
          >
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <UIText variant="eyebrow" align="right" style={styles.headerEyebrowNew}>
              {t("addresses.eyebrow")}
            </UIText>
            <UIText variant="sheet-title" color="inverse" align="right" style={styles.headerTitleNew}>
              {t("addresses.title")}
            </UIText>
            <UIText variant="body-sm" color="inverse-muted" align="right" style={styles.headerSubNew}>
              {addresses.length > 0
                ? t("addresses.savedCount", { count: addresses.length })
                : t("addresses.addFirst")}
            </UIText>
          </View>

          <Pressable
            onPress={handleAdd}
            style={styles.addBtnHeader}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("addresses.addNew")}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Pressable>
        </View>

        {/* Quick stats */}
        {addresses.length > 0 && (
          <Animated.View entering={FadeIn.duration(280)} style={styles.statsRow}>
            <View style={styles.statPill}>
              <Ionicons name="location" size={12} color={theme.colors.brand[300]} />
              <UIText variant="eyebrow" style={{ color: "rgba(255,255,255,0.82)" }}>
                {t("addresses.count", { count: addresses.length })}
              </UIText>
            </View>
            {defaultAddr && (
              <View style={[styles.statPill, { borderColor: "rgba(34,197,94,0.3)" }]}>
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.success.base} />
                <UIText variant="eyebrow" style={{ color: theme.colors.success.light }}>
                  {defaultAddr.city}  •  {t("addresses.default")}
                </UIText>
              </View>
            )}
          </Animated.View>
        )}
      </LinearGradient>

      {/* ── Content ── */}
      {showInitialSkeleton ? (
        <View style={styles.loadingWrap}>
          {[1, 2, 3].map((i) => (
            <ShimmerCard key={i} />
          ))}
        </View>
      ) : showEmpty ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="location-outline"
            title={t("addresses.emptyTitle")}
            description={t("addresses.emptyDesc")}
            actionLabel={t("addresses.emptyAction")}
            onAction={handleAdd}
          />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={renderAddress}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.brand[600]}
              colors={[theme.colors.brand[600]]}
              progressBackgroundColor={theme.colors.surface}
            />
          }
          ListHeaderComponent={
            addresses.length > 1 ? (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="map-outline" size={14} color={theme.colors.brand[700]} />
                </View>
                <View>
                  <UIText variant="eyebrow" color="tertiary" align="right">
                    {t("addresses.allLocations")}
                  </UIText>
                  <UIText variant="card-title" align="right" style={styles.sectionTitleNew}>
                    {t("addresses.savedTitle")}
                  </UIText>
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            <Animated.View
              entering={FadeInDown.duration(320).delay(addresses.length * 60 + 100)}
            >
              <Pressable
                onPress={handleAdd}
                style={styles.addCardBtn}
                accessibilityRole="button"
                accessibilityLabel={t("addresses.addNew")}
              >
                <View style={styles.addCardIcon}>
                  <Ionicons name="add" size={22} color={theme.colors.brand[700]} />
                </View>
                <View style={{ flex: 1 }}>
                  <UIText variant="body-sm" weight="bold" align="right">
                    {t("addresses.addNew")}
                  </UIText>
                  <UIText variant="caption" color="tertiary" align="right" style={styles.addCardDescNew}>
                    {t("addresses.addNewDesc")}
                  </UIText>
                </View>
                <Ionicons name="chevron-back" size={14} color={theme.colors.brand[700]} />
              </Pressable>
            </Animated.View>
          }
        />
      )}

      {/* ── Form Drawer ── */}
      <AddressFormDrawer
        visible={drawerVisible}
        address={editingAddress}
        onClose={() => setDrawerVisible(false)}
        onSubmit={handleSubmit}
        loading={submitting}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingBottom:     16,
    gap:               14,
    overflow:          "hidden",
  },
  decoCircle: {
    position:        "absolute",
    right:           -40,
    top:             -40,
    width:           140,
    height:          140,
    borderRadius:    70,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  decoCircle2: {
    position:        "absolute",
    left:            -20,
    bottom:          -30,
    width:           90,
    height:          90,
    borderRadius:    45,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  headerTopRow: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  backBtn: {
    width:           38,
    height:          38,
    borderRadius:    12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.12)",
  },
  addBtnHeader: {
    width:         42,
    height:        42,
    borderRadius:  13,
    backgroundColor: theme.colors.brand[600],
    alignItems:    "center",
    justifyContent: "center",
    ...theme.shadow.brand,
    shadowOpacity: 0.3,
  },
  headerEyebrowNew: {
    color:     "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  headerTitleNew: {
    letterSpacing: -0.4,
    marginTop:     2,
  },
  headerSubNew: {
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap:           8,
  },
  statPill: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderRadius:      999,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.10)",
  },

  // ── Loading skeletons ──
  loadingWrap: {
    flex:    1,
    padding: 20,
    gap:     12,
  },
  skeletonCard: {
    height:          180,
    borderRadius:    20,
    backgroundColor: theme.colors.slate[100],
  },

  // ── Empty state ──
  emptyWrap: {
    flex:              1,
    justifyContent:    "center",
    paddingHorizontal: 20,
  },

  // ── List ──
  list: {
    padding:       20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
    marginBottom:  14,
  },
  sectionIcon: {
    width:           34,
    height:          34,
    borderRadius:    11,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  sectionTitleNew: {
    letterSpacing: -0.2,
    marginTop:     1,
  },

  // ── Add address CTA ──
  addCardBtn: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             14,
    padding:         16,
    marginTop:       14,
    borderRadius:    18,
    backgroundColor: theme.colors.surface,
    borderWidth:     1.5,
    borderColor:     theme.colors.brand[200],
    borderStyle:     "dashed",
  },
  addCardIcon: {
    width:           48,
    height:          48,
    borderRadius:    14,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  addCardDescNew: {
    marginTop:       2,
    textTransform:   "none",
    letterSpacing:   0,
  },
});
