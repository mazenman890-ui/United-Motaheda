import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useAuth } from "@/contexts/AuthContext";
import { useOrderStore } from "@/stores/orders";
import { theme } from "@/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Tier system ─────────────────────────────────────────────────────────────

interface Tier {
  name: string;
  minPoints: number;
  icon: IoniconsName;
  color: string;
  gradient: [string, string];
  perks: string[];
  multiplier: number;
}

const TIERS: Tier[] = [
  {
    name: "برونزي", minPoints: 0, icon: "shield-outline",
    color: "#92400E", gradient: ["#D97706", "#B45309"],
    perks: ["1 نقطة لكل 10 ج.م", "عروض حصرية للأعضاء"],
    multiplier: 1,
  },
  {
    name: "فضي", minPoints: 500, icon: "shield-half",
    color: "#475569", gradient: ["#64748B", "#475569"],
    perks: ["1.5 نقطة لكل 10 ج.م", "خصم 5% على كل طلب", "أولوية تجهيز الطلبات"],
    multiplier: 1.5,
  },
  {
    name: "ذهبي", minPoints: 1500, icon: "shield",
    color: "#B45309", gradient: ["#F59E0B", "#D97706"],
    perks: ["2x نقاط على كل طلب", "خصم 10% دائم", "توصيل مجاني فوق 100 ج.م", "دعم أولوية"],
    multiplier: 2,
  },
  {
    name: "بلاتيني", minPoints: 4000, icon: "diamond",
    color: "#7C3AED", gradient: ["#8B5CF6", "#6D28D9"],
    perks: ["3x نقاط", "خصم 15% دائم", "توصيل مجاني دائم", "هدايا شهرية", "خط ساخن مخصص"],
    multiplier: 3,
  },
];

// ─── Rewards catalog ─────────────────────────────────────────────────────────

interface Reward {
  id: string;
  name: string;
  description: string;
  points: number;
  icon: IoniconsName;
  color: string;
  bg: string;
  type: "discount" | "shipping" | "gift" | "vip";
}

const REWARDS: Reward[] = [
  { id: "r1", name: "خصم 20 ج.م",  description: "على طلبك القادم",            points: 200,  icon: "pricetag", color: theme.colors.brand[700],  bg: theme.colors.brand[50],  type: "discount" },
  { id: "r2", name: "توصيل مجاني", description: "طلب واحد بتوصيل مجاني",      points: 150,  icon: "bicycle", color: theme.colors.green[700],  bg: theme.colors.green[50],  type: "shipping" },
  { id: "r3", name: "خصم 50 ج.م",  description: "على طلب فوق 300 ج.م",        points: 450,  icon: "gift",    color: theme.colors.purple[700], bg: theme.colors.purple[50], type: "discount" },
  { id: "r4", name: "منتج هدية",   description: "هدية بقيمة تصل إلى 80 ج.م", points: 800,  icon: "sparkles",color: theme.colors.amber[700],  bg: theme.colors.amber[50],  type: "gift" },
  { id: "r5", name: "خصم 100 ج.م", description: "على أي طلب",                 points: 900,  icon: "star",    color: theme.colors.rose[600],   bg: theme.colors.rose[50],   type: "discount" },
  { id: "r6", name: "اشتراك VIP",   description: "مميزات بلاتيني لمدة شهر",   points: 2000, icon: "diamond", color: theme.colors.navy[400],   bg: theme.colors.navy[25],   type: "vip" },
];

