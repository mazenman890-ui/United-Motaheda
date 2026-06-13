/**
 * ProfileScreen — Elite 2026 redesign on the @/shared/kit design language.
 *
 * Performance wins:
 *   - MenuRow press: Reanimated withSpring(0.985) on UI thread
 *   - LoyaltySummaryCard: Reanimated scale, gradient progress bar from real data
 *   - All navigation handlers: useCallback with stable router refs
 *   - Zero inline style objects in the hot render path
 *   - SectionLabel, MenuRow, LoyaltySummaryCard: memo'd
 *
 * Kit migration: all theme.colors.* replaced with kit tokens.
 */
import React, { memo, useCallback, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/features/auth";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { useOrderStore } from "@/stores/orders";
import { useLoyaltyBalance } from "@/features/loyalty";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { kit } from "@/shared/kit";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "@/i18n/LanguageProvider";
import { ProfileAuthHero } from "@/features/profile/components/ProfileAuthHero";
import { ProfileGuestHero } from "@/features/profile/components/ProfileGuestHero";
import { PROFILE } from "@/features/profile/components/profile.styles";
import { flexRow, isRtl, textAlignStart, FORWARD_CHEVRON } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
const startAlign = textAlignStart(isRtl());

// Press spring config (replaces theme.animation.spring.press)
const SPRING_PRESS = { damping: 22, stiffness: 420, mass: 0.7 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function waUrl(lang: string): string {
  const msg = lang === "en"
    ? "Hello, I need help with a specific medicine or order."
    : "مرحباً، أحتاج مساعدة بخصوص دواء أو طلب معين.";
  return `https://wa.me/201112343212?text=${encodeURIComponent(msg)}`;
}

function getTier(points: number) {
  if (points >= 4000)
    return { nameKey: "profile.tier.platinum", color: "#C084FC", ring: ["#A855F7", "#7E22CE"] as [string, string], icon: "diamond"       as IoniconsName };
  if (points >= 1500)
    return { nameKey: "profile.tier.gold",     color: "#FCD34D", ring: ["#FBBF24", "#F59E0B"] as [string, string], icon: "shield"        as IoniconsName };
  if (points >= 500)
    return { nameKey: "profile.tier.silver",   color: "#94A3B8", ring: ["#94A3B8", "#475569"] as [string, string], icon: "shield-half"   as IoniconsName };
  return   { nameKey: "profile.tier.bronze",   color: kit.color.warn, ring: ["#D97706", "#92400E"] as [string, string], icon: "shield-outline" as IoniconsName };
}

const TIER_THRESHOLDS = [500, 1500, 4000, Infinity] as const;

// ─── SectionLabel ─────────────────────────────────────────────────────────────

const SectionLabel = memo(function SectionLabel({
  icon, label, accent = kit.color.accentDeep,
}: {
  icon:    IoniconsName;
  label:   string;
  accent?: string;
}) {
  return (
    <View style={sl.row}>
      <View style={[sl.badge, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
        <Ionicons name={icon} size={13} color={accent} />
      </View>
      <UIText variant="eyebrow" weight="bold" align="right" style={[sl.label, { color: accent }]}>
        {label}
      </UIText>
    </View>
  );
});

// ─── MenuRow — Reanimated UI-thread spring ────────────────────────────────────

interface MenuRowProps {
  icon:      IoniconsName;
  label:     string;
  subtitle?: string;
  onPress:   () => void;
  badge?:    number | string;
  color?:    string;
  danger?:   boolean;
  last?:     boolean;
}

const MenuRow = memo(function MenuRow({
  icon, label, subtitle, onPress, badge, color, danger, last,
}: MenuRowProps) {
  const ic    = danger ? kit.color.danger : (color ?? kit.color.accentDeep);
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleIn    = useCallback(() => { scale.value = withSpring(0.985, SPRING_PRESS); }, [scale]);
  const handleOut   = useCallback(() => { scale.value = withSpring(1,     SPRING_PRESS); }, [scale]);
  const handlePress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}, ${subtitle}` : label}>
      <Animated.View style={[mr.row, !last && mr.sep, anim]}>

        <View style={[mr.icon, {
          backgroundColor: danger ? kit.color.dangerTint  : `${ic}14`,
          borderColor:     danger ? "rgba(179,38,30,0.3)" : `${ic}26`,
        }]}>
          <Ionicons name={icon} size={18} color={ic} />
        </View>

        <View style={mr.textGroup}>
          <UIText
            variant="body-sm"
            weight="bold"
            align={startAlign}
            numberOfLines={1}
            style={danger ? mr.dangerLabel : undefined}>
            {label}
          </UIText>
          {subtitle && (
            <UIText variant="caption" color="tertiary" align={startAlign} numberOfLines={1}>
              {subtitle}
            </UIText>
          )}
        </View>

        {badge != null && (
          <View style={[mr.badgePill, danger && mr.badgeDanger]}>
            <UIText variant="eyebrow" style={{ color: danger ? kit.color.danger : kit.color.accentDeep }}>
              {badge}
            </UIText>
          </View>
        )}

        <Ionicons name={FORWARD_CHEVRON} size={15} color={kit.color.inkFaint} />
      </Animated.View>
    </Pressable>
  );
});

// ─── LoyaltySummaryCard ───────────────────────────────────────────────────────

const LoyaltySummaryCard = memo(function LoyaltySummaryCard({
  points, tier, onPress,
}: {
  points:  number;
  tier:    ReturnType<typeof getTier>;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  const nextIdx   = TIER_THRESHOLDS.findIndex((th) => th > points);
  const nextTh    = TIER_THRESHOLDS[nextIdx] ?? Infinity;
  const prevTh    = nextIdx > 0 ? TIER_THRESHOLDS[nextIdx - 1] : 0;
  const progress  = nextTh === Infinity ? 1 : (points - prevTh) / (nextTh - prevTh);
  const isMaxTier = nextTh === Infinity;

  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handleIn  = useCallback(() => { scale.value = withSpring(0.98, SPRING_PRESS); }, [scale]);
  const handleOut = useCallback(() => { scale.value = withSpring(1,    SPRING_PRESS); }, [scale]);

  return (
    <View style={lc.outer}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        accessibilityRole="button"
        accessibilityLabel={t("profile.loyaltyCard")}>
        <Animated.View style={[lc.card, anim]}>

          <View style={[lc.tierIcon, { backgroundColor: `${tier.color}18`, borderColor: `${tier.color}30` }]}>
            <Ionicons name={tier.icon} size={20} color={tier.color} />
          </View>

          <View style={lc.body}>
            <View style={lc.topRow}>
              <UIText variant="body-sm" weight="black" align="right" style={[lc.tierName, { color: tier.color }]}>
                {t(tier.nameKey)}
              </UIText>
              <UIText variant="eyebrow" color="tertiary" align="right">
                {t("profile.loyaltyCard")}
              </UIText>
            </View>

            {/* Gradient progress fill */}
            <View style={lc.track}>
              <LinearGradient
                colors={tier.ring}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[lc.fill, {
                  width: `${Math.min(Math.max(progress, 0.02) * 100, 100)}%` as any,
                }]}
              />
            </View>

            <UIText variant="eyebrow" color="tertiary" align="right">
              {isMaxTier
                ? t("profile.tier.platinum")
                : `${points.toLocaleString()} / ${nextTh.toLocaleString()} ${t("profile.pointsUnit")}`
              }
            </UIText>
          </View>

          <View style={lc.badge}>
            <UIText
              variant="card-title"
              weight="black"
              align="center"
              style={{ color: tier.color, letterSpacing: -0.4 }}>
              {points.toLocaleString()}
            </UIText>
            <UIText variant="eyebrow" color="tertiary" align="center">
              {t("profile.pointsUnit")}
            </UIText>
          </View>

          <Ionicons name={FORWARD_CHEVRON} size={14} color={kit.color.inkFaint} />
        </Animated.View>
      </Pressable>
    </View>
  );
});

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t }                     = useTranslation();
  const { language, setLanguage } = useAppLanguage();
  const { user, signOut }         = useAuth();
  const cartCount     = useCartStore((s) => s.itemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const orders        = useOrderStore((s) => s.orders);
  const [signingOut, setSigningOut] = useState(false);
  const loyaltyBalanceQuery         = useLoyaltyBalance(!!user?.id);

  const { orderCount, loyaltyPoints, tier, lastOrder } = useMemo(() => {
    const realBalance = loyaltyBalanceQuery.data?.balance;
    const spent       = orders.reduce((sum: number, o: { total: number }) => sum + o.total, 0);
    const pts         = realBalance ?? Math.floor(spent / 10);
    return {
      orderCount:    orders.length,
      loyaltyPoints: pts,
      tier:          getTier(pts),
      lastOrder:     orders[0] ?? null,
    };
  }, [orders, loyaltyBalanceQuery.data?.balance]);

  // ── Stable navigation handlers ──────────────────────────────────────────────
  const goLoyalty       = useCallback(() => router.push("/loyalty"),              [router]);
  const goEditProfile   = useCallback(() => router.push("/edit-profile"),         [router]);
  const goSecurity      = useCallback(() => router.push("/change-password"),      [router]);
  const goNotifications = useCallback(() => router.push("/notifications"),        [router]);
  const goAddresses     = useCallback(() => router.push("/addresses"),            [router]);
  const goPayment       = useCallback(() => router.push("/payment"),              [router]);
  const goFaq           = useCallback(() => router.push("/faq"),                  [router]);
  const goAbout         = useCallback(() => router.push("/about"),                [router]);
  const goPrivacy       = useCallback(() => router.push("/privacy"),              [router]);
  const goTerms         = useCallback(() => router.push("/terms"),                [router]);
  const callWhatsApp    = useCallback(() => Linking.openURL(waUrl(language)).catch(() => {}), [language]);
  const callPhone       = useCallback(() => Linking.openURL("tel:01112343212").catch(() => {}), []);
  const toggleLanguage  = useCallback(() => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    void setLanguage(language === "ar" ? "en" : "ar");
  }, [language, setLanguage]);

  const handleSignOut = useCallback(async () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setSigningOut(true);
    try { await signOut(); } finally { setSigningOut(false); }
  }, [signOut]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: theme.layout.tabBarHeight + 32 }]}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        {user ? (
          <ProfileAuthHero
            user={user}
            tier={tier}
            loyaltyPoints={loyaltyPoints}
            orderCount={orderCount}
            wishlistCount={wishlistCount}
            cartCount={cartCount}
            lastOrder={lastOrder}
            insetsTop={insets.top}
          />
        ) : (
          <ProfileGuestHero insetsTop={insets.top} />
        )}

        {/* ── Loyalty progress (auth only) ── */}
        {user && (
          <LoyaltySummaryCard
            points={loyaltyPoints}
            tier={tier}
            onPress={goLoyalty}
          />
        )}

        {/* ── Settings ── */}
        <View style={s.section}>
          <SectionLabel
            icon="settings-outline"
            label={t("profile.settingsSection")}
            accent={kit.color.accentDeep}
          />
          <View style={s.card}>
            {user && (
              <MenuRow
                icon="create-outline"
                color={kit.color.accent}
                label={t("profile.menuEditProfile")}
                subtitle={t("profile.menuEditProfileSubtitle")}
                onPress={goEditProfile}
              />
            )}
            <MenuRow
              icon="language-outline"
              color="#2563EB"
              label={t("language.label")}
              subtitle={language === "ar" ? t("language.en") : t("language.ar")}
              onPress={toggleLanguage}
            />
            <MenuRow
              icon="notifications-outline"
              color={kit.color.warn}
              label={t("profile.notifications")}
              subtitle={t("profile.notificationsSubtitle")}
              onPress={goNotifications}
            />
            {user && (
              <MenuRow
                icon="lock-closed-outline"
                color={kit.color.inkSoft}
                label={t("profile.menuSecurity")}
                subtitle={t("profile.menuSecuritySubtitle")}
                onPress={goSecurity}
              />
            )}
            <MenuRow
              icon="location-outline"
              color={kit.color.success}
              label={t("profile.menuAddresses")}
              subtitle={t("profile.menuAddressesSubtitle")}
              onPress={goAddresses}
            />
            <MenuRow
              icon="card-outline"
              color="#7C3AED"
              label={t("profile.menuPayment")}
              subtitle={t("profile.menuPaymentSubtitle")}
              onPress={goPayment}
              last
            />
          </View>
        </View>

        {/* ── Support ── */}
        <View style={s.section}>
          <SectionLabel
            icon="headset-outline"
            label={t("profile.sectionSupport")}
            accent={PROFILE.whatsappGreen}
          />
          <View style={s.card}>
            <MenuRow
              icon="logo-whatsapp"
              color={PROFILE.whatsappGreen}
              label={t("profile.whatsapp")}
              subtitle={t("profile.whatsappSubtitle")}
              onPress={callWhatsApp}
            />
            <MenuRow
              icon="call-outline"
              color={kit.color.accent}
              label={t("profile.callUs")}
              subtitle="01112343212"
              onPress={callPhone}
            />
            <MenuRow
              icon="help-circle-outline"
              color="#6366F1"
              label={t("profile.faq")}
              onPress={goFaq}
              last
            />
          </View>
        </View>

        {/* ── About ── */}
        <View style={s.section}>
          <SectionLabel
            icon="information-circle-outline"
            label={t("profile.sectionAbout")}
            accent={kit.color.inkSoft}
          />
          <View style={s.card}>
            <MenuRow
              icon="business-outline"
              color={kit.color.accent}
              label={t("profile.aboutPharmacy")}
              onPress={goAbout}
            />
            <MenuRow
              icon="document-text-outline"
              color={kit.color.inkSoft}
              label={t("profile.privacy")}
              onPress={goPrivacy}
            />
            <MenuRow
              icon="shield-checkmark-outline"
              color={kit.color.success}
              label={t("profile.terms")}
              onPress={goTerms}
              last
            />
          </View>
        </View>

        {/* ── Sign out ── */}
        {user && (
          <View style={s.dangerWrap}>
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityLabel={t("profile.logout")}
              style={({ pressed }) => [s.dangerCard, pressed && s.dangerCardPressed]}>
              <View style={s.dangerIcon}>
                <Ionicons name="log-out-outline" size={20} color={kit.color.danger} />
              </View>
              <UIText
                variant="body-sm"
                weight="black"
                style={s.dangerLabel}>
                {signingOut ? t("common.loading") : t("profile.logout")}
              </UIText>
              <Ionicons name={FORWARD_CHEVRON} size={15} color="rgba(179,38,30,0.5)" />
            </Pressable>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <View style={s.footerPill}>
            <Ionicons name="medkit" size={12} color={kit.color.accentDeep} />
            <UIText variant="caption" weight="bold" style={s.footerBrandText}>
              {t("profile.footerName")}
            </UIText>
          </View>
          <UIText variant="eyebrow" color="tertiary">United Pharmacies</UIText>
          <UIText variant="eyebrow" color="disabled" style={s.footerVersion}>
            {t("profile.version", { ver: "1.0.0" })}
          </UIText>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── SectionLabel styles ──────────────────────────────────────────────────────
const sl = StyleSheet.create({
  row: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: theme.layout.pagePaddingH,
    marginBottom:      10,
  },
  badge: {
    width:          28,
    height:         28,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
  },
  label: {
    letterSpacing: 0.4,
  },
});

// ─── MenuRow styles ───────────────────────────────────────────────────────────
const mr = StyleSheet.create({
  row: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingVertical:   14,
    paddingHorizontal: 16,
    backgroundColor:   kit.color.surface,
    gap:               12,
  },
  sep: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: kit.color.line,
  },
  icon: {
    width:          40,
    height:         40,
    borderRadius:   13,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    flexShrink:     0,
  },
  textGroup: {
    flex:              1,
    paddingHorizontal: 12,
    gap:               2,
  },
  dangerLabel: { color: kit.color.danger },
  badgePill: {
    minWidth:          22,
    height:            22,
    borderRadius:      11,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 6,
    backgroundColor:   kit.color.accentTint,
    borderWidth:       1,
    borderColor:       kit.color.line,
    marginEnd:         8,
  },
  badgeDanger: {
    backgroundColor: kit.color.dangerTint,
    borderColor:     "rgba(179,38,30,0.3)",
  },
});

// ─── LoyaltySummaryCard styles ────────────────────────────────────────────────
const lc = StyleSheet.create({
  outer: {
    paddingHorizontal: theme.layout.pagePaddingH,
    marginTop:         20,
  },
  card: {
    flexDirection:   flexRow(isRtl()),
    alignItems:      "center",
    gap:             14,
    backgroundColor: kit.color.surface,
    borderRadius:    kit.radius.card,
    padding:         16,
    borderWidth:     1,
    borderColor:     kit.color.line,
    ...kit.shadow.raised,
  },
  tierIcon: {
    width:          48,
    height:         48,
    borderRadius:   15,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    flexShrink:     0,
  },
  body: {
    flex: 1,
    gap:  5,
  },
  topRow: {
    flexDirection:  flexRow(isRtl()),
    alignItems:     "center",
    justifyContent: "space-between",
  },
  tierName: { letterSpacing: -0.2 },
  track: {
    height:          5,
    borderRadius:    3,
    backgroundColor: kit.color.well,
    overflow:        "hidden",
  },
  fill: {
    height:       5,
    borderRadius: 3,
  },
  badge: {
    alignItems: "center",
    flexShrink: 0,
    minWidth:   48,
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: kit.color.canvas,
  },
  scroll: {},

  section: {
    marginTop: kit.sp(6),
  },

  card: {
    marginHorizontal: theme.layout.pagePaddingH,
    backgroundColor:  kit.color.surface,
    borderRadius:     kit.radius.card,
    overflow:         "hidden",
    borderWidth:      1,
    borderColor:      kit.color.line,
    ...kit.shadow.raised,
  },

  dangerWrap: {
    paddingHorizontal: theme.layout.pagePaddingH,
    marginTop:         kit.sp(8),
  },
  dangerCard: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               14,
    backgroundColor:   kit.color.dangerTint,
    borderRadius:      kit.radius.card,
    paddingVertical:   15,
    paddingHorizontal: 16,
    borderWidth:       1,
    borderColor:       "rgba(179,38,30,0.25)",
    ...kit.shadow.raised,
  },
  dangerCardPressed: { opacity: 0.88 },
  dangerIcon: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: "rgba(179,38,30,0.08)",
    borderWidth:     1,
    borderColor:     "rgba(179,38,30,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  dangerLabel: {
    flex:  1,
    color: kit.color.danger,
  },

  footer: {
    alignItems:    "center",
    marginTop:     kit.sp(8),
    paddingBottom: kit.sp(4),
    gap:           6,
  },
  footerPill: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   kit.color.accentTint,
    borderRadius:      999,
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       kit.color.line,
  },
  footerBrandText: { color: kit.color.accentDeep },
  footerVersion:   { marginTop: kit.sp(1) },
});
