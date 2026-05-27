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
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/features/auth";
import {
  useNotificationPreferences,
  type NotificationCategoryPrefs,
  type NotificationChannelPrefs,
} from "@/features/notifications";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const CHANNELS: Array<{
  key: keyof NotificationChannelPrefs;
  label: string;
  description: string;
  icon: IoniconsName;
  color: string;
  bg: string;
}> = [
  {
    key: "push",
    label: "الإشعارات الفورية",
    description: "تنبيهات داخل التطبيق على جهازك",
    icon: "notifications-outline",
    color: theme.colors.brand[600],
    bg: theme.colors.brand[50],
  },
  {
    key: "email",
    label: "البريد الإلكتروني",
    description: "تأكيدات الطلبات والملخصات الأسبوعية",
    icon: "mail-outline",
    color: theme.colors.purple[600],
    bg: theme.colors.purple[50],
  },
  {
    key: "sms",
    label: "الرسائل النصية",
    description: "رموز التحقق وتنبيهات الطلبات الحرجة",
    icon: "chatbubble-outline",
    color: theme.colors.amber[600],
    bg: theme.colors.amber[50],
  },
];

const CATEGORIES: Array<{
  key: keyof NotificationCategoryPrefs;
  label: string;
  description: string;
  icon: IoniconsName;
  color: string;
}> = [
  {
    key: "order_updates",
    label: "تحديثات الطلبات",
    description: "حالة الطلب والتوصيل",
    icon: "bag-handle-outline",
    color: theme.colors.brand[600],
  },
  {
    key: "promotions",
    label: "العروض والخصومات",
    description: "عروض حصرية وكوبونات",
    icon: "pricetag-outline",
    color: theme.colors.amber[600],
  },
  {
    key: "security_alerts",
    label: "تنبيهات الأمان",
    description: "تسجيل دخول من جهاز جديد",
    icon: "shield-checkmark-outline",
    color: theme.colors.green[600],
  },
  {
    key: "health_reminders",
    label: "تذكيرات صحية",
    description: "مواعيد الأدوية والمتابعة",
    icon: "heart-outline",
    color: theme.colors.rose[500],
  },
  {
    key: "new_arrivals",
    label: "وصل حديثاً",
    description: "منتجات جديدة في المخزون",
    icon: "sparkles-outline",
    color: theme.colors.purple[600],
  },
  {
    key: "account_updates",
    label: "تحديثات الحساب",
    description: "تغييرات الملف الشخصي والإعدادات",
    icon: "person-outline",
    color: theme.colors.slate[600],
  },
];

export default function NotificationPreferencesScreen() {
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
            accessibilityLabel="رجوع">
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>تفضيلات الإشعارات</Text>
            <Text style={styles.headerSub}>تحكم في طرق وأنواع التنبيهات</Text>
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
            <Text style={styles.signedOutText}>
              سجل دخولك لحفظ تفضيلاتك على الخادم
            </Text>
          </Animated.View>
        )}

        {/* ── Channels ── */}
        <Animated.View entering={FadeInDown.duration(280)}>
          <SectionHeader icon="megaphone-outline" title="قنوات التواصل" />
          <View style={styles.card}>
            {CHANNELS.map((ch, i) => (
              <View key={ch.key} style={[styles.row, i < CHANNELS.length - 1 && styles.rowBorder]}>
                <View style={[styles.rowIcon, { backgroundColor: ch.bg }]}>
                  <Ionicons name={ch.icon} size={17} color={ch.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{ch.label}</Text>
                  <Text style={styles.rowDesc}>{ch.description}</Text>
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
          <SectionHeader icon="grid-outline" title="أنواع الإشعارات" />
          <View style={styles.card}>
            {CATEGORIES.map((cat, i) => (
              <View key={cat.key} style={[styles.row, i < CATEGORIES.length - 1 && styles.rowBorder]}>
                <View style={[styles.rowIcon, { backgroundColor: cat.color + "18" }]}>
                  <Ionicons name={cat.icon} size={16} color={cat.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{cat.label}</Text>
                  <Text style={styles.rowDesc}>{cat.description}</Text>
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
          <Text style={styles.footerText}>
            تنبيهات الأمان وتأكيدات الطلبات الحرجة قد تُرسل دائماً بغض النظر عن إعداداتك.
          </Text>
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
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // Header
  header: { paddingHorizontal: 20, paddingBottom: 16, overflow: "hidden" },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: { fontSize: 18, fontFamily: theme.fonts.black, color: "#fff", textAlign: "right" },
  headerSub: { fontSize: 11, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.50)", textAlign: "right" },
  shieldIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },

  // Signed-out banner
  signedOutBanner: {
    flexDirection: "row-reverse", alignItems: "center", gap: 8,
    backgroundColor: theme.colors.amber[50],
    borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.amber[100],
  },
  signedOutText: {
    flex: 1, fontSize: 11, fontFamily: theme.fonts.bold,
    color: theme.colors.amber[800], textAlign: "right",
  },

  // Sections
  sectionHead: { flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, fontFamily: theme.fonts.black, color: theme.colors.text.primary },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    overflow: "hidden",
    ...theme.shadow.xs,
  },
  row: {
    flexDirection: "row-reverse", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.text.primary, textAlign: "right" },
  rowDesc: { fontSize: 10, fontFamily: theme.fonts.regular, color: theme.colors.slate[400], textAlign: "right" },

  // Footer
  footerNote: {
    flexDirection: "row-reverse", alignItems: "flex-start", gap: 8,
    backgroundColor: theme.colors.brand[50],
    borderRadius: 12, padding: 12, marginTop: 18,
    borderWidth: 1, borderColor: theme.colors.brand[100],
  },
  footerText: {
    flex: 1, fontSize: 11, fontFamily: theme.fonts.regular,
    color: theme.colors.brand[700], textAlign: "right", lineHeight: 18,
  },
});
