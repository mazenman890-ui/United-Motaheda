import React, { useCallback, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { useOrderStore } from "@/stores/orders";
import { Button } from "@/components/ui/Button";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function getTier(points: number) {
  if (points >= 4000)
    return { name: "بلاتيني", color: "#A78BFA", ring: ["#8B5CF6", "#7C3AED"] as [string, string], icon: "diamond" as IoniconsName };
  if (points >= 1500)
    return { name: "ذهبي", color: "#FBBF24", ring: ["#F59E0B", "#D97706"] as [string, string], icon: "shield" as IoniconsName };
  if (points >= 500)
    return { name: "فضي", color: "#94A3B8", ring: ["#94A3B8", "#64748B"] as [string, string], icon: "shield-half" as IoniconsName };
  return { name: "برونزي", color: "#D97706", ring: ["#D97706", "#B45309"] as [string, string], icon: "shield-outline" as IoniconsName };
}

// ─── MenuRow ──────────────────────────────────────────────────────────────

function MenuRow({
  icon, label, subtitle, onPress, badge, color, danger, last,
}: {
  icon: IoniconsName;
  label: string;
  subtitle?: string;
  onPress: () => void;
  badge?: number | string;
  color?: string;
  danger?: boolean;
  last?: boolean;
}) {
  const ic = danger ? theme.colors.error.base : (color ?? theme.colors.brand[600]);
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.menuRow,
        !last && styles.menuRowBorder,
        pressed && { backgroundColor: theme.colors.slate[50] },
      ]}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? theme.colors.error.bg : `${ic}14` }]}>
        <Ionicons name={icon} size={17} color={ic} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, danger && { color: theme.colors.error.base }]}>{label}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {badge != null && (
        <View style={[styles.badge, danger && { backgroundColor: theme.colors.error.bg }]}>
          <Text style={[styles.badgeText, danger && { color: theme.colors.error.base }]}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-back" size={15} color={theme.colors.slate[300]} />
    </Pressable>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────

function StatPill({
  value, label, icon, accent, onPress, isLast,
}: {
  value: string | number;
  label: string;
  icon: IoniconsName;
  accent: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.statCol,
        pressed && { opacity: 0.65, transform: [{ scale: 0.96 }] },
      ]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}18` }]}>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const cartCount = useCartStore((s) => s.itemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const orders = useOrderStore((s) => s.orders);
  const [signingOut, setSigningOut] = useState(false);

  const { orderCount, totalSpent, loyaltyPoints, tier, lastOrder } = useMemo(() => {
    const spent = orders.reduce((sum, o) => sum + o.total, 0);
    const pts = Math.floor(spent / 10);
    return {
      orderCount: orders.length,
      totalSpent: spent,
      loyaltyPoints: pts,
      tier: getTier(pts),
      lastOrder: orders[0] ?? null,
    };
  }, [orders]);

  const handleSignOut = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setSigningOut(true);
    try { await signOut(); } finally { setSigningOut(false); }
  }, [signOut]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.layout.tabBarHeight + 24 }}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        {user ? (
          <View>
            <LinearGradient
              colors={["#011826", "#032B42", "#064D6E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={[styles.hero, { paddingTop: insets.top + 14 }]}>

              {/* Decorative layers */}
              <View style={styles.heroDecor1} />
              <View style={styles.heroDecor2} />
              <View style={styles.heroDecor3} />

              {/* Top bar */}
              <Animated.View entering={FadeIn.duration(200)} style={styles.heroTopBar}>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                  <Text style={styles.heroPageLabel}>حسابي</Text>
                </View>
                <Pressable
                  onPress={() => router.push("/notifications")}
                  style={styles.heroIconBtn}>
                  <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.8)" />
                </Pressable>
              </Animated.View>

              {/* Avatar + Identity */}
              <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.heroIdentity}>
                <View style={styles.avatarContainer}>
                  {/* Tier glow ring */}
                  <LinearGradient
                    colors={tier.ring}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGlow}
                  />
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>
                      {(user.name ?? user.email)?.[0]?.toUpperCase() ?? "U"}
                    </Text>
                  </View>
                  <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
                    <Ionicons name={tier.icon} size={10} color="#fff" />
                  </View>
                </View>

                <View style={styles.heroTextGroup}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.name ?? "المستخدم"}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>

                {/* Tier + Points */}
                <Pressable onPress={() => router.push("/loyalty")} style={styles.tierChip}>
                  <Ionicons name={tier.icon} size={11} color={tier.color} />
                  <Text style={styles.tierChipLabel}>عضو {tier.name}</Text>
                  <View style={styles.pointsChip}>
                    <Text style={styles.pointsChipText}>{loyaltyPoints}</Text>
                    <Text style={styles.pointsChipUnit}>نقطة</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </LinearGradient>

            {/* ── Stats Card (overlapping hero) ── */}
            <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.statsCard}>
              <StatPill
                value={orderCount}
                label="طلب"
                icon="bag-handle-outline"
                accent={theme.colors.brand[600]}
                onPress={() => router.push("/orders")}
              />
              <View style={styles.statDivider} />
              <StatPill
                value={wishlistCount}
                label="مفضلة"
                icon="heart-outline"
                accent={theme.colors.rose[500]}
                onPress={() => router.push("/favorites")}
              />
              <View style={styles.statDivider} />
              <StatPill
                value={loyaltyPoints}
                label="نقطة"
                icon="diamond-outline"
                accent="#9333EA"
                onPress={() => router.push("/loyalty")}
              />
              <View style={styles.statDivider} />
              <StatPill
                value={cartCount}
                label="سلة"
                icon="cart-outline"
                accent={theme.colors.amber[600]}
                onPress={() => router.push("/(tabs)/cart")}
                isLast
              />
            </Animated.View>

            {/* ── Last order ── */}
            {lastOrder && (
              <Animated.View entering={FadeInDown.delay(200).duration(320)} style={styles.quickCardWrap}>
                <Pressable
                  onPress={() => router.push("/orders")}
                  style={({ pressed }) => [styles.quickCard, pressed && { opacity: 0.88 }]}>
                  <View style={styles.quickCardIcon}>
                    <Ionicons name="bag-handle" size={17} color={theme.colors.brand[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                      <Text style={styles.quickCardTitle}>آخر طلب</Text>
                      <View style={styles.statusDot} />
                    </View>
                    <Text style={styles.quickCardSub}>
                      #{lastOrder.id.slice(-6)} • {lastOrder.items.length} منتج • {lastOrder.total.toFixed(0)} ج.م
                    </Text>
                  </View>
                  <Ionicons name="chevron-back" size={14} color={theme.colors.slate[300]} />
                </Pressable>
              </Animated.View>
            )}
          </View>
        ) : (
          /* ── Guest hero ── */
          <LinearGradient
            colors={["#011826", "#032B42", "#064D6E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={[styles.guestHero, { paddingTop: insets.top + 28 }]}>
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />

            <View style={styles.guestAvatar}>
              <Ionicons name="person" size={34} color="rgba(255,255,255,0.45)" />
            </View>
            <Text style={styles.guestTitle}>مرحباً بك في صيدليات المتحدة</Text>
            <Text style={styles.guestDesc}>
              سجّل دخولك للوصول إلى طلباتك ومفضلتك وبرنامج الولاء
            </Text>
            <View style={styles.guestActions}>
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={({ pressed }) => [styles.guestPrimaryBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] }]}>
                <Text style={styles.guestPrimaryText}>تسجيل الدخول</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(auth)/register")}
                style={({ pressed }) => [styles.guestSecondaryBtn, pressed && { opacity: 0.85 }]}>
                <Text style={styles.guestSecondaryText}>إنشاء حساب جديد</Text>
              </Pressable>
            </View>
          </LinearGradient>
        )}

        {/* ── Quick action grid ── */}
        {user && (
          <Animated.View entering={FadeInDown.delay(280).duration(280)} style={styles.quickGrid}>
            {([
              { icon: "bag-handle-outline", label: "طلباتي", color: theme.colors.brand[600], bg: theme.colors.brand[50], route: "/orders" },
              { icon: "heart-outline", label: "المفضلة", color: theme.colors.rose[500], bg: theme.colors.rose[50], route: "/favorites" },
              { icon: "diamond-outline", label: "الولاء", color: "#9333EA", bg: theme.colors.purple[50], route: "/loyalty" },
              { icon: "location-outline", label: "العناوين", color: theme.colors.amber[600], bg: theme.colors.amber[50], route: "/addresses" },
            ] as { icon: IoniconsName; label: string; color: string; bg: string; route: string }[]).map((a) => (
              <Pressable
                key={a.label}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  router.push(a.route as any);
                }}
                style={({ pressed }) => [styles.quickGridItem, pressed && { transform: [{ scale: 0.955 }], opacity: 0.85 }]}>
                <View style={[styles.quickGridIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={19} color={a.color} />
                </View>
                <Text style={styles.quickGridLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* ── Settings ── */}
        <Animated.View entering={FadeInDown.delay(340).duration(280)} style={styles.section}>
          <Text style={styles.sectionLabel}>الإعدادات</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="notifications-outline"
              label="الإشعارات"
              subtitle="تنبيهات الطلبات والعروض"
              onPress={() => router.push("/notifications")}
            />
            <MenuRow
              icon="location-outline"
              label="العناوين المحفوظة"
              subtitle="إدارة عناوين التوصيل"
              onPress={() => router.push("/addresses")}
            />
            <MenuRow
              icon="card-outline"
              label="طرق الدفع"
              subtitle="الدفع عند الاستلام، إنستاباي، فودافون"
              onPress={() => router.push("/payment")}
              last
            />
          </View>
        </Animated.View>

        {/* ── Support ── */}
        <Animated.View entering={FadeInDown.delay(400).duration(280)} style={styles.section}>
          <Text style={styles.sectionLabel}>الدعم والمساعدة</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="logo-whatsapp"
              label="تواصل واتساب"
              subtitle="رد سريع خلال دقائق"
              color="#25D366"
              onPress={() => Linking.openURL("https://wa.me/201112343212?text=مرحباً").catch(() => {})}
            />
            <MenuRow
              icon="call-outline"
              label="اتصل بنا"
              subtitle="01112343212"
              color={theme.colors.brand[600]}
              onPress={() => Linking.openURL("tel:01112343212").catch(() => {})}
            />
            <MenuRow
              icon="help-circle-outline"
              label="الأسئلة الشائعة"
              onPress={() => router.push("/faq")}
              last
            />
          </View>
        </Animated.View>

        {/* ── About ── */}
        <Animated.View entering={FadeInDown.delay(460).duration(280)} style={styles.section}>
          <Text style={styles.sectionLabel}>عن التطبيق</Text>
          <View style={styles.menuCard}>
            <MenuRow
              icon="information-circle-outline"
              label="عن صيدليات المتحدة"
              onPress={() => router.push("/about")}
            />
            <MenuRow
              icon="document-text-outline"
              label="سياسة الخصوصية"
              onPress={() => router.push("/privacy")}
            />
            <MenuRow
              icon="shield-checkmark-outline"
              label="الشروط والأحكام"
              onPress={() => router.push("/terms")}
              last
            />
          </View>
        </Animated.View>

        {/* ── Sign out ── */}
        {user && (
          <Animated.View entering={FadeInDown.delay(520).duration(280)} style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Button variant="ghost" size="md" fullWidth loading={signingOut} onPress={handleSignOut}>
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                <Ionicons name="log-out-outline" size={16} color={theme.colors.error.base} />
                <Text style={{ fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.error.base }}>
                  تسجيل الخروج
                </Text>
              </View>
            </Button>
          </Animated.View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Ionicons name="medkit" size={12} color={theme.colors.brand[600]} />
            <Text style={styles.footerBrandText}>صيدليات المتحدة</Text>
          </View>
          <Text style={styles.footerSub}>United Pharmacies</Text>
          <Text style={styles.footerVersion}>الإصدار 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },

  // ── Hero (logged in) ──
  hero: { paddingHorizontal: 20, paddingBottom: 58, overflow: "hidden" },
  heroDecor1: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroDecor2: {
    position: "absolute",
    left: -30,
    bottom: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.025)",
  },
  heroDecor3: {
    position: "absolute",
    right: 60,
    top: 40,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  heroTopBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  heroPageLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.extrabold,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
  },
  heroIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },

  // Avatar
  heroIdentity: { alignItems: "center", gap: 5 },
  avatarContainer: { position: "relative", marginBottom: 10 },
  avatarGlow: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 30,
    opacity: 0.6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarLetter: { fontSize: 32, fontFamily: theme.fonts.black, color: "#032B42" },
  tierBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  heroTextGroup: { alignItems: "center", gap: 2 },
  userName: { fontSize: 19, fontFamily: theme.fonts.black, color: "#fff" },
  userEmail: { fontSize: 11.5, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.55)" },

  // Tier chip
  tierChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  tierChipLabel: { fontSize: 11, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.90)" },
  pointsChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pointsChipText: { fontSize: 11, fontFamily: theme.fonts.black, color: "#fff" },
  pointsChipUnit: { fontSize: 9, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.65)" },

  // ── Guest hero ──
  guestHero: {
    paddingHorizontal: 24,
    paddingBottom: 34,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  guestAvatar: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 4,
  },
  guestTitle: { fontSize: 18, fontFamily: theme.fonts.black, color: "#fff", textAlign: "center" },
  guestDesc: { fontSize: 12, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 18 },
  guestActions: { width: "100%", marginTop: 16, gap: 9 },
  guestPrimaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    ...theme.shadow.md,
  },
  guestPrimaryText: { fontSize: 14, fontFamily: theme.fonts.black, color: "#032B42" },
  guestSecondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  guestSecondaryText: { fontSize: 13, fontFamily: theme.fonts.bold, color: "#fff" },

  // ── Stats card ──
  statsCard: {
    flexDirection: "row-reverse",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -36,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 4,
    ...theme.shadow.lg,
    borderWidth: 1,
    borderColor: theme.colors.slate[100],
  },
  statCol: { flex: 1, alignItems: "center", gap: 4 },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statDivider: { width: 1, backgroundColor: theme.colors.slate[100], marginVertical: 8 },
  statValue: { fontSize: 18, fontFamily: theme.fonts.black, color: theme.colors.slate[900] },
  statLabel: { fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400] },

  // ── Quick last-order card ──
  quickCardWrap: { paddingHorizontal: 16, marginTop: 12 },
  quickCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: theme.colors.slate[100],
    ...theme.shadow.xs,
  },
  quickCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
  },
  quickCardTitle: { fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.slate[800], textAlign: "right" },
  quickCardSub: { fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "right", marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.green[500] },

  // ── Quick action grid ──
  quickGrid: {
    flexDirection: "row-reverse",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  quickGridItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: theme.colors.slate[100],
    ...theme.shadow.xs,
  },
  quickGridIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  quickGridLabel: { fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.slate[700] },

  // ── Sections ──
  section: { paddingHorizontal: 16, marginTop: 24, gap: 8 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.extrabold,
    color: theme.colors.slate[400],
    letterSpacing: 1.8,
    textAlign: "right",
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.slate[100],
    ...theme.shadow.xs,
  },

  // ── Menu row ──
  menuRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.slate[100],
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.slate[800], textAlign: "right" },
  menuSubtitle: { fontSize: 10.5, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "right", marginTop: 1 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  badgeText: { fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },

  // ── Footer ──
  footer: { alignItems: "center", marginTop: 28, gap: 4, paddingBottom: 8 },
  footerBrand: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.brand[50],
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  footerBrandText: { fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },
  footerSub: { fontSize: 9, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], letterSpacing: 1 },
  footerVersion: { fontSize: 9.5, fontFamily: theme.fonts.regular, color: theme.colors.slate[300], marginTop: 2 },
});
