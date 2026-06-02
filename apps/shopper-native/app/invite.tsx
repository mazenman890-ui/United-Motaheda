import React, { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { useAuth } from "@/features/auth/context";
import { SubScreenHeader } from "@/features/loyalty/components/SubScreenHeader";
import { useReferralCode, useReferralRewards } from "@/features/loyalty/hooks/useReferralCode";


function blurActiveElementOnWeb() {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") return;
  const webDoc = (globalThis as unknown as {
    document?: { activeElement?: { blur?: () => void } };
  }).document;
  const activeElement = webDoc?.activeElement;
  if (activeElement?.blur) activeElement.blur();
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function InviteScreen() {
  const { t, i18n } = useTranslation();
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();
  const isAuthed = !!user;
  const locale   = i18n.language.startsWith("en") ? "en-US" : "ar-EG";

  const { data: referral, isLoading } = useReferralCode(isAuthed);
  const { data: rewards = [] }        = useReferralRewards(isAuthed);

  const code          = referral?.code ?? null;
  const totalReferrals = rewards.length;
  const totalPoints    = rewards.reduce((s, r) => s + r.points_granted, 0);

  useFocusEffect(
    useCallback(() => {
      return () => {
        blurActiveElementOnWeb();
      };
    }, []),
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SubScreenHeader
        title={t("invite.title")}
        subtitle={t("invite.subtitle")}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* ── Hero gradient banner ────────────────────────── */}
        <LinearGradient
          colors={["#4F46E5", "#7C3AED", "#9333EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>

          <Animated.View entering={FadeIn.duration(400)} style={styles.heroInner}>
            <View style={styles.heroBadge}>
              <Ionicons name="people" size={28} color="#fff" />
            </View>
            <UIText style={styles.heroTitle}>{t("invite.heroTitle", { appName: t("common.appName") })}</UIText>
            <UIText style={styles.heroSub}>
              {t("invite.heroSub")}
            </UIText>
          </Animated.View>

          {/* Decorative circles */}
          <View style={[styles.deco, { top: -40, right: -40, width: 160, height: 160 }]} />
          <View style={[styles.deco, { bottom: -30, left: -30, width: 100, height: 100 }]} />
        </LinearGradient>

        {/* ── Stats row ──────────────────────────────────── */}
        {isAuthed && (
          <Animated.View entering={FadeInDown.duration(380).delay(100)} style={styles.statsRow}>
            <StatCell icon="people-outline"   label={t("invite.statReferrals")} value={totalReferrals} color="#7C3AED" />
            <View style={styles.statsDivider} />
            <StatCell icon="star-outline"     label={t("invite.statPoints")}    value={totalPoints}    color={theme.colors.amber[500]} />
          </Animated.View>
        )}

        {/* ── Code card ──────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(380).delay(180)} style={{ paddingHorizontal: 16 }}>
          {isAuthed ? (
            isLoading ? (
              <View style={styles.codeCardSkeleton} />
            ) : code ? (
              <CodeCard code={code} />
            ) : (
              <NoCodeCard />
            )
          ) : (
            <UnauthCard />
          )}
        </Animated.View>

        {/* ── How it works ────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(380).delay(260)} style={styles.howWrap}>
          <UIText style={styles.howTitle}>{t("invite.howTitle")}</UIText>
          <View style={styles.howList}>
            <HowStep
              num="1"
              color="#7C3AED"
              title={t("invite.howStep1Title")}
              body={t("invite.howStep1Body")}
            />
            <HowStep
              num="2"
              color={theme.colors.brand[600]}
              title={t("invite.howStep2Title")}
              body={t("invite.howStep2Body")}
            />
            <HowStep
              num="3"
              color="#10B981"
              title={t("invite.howStep3Title")}
              body={t("invite.howStep3Body")}
            />
          </View>
        </Animated.View>

        {/* ── Past referrals ───────────────────────────────── */}
        {rewards.length > 0 && (
          <Animated.View entering={FadeInDown.duration(380).delay(320)} style={styles.histWrap}>
            <UIText style={styles.histTitle}>{t("invite.histTitle")}</UIText>
            <View style={styles.histList}>
              {rewards.map((r) => (
                <View key={r.id} style={styles.histRow}>
                  <View style={styles.histIcon}>
                    <Ionicons name="person-add-outline" size={15} color="#7C3AED" />
                  </View>
                  <UIText style={styles.histDate}>
                    {new Date(r.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                  </UIText>
                  <UIText style={styles.histPts}>+{r.points_granted.toLocaleString(locale)} {t("invite.pointsUnit")}</UIText>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Code card (authenticated + code exists) ────────────────────────────────────

function CodeCard({ code }: { code: string }) {
  const { t } = useTranslation();
  const [copied, setCopied]   = useState(false);
  const [sharing, setSharing] = useState(false);
  const scale = useSharedValue(1);
  const anim  = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleCopy = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    scale.value = withSequence(
      withSpring(0.94, { damping: 14 }),
      withSpring(1.00, { damping: 14 }),
    );
    // Share just the raw code so the user can select "Copy" from the system sheet.
    // This is the standard clipboard workaround when expo-clipboard is not installed.
    try {
      await Share.share({ message: code, title: t("invite.shareTitle") });
    } catch {
      // dismissed — no-op
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [code, scale, t]);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await Share.share({
        message: t("invite.shareMessage", { code }),
        title:   t("invite.shareDialogTitle"),
      });
    } catch {
      // User dismissed the share sheet — not an error
    } finally {
      setSharing(false);
    }
  }, [code, sharing, t]);

  return (
    <Animated.View style={[styles.codeCard, anim]}>
      <UIText style={styles.codeLabel}>{t("invite.yourCode")}</UIText>

      {/* Code display */}
      <View style={styles.codeBox}>
        <UIText style={styles.codeText}>{code}</UIText>
        <Pressable onPress={handleCopy} hitSlop={8} style={styles.copyBtn} accessibilityRole="button" accessibilityLabel={t("invite.copyCode")}>
          <Ionicons
            name={copied ? "checkmark-circle" : "copy-outline"}
            size={20}
            color={copied ? theme.colors.brand[600] : theme.colors.slate[500]}
          />
          <UIText style={[styles.copyLabel, copied && { color: theme.colors.brand[600] }]}>
            {copied ? t("invite.copied") : t("invite.copy")}
          </UIText>
        </Pressable>
      </View>

      {copied && (
        <Animated.View entering={FadeIn.duration(160)} style={styles.copiedBanner}>
          <Ionicons name="checkmark-circle" size={13} color={theme.colors.brand[700]} />
          <UIText style={styles.copiedText}>{t("invite.codeCopied")}</UIText>
        </Animated.View>
      )}

      {/* Share button */}
      <Pressable
        onPress={handleShare}
        disabled={sharing}
        accessibilityRole="button"
        accessibilityLabel={t("invite.shareCode")}
        style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.88 }]}>
        <LinearGradient
          colors={["#7C3AED", "#9333EA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shareBtnGrad}>
          <Ionicons name="share-social-outline" size={18} color="#fff" />
          <UIText style={styles.shareBtnText}>{t("invite.shareCode")}</UIText>
        </LinearGradient>
      </Pressable>

      {/* WhatsApp quick share */}
      <Pressable
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel={t("invite.whatsappShare")}
        style={styles.waBtn}>
        <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
        <UIText style={styles.waBtnText}>{t("invite.whatsappShare")}</UIText>
      </Pressable>
    </Animated.View>
  );
}

// ─── No referral code yet ────────────────────────────────────────────────────────

function NoCodeCard() {
  const { t } = useTranslation();
  return (
    <View style={[styles.codeCard, { alignItems: "center", paddingVertical: 28, gap: 10 }]}>
      <View style={styles.noCodeIcon}>
        <Ionicons name="hourglass-outline" size={28} color={theme.colors.slate[400]} />
      </View>
      <UIText style={styles.codeLabel}>{t("invite.noCodeTitle")}</UIText>
      <UIText style={{ fontFamily: theme.fonts.regular, fontSize: 13, color: theme.colors.text.tertiary, textAlign: "center" }}>
        {t("invite.noCodeBody")}
      </UIText>
    </View>
  );
}

// ─── Unauthenticated card ────────────────────────────────────────────────────────

function UnauthCard() {
  const { t } = useTranslation();
  return (
    <View style={[styles.codeCard, { alignItems: "center", paddingVertical: 28, gap: 10 }]}>
      <View style={styles.noCodeIcon}>
        <Ionicons name="lock-closed-outline" size={28} color={theme.colors.slate[400]} />
      </View>
      <UIText style={styles.codeLabel}>{t("invite.unauthTitle")}</UIText>
      <UIText style={{ fontFamily: theme.fonts.regular, fontSize: 13, color: theme.colors.text.tertiary, textAlign: "center" }}>
        {t("invite.unauthBody")}
      </UIText>
    </View>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────────

function StatCell({ icon, label, value, color }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: number; color: string }) {
  const { i18n } = useTranslation();
  const locale   = i18n.language.startsWith("en") ? "en-US" : "ar-EG";
  return (
    <View style={styles.statCell}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <UIText style={styles.statValue}>{value.toLocaleString(locale)}</UIText>
      <UIText style={styles.statLabel}>{label}</UIText>
    </View>
  );
}

// ─── How-it-works step ────────────────────────────────────────────────────────────

function HowStep({ num, color, title, body }: { num: string; color: string; title: string; body: string }) {
  return (
    <View style={styles.howStep}>
      <View style={[styles.howNum, { backgroundColor: color + "18", borderColor: color + "40" }]}>
        <UIText style={[styles.howNumText, { color }]}>{num}</UIText>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <UIText style={styles.howStepTitle}>{title}</UIText>
        <UIText style={styles.howStepBody}>{body}</UIText>
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: 16,
    marginTop:        16,
    borderRadius:     24,
    padding:          24,
    overflow:         "hidden",
    ...theme.shadow.lg,
  },
  heroInner: {
    gap: 10,
    zIndex: 1,
  },
  heroBadge: {
    width:           56,
    height:          56,
    borderRadius:    18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems:      "center",
    justifyContent:  "center",
    alignSelf:       "flex-end",
  },
  heroTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      20,
    color:         "#fff",
    textAlign:     "right",
    letterSpacing: -0.3,
  },
  heroSub: {
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      "rgba(255,255,255,0.75)",
    textAlign:  "right",
    lineHeight: 20,
  },
  deco: {
    position:        "absolute",
    borderRadius:    999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  statsRow: {
    flexDirection:     "row-reverse",
    marginHorizontal:  16,
    marginTop:         12,
    backgroundColor:   theme.colors.surface,
    borderRadius:      20,
    paddingVertical:   16,
    paddingHorizontal: 8,
    ...theme.shadow.card,
    borderWidth: 1,
    borderColor: theme.colors.border.hairline,
  },
  statCell: {
    flex:       1,
    alignItems: "center",
    gap:        6,
  },
  statIcon: {
    width:          40,
    height:         40,
    borderRadius:   12,
    alignItems:     "center",
    justifyContent: "center",
  },
  statValue: {
    fontFamily:    theme.fonts.black,
    fontSize:      22,
    color:         theme.colors.text.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: theme.fonts.regular,
    fontSize:   11,
    color:      theme.colors.text.tertiary,
  },
  statsDivider: {
    width:           1,
    height:          48,
    backgroundColor: theme.colors.border.hairline,
    alignSelf:       "center",
  },

  codeCard: {
    marginTop:       14,
    backgroundColor: theme.colors.surface,
    borderRadius:    22,
    padding:         20,
    gap:             14,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.card,
  },
  codeCardSkeleton: {
    marginTop:       14,
    height:          220,
    borderRadius:    22,
    backgroundColor: theme.colors.surfaceSunken,
  },
  codeLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.text.tertiary,
    textAlign:  "right",
    textTransform: "none",
  },
  codeBox: {
    flexDirection:    "row-reverse",
    alignItems:       "center",
    justifyContent:   "space-between",
    backgroundColor:  theme.colors.surfaceSunken,
    borderRadius:     14,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderWidth:      1,
    borderColor:      theme.colors.border.hairline,
    borderStyle:      "dashed",
  },
  codeText: {
    fontFamily:    theme.fonts.black,
    fontSize:      26,
    color:         theme.colors.brand[700],
    letterSpacing: 4,
    textAlign:     "right",
  },
  copyBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       theme.colors.border.hairline,
  },
  copyLabel: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.text.secondary,
  },
  copiedBanner: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               6,
    backgroundColor:   theme.colors.brand.lighter,
    borderRadius:      10,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderWidth:       1,
    borderColor:       theme.colors.border.brandSoft,
  },
  copiedText: {
    fontFamily: theme.fonts.bold,
    fontSize:   12,
    color:      theme.colors.brand[700],
    textAlign:  "right",
  },
  shareBtn: {
    borderRadius: 14,
    overflow:     "hidden",
  },
  shareBtnGrad: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               10,
    paddingVertical:   15,
    paddingHorizontal: 24,
  },
  shareBtnText: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
    color:      "#fff",
  },
  waBtn: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               8,
    paddingVertical:   12,
    borderRadius:      12,
    backgroundColor:   "#25D36614",
    borderWidth:       1,
    borderColor:       "#25D36630",
  },
  waBtnText: {
    fontFamily: theme.fonts.bold,
    fontSize:   13,
    color:      "#128C7E",
  },

  noCodeIcon: {
    width:           64,
    height:          64,
    borderRadius:    20,
    backgroundColor: theme.colors.surfaceSunken,
    alignItems:      "center",
    justifyContent:  "center",
  },

  howWrap: {
    marginHorizontal: 16,
    marginTop:        20,
    gap:              12,
  },
  howTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      16,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  howList: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    padding:         16,
    gap:             16,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.hairline,
  },
  howStep: {
    flexDirection: "row-reverse",
    alignItems:    "flex-start",
    gap:           14,
  },
  howNum: {
    width:        36,
    height:       36,
    borderRadius: 11,
    borderWidth:  1,
    alignItems:   "center",
    justifyContent: "center",
    flexShrink:   0,
  },
  howNumText: {
    fontFamily: theme.fonts.black,
    fontSize:   15,
  },
  howStepTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      13,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.1,
  },
  howStepBody: {
    fontFamily: theme.fonts.regular,
    fontSize:   12,
    color:      theme.colors.text.secondary,
    textAlign:  "right",
    lineHeight: 18,
  },

  histWrap: {
    marginHorizontal: 16,
    marginTop:        20,
    gap:              12,
  },
  histTitle: {
    fontFamily:    theme.fonts.black,
    fontSize:      16,
    color:         theme.colors.text.primary,
    textAlign:     "right",
    letterSpacing: -0.2,
  },
  histList: {
    backgroundColor: theme.colors.surface,
    borderRadius:    18,
    padding:         4,
    borderWidth:     1,
    borderColor:     theme.colors.border.hairline,
    ...theme.shadow.hairline,
  },
  histRow: {
    flexDirection:     "row-reverse",
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 14,
    paddingVertical:   13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.hairline,
  },
  histIcon: {
    width:          32,
    height:         32,
    borderRadius:   10,
    backgroundColor: "#7C3AED18",
    alignItems:     "center",
    justifyContent: "center",
  },
  histDate: {
    flex:       1,
    fontFamily: theme.fonts.regular,
    fontSize:   13,
    color:      theme.colors.text.secondary,
    textAlign:  "right",
  },
  histPts: {
    fontFamily: theme.fonts.black,
    fontSize:   14,
    color:      "#7C3AED",
    letterSpacing: -0.3,
  },
});
