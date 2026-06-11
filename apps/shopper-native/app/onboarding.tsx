/**
 * Onboarding — light, premium, robust (2026 rebuild).
 *
 * Why this is a from-scratch rebuild
 * ──────────────────────────────────
 * The previous scroll-offset-driven parallax onboarding was fragile on Fabric
 * RTL: Android inverts the horizontal scroll-offset origin, so interpolating
 * `offset/width` put the progress dots, CTA, and parallax one-to-one out of
 * sync with the visible slide (first slide showed the last slide's indicator).
 *
 * This version removes that whole class of bug:
 *   • The active index comes from `onViewableItemsChanged` — layout-based and
 *     immune to the offset-sign inversion. It drives the dots, the CTA label,
 *     and each slide's entrance.
 *   • Slide CONTENT is always rendered at full opacity — there is no opacity
 *     gating that can ever leave a page blank. Motion is additive only (a
 *     gentle scale/rise on the active slide), so a missed animation can never
 *     hide content.
 *   • Dot-tap navigation uses `pagerOffset` (the one place the confirmed RTL
 *     offset inversion still matters) via `scrollToOffset`.
 *
 * Design: light theme, one centred hero per slide — a gradient icon medallion
 * with the slide's headline metric — eyebrow pill, title, body. Fixed brand
 * row + skip on top; animated progress + a single full-width CTA on the bottom.
 * Fully RTL (centred copy reads identically), reduced-motion aware, responsive
 * (content column capped for tablets), and accessible.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  type ListRenderItemInfo,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { AppLogo } from "@/shared/components/AppLogo";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { ONBOARDING_KEY } from "@/lib/onboardingKey";
import { flexRow, isRtl, FORWARD_CHEVRON } from "@/utils/layout";
import { pagerOffset, PressableScale } from "@/shared/motion";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const IS_RTL = isRtl();

// ─── Light palette ────────────────────────────────────────────────────────────
const INK        = "#0B1F33";   // primary heading ink
const INK_SOFT   = "#5A6B7B";   // body / muted
const INK_FAINT  = "#9AA7B4";   // inactive dots / hints
const SURFACE    = "#FFFFFF";
const BG_TOP     = "#F4F9FB";   // page wash (top)
const BG_BOTTOM  = "#EAF2F6";   // page wash (bottom)

// ─── Slide model ────────────────────────────────────────────────────────────
interface Slide {
  id:             number;
  eyebrowKey:     string;
  titleKey:       string;
  bodyKey:        string;
  metricValue:    string;
  metricLabelKey: string;
  icon:           IoniconsName;
  grad:           readonly [string, string];  // medallion gradient
  accent:         string;                      // eyebrow text / dot
  tint:           string;                      // eyebrow pill bg
  glow:           string;                      // ambient halo behind hero
}

const SLIDES: Slide[] = [
  {
    id: 1,
    eyebrowKey: "onboarding.slide1Eyebrow",
    titleKey:   "onboarding.slide1Title",
    bodyKey:    "onboarding.slide1Body",
    metricValue: "52k+",
    metricLabelKey: "onboarding.metricProducts",
    icon:  "medkit",
    grad:  ["#2DD4BF", "#0E9F94"],
    accent: "#0D9488",
    tint:  "rgba(13,148,136,0.10)",
    glow:  "rgba(45,212,191,0.20)",
  },
  {
    id: 2,
    eyebrowKey: "onboarding.slide2Eyebrow",
    titleKey:   "onboarding.slide2Title",
    bodyKey:    "onboarding.slide2Body",
    metricValue: "30-60",
    metricLabelKey: "onboarding.metricDelivery",
    icon:  "flash",
    grad:  ["#38BDF8", "#0284C7"],
    accent: "#0284C7",
    tint:  "rgba(2,132,199,0.10)",
    glow:  "rgba(56,189,248,0.18)",
  },
  {
    id: 3,
    eyebrowKey: "onboarding.slide3Eyebrow",
    titleKey:   "onboarding.slide3Title",
    bodyKey:    "onboarding.slide3Body",
    metricValue: "100%",
    metricLabelKey: "onboarding.metricQuality",
    icon:  "shield-checkmark",
    grad:  ["#4ADE80", "#16A34A"],
    accent: "#15A34A",
    tint:  "rgba(22,163,74,0.10)",
    glow:  "rgba(74,222,128,0.18)",
  },
];

const SLIDE_COUNT = SLIDES.length;
const LAST_INDEX  = SLIDE_COUNT - 1;
const ENTER_EASING = Easing.bezier(0.16, 1, 0.3, 1);

// ─── SlidePage — content is always visible; motion is additive only ──────────
const SlidePage = memo(function SlidePage({
  slide,
  width,
  compact,
  reduced,
  isActive,
  topPad,
  bottomPad,
}: {
  slide:     Slide;
  width:     number;
  compact:   boolean;
  reduced:   boolean;
  isActive:  boolean;
  topPad:    number;
  bottomPad: number;
}) {
  const { t } = useTranslation();
  const contentMaxWidth = Math.min(width - 48, 460);

  // Additive entrance: scale + rise that settles when the slide is active.
  // Opacity is NEVER animated, so content can't be hidden by a missed tween.
  const appear = useSharedValue(reduced || isActive ? 1 : 0);

  useEffect(() => {
    if (reduced) { appear.value = 1; return; }
    appear.value = isActive
      ? withSpring(1, { damping: 18, stiffness: 140, mass: 0.9 })
      : withTiming(0.92, { duration: 260, easing: ENTER_EASING });
  }, [isActive, reduced, appear]);

  const heroAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.94 + appear.value * 0.06 },
      { translateY: (1 - appear.value) * 14 },
    ],
  }));
  const copyAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - appear.value) * 18 }],
  }));

  const medallion = compact ? 104 : 124;
  const iconSize  = compact ? 44 : 52;

  return (
    <View style={[page.root, { width, paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={[page.col, { maxWidth: contentMaxWidth }]}>
        {/* Hero medallion + metric */}
        <Animated.View style={[page.hero, heroAnim]}>
          <View style={[page.glow, { backgroundColor: slide.glow }]} pointerEvents="none" />
          <LinearGradient
            colors={slide.grad}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[page.medallion, { width: medallion, height: medallion, borderRadius: medallion * 0.34 }]}>
            <Ionicons name={slide.icon} size={iconSize} color="#FFFFFF" />
          </LinearGradient>

          <View style={page.metricWrap}>
            <Text style={[page.metric, compact && page.metricCompact]}>{slide.metricValue}</Text>
            <Text style={page.metricLabel}>{t(slide.metricLabelKey)}</Text>
          </View>
        </Animated.View>

        {/* Copy */}
        <Animated.View style={[page.copy, copyAnim]}>
          <View style={[page.eyebrow, { backgroundColor: slide.tint }]}>
            <Ionicons name={slide.icon} size={13} color={slide.accent} />
            <Text weight="black" style={[page.eyebrowText, { color: slide.accent }]}>
              {t(slide.eyebrowKey)}
            </Text>
          </View>

          <Text style={[page.title, compact && page.titleCompact]}>{t(slide.titleKey)}</Text>
          <Text style={page.body}>{t(slide.bodyKey)}</Text>
        </Animated.View>
      </View>
    </View>
  );
});

