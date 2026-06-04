/**
 * ProfileScreen — static, instant render.
 *
 * Removed: import Animated, { FadeInDown } + 4 × Animated.View section
 * wrappers (delays 340 ms → 520 ms). The staggered entrance made the three
 * menu-card groups appear one by one, causing the "floating and disjointed"
 * perception. All sections now paint in the same frame as the hero.
 */
import React, { useCallback, useMemo, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/features/auth";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { useOrderStore } from "@/stores/orders";
import { useLoyaltyBalance } from "@/features/loyalty";
import { Button } from "@/components/ui/Button";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "@/i18n/LanguageProvider";
import { ProfileAuthHero } from "@/features/profile/components/ProfileAuthHero";
import { ProfileGuestHero } from "@/features/profile/components/ProfileGuestHero";
import { styles, PROFILE } from "@/features/profile/components/profile.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Tier helper ──────────────────────────────────────────────────────────────

function getTier(points: number) {
  if (points >= 4000)
    return { nameKey: "profile.tier.platinum", color: theme.colors.purple[400], ring: [theme.colors.purple[500], theme.colors.purple[700]] as [string, string], icon: "diamond" as IoniconsName };
  if (points >= 1500)
    return { nameKey: "profile.tier.gold",     color: theme.colors.amber[300],  ring: [theme.colors.amber[400],  theme.colors.amber[500]]  as [string, string], icon: "shield" as IoniconsName };
  if (points >= 500)
    return { nameKey: "profile.tier.silver",   color: theme.colors.slate[400],  ring: [theme.colors.slate[400],  theme.colors.slate[600]]  as [string, string], icon: "shield-half" as IoniconsName };
  return   { nameKey: "profile.tier.bronze",   color: theme.colors.amber[500],  ring: [theme.colors.amber[500],  theme.colors.amber[700]]  as [string, string], icon: "shield-outline" as IoniconsName };
}

// ─── MenuRow ──────────────────────────────────────────────────────────────────

function MenuRow({
  icon, label, subtitle, onPress, badge, color, danger, last,
}: {
  icon:      IoniconsName;
  label:     string;
  subtitle?: string;
  onPress:   () => void;
  badge?:    number | string;
  color?:    string;
  danger?:   boolean;
  last?:     boolean;
}) {
  const ic = danger ? theme.colors.error.base : (color ?? theme.colors.brand[700]);
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}, ${subtitle}` : label}
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

// ─── ProfileScreen ────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { t }   = useTranslation();
  const { language, setLanguage } = useAppLanguage();

  const { user, signOut } = useAuth();
  const cartCount     = useCartStore((s) => s.itemCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const orders        = useOrderStore((s) => s.orders);

  const [signingOut, setSigningOut] = useState(false);

  const loyaltyBalanceQuery = useLoyaltyBalance(!!user?.id);

  const { orderCount, loyaltyPoints, tier, lastOrder } = useMemo(() => {
    const realBalance = loyaltyBalanceQuery.data?.balance;
    const spent = orders.reduce((sum: number, o: { total: number }) => sum + o.total, 0);
    const pts   = realBalance ?? Math.floor(spent / 10);
    return {
      orderCount:    orders.length,
      loyaltyPoints: pts,
      tier:          getTier(pts),
      lastOrder:     orders[0] ?? null,
    };
  }, [orders, loyaltyBalanceQuery.data?.balance]);

  const handleSignOut = useCallback(async () => {
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setSigningOut(true);
    try { await signOut(); } finally { setSigningOut(false); }
  }, [signOut]);

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.layout.tabBarHeight + 24 }}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
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

        {/* ── Settings ── */}
        <View style={styles.section}>
          <UIText variant="eyebrow" color="tertiary" align="right" style={styles.sectionLabelNew}>
            {t("profile.settingsSection")}
          </UIText>
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
              label={t("profile.notifications")}
              subtitle={t("profile.notificationsSubtitle")}
              onPress={() => router.push("/notifications")}
            />
            <MenuRow
              icon="location-outline"
              label={t("profile.menuAddresses")}
              subtitle={t("profile.menuAddressesSubtitle")}
              onPress={() => router.push("/addresses")}
            />
            <MenuRow
              icon="card-outline"
              label={t("profile.menuPayment")}
              subtitle={t("profile.menuPaymentSubtitle")}
              onPress={() => router.push("/payment")}
              last
            />
          </View>
        </View>

        {/* ── Support ── */}
        <View style={styles.section}>
          <UIText variant="eyebrow" color="tertiary" align="right" style={styles.sectionLabelNew}>
            {t("profile.sectionSupport")}
          </UIText>
          <View style={styles.menuCard}>
            <MenuRow
              icon="logo-whatsapp"
              label={t("profile.whatsapp")}
              subtitle={t("profile.whatsappSubtitle")}
              color={PROFILE.whatsappGreen}
              onPress={() => Linking.openURL("https://wa.me/201112343212?text=مرحباً").catch(() => {})}
            />
            <MenuRow
              icon="call-outline"
              label={t("profile.callUs")}
              subtitle="01112343212"
              color={theme.colors.brand[600]}
              onPress={() => Linking.openURL("tel:01112343212").catch(() => {})}
            />
            <MenuRow
              icon="help-circle-outline"
              label={t("profile.faq")}
              onPress={() => router.push("/faq")}
              last
            />
          </View>
        </View>

        {/* ── About ── */}
        <View style={styles.section}>
          <UIText variant="eyebrow" color="tertiary" align="right" style={styles.sectionLabelNew}>
            {t("profile.sectionAbout")}
          </UIText>
          <View style={styles.menuCard}>
            <MenuRow
              icon="information-circle-outline"
              label={t("profile.aboutPharmacy")}
              onPress={() => router.push("/about")}
            />
            <MenuRow
              icon="document-text-outline"
              label={t("profile.privacy")}
              onPress={() => router.push("/privacy")}
            />
            <MenuRow
              icon="shield-checkmark-outline"
              label={t("profile.terms")}
              onPress={() => router.push("/terms")}
              last
            />
          </View>
        </View>

        {/* ── Sign out ── */}
        {user && (
          <View style={s.signOut}>
            <Button variant="ghost" size="md" fullWidth loading={signingOut} onPress={handleSignOut}>
              <View style={s.signOutInner}>
                <Ionicons name="log-out-outline" size={16} color={theme.colors.error.base} />
                <UIText variant="body-sm" weight="black" style={{ color: theme.colors.error.base }}>
                  {t("profile.logout")}
                </UIText>
              </View>
            </Button>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerBrand}>
            <Ionicons name="medkit" size={12} color={theme.colors.brand[700]} />
            <UIText variant="caption" weight="bold" style={{ color: theme.colors.brand[700] }}>
              {t("profile.footerName")}
            </UIText>
          </View>
          <UIText variant="eyebrow" color="tertiary">United Pharmacies</UIText>
          <UIText variant="eyebrow" color="disabled" style={styles.footerVersionNew}>
            {t("profile.version", { ver: "1.0.0" })}
          </UIText>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex:            1,
    backgroundColor: theme.colors.bg,
  },
  signOut: {
    paddingHorizontal: theme.spacing.lg,           // 16 — consistent with sections
    marginTop:         theme.spacing.sm,           // 8
  },
  signOutInner: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           theme.spacing.sm,
  },
});
