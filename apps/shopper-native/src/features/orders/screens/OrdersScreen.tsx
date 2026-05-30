import React, { memo, useCallback, useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useAppLanguage } from "@/i18n/LanguageProvider";
import { useAuth } from "@/features/auth";
import { Badge } from "@/components/ui/Badge";
import { AppHeader } from "@/shared/components";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/theme";
import { formatPrice } from "@/utils/format";
import type { Order, OrderStatus } from "@/stores/orders";
import { useOrders } from "../hooks/useOrders";

// ─── Status metadata ──────────────────────────────────────────────────────────

const STATUS_META: Record<
  OrderStatus,
  {
    labelKey: string;
    variant:  "success" | "warning" | "brand" | "error" | "neutral";
    icon:     React.ComponentProps<typeof Ionicons>["name"];
    dot:      string;
  }
> = {
  pending:         { labelKey: "orders.pending",    variant: "warning", icon: "time-outline",             dot: "#F59E0B" },
  pending_payment: { labelKey: "orders.pendingPayment", variant: "warning", icon: "card-outline",         dot: "#F59E0B" },
  processing:      { labelKey: "orders.processing", variant: "brand",   icon: "refresh-outline",          dot: "#0DB8A8" },
  shipped:         { labelKey: "orders.shipped",    variant: "brand",   icon: "car-outline",              dot: "#6366F1" },
  delivered:       { labelKey: "orders.delivered",  variant: "success", icon: "checkmark-circle-outline", dot: "#10B981" },
  cancelled:       { labelKey: "orders.cancelled",  variant: "error",   icon: "close-circle-outline",     dot: "#EF4444" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleDateString(language === "en" ? "en-US" : "ar-EG", {
      day:   "numeric",
      month: "short",
      year:  "numeric",
    });
  } catch {
    return "";
  }
}

function paymentDot(status: string): string | null {
  switch (status) {
    case "pending_verification": return "#F59E0B";
    case "verified":
    case "paid":                 return "#10B981";
    case "failed":               return "#EF4444";
    default:                     return null;
  }
}

// ─── State 1: Unauthenticated ─────────────────────────────────────────────────

