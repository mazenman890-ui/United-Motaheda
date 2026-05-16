import React, { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { usePaymentStore, hydratePaymentStore } from "@/stores/payment";
import { theme } from "@/theme";

export default function PaymentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const selected = usePaymentStore((s) => s.selected);

  useEffect(() => {
    hydratePaymentStore();
  }, []);

  const selectedLabel = usePaymentStore((s) =>
    s.methods.find((m) => m.type === s.selected)?.label ?? ""
  );

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <LinearGradient
        colors={["#011826", "#032B42", "#064D6E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.decoCircle} />

        <View style={styles.headerTopRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>طرق الدفع</Text>
            <Text style={styles.headerSub}>اختر طريقة الدفع المفضلة</Text>
          </View>
          <View style={styles.shieldIcon}>
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.green[400]} />
          </View>
        </View>

        {/* Active method badge */}
        <Animated.View entering={FadeIn.duration(200)} style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={12} color={theme.colors.green[400]} />
          <Text style={styles.activeBadgeText}>الطريقة الحالية: {selectedLabel}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}>

        {/* Trust banner */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.trustBanner}>
          <View style={styles.trustBannerRow}>
            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: theme.colors.green[50] }]}>
                <Ionicons name="lock-closed" size={14} color={theme.colors.green[600]} />
              </View>
              <Text style={styles.trustLabel}>مشفر</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: theme.colors.brand[50] }]}>
                <Ionicons name="shield-checkmark" size={14} color={theme.colors.brand[600]} />
              </View>
              <Text style={styles.trustLabel}>آمن</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: theme.colors.purple[50] }]}>
                <Ionicons name="eye-off" size={14} color={theme.colors.purple[600]} />
              </View>
              <Text style={styles.trustLabel}>خصوصية</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={[styles.trustIcon, { backgroundColor: theme.colors.amber[50] }]}>
                <Ionicons name="flash" size={14} color={theme.colors.amber[600]} />
              </View>
              <Text style={styles.trustLabel}>فوري</Text>
            </View>
          </View>
        </Animated.View>

        {/* Payment selector */}
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <PaymentMethodSelector />
        </Animated.View>

        {/* Info note */}
        <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={theme.colors.brand[600]} />
          <Text style={styles.infoNoteText}>
            يمكنك تغيير طريقة الدفع عند إتمام كل طلب. لن يتم حفظ أي بيانات مالية حساسة.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 12, overflow: "hidden" },
  decoCircle: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.03)",
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
  shieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  activeBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    color: "rgba(255,255,255,0.70)",
  },

  content: { padding: 20, gap: 20 },

  trustBanner: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    ...theme.shadow.xs,
  },
  trustBannerRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
  },
  trustItem: { alignItems: "center", gap: 6 },
  trustIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  trustLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.bold,
    color: theme.colors.slate[500],
  },

  infoNote: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.brand[50],
    borderWidth: 1,
    borderColor: theme.colors.brand[100],
  },
  infoNoteText: {
    flex: 1,
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.brand[700],
    textAlign: "right",
    lineHeight: 18,
  },
});