// ─── ProgressDot — width/colour driven by the (sign-independent) active index ─
const ProgressDot = memo(function ProgressDot({
  active,
  accent,
  reduced,
}: {
  active:  boolean;
  accent:  string;
  reduced: boolean;
}) {
  const w = useSharedValue(active ? 24 : 7);
  useEffect(() => {
    w.value = reduced
      ? (active ? 24 : 7)
      : withSpring(active ? 24 : 7, { damping: 18, stiffness: 200 });
  }, [active, reduced, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return <Animated.View style={[foot.dot, { backgroundColor: active ? accent : INK_FAINT }, style]} />;
});

// ─── OnboardingScreen ─────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const listRef = useRef<FlatList<Slide>>(null);

  const [index, setIndex] = useState(0);
  const finishingRef = useRef(false);
  const prevIndexRef = useRef(0);

  const compact   = height < 720;
  const topPad    = insets.top + 76;                                   // clears brand row
  const bottomPad = Math.max(insets.bottom, 12) + (compact ? 150 : 168); // clears footer

  // Active index from viewability — immune to the RTL offset-sign inversion.
  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const i = viewableItems[0]?.index;
    if (i == null) return;
    setIndex(i);
    if (i !== prevIndexRef.current) {
      prevIndexRef.current = i;
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    }
  }).current;

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  }, [router]);

  const goTo = useCallback((i: number) => {
    if (i < 0 || i >= SLIDE_COUNT) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    listRef.current?.scrollToOffset({ offset: pagerOffset(i, width, LAST_INDEX), animated: true });
  }, [width]);

  const goNext = useCallback(() => {
    if (index < LAST_INDEX) goTo(index + 1);
    else void finish();
  }, [index, goTo, finish]);

  const renderItem = useCallback(
    ({ item, index: i }: ListRenderItemInfo<Slide>) => (
      <SlidePage
        slide={item}
        width={width}
        compact={compact}
        reduced={reduced}
        isActive={i === index}
        topPad={topPad}
        bottomPad={bottomPad}
      />
    ),
    [width, compact, reduced, index, topPad, bottomPad],
  );

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: width, offset: width * i, index: i }),
    [width],
  );

  const isLast      = index === LAST_INDEX;
  const activeAccent = SLIDES[index]?.accent ?? theme.colors.brand[600];

  return (
    <View style={chrome.root}>
      <StatusBar style="dark" />

      {/* Light page wash */}
      <LinearGradient colors={[BG_TOP, BG_BOTTOM]} style={StyleSheet.absoluteFill} />

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onViewableItemsChanged={onViewRef}
        viewabilityConfig={viewConfig}
        windowSize={SLIDE_COUNT}
        initialNumToRender={SLIDE_COUNT}
        maxToRenderPerBatch={SLIDE_COUNT}
      />

      {/* ── Top chrome: brand + skip ── */}
      <Animated.View
        entering={reduced ? undefined : FadeInDown.duration(420).delay(80)}
        style={[chrome.brandRow, { top: insets.top + 12 }]}>
        <View style={chrome.brandMark}>
          <AppLogo size="sm" />
        </View>
        <Text weight="black" style={chrome.brandName}>United Pharmacy</Text>
      </Animated.View>

      {!isLast && (
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(260).delay(220)}
          exiting={reduced ? undefined : FadeOut.duration(160)}
          style={[chrome.skipWrap, { top: insets.top + 14 }]}>
          <PressableScale
            onPress={() => void finish()}
            hitSlop={12}
            style={chrome.skipBtn}
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.skipLabel")}>
            <Text weight="bold" style={chrome.skipText}>{t("onboarding.skip")}</Text>
          </PressableScale>
        </Animated.View>
      )}

      {/* ── Bottom chrome: progress + CTA ── */}
      <Animated.View
        entering={reduced ? undefined : FadeInUp.duration(460).delay(360)}
        style={[foot.wrap, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
        <View
          style={foot.dots}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: SLIDE_COUNT, now: index + 1 }}
          accessibilityLabel={t("onboarding.slideProgress", { n: index + 1, total: SLIDE_COUNT })}>
          {SLIDES.map((s, i) => (
            <ProgressDot key={s.id} active={i === index} accent={s.accent} reduced={reduced} />
          ))}
        </View>

        <PressableScale
          onPress={goNext}
          scaleTo={0.97}
          style={foot.cta}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t("onboarding.start") : t("onboarding.next")}>
          <LinearGradient
            colors={[activeAccent, INK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={foot.ctaGrad}>
            <Text weight="black" style={foot.ctaText}>
              {isLast ? t("onboarding.start") : t("onboarding.next")}
            </Text>
            <View style={foot.ctaIcon}>
              <Ionicons name={isLast ? "checkmark" : FORWARD_CHEVRON} size={17} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const chrome = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_TOP },

  brandRow: {
    position:      "absolute",
    zIndex:        theme.zIndex.sticky,
    start:         20,
    flexDirection: flexRow(IS_RTL),
    alignItems:    "center",
    gap:           10,
  },
  brandMark: {
    width: 38, height: 38, borderRadius: 13, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(11,31,51,0.08)",
    backgroundColor: SURFACE,
  },
  brandName: {
    color: INK, fontSize: 14, lineHeight: 20,
    fontFamily: theme.fonts.black, includeFontPadding: false, textAlignVertical: "center",
  },

  skipWrap: { position: "absolute", zIndex: theme.zIndex.toast, end: 16 },
  skipBtn: {
    minHeight: 40, minWidth: 64,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: theme.radius.pill,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(11,31,51,0.05)",
    borderWidth: 1, borderColor: "rgba(11,31,51,0.08)",
  },
  skipText: {
    color: INK_SOFT, fontSize: 13, lineHeight: 20,
    paddingHorizontal: 2, includeFontPadding: false, textAlign: "center",
  },
});

