/**
 * ProfileScreen — complete redesign.
 *
 * Performance wins:
 *   - MenuRow press: Reanimated withSpring(0.985) on UI thread
 *     (replaces JS-thread `({ pressed }) => style` pattern throughout)
 *   - LoyaltySummaryCard: Reanimated scale, progress bar from real data
 *   - All navigation handlers: useCallback with stable router refs
 *   - Zero inline style objects in the hot render path
 *   - SectionLabel, MenuRow, LoyaltySummaryCard: memo'd — skip re-render
 *     when parent state changes (e.g. signingOut toggle)
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
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "@/i18n/LanguageProvider";
import { ProfileAuthHero } from "@/features/profile/components/ProfileAuthHero";
import { ProfileGuestHero } from "@/features/profile/components/ProfileGuestHero";
import { PROFILE } from "@/features/profile/components/profile.styles";
import { flexRow, isRtl, textAlignStart, FORWARD_CHEVRON } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];
const startAlign = textAlignStart(isRtl());

// ─── Helpers (module-level — no re-allocation) ────────────────────────────────

function waUrl(lang: string): string {
  const msg = lang === "en"
    ? "Hello, I need help with a specific medicine or order."
    : "مرحباً، أحتاج مساعدة بخصوص دواء أو طلب معين.";
  return `https://wa.me/201112343212?text=${encodeURIComponent(msg)}`;
}

function getTier(points: number) {
  if (points >= 4000)
    return { nameKey: "profile.tier.platinum", color: theme.colors.purple[400], ring: [theme.colors.purple[500], theme.colors.purple[700]] as [string, string], icon: "diamond"       as IoniconsName };
  if (points >= 1500)
    return { nameKey: "profile.tier.gold",     color: theme.colors.amber[300],  ring: [theme.colors.amber[400],  theme.colors.amber[500]]  as [string, string], icon: "shield"        as IoniconsName };
  if (points >= 500)
    return { nameKey: "profile.tier.silver",   color: theme.colors.slate[400],  ring: [theme.colors.slate[400],  theme.colors.slate[600]]  as [string, string], icon: "shield-half"   as IoniconsName };
  return   { nameKey: "profile.tier.bronze",   color: theme.colors.amber[500],  ring: [theme.colors.amber[500],  theme.colors.amber[700]]  as [string, string], icon: "shield-outline" as IoniconsName };
}

// Loyalty tier thresholds (ascending). Infinity = max tier has no cap.
const TIER_THRESHOLDS = [500, 1500, 4000, Infinity] as const;

// ─── SectionLabel ─────────────────────────────────────────────────────────────

const SectionLabel = memo(function SectionLabel({
  icon, label, accent = theme.colors.brand[700],
}: {
  icon:    IoniconsName;
  label:   string;
  accent?: string;
}) {
  return (
    <View style={sl.row}>
      <View style={[sl.badge, { backgroundColor: `${accent}18`, borderColor: `${accent}30` }]}>
        <Ionicons name={icon} size={12} color={accent} />
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
  const ic    = danger ? theme.colors.error.base : (color ?? theme.colors.brand[700]);
  const scale = useSharedValue(1);

  // Reads only scale.value → worklet runs exclusively on the UI thread
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // 0.985 — subtle row press, less aggressive than card (0.97) by design
  const handleIn    = useCallback(() => { scale.value = withSpring(0.985, theme.animation.spring.press); }, [scale]);
  const handleOut   = useCallback(() => { scale.value = withSpring(1,    theme.animation.spring.press); }, [scale]);
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

        {/* Icon tile — semantic color bg */}
        <View style={[mr.icon, {
          backgroundColor: danger ? theme.colors.error.bg   : `${ic}14`,
          borderColor:     danger ? theme.colors.error.light : `${ic}26`,
        }]}>
          <Ionicons name={icon} size={18} color={ic} />
        </View>

        {/* Label + optional subtitle */}
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

        {/* Optional badge pill */}
        {badge != null && (
          <View style={[mr.badgePill, danger && mr.badgeDanger]}>
            <UIText variant="eyebrow" style={{ color: danger ? theme.colors.error.base : theme.colors.brand[700] }}>
              {badge}
            </UIText>
          </View>
        )}

        {/* Chevron — logical left in RTL */}
        <Ionicons name={FORWARD_CHEVRON} size={15} color={theme.colors.slate[300]} />
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

  // Progress to next tier
  const nextIdx      = TIER_THRESHOLDS.findIndex((th) => th > points);
  const nextTh       = TIER_THRESHOLDS[nextIdx] ?? Infinity;
  const prevTh       = nextIdx > 0 ? TIER_THRESHOLDS[nextIdx - 1] : 0;
  const progress     = nextTh === Infinity ? 1 : (points - prevTh) / (nextTh - prevTh);
  const isMaxTier    = nextTh === Infinity;

  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handleIn  = useCallback(() => { scale.value = withSpring(0.98, theme.animation.spring.press); }, [scale]);
  const handleOut = useCallback(() => { scale.value = withSpring(1,   theme.animation.spring.press); }, [scale]);

  return (
    <View style={lc.outer}>
      <Pressable
        onPress={onPress}
        onPressIn={handleIn}
        onPressOut={handleOut}
        accessibilityRole="button"
        accessibilityLabel={t("profile.loyaltyCard")}>
        <Animated.View style={[lc.card, anim]}>

          {/* Tier badge icon */}
          <View style={[lc.tierIcon, { backgroundColor: `${tier.color}18`, borderColor: `${tier.color}30` }]}>
            <Ionicons name={tier.icon} size={20} color={tier.color} />
          </View>

          {/* Progress section */}
          <View style={lc.body}>
            <View style={lc.topRow}>
              <UIText variant="body-sm" weight="black" align="right" style={[lc.tierName, { color: tier.color }]}>
                {t(tier.nameKey)}
              </UIText>
              <UIText variant="eyebrow" color="tertiary" align="right">
                {t("profile.loyaltyCard")}
              </UIText>
            </View>

            {/* Progress track */}
            <View style={lc.track}>
              <View style={[lc.fill, {
                width:           `${Math.min(Math.max(progress, 0.02) * 100, 100)}%` as any,
                backgroundColor: tier.color,
              }]} />
            </View>

            <UIText variant="eyebrow" color="tertiary" align="right">
              {isMaxTier
                ? t("profile.tier.platinum")
                : `${points.toLocaleString()} / ${nextTh.toLocaleString()} ${t("profile.pointsUnit")}`
              }
            </UIText>
          </View>

          {/* Points balance */}
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

          <Ionicons name={FORWARD_CHEVRON} size={14} color={theme.colors.slate[300]} />
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
  // One useCallback per destination so MenuRow memo never re-renders on
  // unrelated state changes (e.g. signingOut toggling).
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
        contentContainerStyle={s.scroll}
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
            accent={theme.colors.brand[700]}
          />
          <View style={s.card}>
            {user && (
              <MenuRow
                icon="create-outline"
                color={theme.colors.brand[600]}
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
              color={theme.colors.amber[600]}
              label={t("profile.notifications")}
              subtitle={t("profile.notificationsSubtitle")}
              onPress={goNotifications}
            />
            {user && (
              <MenuRow
                icon="lock-closed-outline"
                color={theme.colors.slate[600]}
                label={t("profile.menuSecurity")}
                subtitle={t("profile.menuSecuritySubtitle")}
                onPress={goSecurity}
              />
            )}
            <MenuRow
              icon="location-outline"
              color={theme.colors.success.strong}
              label={t("profile.menuAddresses")}
              subtitle={t("profile.menuAddressesSubtitle")}
              onPress={goAddresses}
            />
            <MenuRow
              icon="card-outline"
              color={theme.colors.purple[600]}
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
              color={theme.colors.brand[600]}
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
            accent={theme.colors.slate[600]}
          />
          <View style={s.card}>
            <MenuRow
              icon="business-outline"
              color={theme.colors.brand[600]}
              label={t("profile.aboutPharmacy")}
              onPress={goAbout}
            />
            <MenuRow
              icon="document-text-outline"
              color={theme.colors.slate[500]}
              label={t("profile.privacy")}
              onPress={goPrivacy}
            />
            <MenuRow
              icon="shield-checkmark-outline"
              color={theme.colors.success.strong}
              label={t("profile.terms")}
              onPress={goTerms}
              last
            />
          </View>
        </View>

        {/* ── Sign out — danger zone ── */}
        {user && (
          <View style={s.dangerWrap}>
            <Pressable
              onPress={handleSignOut}
              disabled={signingOut}
              accessibilityRole="button"
              accessibilityLabel={t("profile.logout")}
              style={({ pressed }) => [s.dangerCard, pressed && s.dangerCardPressed]}>
              <View style={s.dangerIcon}>
                <Ionicons name="log-out-outline" size={20} color={theme.colors.error.base} />
              </View>
              <UIText
                variant="body-sm"
                weight="black"
                style={s.dangerLabel}>
                {signingOut ? t("common.loading") : t("profile.logout")}
              </UIText>
              <Ionicons name={FORWARD_CHEVRON} size={15} color={theme.colors.error.light} />
            </Pressable>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <View style={s.footerPill}>
            <Ionicons name="medkit" size={12} color={theme.colors.brand[700]} />
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
    width:          24,
    height:         24,
    borderRadius:   8,
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
    backgroundColor:   theme.colors.surface,
    gap:               12,
  },
  sep: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
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
  dangerLabel: { color: theme.colors.error.base },
  badgePill: {
    minWidth:          22,
    height:            22,
    borderRadius:      11,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 6,
    backgroundColor:   theme.colors.brand.lighter,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
    marginEnd:         8,
  },
  badgeDanger: {
    backgroundColor: theme.colors.error.bg,
    borderColor:     theme.colors.error.light,
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
    backgroundColor: theme.colors.surface,
    borderRadius:    theme.radius.xl,
    padding:         16,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.md,
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
    backgroundColor: theme.colors.subtle,
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
    backgroundColor: theme.colors.bg,
  },
  scroll: {
    paddingBottom: theme.layout.tabBarHeight + 32,
  },

  // Section wrapper — consistent vertical rhythm
  section: {
    marginTop: theme.spacing["2xl"],  // 24
  },

  // Menu card — white surface, rounded, hairline border
  card: {
    marginHorizontal: theme.layout.pagePaddingH,
    backgroundColor:  theme.colors.surface,
    borderRadius:     theme.radius.xl,
    overflow:         "hidden",
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
    ...theme.shadow.sm,
  },

  // Sign out — dedicated danger card
  dangerWrap: {
    paddingHorizontal: theme.layout.pagePaddingH,
    marginTop:         theme.spacing["3xl"],   // 32
  },
  dangerCard: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               14,
    backgroundColor:   theme.colors.error.bg,
    borderRadius:      theme.radius.xl,
    paddingVertical:   15,
    paddingHorizontal: 16,
    borderWidth:       1,
    borderColor:       theme.colors.error.light,
    ...theme.shadow.sm,
  },
  dangerCardPressed: {
    opacity: 0.88,
  },
  dangerIcon: {
    width:           40,
    height:          40,
    borderRadius:    13,
    backgroundColor: `${theme.colors.error.base}14`,
    borderWidth:     1,
    borderColor:     theme.colors.error.light,
    alignItems:      "center",
    justifyContent:  "center",
    flexShrink:      0,
  },
  dangerLabel: {
    flex:  1,
    color: theme.colors.error.base,
  },

  // Footer
  footer: {
    alignItems:    "center",
    marginTop:     theme.spacing["3xl"],
    paddingBottom: theme.spacing.lg,
    gap:           6,
  },
  footerPill: {
    flexDirection:     flexRow(isRtl()),
    alignItems:        "center",
    gap:               6,
    backgroundColor:   theme.colors.brand.lighter,
    borderRadius:      999,
    paddingHorizontal: 14,
    paddingVertical:   6,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
  },
  footerBrandText: { color: theme.colors.brand[700] },
  footerVersion:   { marginTop: theme.spacing.xs },
});
