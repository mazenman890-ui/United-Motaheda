/**
 * Onboarding — 2026 rebuild on the @/shared/kit design language.
 *
 * Architecture (completely new — replaces the centered-medallion layout):
 *   • Each slide is a full-bleed page: a tinted visual STAGE on top (rotated
 *     ink-tone tile + floating satellite chip + metric stat pill) and a white
 *     SHEET PANEL below with start-aligned editorial type: step counter,
 *     display title, body. Nothing is centered; hierarchy reads top-down,
 *     start-aligned, like a product page — not a slideshow card.
 *   • Chrome is fixed: brand row + ghost skip on top; on the bottom a
 *     segmented progress bar at the reading start and a circular ink FAB at
 *     the reading end (expands into a labelled pill on the last step).
 *
 * Functional core (kept — proven on device, do not regress):
 *   • Active index from `onViewableItemsChanged` with the confirmed Android
 *     Fabric RTL inversion (`RTL_ANDROID ? LAST_INDEX - rawI : rawI`).
 *   • `pagerOffset` only for programmatic `scrollToOffset` navigation.
 *   • Completion → AsyncStorage[ONBOARDING_KEY] → router.replace("/(tabs)").
 *   • Reduced-motion: springs collapse to instant states.
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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
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
import { Text as UIText } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { ONBOARDING_KEY } from "@/lib/onboardingKey";
import { flexRow, isRtl, textAlignStart, FORWARD_CHEVRON } from "@/utils/layout";
import { pagerOffset, PressableScale, RTL_ANDROID } from "@/shared/motion";
import { kit, Button } from "@/shared/kit";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const IS_RTL = isRtl();
const TEXT_START = textAlignStart(IS_RTL);

// ─── Slide model ──────────────────────────────────────────────────────────────

interface Slide {
  id:             number;
  titleKey:       string;
  bodyKey:        string;
  metricValue:    string;
  metricLabelKey: string;
  icon:           IoniconsName;
  satIcon:        IoniconsName;
  /** Solid deep tone for the main stage tile. */
  tone:           string;
  /** Pale wash behind the stage. */
  tint:           string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    titleKey:       "onboarding.slide1Title",
    bodyKey:        "onboarding.slide1Body",
    metricValue:    "52k+",
    metricLabelKey: "onboarding.metricProducts",
    icon:    "medkit",
    satIcon: "sparkles",
    tone:    "#0E7E74",
    tint:    "#E2F1EE",
  },
  {
    id: 2,
    titleKey:       "onboarding.slide2Title",
    bodyKey:        "onboarding.slide2Body",
    metricValue:    "30–60",
    metricLabelKey: "onboarding.metricDelivery",
    icon:    "flash",
    satIcon: "time",
    tone:    "#2358D6",
    tint:    "#E9EFFC",
  },
  {
    id: 3,
    titleKey:       "onboarding.slide3Title",
    bodyKey:        "onboarding.slide3Body",
    metricValue:    "100%",
    metricLabelKey: "onboarding.metricQuality",
    icon:    "shield-checkmark",
    satIcon: "ribbon",
    tone:    "#15803D",
    tint:    "#E7F3EA",
  },
];

const SLIDE_COUNT = SLIDES.length;
const LAST_INDEX  = SLIDE_COUNT - 1;

// ─── SlidePage ────────────────────────────────────────────────────────────────