const page = StyleSheet.create({
  root: { paddingHorizontal: 24, justifyContent: "center" },
  col:  { width: "100%", alignSelf: "center", alignItems: "center", gap: 36 },

  hero: { alignItems: "center", gap: 18 },
  glow: {
    position: "absolute", top: -28, width: 240, height: 240, borderRadius: 120,
  },
  medallion: {
    alignItems: "center", justifyContent: "center",
    shadowColor: "#0B1F33", shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18, shadowRadius: 26, elevation: 12,
  },
  metricWrap: { alignItems: "center", gap: 2 },
  metric: {
    fontFamily: theme.fonts.black, fontSize: 46, lineHeight: 54,
    color: INK, letterSpacing: -1.5, includeFontPadding: false, textAlignVertical: "center",
  },
  metricCompact: { fontSize: 38, lineHeight: 46 },
  metricLabel: {
    fontFamily: theme.fonts.bold, fontSize: 13, color: INK_SOFT,
    textAlign: "center", includeFontPadding: false,
  },

  copy: { alignItems: "center", gap: 14, width: "100%" },
  eyebrow: {
    flexDirection: flexRow(IS_RTL), alignItems: "center", gap: 6,
    minHeight: 34, paddingHorizontal: 14, borderRadius: theme.radius.pill,
  },
  eyebrowText: { fontSize: 11, lineHeight: 18, includeFontPadding: false, textAlignVertical: "center" },
  title: {
    fontFamily: theme.fonts.black, fontSize: 30, lineHeight: 40,
    color: INK, textAlign: "center", letterSpacing: -0.8,
    includeFontPadding: false, textAlignVertical: "center",
  },
  titleCompact: { fontSize: 26, lineHeight: 34 },
  body: {
    fontFamily: theme.fonts.regular, fontSize: 15, lineHeight: 24,
    color: INK_SOFT, textAlign: "center", includeFontPadding: false,
    paddingHorizontal: 6,
  },
});

const foot = StyleSheet.create({
  wrap: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    zIndex: theme.zIndex.overlay, paddingHorizontal: 24, gap: 22,
  },
  dots: {
    flexDirection: flexRow(IS_RTL), alignItems: "center", justifyContent: "center",
    gap: 7, minHeight: 10,
  },
  dot: { height: 7, borderRadius: 4 },
  cta: {
    borderRadius: 18, overflow: "hidden",
    shadowColor: "#0B1F33", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20, shadowRadius: 18, elevation: 9,
  },
  ctaGrad: {
    flexDirection: flexRow(IS_RTL), alignItems: "center", justifyContent: "center",
    gap: 12, height: 58, borderRadius: 18, paddingHorizontal: 20,
  },
  ctaText: {
    color: "#FFFFFF", fontFamily: theme.fonts.black, fontSize: 16,
    letterSpacing: -0.2, includeFontPadding: false, textAlignVertical: "center",
  },
  ctaIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center",
  },
});
