import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
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
import { useAuth } from "@/contexts/AuthContext";
import { useAddressStore } from "@/stores/addresses";
import { AddressCard } from "@/components/AddressCard";
import { AddressFormDrawer } from "@/components/AddressFormDrawer";
import { EmptyState } from "@/components/ui/EmptyState";
import { theme } from "@/theme";
import type { Address, AddressFormData } from "@/types/address";

export default function AddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const addresses = useAddressStore((s) => s.addresses);
  const loading = useAddressStore((s) => s.loading);
  const fetchAddresses = useAddressStore((s) => s.fetch);
  const addAddress = useAddressStore((s) => s.add);
  const updateAddress = useAddressStore((s) => s.update);
  const removeAddress = useAddressStore((s) => s.remove);
  const setDefault = useAddressStore((s) => s.setDefault);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) fetchAddresses(user.id);
  }, [user?.id, fetchAddresses]);

  const defaultAddr = useMemo(() => addresses.find((a) => a.is_default), [addresses]);

  const handleAdd = useCallback(() => {
    setEditingAddress(null);
    setDrawerVisible(true);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleEdit = useCallback((addr: Address) => {
    setEditingAddress(addr);
    setDrawerVisible(true);
  }, []);

  const handleDelete = useCallback((addr: Address) => {
    Alert.alert(
      "حذف العنوان",
      `هل تريد حذف "${addr.recipient_name}" نهائياً؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            removeAddress(addr.id);
          },
        },
      ]
    );
  }, [removeAddress]);

  const handleSetDefault = useCallback((addr: Address) => {
    if (!user?.id) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDefault(addr.id, user.id);
  }, [user?.id, setDefault]);

  const handleSubmit = useCallback(async (data: AddressFormData) => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, user.id, data);
      } else {
        await addAddress(user.id, data);
      }
      setDrawerVisible(false);
    } catch (e) {
      Alert.alert("خطأ", "تعذر حفظ العنوان. حاول مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }, [user?.id, editingAddress, updateAddress, addAddress]);

  const renderAddress = useCallback(({ item, index }: { item: Address; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(280)}>
      <AddressCard
        address={item}
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item)}
        onSetDefault={() => handleSetDefault(item)}
      />
    </Animated.View>
  ), [handleEdit, handleDelete, handleSetDefault]);

  return (
    <View style={styles.screen}>
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={["#011826", "#032B42", "#064D6E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>
        {/* Decorative elements */}
        <View style={styles.decoCircle} />
        <View style={styles.decoCircle2} />

        <View style={styles.headerTopRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>عناويني</Text>
            <Text style={styles.headerSub}>
              {addresses.length > 0 ? `${addresses.length} عنوان محفوظ` : "أضف عنوانك الأول"}
            </Text>
          </View>
          <Pressable onPress={handleAdd} style={styles.addBtnHeader}>
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Quick stats */}
        {addresses.length > 0 && (
          <Animated.View entering={FadeIn.duration(250)} style={styles.statsRow}>
            <View style={styles.statPill}>
              <Ionicons name="location" size={12} color={theme.colors.brand[400]} />
              <Text style={styles.statText}>{addresses.length} عنوان</Text>
            </View>
            {defaultAddr && (
              <View style={[styles.statPill, { borderColor: "rgba(34,197,94,0.3)" }]}>
                <Ionicons name="checkmark-circle" size={12} color={theme.colors.green[400]} />
                <Text style={[styles.statText, { color: theme.colors.green[200] }]}>
                  {defaultAddr.city} — الافتراضي
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </LinearGradient>

      {/* ── Content ── */}
      {loading && addresses.length === 0 ? (
        <View style={styles.loadingWrap}>
          {[1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(i * 100).duration(300)}
              style={styles.skeletonCard}
            />
          ))}
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="location-outline"
            title="لا توجد عناوين محفوظة"
            description="أضف عنوان التوصيل الأول الخاص بك لتسهيل عملية الطلب"
            actionLabel="إضافة عنوان"
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
          ListHeaderComponent={
            addresses.length > 1 ? (
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="map-outline" size={13} color={theme.colors.brand[600]} />
                </View>
                <Text style={styles.sectionTitle}>العناوين المحفوظة</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            <Animated.View entering={FadeInDown.delay(addresses.length * 60 + 100).duration(280)}>
              <Pressable onPress={handleAdd} style={styles.addCardBtn}>
                <View style={styles.addCardIcon}>
                  <Ionicons name="add" size={20} color={theme.colors.brand[600]} />
                </View>
                <View>
                  <Text style={styles.addCardTitle}>إضافة عنوان جديد</Text>
                  <Text style={styles.addCardDesc}>أضف موقع توصيل إضافي</Text>
                </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
    overflow: "hidden",
  },
  decoCircle: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  decoCircle2: {
    position: "absolute",
    left: -20,
    bottom: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  headerTopRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.black,
    color: "#fff",
    textAlign: "right",
  },
  headerSub: {
    fontSize: 11,
    fontFamily: theme.fonts.semibold,
    color: "rgba(255,255,255,0.50)",
    textAlign: "right",
  },
  addBtnHeader: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.brand,
  },
  statsRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  statPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  statText: {
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    color: "rgba(255,255,255,0.70)",
  },

  // Loading skeletons
  loadingWrap: { flex: 1, padding: 20, gap: 12 },
  skeletonCard: {
    height: 180,
    borderRadius: 20,
    backgroundColor: theme.colors.slate[100],
  },

  // Empty
  emptyWrap: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },

  // List
  list: { padding: 20, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.black,
    color: theme.colors.text.primary,
  },

  // Add card (dashed border)
  addCardBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 16,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: theme.colors.brand[100],
    borderStyle: "dashed",
  },
  addCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  addCardTitle: {
    fontSize: 13,
    fontFamily: theme.fonts.bold,
    color: theme.colors.brand[700],
    textAlign: "right",
  },
  addCardDesc: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    color: theme.colors.slate[400],
    textAlign: "right",
  },
});
