/**
 * Onboarding — flagship scroll-driven experience (2026 redesign).
 *
 * Architecture
 * ────────────
 * One continuous "living" background (deep-navy gradient + two SVG radial
 * aurora glows) sits behind a transparent Animated.FlatList. Slides carry
 * content only — during a swipe the whole world morphs instead of pages
 * sliding past each other.
 *
 * Motion system — single source of truth
 *   `scrollX` (shared value, useAnimatedScrollHandler) drives EVERYTHING
 *   on the UI thread via interpolation around each slide index:
 *     - Aurora glows crossfade between slide palettes
 *     - Hero card: counter-parallax (lags the page), scale, tilt, fade
 *     - Satellite chips: lead-parallax (faster than the page) → real depth
 *     - Copy rows: staggered fade windows (eyebrow → title → body)
 *     - Pagination dots: width + color morph continuous with the finger
 *     - CTA label: "Next" ⇄ "Start now" crossfade near the last slide
 *   No per-swipe re-renders: slides never depend on the active index.
 *
 * Mount choreography (first paint only)
 *   brand row → hero card → eyebrow → title → body → footer, staggered
 *   via withDelay; composed multiplicatively with the scroll-driven styles.
 *
 * Ambient layer
 *   Satellites + auroras run slow float loops (withRepeat, yoyo) with
 *   `ReduceMotion.System` so OS-level reduced-motion disables them.
 *
 * RTL
 *   Layout via flexRow + start/end style keys (auto-mirrored by RN from
 *   I18nManager, same flag the layout utils read). Directional translateX
 *   outputs are multiplied by DIR (−1 in RTL). Scroll offsets are
 *   index-consistent in both directions (offset 0 = first slide), matching
 *   getItemLayout — the same contract the previous implementation relied
 *   on in production.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { AppLogo } from "@/shared/components/AppLogo";
import { Text } from "@/shared/ui";
import { theme } from "@/shared/theme";
import { ONBOARDING_KEY } from "@/lib/onboardingKey";
import { flexRow, isRtl, textAlignStart, FORWARD_CHEVRON } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

// ─── Direction constants ──────────────────────────────────────────────────────

const IS_RTL      = isRtl();
const START_ALIGN = textAlignStart(IS_RTL);
/** Sign multiplier for directional translateX outputs (mirrors parallax in RTL). */
const DIR = IS_RTL ? -1 : 1;

// ─── Slide data ───────────────────────────────────────────────────────────────

interface SatelliteSpec {
  icon:     IoniconsName;
  labelKey: string;
  /** Absolute offsets inside the hero zone (logical start/end keys). */
  pos:      { top?: number; bottom?: number; start?: number; end?: number };
  /** Ambient float loop config. */
  float:    { amp: number; dur: number; delay: number };
  /** Parallax depth multiplier (1 = chip baseline, higher = closer to viewer). */
  depth:    number;
}

interface Slide {
  id:             number;
  eyebrowKey:     string;
  titleKey:       string;
  bodyKey:        string;
  metricValue:    string;
  metricLabelKey: string;
  icon:           IoniconsName;
  accent:         string;
  accentSoft:     string;
  /** Aurora glow colors for this slide (top orb / bottom orb). */
  auroraA:        string;
  auroraB:        string;
  showLogo?:      boolean;
  satellites:     [SatelliteSpec, SatelliteSpec];
}