function UnauthenticatedState({ showBack }: { showBack: boolean }): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const pulseScale = useSharedValue(1);
  const pulseOp    = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 1600 }), withTiming(1.0, { duration: 1200 })),
      -1, false,
    );
    pulseOp.value = withRepeat(
      withSequence(withTiming(0, { duration: 1600 }), withTiming(0.4, { duration: 1200 })),
      -1, false,
    );
  }, [pulseScale, pulseOp]);

  const pulseAnim = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity:   pulseOp.value,
  }));

  const handleSignIn  = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); router.push("/(auth)/login"); };
  const handleCreate  = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); router.push("/(auth)/register"); };

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7FA" }}>
      <AppHeader title={t("orders.title")} showBack={showBack} />

      {/* Hero */}
      <LinearGradient
        colors={["#021D2E", "#032840", "#053C5A"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[authS.hero, { paddingBottom: 48 }]}>

        {/* Decorative pulse ring */}
        <Animated.View style={[authS.pulseRing, pulseAnim]} />
        <View style={authS.staticRing} />

        {/* Glow orb */}
        <View style={authS.glowOrb} />

        <Animated.View entering={FadeInUp.duration(500).delay(80)}>
          {/* Icon tile */}
          <LinearGradient
            colors={["#0DB8A8", "#0891B2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={authS.iconTile}>
            <View style={authS.iconInner}>
              <Ionicons name="bag-outline" size={40} color="#fff" />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(480).delay(160)} style={authS.heroText}>
          <Text style={authS.heroTitle}>{t("orders.authTitle")}</Text>
          <Text style={authS.heroSub}>{t("orders.authSub")}</Text>
        </Animated.View>
      </LinearGradient>

      {/* Card */}
      <Animated.View entering={FadeInDown.duration(420).delay(200)} style={authS.card}>
        {/* Sign in */}
        <Pressable onPress={handleSignIn} style={authS.signInBtn}>
          <LinearGradient
            colors={["#0DB8A8", "#0891B2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={authS.signInGrad}>
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={authS.signInText}>{t("auth.signIn")}</Text>
          </LinearGradient>
        </Pressable>

        {/* Create account */}
        <Pressable onPress={handleCreate} style={authS.createBtn}>
          <Text style={authS.createText}>{t("auth.createAccount")}</Text>
        </Pressable>

        {/* Divider */}
        <View style={authS.divider}>
          <View style={authS.dividerLine} />
          <Text style={authS.dividerText}>{t("auth.or")}</Text>
          <View style={authS.dividerLine} />
        </View>

        {/* Feature list */}
        {[
          { icon: "location-outline"      as const, labelKey: "orders.featureTrack"   },
          { icon: "notifications-outline" as const, labelKey: "orders.featureAlerts"  },
          { icon: "reload-outline"        as const, labelKey: "orders.featureReorder" },
        ].map((feat) => (
          <View key={feat.labelKey} style={authS.feature}>
            <View style={authS.featureIcon}>
              <Ionicons name={feat.icon} size={15} color={theme.colors.brand[600]} />
            </View>
            <Text style={authS.featureLabel}>{t(feat.labelKey)}</Text>
          </View>
        ))}

        {/* Privacy note */}
        <View style={authS.privacyRow}>
          <Ionicons name="shield-checkmark-outline" size={13} color={theme.colors.slate[400]} />
          <Text style={authS.privacyText}>{t("orders.privacyNote")}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── State 2: Authenticated — No orders ──────────────────────────────────────

function EmptyOrdersState({ showBack }: { showBack: boolean }): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-9, { duration: 2000 }),
        withTiming(0,  { duration: 2000 }),
      ),
      -1, false,
    );
  }, [floatY]);
  const floatAnim = useAnimatedStyle(() => ({ transform: [{ translateY: floatY.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7FA" }}>
      <AppHeader title={t("orders.title")} showBack={showBack} />
      <ScrollView
        contentContainerStyle={[emptyS.container, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Floating illustration */}
        <Animated.View style={[emptyS.illusWrap, floatAnim]}>
          <LinearGradient
            colors={["#E6FDF9", "#D1FAF4"]}
            style={emptyS.illusBg}>
            {/* Outer ring */}
            <View style={emptyS.illusRing}>
              {/* Bag icon */}
              <Ionicons name="bag-handle-outline" size={64} color="#0DB8A8" />
            </View>
            {/* Floating pill badge */}
            <View style={emptyS.illusBadge}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(420).delay(80)} style={emptyS.textBlock}>
          <UIText variant="sheet-title" align="center" style={emptyS.headline}>
            {t("orders.emptyHeadline")}
          </UIText>
          <UIText variant="body-sm" color="secondary" align="center" style={emptyS.sub}>
            {t("orders.emptyDescription")}
          </UIText>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.duration(400).delay(160)}>
          <Pressable
            onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); router.push("/(tabs)/products"); }}
            style={emptyS.ctaWrap}>
            <LinearGradient
              colors={["#0DB8A8", "#0891B2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={emptyS.ctaGrad}>
              <Ionicons name="storefront-outline" size={18} color="#fff" />
              <Text style={emptyS.ctaText}>{t("common.shopNow")}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Category quick-links */}
        <Animated.View entering={FadeInDown.duration(400).delay(240)} style={emptyS.catsSection}>
          <UIText variant="eyebrow" color="tertiary" align="center" style={{ marginBottom: 14, letterSpacing: 0.4 }}>
            {t("search.categoriesTitle")}
          </UIText>
          <View style={emptyS.catRow}>
            {[
              { icon: "leaf-outline"     as const, label: t("home.qaVitamins"), color: "#059669", bg: "#D1FAE5" },
              { icon: "sparkles-outline" as const, label: t("home.qaMomBaby"),  color: "#7C3AED", bg: "#EDE9FE" },
              { icon: "medkit-outline"   as const, label: t("home.qaRx"),       color: "#0891B2", bg: "#E0F2FE" },
            ].map((cat) => (
              <Pressable
                key={cat.label}
                onPress={() => router.push("/(tabs)/products")}
                style={[emptyS.catChip, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={16} color={cat.color} />
                <Text style={[emptyS.catLabel, { color: cat.color }]} numberOfLines={1}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonCard(): React.ReactElement {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={listS.card}>
      <View style={listS.skeletonRow}>
        <View style={[listS.skeletonRect, { width: 36, height: 36, borderRadius: 12 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[listS.skeletonRect, { width: "35%", height: 9 }]} />
          <View style={[listS.skeletonRect, { width: "55%", height: 14 }]} />
          <View style={[listS.skeletonRect, { width: "40%", height: 9 }]} />
        </View>
        <View style={[listS.skeletonRect, { width: 72, height: 24, borderRadius: 20 }]} />
      </View>
      <View style={listS.skeletonItems}>
        <View style={[listS.skeletonRect, { width: 56, height: 56, borderRadius: 14 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[listS.skeletonRect, { width: "65%", height: 12 }]} />
          <View style={[listS.skeletonRect, { width: "40%", height: 10 }]} />
        </View>
      </View>
      <View style={listS.skeletonFooter}>
        <View style={[listS.skeletonRect, { width: 70, height: 10, borderRadius: 4 }]} />
        <View style={[listS.skeletonRect, { width: 90, height: 18, borderRadius: 6 }]} />
      </View>
    </Animated.View>
  );
}

// ─── Order card ───────────────────────────────────────────────────────────────

const OrderCard = memo(function OrderCard({
  order, index, onPress,
}: { order: Order; index: number; onPress: (id: string) => void }): React.ReactElement {
  const { t }        = useTranslation();
  const { language } = useAppLanguage();
  const meta         = STATUS_META[order.status] ?? STATUS_META.pending;
  const firstItem    = order.items[0];
  const extraCount   = order.items.length - 1;
  const shortId      = order.id.slice(-8).toUpperCase();
  const pmDot        = paymentDot(order.paymentStatus ?? "");

  const scale = useSharedValue(1);
  const cardAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={cardAnim}
      entering={FadeInDown.duration(340).delay(index * 55).springify().damping(22)}>
      <Pressable
        onPress={() => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); onPress(order.id); }}
        onPressIn={() => { scale.value = withSpring(0.978, { damping: 20, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1.0,   { damping: 18, stiffness: 380 }); }}
        style={listS.card}>

        {/* Status accent line */}
        <View style={[listS.statusLine, { backgroundColor: meta.dot }]} />

        {/* ── Header ── */}
        <View style={listS.cardHeader}>
          <View style={listS.headerLeft}>
            {/* Icon */}
            <View style={[listS.orderIcon, { borderColor: meta.dot + "30", backgroundColor: meta.dot + "12" }]}>
              <Ionicons name={meta.icon} size={16} color={meta.dot} />
            </View>
            <View>
              <Text style={listS.orderRef}>{t("orders.orderLabel")} #{shortId}</Text>
              <Text style={listS.orderDate}>{formatDate(order.createdAt, language)}</Text>
            </View>
          </View>
          <View style={listS.badgeGroup}>
            <Badge variant={meta.variant} size="sm">{t(meta.labelKey)}</Badge>
            {pmDot && (
              <View style={[listS.pmDot, { backgroundColor: pmDot }]} />
            )}
          </View>
        </View>

        {/* ── Items preview ── */}
        <View style={listS.itemsRow}>
          {firstItem?.imageUrl ? (
            <Image
              source={{ uri: firstItem.imageUrl }}
              style={listS.itemThumb}
              contentFit="contain"
            />
          ) : (
            <View style={[listS.itemThumb, listS.itemPlaceholder]}>
              <Ionicons name="medkit-outline" size={20} color={theme.colors.slate[300]} />
            </View>
          )}
          <View style={{ flex: 1, gap: 3 }}>
            <UIText variant="body-sm" weight="bold" align="right" numberOfLines={1}>
              {firstItem?.name || t("orders.noItems")}
            </UIText>
            {extraCount > 0 && (
              <UIText variant="caption" color="muted" align="right">
                {t("orders.moreItems", { count: extraCount })}
              </UIText>
            )}
          </View>
          <Ionicons name="chevron-back" size={14} color={theme.colors.slate[300]} />
        </View>

        {/* ── Footer ── */}
        <View style={listS.cardFooter}>
          <UIText variant="caption" color="muted">{t("orders.total")}</UIText>
          <Text style={listS.totalText}>{formatPrice(order.total)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── State 3: Populated — Orders list ────────────────────────────────────────

function OrdersList({
  orders, isRefetching, onRefresh, onOrderPress, showBack,
}: {
  orders:       Order[];
  isRefetching: boolean;
  onRefresh:    () => void;
  onOrderPress: (id: string) => void;
  showBack:     boolean;
}): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { t }  = useTranslation();

  const deliveredCount = orders.filter((o) => o.status === "delivered").length;
  const activeCount    = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7FA" }}>
      <AppHeader title={t("orders.title")} showBack={showBack} />
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[listS.listContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand[600]}
            colors={[theme.colors.brand[600]]}
          />
        }
        ListHeaderComponent={
          <Animated.View entering={FadeInDown.duration(380)} style={listS.statsRow}>
            {/* Total orders */}
            <View style={listS.statCard}>
              <LinearGradient colors={["#0DB8A8", "#0891B2"]} style={listS.statIcon}>
                <Ionicons name="bag-outline" size={16} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={listS.statValue}>{orders.length}</Text>
                <Text style={listS.statLabel}>{t("orders.countOrders", { count: orders.length })}</Text>
              </View>
            </View>
            {/* Active */}
            <View style={listS.statCard}>
              <LinearGradient colors={["#6366F1", "#4F46E5"]} style={listS.statIcon}>
                <Ionicons name="refresh-outline" size={16} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={listS.statValue}>{activeCount}</Text>
                <Text style={listS.statLabel}>{t("orders.processing")}</Text>
              </View>
            </View>
            {/* Delivered */}
            <View style={listS.statCard}>
              <LinearGradient colors={["#10B981", "#059669"]} style={listS.statIcon}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={listS.statValue}>{deliveredCount}</Text>
                <Text style={listS.statLabel}>{t("orders.delivered")}</Text>
              </View>
            </View>
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <OrderCard order={item} index={index} onPress={onOrderPress} />
        )}
      />
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export interface OrdersScreenProps {
  showBack?: boolean;
}

export function OrdersScreen({ showBack = true }: OrdersScreenProps): React.ReactElement {
  const router  = useRouter();
  const { user }= useAuth();

  const {
    data:        orders        = [],
    isLoading,
    isRefetching,
    refetch,
    isSuccess,
  } = useOrders(user?.id);

  const handleOrderPress = useCallback(
    (orderId: string) => router.push(`/order/${orderId}`),
    [router],
  );
  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  // ── Unauthenticated ─────────────────────────────────────────────────────────
  if (!user) {
    return <UnauthenticatedState showBack={showBack} />;
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F4F7FA" }}>
        <AppHeader title="طلباتي" showBack={showBack} />
        <View style={{ gap: 12, padding: 16 }}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  // ── Empty (authenticated, no orders) ────────────────────────────────────────
  if (isSuccess && orders.length === 0) {
    return <EmptyOrdersState showBack={showBack} />;
  }

  // ── Populated list ───────────────────────────────────────────────────────────
  return (
    <OrdersList
      orders={orders}
      isRefetching={isRefetching}
      onRefresh={handleRefresh}
      onOrderPress={handleOrderPress}
      showBack={showBack}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Unauthenticated
const authS = StyleSheet.create({
  hero: {
    alignItems:    "center",
    paddingTop:    40,
    paddingHorizontal: 24,
    gap:           24,
    overflow:      "hidden",
  },
  pulseRing: {
    position:     "absolute",
    width:        160,
    height:       160,
    borderRadius: 80,
    borderWidth:  1.5,
    borderColor:  "rgba(13,184,168,0.35)",
  },
  staticRing: {
    position:     "absolute",
    width:        100,
    height:       100,
    borderRadius: 50,
    borderWidth:  1,
    borderColor:  "rgba(13,184,168,0.18)",
  },
  glowOrb: {
    position:        "absolute",
    top:             -60,
    right:           -60,
    width:           180,
    height:          180,
    borderRadius:    90,
    backgroundColor: "rgba(13,184,168,0.10)",
  },
  iconTile: {
    width:        88,
    height:       88,
    borderRadius: 26,
    overflow:     "hidden",
  },
  iconInner: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    borderRadius:   26,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroText: {
    alignItems: "center",
    gap:        8,
  },
  heroTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         "#fff",
    textAlign:     "center",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      "rgba(255,255,255,0.55)",
    textAlign:  "center",
    lineHeight: 20,
    maxWidth:   280,
  },
  card: {
    margin:           16,
    backgroundColor:  "#fff",
    borderRadius:     24,
    padding:          20,
    gap:              16,
    shadowColor:      "#0C2240",
    shadowOffset:     { width: 0, height: 8 },
    shadowOpacity:    0.10,
    shadowRadius:     20,
    elevation:        8,
  },
  signInBtn: {
    borderRadius: 16,
    overflow:     "hidden",
  },
  signInGrad: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               10,
    paddingVertical:   15,
    borderRadius:      16,
  },
  signInText: {
    fontFamily:    theme.fonts.black,
    fontSize:      15,
    color:         "#fff",
    letterSpacing: 0.2,
  },
  createBtn: {
    alignItems:     "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius:   16,
    borderWidth:    1.5,
    borderColor:    "rgba(13,184,168,0.30)",
    backgroundColor: "rgba(13,184,168,0.05)",
  },
  createText: {
    fontFamily:    theme.fonts.bold,
    fontSize:      14,
    color:         theme.colors.brand[700],
    letterSpacing: 0.1,
  },
  divider: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            12,
  },
  dividerLine: {
    flex:            1,
    height:          StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15,23,42,0.10)",
  },
  dividerText: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.slate[400],
  },
  feature: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           12,
  },
  featureIcon: {
    width:          32,
    height:         32,
    borderRadius:   10,
    backgroundColor: "rgba(13,184,168,0.10)",
    alignItems:     "center",
    justifyContent: "center",
  },
  featureLabel: {
    flex:       1,
    fontFamily: theme.fonts.semibold,
    fontSize:   13,
    color:      theme.colors.text.primary,
    textAlign:  "right",
  },
  privacyRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            5,
    paddingTop:     4,
  },
  privacyText: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.slate[400],
  },
});

// Empty (authenticated)
const emptyS = StyleSheet.create({
  container: {
    alignItems:    "center",
    paddingTop:    36,
    paddingHorizontal: 24,
    gap:           24,
  },
  illusWrap: {
    marginBottom: 4,
  },
  illusBg: {
    width:          160,
    height:         160,
    borderRadius:   80,
    alignItems:     "center",
    justifyContent: "center",
  },
  illusRing: {
    width:          130,
    height:         130,
    borderRadius:   65,
    borderWidth:    1.5,
    borderColor:    "rgba(13,184,168,0.25)",
    alignItems:     "center",
    justifyContent: "center",
  },
  illusBadge: {
    position:        "absolute",
    bottom:          16,
    right:           16,
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: "#0DB8A8",
    alignItems:      "center",
    justifyContent:  "center",
    borderWidth:     2,
    borderColor:     "#fff",
  },
  textBlock: {
    alignItems: "center",
    gap:        8,
  },
  headline: {
    letterSpacing: -0.4,
  },
  sub: {
    lineHeight: 20,
    maxWidth:   280,
    textAlign:  "center",
  },
  ctaWrap: {
    borderRadius: 18,
    overflow:     "hidden",
    width:        220,
  },
  ctaGrad: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               8,
    paddingVertical:   14,
    paddingHorizontal: 28,
    borderRadius:      18,
  },
  ctaText: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
    color:      "#fff",
  },
  catsSection: {
    width:      "100%",
    alignItems: "center",
    marginTop:  8,
  },
  catRow: {
    flexDirection: "row-reverse",
    gap:           10,
    flexWrap:      "wrap",
    justifyContent: "center",
  },
  catChip: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               7,
    paddingHorizontal: 14,
    paddingVertical:   10,
    borderRadius:      14,
  },
  catLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
  },
});

// Orders list
const listS = StyleSheet.create({
  listContent: {
    padding: 16,
    gap:     12,
  },
  // Stats row
  statsRow: {
    flexDirection:   "row-reverse",
    gap:             10,
    marginBottom:    4,
  },
  statCard: {
    flex:            1,
    backgroundColor: "#fff",
    borderRadius:    16,
    padding:         12,
    gap:             8,
    alignItems:      "center",
    shadowColor:     "#0C2240",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       3,
  },
  statIcon: {
    width:          34,
    height:         34,
    borderRadius:   10,
    alignItems:     "center",
    justifyContent: "center",
    overflow:       "hidden",
  },
  statValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      20,
    color:         theme.colors.text.primary,
    textAlign:     "center",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   10,
    color:      theme.colors.text.tertiary,
    textAlign:  "center",
    lineHeight: 13,
  },
  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius:    18,
    padding:         16,
    gap:             12,
    overflow:        "hidden",
    shadowColor:     "#0C2240",
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.07,
    shadowRadius:    12,
    elevation:       4,
    borderWidth:     1,
    borderColor:     "rgba(15,23,42,0.05)",
  },
  statusLine: {
    position:     "absolute",
    top:          0,
    left:         0,
    right:        0,
    height:       3,
    borderTopLeftRadius:  18,
    borderTopRightRadius: 18,
  },
  cardHeader: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    marginTop:      6,
  },
  headerLeft: {
    flexDirection: "row-reverse",
    alignItems:    "center",
    gap:           10,
  },
  orderIcon: {
    width:        36,
    height:       36,
    borderRadius: 12,
    borderWidth:  1,
    alignItems:   "center",
    justifyContent: "center",
  },
  orderRef: {
    fontFamily:    theme.fonts.black,
    fontSize:      13.5,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  orderDate: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
    marginTop:  1,
  },
  badgeGroup: {
    alignItems: "center",
    gap:        6,
  },
  pmDot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  itemsRow: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    14,
    padding:         12,
  },
  itemThumb: {
    width:           56,
    height:          56,
    borderRadius:    14,
    overflow:        "hidden",
    backgroundColor: "#fff",
  },
  itemPlaceholder: {
    backgroundColor: theme.colors.slate[100],
    alignItems:      "center",
    justifyContent:  "center",
  },
  cardFooter: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingTop:     10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.07)",
  },
  totalText: {
    fontFamily:    theme.fonts.black,
    fontSize:      17,
    color:         theme.colors.brand[700],
    letterSpacing: -0.4,
    textAlign:     "right",
  },
  // Skeleton
  skeletonRow: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    gap:            10,
    marginTop:      4,
  },
  skeletonItems: {
    flexDirection:   "row-reverse",
    alignItems:      "center",
    gap:             12,
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius:    14,
    padding:         12,
  },
  skeletonFooter: {
    flexDirection:  "row-reverse",
    alignItems:     "center",
    justifyContent: "space-between",
    paddingTop:     10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(15,23,42,0.07)",
  },
  skeletonRect: {
    backgroundColor: theme.colors.slate[100],
    borderRadius:    6,
  },
});