const SlidePage = memo(function SlidePage({
  slide,
  index,
  width,
  reduced,
  isActive,
  topPad,
  bottomPad,
}: {
  slide:     Slide;
  index:     number;
  width:     number;
  reduced:   boolean;
  isActive:  boolean;
  topPad:    number;
  bottomPad: number;
}) {
  const { t } = useTranslation();

  // Additive stage motion — content is never opacity-gated (a missed tween
  // can therefore never blank a page).
  const appear = useSharedValue(reduced || isActive ? 1 : 0);
  useEffect(() => {
    if (reduced) { appear.value = 1; return; }
    appear.value = isActive
      ? withSpring(1, { damping: 16, stiffness: 130, mass: 0.9 })
      : withTiming(0.85, { duration: 240 });
  }, [isActive, reduced, appear]);

  const tileAnim = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${-7 + appear.value * 1}deg` },
      { scale: 0.92 + appear.value * 0.08 },
      { translateY: (1 - appear.value) * 12 },
    ],
  }));
  const satAnim = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${9 - appear.value * 2}deg` },
      { translateY: (1 - appear.value) * 20 },
    ],
  }));
  const statAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - appear.value) * 26 }],
  }));

  return (
    <View style={[page.root, { width, paddingTop: topPad }]}>
      {/* ── Stage ── */}
      <View style={page.stage}>
        <View style={[page.stageWash, { backgroundColor: slide.tint }]} />
        <Animated.View style={[page.tile, { backgroundColor: slide.tone }, tileAnim]}>
          <Ionicons name={slide.icon} size={56} color={kit.color.onInk} />
        </Animated.View>

        <Animated.View style={[page.satellite, satAnim]}>
          <Ionicons name={slide.satIcon} size={22} color={slide.tone} />
        </Animated.View>

        <Animated.View style={[page.statChip, statAnim]}>
          <UIText style={page.statValue}>{slide.metricValue}</UIText>
          <UIText style={page.statLabel}>{t(slide.metricLabelKey)}</UIText>
        </Animated.View>
      </View>

      {/* ── Sheet panel ── */}
      <View style={[page.panel, { paddingBottom: bottomPad }]}>
        <UIText style={page.step}>{`0${index + 1} — 0${SLIDE_COUNT}`}</UIText>
        <UIText style={page.title}>{t(slide.titleKey)}</UIText>
        <UIText style={page.body}>{t(slide.bodyKey)}</UIText>
      </View>
    </View>
  );
});

// ─── Progress segment ─────────────────────────────────────────────────────────

const Segment = memo(function Segment({
  active,
  reduced,
}: {
  active:  boolean;
  reduced: boolean;
}) {
  const w = useSharedValue(active ? 32 : 12);
  useEffect(() => {
    w.value = reduced
      ? (active ? 32 : 12)
      : withSpring(active ? 32 : 12, { damping: 18, stiffness: 220 });
  }, [active, reduced, w]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[
        chrome.segment,
        { backgroundColor: active ? kit.color.ink : kit.color.lineStrong },
        style,
      ]}
    />
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const listRef = useRef<FlatList<Slide>>(null);

  const [index, setIndex] = useState(0);
  const finishingRef = useRef(false);
  const prevIndexRef = useRef(0);

  const compact   = height < 720;
  const topPad    = insets.top + 64;
  const bottomPad = Math.max(insets.bottom, 12) + 104; // clears the controls row

  // Active index from viewability — Android Fabric RTL reports the visual
  // position, so invert to the data index there (confirmed on device).
  const viewConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const rawI = viewableItems[0]?.index;
    if (rawI == null) return;
    const i = RTL_ANDROID ? LAST_INDEX - rawI : rawI;
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
        index={i}
        width={width}
        reduced={reduced}
        isActive={i === index}
        topPad={topPad}
        bottomPad={bottomPad}
      />
    ),
    [width, reduced, index, topPad, bottomPad],
  );

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: width, offset: width * i, index: i }),
    [width],
  );

  const isLast = index === LAST_INDEX;

  return (
    <View style={chrome.root}>
      <StatusBar style="dark" />

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
        entering={reduced ? undefined : FadeInDown.duration(380).delay(60)}
        style={[chrome.topRow, { top: insets.top + 10 }]}>
        <View style={chrome.brand}>
          <View style={chrome.brandMark}>
            <AppLogo size="sm" />
          </View>
          <UIText style={chrome.brandName}>United Pharmacy</UIText>
        </View>

        <Button
          label={t("onboarding.skip")}
          onPress={() => void finish()}
          variant="ghost"
          size="sm"
          accessibilityLabel={t("onboarding.skipLabel")}
        />
      </Animated.View>

      {/* ── Bottom chrome: segments + FAB ── */}
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(420).delay(260)}
        style={[chrome.controls, { bottom: Math.max(insets.bottom, 12) + 18 }]}>
        <View
          style={chrome.segments}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 1, max: SLIDE_COUNT, now: index + 1 }}
          accessibilityLabel={t("onboarding.slideProgress", { n: index + 1, total: SLIDE_COUNT })}>
          {SLIDES.map((s, i) => (
            <Segment key={s.id} active={i === index} reduced={reduced} />
          ))}
        </View>

        <PressableScale
          onPress={goNext}
          scaleTo={0.92}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t("onboarding.start") : t("onboarding.next")}
          style={[chrome.fab, isLast && chrome.fabWide, compact && chrome.fabCompact]}>
          {isLast && (
            <Animated.View entering={reduced ? undefined : FadeIn.duration(180)}>
              <UIText style={chrome.fabLabel}>{t("onboarding.start")}</UIText>
            </Animated.View>
          )}
          <Ionicons
            name={isLast ? "checkmark" : FORWARD_CHEVRON}
            size={22}
            color={kit.color.onInk}
          />
        </PressableScale>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const chrome = StyleSheet.create({
  root: { flex: 1, backgroundColor: kit.color.canvas },

  topRow: {
    position:          "absolute",
    start:             0,
    end:               0,
    zIndex:            20,
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: kit.sp(5),
  },
  brand: {
    flexDirection: flexRow(IS_RTL),
    alignItems:    "center",
    gap:           10,
  },
  brandMark: {
    width: 34, height: 34, borderRadius: 11, overflow: "hidden",
    backgroundColor: kit.color.surface,
    borderWidth: 1, borderColor: kit.color.line,
  },
  brandName: {
    fontFamily: theme.fonts.black,
    fontSize: 13, lineHeight: 18,
    color: kit.color.ink,
    includeFontPadding: false,
  },

  controls: {
    position:          "absolute",
    start:             0,
    end:               0,
    zIndex:            20,
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: kit.sp(6),
  },
  segments: {
    flexDirection: flexRow(IS_RTL),
    alignItems:    "center",
    gap:           6,
  },
  segment: {
    height:       5,
    borderRadius: 3,
  },

  fab: {
    flexDirection:   flexRow(IS_RTL),
    alignItems:      "center",
    justifyContent:  "center",
    gap:             8,
    minWidth:        60,
    height:          60,
    borderRadius:    30,
    backgroundColor: kit.color.ink,
    ...kit.shadow.floating,
  },
  fabWide:    { paddingHorizontal: kit.sp(6) },
  fabCompact: { height: 54, minWidth: 54, borderRadius: 27 },
  fabLabel: {
    fontFamily: theme.fonts.black,
    fontSize: 14, lineHeight: 20,
    color: kit.color.onInk,
    includeFontPadding: false,
  },
});