function generateCouponCode(rewardId: string): string {
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  return `UM-${rewardId.toUpperCase()}-${time}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LoyaltyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const orders = useOrderStore((s) => s.orders);

  const [redeemed, setRedeemed] = useState<Record<string, string>>({});
  const [activeReward, setActiveReward] = useState<Reward | null>(null);

  const { totalPoints, totalSpent, currentTier, nextTier, progress } = useMemo(() => {
    const spent = orders.reduce((sum, o) => sum + o.total, 0);
    const baseLine = orders.reduce((sum, o) => sum + Math.floor(o.total / 10), 0);
    const redeemedPts = Object.keys(redeemed).reduce(
      (sum, rid) => sum + (REWARDS.find((r) => r.id === rid)?.points ?? 0),
      0,
    );
    const pts = Math.max(0, baseLine - redeemedPts);
    let tier = TIERS[0];
    let next: Tier | null = TIERS[1] ?? null;
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (baseLine >= TIERS[i].minPoints) {
        tier = TIERS[i];
        next = TIERS[i + 1] ?? null;
        break;
      }
    }
    const prog = next
      ? Math.min(1, (baseLine - tier.minPoints) / (next.minPoints - tier.minPoints))
      : 1;
    return { totalPoints: pts, totalSpent: spent, currentTier: tier, nextTier: next, progress: prog };
  }, [orders, redeemed]);

  const handleRedeem = (reward: Reward) => {
    if (totalPoints < reward.points) {
      Alert.alert("نقاط غير كافية", `تحتاج إلى ${reward.points - totalPoints} نقطة إضافية`);
      return;
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const code = generateCouponCode(reward.id);
    setRedeemed((prev) => ({ ...prev, [reward.id]: code }));
    setActiveReward(reward);
  };

  // Build a recent activity feed from orders
  const activity = useMemo(() => {
    return orders.slice(0, 5).map((o) => ({
      id: o.id,
      label: `طلب #${o.id.slice(-6)}`,
      date: new Date(o.createdAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }),
      points: Math.floor(o.total / 10),
    }));
  }, [orders]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero ── */}
        <LinearGradient
          colors={currentTier.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 14 }]}>

          {/* Decorative circles */}
          <View style={{ position: "absolute", right: -40, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.06)" }} />
          <View style={{ position: "absolute", left: -30, bottom: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.04)" }} />

          {/* Nav */}
          <Animated.View entering={FadeIn.duration(250)} style={styles.heroNav}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.95)" />
            </Pressable>
            <Text style={styles.heroTitle}>برنامج الولاء</Text>
            <View style={{ width: 38 }} />
          </Animated.View>

          {/* Points display */}
          <Animated.View entering={FadeInUp.delay(80).duration(350)} style={styles.heroBody}>
            <View style={styles.tierPill}>
              <Ionicons name={currentTier.icon} size={13} color="#fff" />
              <Text style={styles.tierPillText}>{currentTier.name}</Text>
              <View style={styles.multBadge}>
                <Text style={styles.multBadgeText}>x{currentTier.multiplier}</Text>
              </View>
            </View>

            <Text style={styles.pointsValue}>{totalPoints.toLocaleString()}</Text>
            <Text style={styles.pointsLabel}>نقطة متاحة للاستبدال</Text>

            {nextTier && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>
                    {nextTier.minPoints - (totalPoints + Object.values(redeemed).length * 0)} نقطة للوصول إلى {nextTier.name}
                  </Text>
                  <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* ── Stats strip ── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.statsStrip}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.brand[50] }]}>
              <Ionicons name="bag-outline" size={15} color={theme.colors.brand[600]} />
            </View>
            <Text style={styles.statValue}>{orders.length}</Text>
            <Text style={styles.statLabel}>طلب</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.amber[50] }]}>
              <Ionicons name="wallet-outline" size={15} color={theme.colors.amber[600]} />
            </View>
            <Text style={styles.statValue}>{totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>ج.م إنفاق</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: theme.colors.green[50] }]}>
              <Ionicons name="ticket-outline" size={15} color={theme.colors.green[600]} />
            </View>
            <Text style={styles.statValue}>{Object.keys(redeemed).length}</Text>
            <Text style={styles.statLabel}>مكافأة</Text>
          </View>
        </Animated.View>

        <View style={styles.content}>

          {/* ── Your active coupons ── */}
          {Object.keys(redeemed).length > 0 && (
            <Animated.View entering={FadeInDown.delay(80).duration(300)}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>كوبوناتك المتاحة</Text>
                <View style={styles.couponBadge}>
                  <Text style={styles.couponBadgeText}>{Object.keys(redeemed).length}</Text>
                </View>
              </View>
              <View style={{ gap: 10 }}>
                {Object.entries(redeemed).map(([rid, code]) => {
                  const r = REWARDS.find((x) => x.id === rid);
                  if (!r) return null;
                  return (
                    <View key={rid} style={styles.couponCard}>
                      <View style={[styles.couponIcon, { backgroundColor: r.bg }]}>
                        <Ionicons name={r.icon} size={20} color={r.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.couponName}>{r.name}</Text>
                        <Text style={styles.couponCode} selectable>{code}</Text>
                      </View>
                      <View style={styles.couponStatus}>
                        <Ionicons name="checkmark-circle" size={12} color={theme.colors.green[600]} />
                        <Text style={styles.couponStatusText}>نشط</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* ── Tier progression ── */}
          <Animated.View entering={FadeInDown.delay(160).duration(300)}>
            <Text style={styles.sectionTitle}>مستويات العضوية</Text>
            <View style={{ gap: 10 }}>
              {TIERS.map((tier, i) => {
                const isCurrent = tier.name === currentTier.name;
                const isUnlocked = totalSpent / 10 >= tier.minPoints;
                return (
                  <View key={tier.name} style={[styles.tierCard, isCurrent && { borderColor: tier.gradient[0] + "60", backgroundColor: tier.gradient[0] + "08" }]}>
                    <LinearGradient
                      colors={isUnlocked ? tier.gradient : [theme.colors.slate[100], theme.colors.slate[200]]}
                      style={styles.tierCardIcon}>
                      <Ionicons
                        name={tier.icon}
                        size={20}
                        color={isUnlocked ? "#fff" : theme.colors.slate[400]}
                      />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <View style={styles.tierCardHeader}>
                        <Text style={[styles.tierCardName, !isUnlocked && { color: theme.colors.slate[400] }]}>
                          {tier.name}
                        </Text>
                        {isCurrent && (
                          <View style={[styles.currentBadge, { backgroundColor: tier.gradient[0] + "18" }]}>
                            <Text style={[styles.currentBadgeText, { color: tier.gradient[0] }]}>مستواك الحالي</Text>
                          </View>
                        )}
                        {!isUnlocked && (
                          <Ionicons name="lock-closed" size={11} color={theme.colors.slate[400]} />
                        )}
                      </View>
                      <Text style={styles.tierCardPts}>
                        {tier.minPoints.toLocaleString()}+ نقطة • مضاعف {tier.multiplier}x
                      </Text>
                      <View style={styles.perksRow}>
                        {tier.perks.map((p, idx) => (
                          <View key={idx} style={styles.perkChip}>
                            <Ionicons name="checkmark" size={9} color={isUnlocked ? tier.color : theme.colors.slate[400]} />
                            <Text style={[styles.perkChipText, !isUnlocked && { color: theme.colors.slate[400] }]}>{p}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* ── Rewards catalog ── */}
          <Animated.View entering={FadeInDown.delay(240).duration(300)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>متجر المكافآت</Text>
              <View style={styles.balanceChip}>
                <Ionicons name="star" size={11} color={theme.colors.amber[600]} />
                <Text style={styles.balanceChipText}>رصيدك: {totalPoints}</Text>
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {REWARDS.map((reward) => {
                const canRedeem = totalPoints >= reward.points;
                const isRedeemed = Boolean(redeemed[reward.id]);
                const shortage = reward.points - totalPoints;
                return (
                  <View key={reward.id} style={[styles.rewardCard, !canRedeem && !isRedeemed && { opacity: 0.85 }]}>
                    <View style={[styles.rewardIcon, { backgroundColor: reward.bg }]}>
                      <Ionicons name={reward.icon} size={20} color={reward.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rewardName}>{reward.name}</Text>
                      <Text style={styles.rewardDesc}>{reward.description}</Text>
                      <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: 6 }}>
                        <Ionicons name="star" size={11} color={theme.colors.amber[600]} />
                        <Text style={styles.rewardPts}>{reward.points} نقطة</Text>
                      </View>
                    </View>
                    <Pressable
                      disabled={!canRedeem || isRedeemed}
                      onPress={() => handleRedeem(reward)}
                      style={({ pressed }) => [
                        styles.redeemBtn,
                        canRedeem && !isRedeemed && styles.redeemBtnActive,
                        isRedeemed && styles.redeemBtnDone,
                        pressed && canRedeem && { opacity: 0.85 },
                      ]}>
                      <Text style={[
                        styles.redeemBtnText,
                        canRedeem && !isRedeemed && { color: "#fff" },
                        isRedeemed && { color: theme.colors.green[700] },
                      ]}>
                        {isRedeemed ? "تم ✓" : canRedeem ? "استبدال" : `+${shortage}`}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* ── Activity feed ── */}
          {activity.length > 0 && (
            <Animated.View entering={FadeInDown.delay(320).duration(300)}>
              <Text style={styles.sectionTitle}>نشاطك الأخير</Text>
              <View style={styles.activityCard}>
                {activity.map((a, i) => (
                  <View
                    key={a.id}
                    style={[
                      styles.activityRow,
                      i < activity.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.slate[100] },
                    ]}>
                    <View style={styles.activityIcon}>
                      <Ionicons name="add" size={14} color={theme.colors.green[600]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityLabel}>{a.label}</Text>
                      <Text style={styles.activityDate}>{a.date}</Text>
                    </View>
                    <Text style={styles.activityPoints}>+{a.points}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── Guest CTA ── */}
          {!user && (
            <Animated.View entering={FadeInDown.delay(400).duration(300)}>
              <LinearGradient
                colors={[theme.colors.hero, theme.colors.heroBright]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.guestCta}>
                <Ionicons name="diamond" size={28} color="#fff" />
                <Text style={styles.guestCtaTitle}>سجّل دخولك لجمع النقاط</Text>
                <Text style={styles.guestCtaDesc}>
                  ابدأ بجمع النقاط مع كل طلب وارتقِ للمستويات للحصول على مكافآت حصرية
                </Text>
                <Pressable
                  onPress={() => router.push("/(auth)/login")}
                  style={styles.guestCtaBtn}>
                  <Text style={styles.guestCtaBtnText}>تسجيل الدخول</Text>
                </Pressable>
              </LinearGradient>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* ── Redeem confirmation modal ── */}
      <Modal
        visible={activeReward !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveReward(null)}>
        <View style={styles.modalBackdrop}>
          {activeReward && (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.modalCard}>
              <View style={[styles.modalIcon, { backgroundColor: activeReward.bg }]}>
                <Ionicons name="checkmark-circle" size={36} color={theme.colors.green[600]} />
              </View>
              <Text style={styles.modalTitle}>تم الاستبدال بنجاح!</Text>
              <Text style={styles.modalDesc}>{activeReward.name}</Text>

              <View style={styles.modalCodeBox}>
                <Text style={styles.modalCodeLabel}>كود الكوبون</Text>
                <Text style={styles.modalCode} selectable>{redeemed[activeReward.id]}</Text>
              </View>

              <Text style={styles.modalNote}>
                احفظ الكود واستخدمه عند إتمام طلبك القادم
              </Text>

              <Pressable
                onPress={() => setActiveReward(null)}
                style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>تم</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Hero */
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    overflow: "hidden",
  },
  heroNav: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroTitle: { fontSize: 16, fontFamily: theme.fonts.black, color: "#fff" },

  heroBody: { alignItems: "center", paddingVertical: 8 },
  tierPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginBottom: 12,
  },
  tierPillText: { fontSize: 12, fontFamily: theme.fonts.black, color: "#fff" },
  multBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  multBadgeText: { fontSize: 10, fontFamily: theme.fonts.black, color: "#fff" },

  pointsValue: { fontSize: 52, fontFamily: theme.fonts.black, color: "#fff", lineHeight: 56 },
  pointsLabel: { fontSize: 11, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  progressWrap: { width: "100%", marginTop: 18, gap: 6 },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.20)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 3 },
  progressLabels: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressText: { fontSize: 10, fontFamily: theme.fonts.bold, color: "rgba(255,255,255,0.85)" },
  progressPct: { fontSize: 10, fontFamily: theme.fonts.black, color: "#fff" },

  /* Stats strip */
  statsStrip: {
    flexDirection: "row-reverse",
    gap: 8,
    marginHorizontal: 16,
    marginTop: -14,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.slate[100],
    ...theme.shadow.sm,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 15, fontFamily: theme.fonts.black, color: theme.colors.slate[800] },
  statLabel: { fontSize: 9, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400] },

  /* Content */
  content: { paddingHorizontal: 16, paddingTop: 18, gap: 22 },

  sectionTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.black,
    color: theme.colors.slate[800],
    textAlign: "right",
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  balanceChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.amber[50],
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.amber[200],
  },
  balanceChipText: { fontSize: 10, fontFamily: theme.fonts.black, color: theme.colors.amber[700] },

  couponBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  couponBadgeText: { fontSize: 11, fontFamily: theme.fonts.black, color: "#fff" },

  /* Coupon cards */
  couponCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.green[100],
    borderStyle: "dashed",
  },
  couponIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  couponName: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.slate[800], textAlign: "right" },
  couponCode: { fontSize: 11, fontFamily: theme.fonts.bold, color: theme.colors.slate[500], textAlign: "right", letterSpacing: 0.5 },
  couponStatus: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.green[50],
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  couponStatusText: { fontSize: 9, fontFamily: theme.fonts.black, color: theme.colors.green[700] },

  /* Tier cards */
  tierCard: {
    flexDirection: "row-reverse",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
  },
  tierCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tierCardHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  tierCardName: { fontSize: 14, fontFamily: theme.fonts.black, color: theme.colors.slate[800] },
  currentBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 9, fontFamily: theme.fonts.black },
  tierCardPts: { fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500], textAlign: "right", marginTop: 2 },
  perksRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 4, marginTop: 6 },
  perkChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: theme.colors.slate[50],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.slate[100],
  },
  perkChipText: { fontSize: 9.5, fontFamily: theme.fonts.bold, color: theme.colors.slate[600] },

  /* Reward cards */
  rewardCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
  },
  rewardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardName: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.slate[800], textAlign: "right" },
  rewardDesc: { fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[500], textAlign: "right" },
  rewardPts: { fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.amber[700] },
  redeemBtn: {
    minWidth: 64,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.slate[100],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  redeemBtnActive: { backgroundColor: theme.colors.brand[600] },
  redeemBtnDone: { backgroundColor: theme.colors.green[50], borderWidth: 1, borderColor: theme.colors.green[200] },
  redeemBtnText: { fontSize: 11, fontFamily: theme.fonts.black, color: theme.colors.slate[500] },

  /* Activity feed */
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.slate[200],
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: theme.colors.green[50],
    alignItems: "center",
    justifyContent: "center",
  },
  activityLabel: { fontSize: 12, fontFamily: theme.fonts.bold, color: theme.colors.slate[800], textAlign: "right" },
  activityDate: { fontSize: 10, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "right" },
  activityPoints: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.green[600] },

  /* Guest CTA */
  guestCta: {
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  guestCtaTitle: { fontSize: 16, fontFamily: theme.fonts.black, color: "#fff", textAlign: "center", marginTop: 4 },
  guestCtaDesc: { fontSize: 12, fontFamily: theme.fonts.semibold, color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 18 },
  guestCtaBtn: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 8,
  },
  guestCtaBtnText: { fontSize: 13, fontFamily: theme.fonts.black, color: theme.colors.hero },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: 8,
  },
  modalIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontFamily: theme.fonts.black, color: theme.colors.slate[900], textAlign: "center" },
  modalDesc: { fontSize: 13, fontFamily: theme.fonts.bold, color: theme.colors.slate[600], textAlign: "center" },
  modalCodeBox: {
    width: "100%",
    backgroundColor: theme.colors.slate[50],
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.slate[200],
    borderStyle: "dashed",
    gap: 4,
  },
  modalCodeLabel: { fontSize: 10, fontFamily: theme.fonts.bold, color: theme.colors.slate[500], letterSpacing: 1 },
  modalCode: { fontSize: 16, fontFamily: theme.fonts.black, color: theme.colors.slate[900], letterSpacing: 1 },
  modalNote: { fontSize: 11, fontFamily: theme.fonts.semibold, color: theme.colors.slate[400], textAlign: "center", lineHeight: 17, marginTop: 8 },
  modalBtn: {
    width: "100%",
    backgroundColor: theme.colors.brand[600],
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 10,
  },
  modalBtnText: { fontSize: 14, fontFamily: theme.fonts.black, color: "#fff" },
});
