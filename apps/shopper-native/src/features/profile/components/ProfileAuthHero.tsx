import React, { memo } from "react";
import { Platform, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { styles, HERO_GLASS, PROFILE } from "./profile.styles";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface TierInfo {
  nameKey: string;
  color:   string;
  ring:    [string, string];
  icon:    IoniconsName;
}

interface HeroUser {
  name?:  string | null;
  email:  string;
}

interface LastOrder {
  id:     string;
  items:  readonly unknown[];
  total:  number;
}

interface ProfileAuthHeroProps {
  user:          HeroUser;
  tier:          TierInfo;
  loyaltyPoints: number;
  orderCount:    number;
  wishlistCount: number;
  cartCount:     number;
  lastOrder:     LastOrder | null;
  insetsTop:     number;
}

// ─── StatPill ─────────────────────────────────────────────────────────────────

const StatPill = memo(function StatPill({
  value, label, icon, accent, onPress,
}: {
  value:   string | number;
  label:   string;
  icon:    IoniconsName;
  accent:  string;
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
});

// ─── ProfileAuthHero ──────────────────────────────────────────────────────────

export const ProfileAuthHero = memo(function ProfileAuthHero({
  user,
  tier,
  loyaltyPoints,
  orderCount,
  wishlistCount,
  cartCount,
  lastOrder,
  insetsTop,
}: ProfileAuthHeroProps) {
  const router = useRouter();
  const { t }  = useTranslation();

  const QUICK_ACTIONS = [
    {
      icon:     "bag-handle-outline" as IoniconsName,
      labelKey: "profile.myOrders",
      grad:     [theme.colors.brand[600], theme.colors.teal[500]] as [string, string],
      route:    "/orders",
    },
    {
      icon:     "heart-outline" as IoniconsName,
      labelKey: "profile.wishlist",
      grad:     [PROFILE.wishlistRed, theme.colors.rose[500]] as [string, string],
      route:    "/favorites",
    },
    {
      icon:     "diamond-outline" as IoniconsName,
      labelKey: "profile.loyaltyCard",
      grad:     [PROFILE.loyaltyViolet, PROFILE.loyaltyPurple] as [string, string],
      route:    "/loyalty",
    },
    {
      icon:     "location-outline" as IoniconsName,
      labelKey: "profile.addresses",
      grad:     [theme.colors.amber[600], theme.colors.amber[500]] as [string, string],
      route:    "/addresses",
    },
  ] as const;

  return (
    <View>
      <LinearGradient
        colors={theme.gradients.heroPrimary as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={[styles.hero, { paddingTop: insetsTop + 14 }]}>

        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroDecor3} />

        {/* Top bar */}
        <Animated.View entering={FadeIn.duration(200)} style={styles.heroTopBar}>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <UIText variant="eyebrow" style={styles.heroPageLabelNew}>{t("profile.title")}</UIText>
          </View>
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
            <Pressable
              onPress={() => router.push("/(tabs)/cart")}
              accessibilityRole="button"
              accessibilityLabel={t("tabs.cart")}
              style={styles.heroIconBtn}>
              <Ionicons name="bag-outline" size={16} color={HERO_GLASS.w80} />
              {cartCount > 0 && (
                <View style={styles.heroIconBadge}>
                  <UIText variant="eyebrow" style={styles.heroIconBadgeText}>
                    {cartCount > 9 ? "9+" : cartCount}
                  </UIText>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push("/notifications")}
              accessibilityRole="button"
              accessibilityLabel={t("profile.settings")}
              style={styles.heroIconBtn}>
              <Ionicons name="settings-outline" size={16} color={HERO_GLASS.w80} />
            </Pressable>
          </View>
        </Animated.View>

        {/* Avatar + identity */}
        <Animated.View entering={FadeInDown.delay(60).duration(320)} style={styles.heroIdentity}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={tier.ring}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGlow}
            />
            <View style={styles.avatar}>
              <UIText style={styles.avatarLetter}>
                {(user.name ?? user.email)?.[0]?.toUpperCase() ?? "U"}
              </UIText>
            </View>
            <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
              <Ionicons name={tier.icon} size={10} color={theme.colors.surface} />
            </View>
          </View>

          <View style={styles.heroTextGroup}>
            <UIText variant="sheet-title" color="inverse" numberOfLines={1} style={styles.userNameNew}>
              {user.name ?? t("profile.userFallback")}
            </UIText>
            <UIText variant="body-sm" color="inverse-muted" numberOfLines={1}>
              {user.email}
            </UIText>
          </View>

          <Pressable onPress={() => router.push("/loyalty")} style={styles.tierChip}>
            <Ionicons name={tier.icon} size={12} color={tier.color} />
            <UIText variant="caption" weight="bold" style={styles.tierChipLabelNew}>
              {t("profile.memberTier", { tier: t(tier.nameKey) })}
            </UIText>
            <View style={styles.pointsChip}>
              <UIText variant="caption" weight="black" style={styles.pointsChipTextNew}>
                {loyaltyPoints}
              </UIText>
              <UIText variant="eyebrow" style={styles.pointsChipUnitNew}>
                {t("profile.pointsUnit")}
              </UIText>
            </View>
          </Pressable>
        </Animated.View>
      </LinearGradient>

      {/* Stats card (overlaps hero) */}
      <Animated.View entering={FadeInDown.delay(140).duration(320)} style={styles.statsCard}>
        <StatPill
          value={orderCount}
          label={t("profile.statOrders")}
          icon="bag-handle-outline"
          accent={theme.colors.brand[600]}
          onPress={() => router.push("/orders")}
        />
        <View style={styles.statDivider} />
        <StatPill
          value={wishlistCount}
          label={t("profile.statWishlist")}
          icon="heart-outline"
          accent={theme.colors.rose[500]}
          onPress={() => router.push("/favorites")}
        />
        <View style={styles.statDivider} />
        <StatPill
          value={loyaltyPoints}
          label={t("profile.statPoints")}
          icon="diamond-outline"
          accent={PROFILE.loyaltyPurple}
          onPress={() => router.push("/loyalty")}
        />
        <View style={styles.statDivider} />
        <StatPill
          value={cartCount}
          label={t("profile.statCart")}
          icon="cart-outline"
          accent={theme.colors.amber[600]}
          onPress={() => router.push("/(tabs)/cart")}
        />
      </Animated.View>

      {/* Last order */}
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
                <UIText variant="body-sm" weight="bold" align="right">
                  {t("profile.lastOrderCard")}
                </UIText>
                <View style={styles.statusDot} />
              </View>
              <UIText variant="caption" color="tertiary" align="right" style={styles.quickCardSubNew}>
                #{lastOrder.id.slice(-6)}{"  "}•{"  "}
                {t("orders.items", { count: lastOrder.items.length })}{"  "}•{"  "}
                {lastOrder.total.toFixed(0)} {t("common.currency")}
              </UIText>
            </View>
            <Ionicons name="chevron-back" size={14} color={theme.colors.slate[300]} />
          </Pressable>
        </Animated.View>
      )}

      {/* Quick action grid */}
      <Animated.View entering={FadeInDown.delay(280).duration(280)} style={styles.quickGrid}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.labelKey}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              router.push(a.route as Parameters<typeof router.push>[0]);
            }}
            style={({ pressed }) => [
              styles.quickGridItem,
              pressed && { transform: [{ scale: 0.94 }], opacity: 0.88 },
            ]}>
            <View style={styles.quickGridIconShadow}>
              <LinearGradient
                colors={a.grad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickGridIconWrap}>
                <View style={styles.quickGridShine} />
                <Ionicons name={a.icon} size={20} color={HERO_GLASS.w95} />
              </LinearGradient>
            </View>
            <UIText variant="caption" weight="bold" align="center" color="secondary">
              {t(a.labelKey)}
            </UIText>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
});