const SLIDES: Slide[] = [
  {
    id: 1,
    eyebrowKey:     "onboarding.slide1Eyebrow",
    titleKey:       "onboarding.slide1Title",
    bodyKey:        "onboarding.slide1Body",
    metricValue:    "52k+",
    metricLabelKey: "onboarding.metricProducts",
    icon:           "medkit-outline",
    accent:         theme.colors.teal[300],
    accentSoft:     "rgba(92,224,210,0.16)",
    auroraA:        theme.colors.teal[500],
    auroraB:        theme.colors.brand[600],
    showLogo:       true,
    satellites: [
      {
        icon: "shield-checkmark-outline", labelKey: "onboarding.featureGenuine",
        pos: { top: 4, start: 2 },  float: { amp: 10, dur: 3000, delay: 200 }, depth: 1.3,
      },
      {
        icon: "chatbubble-ellipses-outline", labelKey: "onboarding.featureSupport",
        pos: { bottom: 12, end: 4 }, float: { amp: 12, dur: 3600, delay: 800 }, depth: 1.0,
      },
    ],
  },
  {
    id: 2,
    eyebrowKey:     "onboarding.slide2Eyebrow",
    titleKey:       "onboarding.slide2Title",
    bodyKey:        "onboarding.slide2Body",
    metricValue:    "30-60",
    metricLabelKey: "onboarding.metricDelivery",
    icon:           "flash-outline",
    accent:         theme.colors.brand[300],
    accentSoft:     "rgba(103,232,249,0.16)",
    auroraA:        theme.colors.brand[400],
    auroraB:        theme.colors.navy[400],
    satellites: [
      {
        icon: "bicycle-outline", labelKey: "onboarding.featureFastDelivery",
        pos: { top: 12, end: 2 },   float: { amp: 11, dur: 3200, delay: 400 }, depth: 1.3,
      },
      {
        icon: "card-outline", labelKey: "onboarding.featureEasyPayment",
        pos: { bottom: 8, start: 4 }, float: { amp: 9, dur: 2800, delay: 0 },  depth: 1.0,
      },
    ],
  },
  {
    id: 3,
    eyebrowKey:     "onboarding.slide3Eyebrow",
    titleKey:       "onboarding.slide3Title",
    bodyKey:        "onboarding.slide3Body",
    metricValue:    "100%",
    metricLabelKey: "onboarding.metricQuality",
    icon:           "shield-checkmark-outline",
    accent:         theme.colors.green[400],
    accentSoft:     "rgba(74,222,128,0.15)",
    auroraA:        theme.colors.green[500],
    auroraB:        theme.colors.teal[500],
    satellites: [
      {
        icon: "lock-closed-outline", labelKey: "onboarding.featureSecureOrders",
        pos: { top: 4, start: 4 },   float: { amp: 10, dur: 3400, delay: 600 }, depth: 1.3,
      },
      {
        icon: "reload-outline", labelKey: "onboarding.featureEasyReorder",
        pos: { bottom: 14, end: 2 }, float: { amp: 12, dur: 3000, delay: 250 }, depth: 1.0,
      },
    ],
  },
];

const SLIDE_COUNT = SLIDES.length;
const LAST_INDEX  = SLIDE_COUNT - 1;

// Shared loop / entrance configs
const FLOAT_EASING = Easing.inOut(Easing.sin);
const ENTER_EASING = Easing.bezier(0.16, 1, 0.3, 1); // theme "emphasize" curve
const PRESS_SPRING = { ...theme.animation.spring.press, reduceMotion: ReduceMotion.System };

// ─── AuroraOrb — soft radial glow (SVG) ──────────────────────────────────────

const AuroraOrb = React.memo(function AuroraOrb({
  id,
  size,
  color,
}: {
  id:    string;
  size:  number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor={color} stopOpacity={0.42} />
          <Stop offset="55%"  stopColor={color} stopOpacity={0.18} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  );
});

// ─── FadeOrb — crossfades a child in around one slide index ──────────────────

const FadeOrb = React.memo(function FadeOrb({
  index,
  scrollX,
  width,
  children,
}: {
  index:    number;
  scrollX:  SharedValue<number>;
  width:    number;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return { opacity: interpolate(p, [index - 1, index, index + 1], [0, 1, 0], Extrapolation.CLAMP) };
  });
  return <Animated.View style={[StyleSheet.absoluteFill, style]}>{children}</Animated.View>;
});

// ─── AuroraLayer — two glow stacks that crossfade per slide + drift ──────────