const page = StyleSheet.create({
  root: { flex: 1 },

  stage: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
  stageWash: {
    position:     "absolute",
    width:        300,
    height:       300,
    borderRadius: 150,
    opacity:      0.9,
  },
  tile: {
    width:          128,
    height:         128,
    borderRadius:   38,
    alignItems:     "center",
    justifyContent: "center",
    ...kit.shadow.floating,
  },
  satellite: {
    position:        "absolute",
    top:             "16%",
    end:             "22%",
    width:           54,
    height:          54,
    borderRadius:    18,
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: kit.color.surface,
    borderWidth:     1,
    borderColor:     kit.color.line,
    ...kit.shadow.raised,
  },
  statChip: {
    position:          "absolute",
    bottom:            "12%",
    start:             "16%",
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "baseline",
    gap:               6,
    backgroundColor:   kit.color.surface,
    borderRadius:      kit.radius.pill,
    paddingHorizontal: 16,
    paddingVertical:   9,
    borderWidth:       1,
    borderColor:       kit.color.line,
    ...kit.shadow.raised,
  },
  statValue: {
    fontFamily: theme.fonts.black,
    fontSize: 17, lineHeight: 24,
    color: kit.color.ink,
    includeFontPadding: false,
    writingDirection: "ltr",
  },
  statLabel: {
    fontFamily: theme.fonts.bold,
    fontSize: 11, lineHeight: 16,
    color: kit.color.inkSoft,
    includeFontPadding: false,
  },

  panel: {
    backgroundColor:      kit.color.surface,
    borderTopStartRadius: kit.radius.sheet + 4,
    borderTopEndRadius:   kit.radius.sheet + 4,
    paddingHorizontal:    kit.sp(7),
    paddingTop:           kit.sp(8),
    gap:                  kit.sp(3),
  },
  step: {
    fontFamily: theme.fonts.black,
    fontSize: 12, lineHeight: 16,
    color: kit.color.inkFaint,
    letterSpacing: 2,
    textAlign: TEXT_START,
    writingDirection: "ltr",
    includeFontPadding: false,
  },
  title: {
    fontFamily: theme.fonts.black,
    fontSize: kit.type.display.fontSize,
    lineHeight: kit.type.display.lineHeight,
    color: kit.color.ink,
    textAlign: TEXT_START,
    includeFontPadding: false,
  },
  body: {
    fontFamily: theme.fonts.regular,
    fontSize: kit.type.body.fontSize,
    lineHeight: kit.type.body.lineHeight + 2,
    color: kit.color.inkSoft,
    textAlign: TEXT_START,
    includeFontPadding: false,
  },
});
