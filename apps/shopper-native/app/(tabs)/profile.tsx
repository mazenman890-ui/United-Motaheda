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
import { useAuth } from "@/features/auth";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { useOrderStore } from "@/stores/orders";
import { useLoyaltyBalance } from "@/features/loyalty";
import { Button } from "@/components/ui/Button";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "@/i18n/LanguageProvider";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function getTier(points: number) {
  if (points >= 4000)
    return { name: "بلاتيني", color: theme.colors.purple[400], ring: [theme.colors.purple[500], theme.colors.purple[700]] as [string, string], icon: "diamond" as IoniconsName };
  if (points >= 1500)
    return { name: "ذهبي", color: theme.colors.amber[300], ring: [theme.colors.amber[400], theme.colors.amber[500]] as [string, string], icon: "shield" as IoniconsName };
  if (points >= 500)
    return { name: "فضي", color: theme.colors.slate[400], ring: [theme.colors.slate[400], theme.colors.slate[600]] as [string, string], icon: "shield-half" as IoniconsName };
  return { name: "برونزي", color: theme.colors.amber[500], ring: [theme.colors.amber[500], theme.colors.amber[700]] as [string, string], icon: "shield-outline" as IoniconsName };
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
  const ic = danger ? theme.colors.error.base : (color ?? theme.colors.brand[700]);
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}، ${subtitle}` : label}
      style={({ pressed }) => [
        styles.menuRow,
        !last && styles.menuRowBorder,
        pressed && { backgroundColor: theme.colors.surfaceSunken },
      ]}>
      <View style={[
        styles.menuIcon,
        { backgroundColor: danger ? theme.colors.error.bg : `${ic}14`,
          borderColor:     danger ? theme.colors.error.light : `${ic}22` },
      ]}>
        <Ionicons name={icon} size={17} color={ic} />
      </View>
      <View style={styles.menuTextWrap}>
        <UIText
          variant="body-sm"
          weight="bold"
          align="right"
          style={danger ? { color: theme.colors.error.base } : undefined}>
          {label}
        </UIText>
        {subtitle && (
          <UIText variant="caption" color="tertiary" align="right" style={styles.menuSubtitleNew}>
            {subtitle}
          </UIText>
        )}
      </View>
      {badge != null && (
        <View style={[styles.badge, danger && { backgroundColor: theme.colors.error.bg }]}>
          <UIText
            variant="eyebrow"
            style={{ color: danger ? theme.colors.error.base : theme.colors.brand[700] }}>
            {badge}
          </UIText>
        </View>
      )}
      <Ionicons name="chevron-back" size={15} color={theme.colors.slate[300]} />
    </Pressable>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────

function StatPill({
  value, label, icon, accent, onPress,
}: {
  value: string | number;
  label: string;
  icon: IoniconsName;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [
        styles.statCol,
        pressed && { opacity: 0.72, transform: [{ scale: 0.97 }] },
      ]}>
      <View style={[
        styles.statIconWrap,
        { backgroundColor: `${accent}14`, borderColor: `${accent}26` },
      ]}>
        <Ionicons name={icon} size={15} color={accent} />
      </View>
      <UIText variant="card-title" weight="black" style={styles.statValueNew}>
        {value}
      </UIText>
      <UIText variant="eyebrow" color="tertiary">
        {label}
      </UIText>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { language, setLanguage } = useAppLanguage();
  const { user, signOut } = useAuth();
  const cartCount = useCartStore((s) => s.itemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const orders = useOrderStore((s) => s.orders);
  const [signingOut, setSigningOut] = useState(false);

  // Real server-side loyalty balance — only fetch when authenticated.
  const loyaltyBalanceQuery = useLoyaltyBalance(!!user?.id);

  const { orderCount, loyaltyPoints, tier, lastOrder } = useMemo(() => {
    // Use the real server balance when available; fall back to local approximation
    // (floor(spend/10)) so the profile renders instantly from cached orders.
    const realBalance = loyaltyBalanceQuery.data?.balance;
    const spent = orders.reduce((sum, o) => sum + o.total, 0);
    const pts = realBalance ?? Math.floor(spent / 10);
    return {
      orderCount: orders.length,
      loyaltyPoints: pts,
      tier: getTier(pts),
      lastOrder: orders[0] ?? null,
    };
  }, [orders, loyaltyBalanceQuery.data?.balance]);

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
              colors={theme.gradients.heroPrimary as [string, string, string]}
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
                  <UIText variant="eyebrow" style={styles.heroPageLabelNew}>حسابي</UIText>
                </View>
                <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                  <Pressable
                    onPress={() => router.push("/(tabs)/cart")}
                    accessibilityRole="button"
                    accessibilityLabel={cartCount > 0 ? `السلة، ${cartCount} عنصر` : "السلة"}
                    style={styles.heroIconBtn}>
                    <Ionicons name="bag-outline" size={16} color="rgba(255,255,255,0.8)" />
                    {cartCount > 0 && (
                      <View style={styles.heroIconBadge}>
                        <Text style={styles.heroIconBadgeText}>
                          {cartCount > 9 ? "9+" : cartCount}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => router.push("/notifications")}
                    accessibilityRole="button"
                    accessibilityLabel="الإعدادات"
                    style={styles.heroIconBtn}>
                    <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.8)" />
                  </Pressable>
                </View>
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
                  <UIText variant="sheet-title" color="inverse" numberOfLines={1} style={styles.userNameNew}>
                    {user.name ?? "المستخدم"}
                  </UIText>
                  <UIText variant="body-sm" color="inverse-muted" numberOfLines={1}>
                    {user.email}
                  </UIText>
                </View>

                {/* Tier + Points */}
                <Pressable onPress={() => router.push("/loyalty")} style={styles.tierChip}>
                  <Ionicons name={tier.icon} size={12} color={tier.color} />
                  <UIText variant="caption" weight="bold" style={styles.tierChipLabelNew}>
                    عضو {tier.name}
                  </UIText>
                  <View style={styles.pointsChip}>
                    <UIText variant="caption" weight="black" style={styles.pointsChipTextNew}>
                      {loyaltyPoints}
                    </UIText>
                    <UIText variant="eyebrow" style={styles.pointsChipUnitNew}>نقطة</UIText>
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
                      <UIText variant="body-sm" weight="bold" align="right">آخر طلب</UIText>
                      <View style={styles.statusDot} />
                    </View>
                    <UIText variant="caption" color="tertiary" align="right" style={styles.quickCardSubNew}>
                      #{lastOrder.id.slice(-6)}  •  {lastOrder.items.length} منتج  •  {lastOrder.total.toFixed(0)} ج.م
                    </UIText>
                  </View>
                  <Ionicons name="chevron-back" size={14} color={theme.colors.slate[300]} />
                </Pressable>
              </Animated.View>
            )}
          </View>
        ) : (
          /* ── Guest hero ── */
          <LinearGradient
            colors={theme.gradients.heroPrimary as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={[styles.guestHero, { paddingTop: insets.top + 28 }]}>
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />

            <View style={styles.guestAvatar}>
              <Ionicons name="person" size={34} color="rgba(255,255,255,0.45)" />
            </View>
            <UIText variant="sheet-title" color="inverse" align="center" style={styles.guestTitleNew}>
              مرحباً بك في صيدليات المتحدة
            </UIText>
            <UIText variant="body-sm" color="inverse-muted" align="center" style={styles.guestDescNew}>
              سجّل دخولك للوصول إلى طلباتك ومفضلتك وبرنامج الولاء
            </UIText>
            <View style={styles.guestActions}>
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={({ pressed }) => [styles.guestPrimaryBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] }]}>
                <UIText variant="body-sm" weight="black" style={{ color: theme.colors.heroMid }}>
                  تسجيل الدخول
                </UIText>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(auth)/register")}
                style={({ pressed }) => [styles.guestSecondaryBtn, pressed && { opacity: 0.85 }]}>
                <UIText variant="body-sm" weight="extrabold" color="inverse">
                  إنشاء حساب جديد
                </UIText>
              </Pressable>
            </View>
          </LinearGradient>
        )}

        {/* ── Quick action grid ── */}
        {user && (
          <Animated.View entering={FadeInDown.delay(280).duration(280)} style={styles.quickGrid}>
            {([
              { icon: "bag-handle-outline", label: "طلباتي", color: theme.colors.brand[600], bg: theme.colors.brand[50], route: "/orders"    },
              { icon: "heart-outline",      label: "المفضلة", color: theme.colors.rose[500],  bg: theme.colors.rose[50],  route: "/favorites" },
              { icon: "diamond-outline",    label: "الولاء",  color: "#9333EA",               bg: theme.colors.purple[50], route: "/loyalty"  },
              { icon: "location-outline",   label: "العناوين", color: theme.colors.amber[600], bg: theme.colors.amber[50], route: "/addresses" },
            ] as const).map((a) => (
              <Pressable
                key={a.label}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                  router.push(a.route as Parameters<typeof router.push>[0]);
                }}
                style={({ pressed }) => [styles.quickGridItem, pressed && { transform: [{ scale: 0.955 }], opacity: 0.85 }]}>
                <View style={[
                  styles.quickGridIcon,
                  { backgroundColor: a.bg, borderColor: `${a.color}22` },
                ]}>
                  <Ionicons name={a.icon} size={20} color={a.color} />
                </View>
                <UIText variant="caption" weight="bold" align="center" color="secondary">
                  {a.label}
                </UIText>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* ── Settings ── */}
        <Animated.View entering={FadeInDown.delay(340).duration(280)} style={styles.section}>
          <UIText variant="eyebrow" color="tertiary" align="right" style={styles.sectionLabelNew}>الإعدادات</UIText>
          <View style={styles.menuCard}>
            <MenuRow
              icon="language-outline"
              label={t("language.label")}
              subtitle={language === "ar" ? t("language.en") : t("language.ar")}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                void setLanguage(language === "ar" ? "en" : "ar");
              }}
            />
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
          <UIText variant="eyebrow" color="tertiary" align="right" style={styles.sectionLabelNew}>الدعم والمساعدة</UIText>
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
          <UIText variant="eyebrow" color="tertiary" align="right" style={styles.sectionLabelNew}>عن التطبيق</UIText>
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
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
                <Ionicons name="log-out-outline" size={16} color={theme.colors.error.base} />
                <UIText variant="body-sm" weight="black" style={{ color: theme.colors.error.base }}>
                  تسجيل الخروج
                </UIText>
              </View>
            </Button>
          </Animated.View>
        )}

        {/* ── Footer — quiet, anchored ─────────────────────────────────── */}
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Ionicons name="medkit" size={12} color={theme.colors.brand[700]} />
            <UIText variant="caption" weight="bold" style={{ color: theme.colors.brand[700] }}>
              صيدليات المتحدة
            </UIText>
          </View>
          <UIText variant="eyebrow" color="tertiary">United Pharmacies</UIText>
          <UIText variant="eyebrow" color="disabled" style={styles.footerVersionNew}>
            الإصدار 1.0.0
          </UIText>
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
  heroPageLabelNew: {
    color: "rgba(255,255,255,0.55)",
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
    position: "relative",
  },
  heroIconBadge: {
    position: "absolute",
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: theme.colors.error.base,
    borderWidth: 2,
    borderColor: theme.colors.hero,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconBadgeText: {
    color: "#fff",
    fontSize: 10,
    lineHeight: 12,
    fontFamily: theme.fonts.extrabold,
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
  avatarLetter: { fontSize: 32, fontFamily: theme.fonts.black, color: theme.colors.heroMid },
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
  heroTextGroup: { alignItems: "center", gap: 4 },
  userName: { fontSize: 19, fontFamily: theme.fonts.black, color: "#fff" },
  userEmail: { fontSize: 11.5, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.55)" },
  userNameNew: {
    letterSpacing: -0.4,
  },

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
  tierChipLabelNew: { color: "rgba(255,255,255,0.92)" },
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
  pointsChipTextNew: { color: "#fff" },
  pointsChipUnitNew: { color: "rgba(255,255,255,0.70)" },

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
  guestTitleNew: {
    letterSpacing: -0.4,
    marginTop:     8,
  },
  guestDescNew: {
    lineHeight: 20,
    maxWidth:   320,
  },
  guestActions: { width: "100%", marginTop: 16, gap: 9 },
  guestPrimaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    ...theme.shadow.md,
  },
  guestPrimaryText: { fontSize: 14, fontFamily: theme.fonts.black, color: theme.colors.heroMid },
  guestSecondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  guestSecondaryText: { fontSize: 13, fontFamily: theme.fonts.bold, color: "#fff" },

  // ── Stats card — clinical lifted surface, hairline dividers ──
  statsCard: {
    flexDirection:    "row-reverse",
    backgroundColor:  theme.colors.surface,
    marginHorizontal: 16,
    marginTop:        -36,
    borderRadius:     20,
    paddingVertical:  18,
    paddingHorizontal: 4,
    ...theme.shadow.lg,
    shadowOpacity:    0.10,
  },
  statCol: {
    flex:       1,
    alignItems: "center",
    gap:        6,
  },
  statIconWrap: {
    width:           34,
    height:          34,
    borderRadius:    11,
    alignItems:      "center",
    justifyContent:  "center",
    marginBottom:    2,
    borderWidth:     1,
  },
  statDivider: {
    width:           StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border.hairline,
    marginVertical:  10,
  },
  statValue: { fontSize: 18, fontFamily: theme.fonts.black, color: theme.colors.slate[900] },
  statLabel: { fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400] },
  statValueNew: {
    letterSpacing: -0.3,
  },

  // ── Quick last-order card ──
  quickCardWrap: { paddingHorizontal: 16, marginTop: 14 },
  quickCard: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surface,
    borderRadius:    16,
    padding:         14,
    ...theme.shadow.card,
  },
  quickCardIcon: {
    width:           42,
    height:          42,
    borderRadius:    13,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
  },
  quickCardTitle: { fontSize: 12, fontFamily: theme.fonts.black, color: theme.colors.slate[800], textAlign: "right" },
  quickCardSub: { fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "right", marginTop: 1 },
  quickCardSubNew: {
    marginTop: 2,
    textTransform: "none",
    letterSpacing: 0,
  },
  statusDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: theme.colors.success.base,
  },

  // ── Quick action grid ──
  quickGrid: {
    flexDirection:     "row-reverse",
    gap:               10,
    paddingHorizontal: 16,
    marginTop:         18,
  },
  quickGridItem: {
    flex:              1,
    backgroundColor:   theme.colors.surface,
    borderRadius:      16,
    paddingVertical:   16,
    paddingHorizontal: 8,
    alignItems:        "center",
    gap:               10,
    ...theme.shadow.card,
  },
  quickGridIcon: {
    width:           46,
    height:          46,
    borderRadius:    14,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
  },
  quickGridLabel: { fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.slate[700] },

  // ── Sections — predictable rhythm across the screen ──
  section: {
    paddingHorizontal: 16,
    marginTop:         28,
    gap:               10,
  },
  sectionLabel: {
    fontSize:      10,
    fontFamily:    theme.fonts.extrabold,
    color:         theme.colors.slate[400],
    letterSpacing: 1.8,
    textAlign:     "right",
    paddingHorizontal: 4,
  },
  sectionLabelNew: {
    paddingHorizontal: 4,
    marginBottom:      4,
  },
  // ── Menu card — clinical elevated container ──
  menuCard: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    overflow:        "hidden",
    ...theme.shadow.card,
  },

  // ── Menu row — refined disclosure rhythm ──
  menuRow: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    gap:              12,
    paddingHorizontal: 16,
    paddingVertical:   15,
  },
  menuRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  menuIcon: {
    width:           40,
    height:          40,
    borderRadius:    12,
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     1,
  },
  menuTextWrap: {
    flex: 1,
    gap:  2,
  },
  menuLabel: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.slate[800], textAlign: "right" },
  menuSubtitle: { fontSize: 10.5, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "right", marginTop: 1 },
  menuSubtitleNew: {
    marginTop:     2,
    textTransform: "none",
    letterSpacing: 0,
  },
  badge: {
    minWidth:        24,
    height:          24,
    borderRadius:    12,
    backgroundColor: theme.colors.brand.lighter,
    borderWidth:     1,
    borderColor:     theme.colors.border.brandSoft,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 8,
  },
  badgeText: { fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },

  // ── Footer — quiet anchor ──
  footer: {
    alignItems: "center",
    marginTop:  32,
    gap:        6,
    paddingBottom: 12,
  },
  footerBrand: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             6,
    backgroundColor: theme.colors.brand.lighter,
    borderRadius:    999,
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
  },
  footerBrandText: { fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.brand[700] },
  footerSub: { fontSize: 9, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], letterSpacing: 1 },
  footerVersion: { fontSize: 9.5, fontFamily: theme.fonts.regular, color: theme.colors.slate[300], marginTop: 2 },
  footerVersionNew: {
    marginTop: 4,
  },
});