const AuroraLayer = React.memo(function AuroraLayer({
  scrollX,
  width,
}: {
  scrollX: SharedValue<number>;
  width:   number;
}) {
  // Slow ambient drift — decorative, disabled by OS reduced-motion.
  const floatA = useSharedValue(0);
  const floatB = useSharedValue(0);

  useEffect(() => {
    floatA.value = withRepeat(
      withTiming(1, { duration: 5200, easing: FLOAT_EASING, reduceMotion: ReduceMotion.System }),
      -1, true,
    );
    floatB.value = withDelay(
      900,
      withRepeat(
        withTiming(1, { duration: 6400, easing: FLOAT_EASING, reduceMotion: ReduceMotion.System }),
        -1, true,
      ),
    );
  }, [floatA, floatB]);

  const stackAStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      transform: [
        { translateY: interpolate(floatA.value, [0, 1], [-12, 12]) },
        { translateX: interpolate(p, [0, LAST_INDEX], [0, -46], Extrapolation.CLAMP) * DIR },
      ],
    };
  });

  const stackBStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      transform: [
        { translateY: interpolate(floatB.value, [0, 1], [10, -10]) },
        { translateX: interpolate(p, [0, LAST_INDEX], [0, 38], Extrapolation.CLAMP) * DIR },
      ],
    };
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden>
      <Animated.View style={[bg.auroraA, stackAStyle]}>
        <View style={bg.sizeA} />
        {SLIDES.map((s, i) => (
          <FadeOrb key={s.id} index={i} scrollX={scrollX} width={width}>
            <AuroraOrb id={`aurora-a-${i}`} size={420} color={s.auroraA} />
          </FadeOrb>
        ))}
      </Animated.View>

      <Animated.View style={[bg.auroraB, stackBStyle]}>
        <View style={bg.sizeB} />
        {SLIDES.map((s, i) => (
          <FadeOrb key={s.id} index={i} scrollX={scrollX} width={width}>
            <AuroraOrb id={`aurora-b-${i}`} size={340} color={s.auroraB} />
          </FadeOrb>
        ))}
      </Animated.View>
    </View>
  );
});

// ─── SatelliteChip — floating glass chip with lead-parallax ──────────────────

const SatelliteChip = React.memo(function SatelliteChip({
  spec,
  accent,
  accentSoft,
  index,
  scrollX,
  width,
}: {
  spec:       SatelliteSpec;
  accent:     string;
  accentSoft: string;
  index:      number;
  scrollX:    SharedValue<number>;
  width:      number;
}) {
  const { t } = useTranslation();
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withDelay(
      spec.float.delay,
      withRepeat(
        withTiming(1, {
          duration: spec.float.dur,
          easing: FLOAT_EASING,
          reduceMotion: ReduceMotion.System,
        }),
        -1, true,
      ),
    );
  }, [float, spec.float.delay, spec.float.dur]);

  const chipStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      opacity: interpolate(p, [index - 0.7, index, index + 0.7], [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        // Lead-parallax: chips travel faster than the page → foreground depth
        {
          translateX:
            interpolate(p, [index - 1, index, index + 1], [56, 0, -56], Extrapolation.CLAMP) *
            spec.depth * DIR,
        },
        { translateY: interpolate(float.value, [0, 1], [-spec.float.amp / 2, spec.float.amp / 2]) },
      ],
    };
  });

  return (
    <Animated.View style={[sat.chip, spec.pos, chipStyle]}>
      <View style={[sat.icon, { backgroundColor: accentSoft }]}>
        <Ionicons name={spec.icon} size={13} color={accent} />
      </View>
      <Text variant="caption" weight="bold" style={sat.label} numberOfLines={1}>
        {t(spec.labelKey)}
      </Text>
    </Animated.View>
  );
});

// ─── HeroCard — gradient-bordered glass focal panel ──────────────────────────

const HeroCard = React.memo(function HeroCard({
  slide,
  compact,
  cardWidth,
}: {
  slide:     Slide;
  compact:   boolean;
  cardWidth: number;
}) {
  const { t } = useTranslation();
  const orbSize  = compact ? 92 : 112;
  const tileSize = compact ? 68 : 82;

  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.34)", "rgba(255,255,255,0.05)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={hero.borderWrap}>
      <View style={[hero.card, { width: cardWidth }, compact && hero.cardCompact]}>
        {/* Diagonal sheen */}
        <View style={hero.sheen} pointerEvents="none" />

        {/* Icon orb — double ring */}
        <View
          style={[
            hero.orb,
            {
              width: orbSize, height: orbSize, borderRadius: orbSize * 0.32,
              backgroundColor: slide.accentSoft,
            },
          ]}>
          <View
            pointerEvents="none"
            style={[hero.orbRing, { borderColor: `${slide.accent}38`, borderRadius: orbSize * 0.32 - 4 }]}
          />
          {slide.showLogo ? (
            <View style={[hero.logoTile, { width: tileSize, height: tileSize, borderRadius: tileSize * 0.3 }]}>
              <AppLogo size="md" />
            </View>
          ) : (
            <Ionicons name={slide.icon} size={compact ? 40 : 48} color={slide.accent} />
          )}
        </View>

        {/* Billboard metric */}
        <Text style={[hero.metricNum, compact && hero.metricNumCompact]}>
          {slide.metricValue}
        </Text>
        <Text variant="caption" style={hero.metricLabel} numberOfLines={2}>
          {t(slide.metricLabelKey)}
        </Text>
      </View>
    </LinearGradient>
  );
});

// ─── SlidePage — transparent content layer, fully scroll-driven ──────────────

const SlidePage = React.memo(function SlidePage({
  slide,
  index,
  width,
  height,
  compact,
  topPad,
  bottomPad,
  scrollX,
}: {
  slide:     Slide;
  index:     number;
  width:     number;
  height:    number;
  compact:   boolean;
  topPad:    number;
  bottomPad: number;
  scrollX:   SharedValue<number>;
}) {
  const { t } = useTranslation();
  const cardWidth = Math.min(300, width - theme.layout.pagePaddingH * 2 - 36);

  // ── Mount entrance (plays once; off-screen slides finish invisibly) ──
  const eHero    = useSharedValue(0);
  const eEyebrow = useSharedValue(0);
  const eTitle   = useSharedValue(0);
  const eBody    = useSharedValue(0);

  useEffect(() => {
    const timing = { duration: 520, easing: ENTER_EASING, reduceMotion: ReduceMotion.System };
    eHero.value    = withDelay(140, withTiming(1, timing));
    eEyebrow.value = withDelay(300, withTiming(1, timing));
    eTitle.value   = withDelay(400, withTiming(1, timing));
    eBody.value    = withDelay(500, withTiming(1, timing));
  }, [eHero, eEyebrow, eTitle, eBody]);

  // ── Scroll-driven styles (composed with entrance) ──
  const heroStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    const sOp = interpolate(p, [index - 1, index, index + 1], [0.2, 1, 0.2], Extrapolation.CLAMP);
    const tilt = interpolate(p, [index - 1, index, index + 1], [2.6, 0, -2.6], Extrapolation.CLAMP) * DIR;
    return {
      opacity: sOp * eHero.value,
      transform: [
        // Counter-parallax: card lags the page → background depth
        { translateX: interpolate(p, [index - 1, index, index + 1], [-44, 0, 44], Extrapolation.CLAMP) * DIR },
        { translateY: (1 - eHero.value) * 26 },
        { scale: interpolate(p, [index - 1, index, index + 1], [0.9, 1, 0.9], Extrapolation.CLAMP) * (0.94 + eHero.value * 0.06) },
        { rotateZ: `${tilt}deg` },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      opacity: interpolate(p, [index - 0.6, index, index + 0.6], [0, 1, 0], Extrapolation.CLAMP) * eHero.value,
    };
  });

  const eyebrowStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      opacity: interpolate(p, [index - 0.8, index, index + 0.8], [0, 1, 0], Extrapolation.CLAMP) * eEyebrow.value,
      transform: [
        { translateX: interpolate(p, [index - 1, index, index + 1], [-14, 0, 14], Extrapolation.CLAMP) * DIR },
        { translateY: (1 - eEyebrow.value) * 16 },
      ],
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      opacity: interpolate(p, [index - 0.65, index, index + 0.65], [0, 1, 0], Extrapolation.CLAMP) * eTitle.value,
      transform: [
        { translateX: interpolate(p, [index - 1, index, index + 1], [-22, 0, 22], Extrapolation.CLAMP) * DIR },
        { translateY: (1 - eTitle.value) * 18 },
      ],
    };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      opacity: interpolate(p, [index - 0.5, index, index + 0.5], [0, 1, 0], Extrapolation.CLAMP) * eBody.value,
      transform: [
        { translateX: interpolate(p, [index - 1, index, index + 1], [-30, 0, 30], Extrapolation.CLAMP) * DIR },
        { translateY: (1 - eBody.value) * 18 },
      ],
    };
  });

  return (
    <View style={[page.root, { width, height, paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* ── Hero zone: glow + card + floating satellites ── */}
      <View style={[page.heroZone, compact && page.heroZoneCompact]}>
        <Animated.View
          pointerEvents="none"
          style={[page.glow, { backgroundColor: slide.accentSoft }, glowStyle]}
        />
        <Animated.View style={heroStyle}>
          <HeroCard slide={slide} compact={compact} cardWidth={cardWidth} />
        </Animated.View>

        {slide.satellites.map((spec) => (
          <SatelliteChip
            key={spec.labelKey}
            spec={spec}
            accent={slide.accent}
            accentSoft={slide.accentSoft}
            index={index}
            scrollX={scrollX}
            width={width}
          />
        ))}
      </View>

      {/* ── Copy block — staggered fade windows during swipe ── */}
      <View style={page.copy}>
        <Animated.View style={eyebrowStyle}>
          <View style={[page.eyebrowPill, { backgroundColor: slide.accentSoft }]}>
            <Ionicons name={slide.icon} size={13} color={slide.accent} />
            <Text variant="caption" weight="black" style={[page.eyebrowText, { color: slide.accent }]}>
              {t(slide.eyebrowKey)}
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={titleStyle}>
          <Text style={[page.title, compact && page.titleCompact]}>
            {t(slide.titleKey)}
          </Text>
        </Animated.View>

        <Animated.View style={bodyStyle}>
          <Text variant="body" style={page.body}>
            {t(slide.bodyKey)}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
});

// ─── PageDot — morphing scroll-driven indicator ───────────────────────────────

const PageDot = React.memo(function PageDot({
  index,
  accent,
  scrollX,
  width,
  onPress,
  label,
}: {
  index:   number;
  accent:  string;
  scrollX: SharedValue<number>;
  width:   number;
  onPress: () => void;
  label:   string;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    // 1 at this index, falling to 0 one slide away — continuous with the finger
    const t = 1 - Math.min(Math.abs(p - index), 1);
    return {
      width:           8 + 24 * t,
      backgroundColor: interpolateColor(t, [0, 1], ["rgba(255,255,255,0.22)", accent]),
      borderColor:     interpolateColor(t, [0, 1], ["rgba(255,255,255,0)", "rgba(255,255,255,0.32)"]),
    };
  });

  return (
    <Pressable onPress={onPress} hitSlop={16} accessibilityRole="button" accessibilityLabel={label}>
      <Animated.View style={[foot.dot, dotStyle]} />
    </Pressable>
  );
});

// ─── OnboardingScreen ─────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);

  const [current, setCurrent] = useState(0);
  const finishingRef = useRef(false);

  const scrollX  = useSharedValue(0);
  const ctaScale = useSharedValue(1);

  const compact   = height < 720;
  const topPad    = insets.top + 74;                                      // clears fixed brand row
  const bottomPad = Math.max(insets.bottom, 8) + (compact ? 138 : 152);   // clears footer

  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Track active index on the UI thread; sync to JS only when it changes.
  const handleIndexChange = useCallback((idx: number) => {
    setCurrent(idx);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }, []);

  useAnimatedReaction(
    () => {
      const idx = Math.round(scrollX.value / Math.max(width, 1));
      return Math.min(Math.max(idx, 0), LAST_INDEX);
    },
    (idx, prev) => {
      if (prev !== null && idx !== prev) runOnJS(handleIndexChange)(idx);
    },
    [width, handleIndexChange],
  );

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  }, [router]);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= SLIDE_COUNT) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    listRef.current?.scrollToIndex({ index: idx, animated: true });
  }, []);

  const goNext = useCallback(() => {
    if (current < LAST_INDEX) {
      goTo(current + 1);
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    void finish();
  }, [current, finish, goTo]);

  const onCtaIn  = useCallback(() => { ctaScale.value = withSpring(0.97, PRESS_SPRING); }, [ctaScale]);
  const onCtaOut = useCallback(() => { ctaScale.value = withSpring(1,    PRESS_SPRING); }, [ctaScale]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Slide>) => (
      <SlidePage
        slide={item}
        index={index}
        width={width}
        height={height}
        compact={compact}
        topPad={topPad}
        bottomPad={bottomPad}
        scrollX={scrollX}
      />
    ),
    [width, height, compact, topPad, bottomPad, scrollX],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({ length: width, offset: width * index, index }),
    [width],
  );

  // ── CTA label crossfade (Next ⇄ Start now) — UI thread ──
  const nextLabelStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      opacity: interpolate(p, [LAST_INDEX - 1, LAST_INDEX], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(p, [LAST_INDEX - 1, LAST_INDEX], [0, -10], Extrapolation.CLAMP) }],
    };
  });
  const startLabelStyle = useAnimatedStyle(() => {
    const p = scrollX.value / Math.max(width, 1);
    return {
      opacity: interpolate(p, [LAST_INDEX - 1, LAST_INDEX], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(p, [LAST_INDEX - 1, LAST_INDEX], [10, 0], Extrapolation.CLAMP) }],
    };
  });
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  const isLast = current === LAST_INDEX;

  return (
    <View style={chrome.root}>
      {/* ── Living background: base gradient + aurora glows ── */}
      <LinearGradient
        colors={[theme.colors.hero, theme.colors.navy[800], theme.colors.navy[900]]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <AuroraLayer scrollX={scrollX} width={width} />

      {/* ── Slides (transparent content layer) ── */}
      <Animated.FlatList
        ref={listRef as never}
        data={SLIDES}
        keyExtractor={(slide) => String(slide.id)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={1}
        style={chrome.list}
      />

      {/* ── Bottom scrim — guarantees CTA contrast over any content ── */}
      <LinearGradient
        colors={["rgba(3,12,24,0)", "rgba(3,12,24,0.62)", "rgba(3,12,24,0.94)"]}
        style={chrome.scrim}
        pointerEvents="none"
      />

      {/* ── Fixed chrome: brand row (top-start) ── */}
      <Animated.View
        entering={FadeInDown.duration(420).delay(80)}
        style={[chrome.brandRow, { top: insets.top + 12 }]}>
        <View style={chrome.brandMark}>
          <AppLogo size="sm" />
        </View>
        <Text weight="black" style={chrome.brandName}>United Pharmacy</Text>
      </Animated.View>

      {/* ── Skip (top-end; hidden on last slide) ── */}
      {!isLast && (
        <Animated.View
          entering={FadeIn.duration(280).delay(260)}
          exiting={FadeOut.duration(180)}
          style={[chrome.skipBtn, { top: insets.top + 14 }]}>
          <Pressable
            onPress={() => void finish()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.skipLabel")}>
            <Text variant="caption" weight="black" style={chrome.skipText}>
              {t("onboarding.skip")}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* ── Footer: morphing dots + CTA ── */}
      <Animated.View
        entering={FadeInUp.duration(460).delay(560)}
        style={[foot.wrap, { paddingBottom: Math.max(insets.bottom, 8) + 14 }]}>

        <View
          style={foot.dotsRow}
          accessibilityRole="progressbar"
          accessibilityLabel={t("onboarding.slideProgress", { n: current + 1, total: SLIDE_COUNT })}
          accessibilityValue={{ min: 0, max: LAST_INDEX, now: current }}>
          {SLIDES.map((slide, index) => (
            <PageDot
              key={slide.id}
              index={index}
              accent={slide.accent}
              scrollX={scrollX}
              width={width}
              onPress={() => goTo(index)}
              label={t("onboarding.slideProgress", { n: index + 1, total: SLIDE_COUNT })}
            />
          ))}
        </View>

        <Animated.View style={ctaStyle}>
          <Pressable
            onPress={goNext}
            onPressIn={onCtaIn}
            onPressOut={onCtaOut}
            accessibilityRole="button"
            accessibilityLabel={isLast ? t("onboarding.start") : t("onboarding.next")}
            style={foot.cta}>
            <LinearGradient
              colors={[theme.colors.teal[400], theme.colors.brand[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={foot.ctaGradient}>

              {/* "Next" face */}
              <Animated.View style={[foot.ctaFace, nextLabelStyle]}>
                <Text variant="body" weight="black" style={foot.ctaText}>
                  {t("onboarding.next")}
                </Text>
                <View style={foot.ctaIconChip}>
                  <Ionicons name={FORWARD_CHEVRON} size={17} color={theme.colors.surface} />
                </View>
              </Animated.View>

              {/* "Start now" face */}
              <Animated.View style={[foot.ctaFace, foot.ctaFaceOverlay, startLabelStyle]}>
                <Text variant="body" weight="black" style={foot.ctaText}>
                  {t("onboarding.start")}
                </Text>
                <View style={foot.ctaIconChip}>
                  <Ionicons name="checkmark" size={17} color={theme.colors.surface} />
                </View>
              </Animated.View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

// Fixed chrome (root, list, scrim, brand, skip)
const chrome = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: theme.colors.navy[900],
  },
  list: {
    flex:            1,
    backgroundColor: "transparent",
  },
  scrim: {
    position: "absolute",
    left:     0,
    right:    0,
    bottom:   0,
    height:   216,
  },
  brandRow: {
    position:      "absolute",
    zIndex:        theme.zIndex.sticky,
    start:         theme.layout.pagePaddingH,
    flexDirection: flexRow(IS_RTL),
    alignItems:    "center",
    gap:           theme.spacing.md,
  },
  brandMark: {
    width:        40,
    height:       40,
    borderRadius: 14,
    overflow:     "hidden",
    borderWidth:  1,
    borderColor:  "rgba(255,255,255,0.22)",
  },
  brandName: {
    color:              theme.colors.surface,
    fontSize:           14,
    lineHeight:         20,
    fontFamily:         theme.fonts.black,
    includeFontPadding: false,
    textAlignVertical:  "center",
  },
  skipBtn: {
    position:          "absolute",
    zIndex:            theme.zIndex.toast,
    end:               theme.layout.pagePaddingH,
    minHeight:         40,
    paddingHorizontal: 18,
    paddingVertical:   10,
    borderRadius:      theme.radius.pill,
    alignItems:        "center",
    justifyContent:    "center",
    backgroundColor:   "rgba(2,9,20,0.50)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.20)",
  },
  skipText: {
    color:              theme.colors.surface,
    includeFontPadding: false,
    lineHeight:         18,
    textAlignVertical:  "center",
  },
});

// Background aurora positions (logical start/end keys — auto-mirrored)
const bg = StyleSheet.create({
  auroraA: {
    position: "absolute",
    top:      -90,
    end:      -120,
  },
  auroraB: {
    position: "absolute",
    bottom:   "16%",
    start:    -130,
  },
  sizeA: { width: 420, height: 420 },
  sizeB: { width: 340, height: 340 },
});

// Slide content
const page = StyleSheet.create({
  root: {
    paddingHorizontal: theme.layout.pagePaddingH,
    justifyContent:    "center",
    gap:               theme.spacing["3xl"],
  },
  heroZone: {
    alignItems:      "center",
    justifyContent:  "center",
    paddingVertical: 30,
  },
  heroZoneCompact: {
    paddingVertical: 20,
  },
  // Soft accent halo behind the hero card
  glow: {
    position:     "absolute",
    width:        300,
    height:       300,
    borderRadius: 150,
  },
  copy: {
    gap: theme.spacing.md,
  },
  eyebrowPill: {
    alignSelf:         IS_RTL ? "flex-end" : "flex-start",
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    gap:               theme.spacing.xs,
    minHeight:         36,
    paddingHorizontal: theme.spacing.md,
    borderRadius:      theme.radius.pill,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.12)",
  },
  eyebrowText: {
    fontSize:           11,
    lineHeight:         18,
    includeFontPadding: false,
    textAlignVertical:  "center",
  },
  title: {
    fontFamily:         theme.fonts.black,
    fontSize:           42,
    lineHeight:         54,
    color:              theme.colors.surface,
    textAlign:          START_ALIGN,
    letterSpacing:      -1.0,
    includeFontPadding: false,
    textAlignVertical:  "center",
  },
  titleCompact: {
    fontSize:   34,
    lineHeight: 44,
  },
  body: {
    color:              "rgba(255,255,255,0.74)",
    textAlign:          START_ALIGN,
    lineHeight:         26,
    includeFontPadding: false,
    textAlignVertical:  "center",
  },
});

// Hero card
const hero = StyleSheet.create({
  // 1.5px gradient border via padded LinearGradient wrapper
  borderWrap: {
    borderRadius: 33.5,
    padding:      1.5,
    ...theme.shadow.float,
  },
  card: {
    borderRadius:    32,
    paddingVertical: 30,
    alignItems:      "center",
    gap:             6,
    backgroundColor: "rgba(9,24,44,0.66)",
    overflow:        "hidden",
  },
  cardCompact: {
    paddingVertical: 22,
  },
  // Diagonal light sheen across the top of the glass
  sheen: {
    position:        "absolute",
    top:             -70,
    left:            -40,
    right:           -40,
    height:          130,
    backgroundColor: "rgba(255,255,255,0.05)",
    transform:       [{ rotate: "-12deg" }],
  },
  orb: {
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    borderColor:    "rgba(255,255,255,0.18)",
    marginBottom:   12,
  },
  orbRing: {
    position:    "absolute",
    top:         4,
    left:        4,
    right:       4,
    bottom:      4,
    borderWidth: 1,
  },
  logoTile: {
    overflow:        "hidden",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: theme.colors.surface,
  },
  metricNum: {
    fontFamily:         theme.fonts.black,
    fontSize:           54,
    lineHeight:         62,
    color:              theme.colors.surface,
    letterSpacing:      -2,
    includeFontPadding: false,
    textAlignVertical:  "center",
  },
  metricNumCompact: {
    fontSize:   42,
    lineHeight: 50,
  },
  metricLabel: {
    color:              "rgba(255,255,255,0.62)",
    textAlign:          "center",
    includeFontPadding: false,
    lineHeight:         16,
    paddingHorizontal:  20,
  },
});

// Satellite chips
const sat = StyleSheet.create({
  chip: {
    position:          "absolute",
    zIndex:            2,
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    gap:               8,
    paddingVertical:   9,
    paddingHorizontal: 12,
    borderRadius:      18,
    backgroundColor:   "rgba(4,16,32,0.66)",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
    maxWidth:          190,
    ...theme.shadow.lg,
  },
  icon: {
    width:          26,
    height:         26,
    borderRadius:   9,
    alignItems:     "center",
    justifyContent: "center",
  },
  label: {
    color:              theme.colors.surface,
    includeFontPadding: false,
    lineHeight:         16,
    flexShrink:         1,
  },
});

// Footer (dots + CTA)
const foot = StyleSheet.create({
  wrap: {
    position:          "absolute",
    left:              0,
    right:             0,
    bottom:            0,
    zIndex:            theme.zIndex.overlay,
    paddingHorizontal: theme.layout.pagePaddingH,
    gap:               theme.spacing.lg,
  },
  dotsRow: {
    flexDirection:  flexRow(IS_RTL),
    alignItems:     "center",
    justifyContent: "center",
    gap:            theme.spacing.xs,
    minHeight:      16,
  },
  dot: {
    height:       8,
    borderRadius: 4,
    borderWidth:  1,
  },
  cta: {
    borderRadius:  22,
    overflow:      "hidden",
    ...theme.shadow.teal,
  },
  ctaGradient: {
    minHeight:      64,
    borderRadius:   22,
    justifyContent: "center",
  },
  ctaFace: {
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    justifyContent:    "center",
    gap:               theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  ctaFaceOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  ctaText: {
    color:              theme.colors.surface,
    fontFamily:         theme.fonts.black,
    fontSize:           15,
    lineHeight:         22,
    letterSpacing:      -0.2,
    includeFontPadding: false,
    textAlignVertical:  "center",
  },
  ctaIconChip: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems:      "center",
    justifyContent:  "center",
  },
});
