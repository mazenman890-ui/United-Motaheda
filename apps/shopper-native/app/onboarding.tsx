import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  ListRenderItemInfo,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewToken,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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
import { edgeEnd, flexRow, isRtl, textAlignStart } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface SlideFeature {
  icon: IoniconsName;
  labelKey: string;
}

interface DecorElement {
  r?: number | string;
  t?: number | string;
  l?: number | string;
  b?: number | string;
  size: number;
  opacity: number;
}

interface Slide {
  id: number;
  eyebrowKey: string;
  titleKey: string;
  bodyKey: string;
  metricValue: string;
  metricLabelKey: string;
  icon: IoniconsName;
  gradient: [string, string, string];
  accent: string;
  accentSoft: string;
  features: SlideFeature[];
  showLogo?: boolean;
  decorA: DecorElement;
  decorB: DecorElement;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    eyebrowKey: "onboarding.slide1Eyebrow",
    titleKey: "onboarding.slide1Title",
    bodyKey: "onboarding.slide1Body",
    metricValue: "52k+",
    metricLabelKey: "onboarding.metricProducts",
    icon: "medkit-outline",
    gradient: [theme.colors.hero, theme.colors.heroMid, theme.colors.heroBright],
    accent: theme.colors.teal[300],
    accentSoft: "rgba(92,224,210,0.18)",
    showLogo: true,
    features: [
      { icon: "shield-checkmark-outline", labelKey: "onboarding.featureGenuine" },
      { icon: "chatbubble-ellipses-outline", labelKey: "onboarding.featureSupport" },
    ],
    decorA: { r: -40, t: 60, size: 260, opacity: 0.08 },
    decorB: { l: -60, b: 120, size: 180, opacity: 0.04 },
  },
  {
    id: 2,
    eyebrowKey: "onboarding.slide2Eyebrow",
    titleKey: "onboarding.slide2Title",
    bodyKey: "onboarding.slide2Body",
    metricValue: "30-60",
    metricLabelKey: "onboarding.metricDelivery",
    icon: "flash-outline",
    gradient: [theme.colors.navy[900], theme.colors.navy[700], theme.colors.brand[700]],
    accent: theme.colors.teal[300],
    accentSoft: "rgba(103,232,249,0.18)",
    features: [
      { icon: "bicycle-outline", labelKey: "onboarding.featureFastDelivery" },
      { icon: "card-outline", labelKey: "onboarding.featureEasyPayment" },
    ],
    decorA: { l: -50, t: 80, size: 220, opacity: 0.09 },
    decorB: { r: -30, t: "40%", size: 140, opacity: 0.05 },
  },
  {
    id: 3,
    eyebrowKey: "onboarding.slide3Eyebrow",
    titleKey: "onboarding.slide3Title",
    bodyKey: "onboarding.slide3Body",
    metricValue: "100%",
    metricLabelKey: "onboarding.metricQuality",
    icon: "shield-checkmark-outline",
    gradient: [theme.colors.teal[950], theme.colors.teal[900], theme.colors.navy[800]],
    accent: theme.colors.teal[200],
    accentSoft: "rgba(153,240,230,0.18)",
    features: [
      { icon: "lock-closed-outline", labelKey: "onboarding.featureSecureOrders" },
      { icon: "reload-outline", labelKey: "onboarding.featureEasyReorder" },
    ],
    decorA: { r: -50, b: 160, size: 240, opacity: 0.07 },
    decorB: { l: -40, t: 50, size: 160, opacity: 0.04 },
  },
];

const IS_RTL      = isRtl();
const START_ALIGN = textAlignStart(IS_RTL);
const FORWARD_ICON: IoniconsName = IS_RTL ? "chevron-back" : "chevron-forward";

// ─── ProgressDot ─────────────────────────────────────────────────────────────

const ProgressDot = React.memo(function ProgressDot({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const width = useSharedValue(active ? 28 : 8);

  useEffect(() => {
    width.value = withSpring(active ? 28 : 8, theme.animation.spring.snappy);
  }, [active, width]);

  const dotStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: active ? theme.colors.teal[300] : "rgba(255,255,255,0.22)",
    borderWidth: active ? 1 : 0,
    borderColor: "rgba(255,255,255,0.30)",
  }));

  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button">
      <Animated.View style={[styles.dot, dotStyle]} />
    </Pressable>
  );
});

// ─── VisualCard — editorial hero composition per slide ───────────────────────
// New layout: large icon orb centred, large metric beside it in a row,
// accent divider, then proof chips below. Stronger glass treatment with
// a shine overlay at top and inner glow ring on the icon orb.

const VisualCard = React.memo(function VisualCard({
  slide,
  compact,
  animStyle,
}: {
  slide: Slide;
  compact: boolean;
  animStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  const { t } = useTranslation();
  const accent = slide.accent;

  return (
    <Animated.View style={[vc.card, compact && vc.cardCompact, animStyle]}>
      {/* Shine overlay — clipped to top, creates premium glass sheen */}
      <View style={vc.shine} pointerEvents="none" />

      {/* Top zone — large icon orb + metric in a row */}
      <View style={vc.topPair}>
        {/* Icon orb — 120×120 with inner glow ring */}
        <View style={[vc.iconOrb, { backgroundColor: slide.accentSoft }]}>
          {/* Inner glow ring — positioned absolute, inset 4px */}
          <View
            style={[
              vc.orbGlowRing,
              { borderColor: `${accent}30` },
            ]}
            pointerEvents="none"
          />
          {slide.showLogo ? (
            <View style={vc.logoInOrb}>
              <AppLogo size="md" />
            </View>
          ) : (
            <Ionicons name={slide.icon} size={48} color={accent} />
          )}
        </View>

        {/* Metric — billboard 52px display numeral */}
        <View style={vc.metricBox}>
          <Text style={vc.metricNum}>{slide.metricValue}</Text>
          <Text variant="caption" style={vc.metricLabel} numberOfLines={2}>
            {t(slide.metricLabelKey)}
          </Text>
        </View>
      </View>

      {/* Accent divider */}
      <View style={[vc.divider, { backgroundColor: `${accent}26` }]} />

      {/* Bottom zone — proof-point chips */}
      <View style={vc.proofRow}>
        {slide.features.map((f) => (
          <View
            key={f.labelKey}
            style={[vc.proofChip, { borderColor: `${accent}28` }]}>
            <View style={[vc.proofIcon, { backgroundColor: `${accent}1E` }]}>
              <Ionicons name={f.icon} size={13} color={accent} />
            </View>
            <Text variant="caption" weight="bold" style={vc.proofText} numberOfLines={1}>
              {t(f.labelKey)}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

// ─── SlidePage ────────────────────────────────────────────────────────────────
// Staggered entrance: eyebrow (80ms delay), title (160ms), body (240ms).
// Each element translates up from 20→0 while fading in.

const SlidePage = React.memo(function SlidePage({
  slide,
  width,
  height,
  topInset,
  bottomInset,
  isActive,
}: {
  slide: Slide;
  width: number;
  height: number;
  topInset: number;
  bottomInset: number;
  isActive: boolean;
}) {
  const { t } = useTranslation();
  const compact      = height < 720;
  const contentBottom =
    Math.max(bottomInset, theme.spacing[1]) + (compact ? 150 : 174);

  // Hero card animation values
  const heroOp  = useSharedValue(0);
  const heroSc  = useSharedValue(0.94);

  // Staggered copy animation values
  const eyebrowOp = useSharedValue(0);
  const eyebrowTY = useSharedValue(16);
  const titleOp   = useSharedValue(0);
  const titleTY   = useSharedValue(20);
  const bodyOp    = useSharedValue(0);
  const bodyTY    = useSharedValue(20);

  useEffect(() => {
    if (isActive) {
      // Hero card
      heroOp.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.ease) });
      heroSc.value = withSpring(1, theme.animation.spring.gentle);

      // Eyebrow — delay 80ms
      eyebrowOp.value = withDelay(80,  withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) }));
      eyebrowTY.value = withDelay(80,  withSpring(0, theme.animation.spring.gentle));

      // Title — delay 160ms
      titleOp.value   = withDelay(160, withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }));
      titleTY.value   = withDelay(160, withSpring(0, theme.animation.spring.gentle));

      // Body — delay 240ms
      bodyOp.value    = withDelay(240, withTiming(1, { duration: 420, easing: Easing.out(Easing.ease) }));
      bodyTY.value    = withDelay(240, withSpring(0, theme.animation.spring.gentle));
    } else {
      // Instant reset so the animation is fresh next time this slide is entered
      heroOp.value    = 0;
      heroSc.value    = 0.94;
      eyebrowOp.value = 0;
      eyebrowTY.value = 16;
      titleOp.value   = 0;
      titleTY.value   = 20;
      bodyOp.value    = 0;
      bodyTY.value    = 20;
    }
  }, [isActive, heroOp, heroSc, eyebrowOp, eyebrowTY, titleOp, titleTY, bodyOp, bodyTY]);

  const heroAnim = useAnimatedStyle(() => ({
    opacity:   heroOp.value,
    transform: [{ scale: heroSc.value }],
  }));

  const eyebrowAnim = useAnimatedStyle(() => ({
    opacity:   eyebrowOp.value,
    transform: [{ translateY: eyebrowTY.value }],
  }));

  const titleAnim = useAnimatedStyle(() => ({
    opacity:   titleOp.value,
    transform: [{ translateY: titleTY.value }],
  }));

  const bodyAnim = useAnimatedStyle(() => ({
    opacity:   bodyOp.value,
    transform: [{ translateY: bodyTY.value }],
  }));

  const { decorA, decorB } = slide;

  return (
    <LinearGradient
      colors={slide.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.page, { width, height, paddingTop: topInset + 18, paddingBottom: contentBottom }]}>

      {/* ── Decorative geometry ── depth layer A (teal tint) */}
      <View
        pointerEvents="none"
        style={[
          styles.decorCircle,
          {
            width:   decorA.size,
            height:  decorA.size,
            borderRadius: decorA.size / 2,
            backgroundColor: `rgba(44,204,189,${decorA.opacity})`,
            ...(decorA.t  !== undefined ? { top:    decorA.t  } : {}),
            ...(decorA.b  !== undefined ? { bottom: decorA.b  } : {}),
            ...(decorA.l  !== undefined ? { left:   decorA.l  } : {}),
            ...(decorA.r  !== undefined ? { right:  decorA.r  } : {}),
          },
        ]}
      />

      {/* ── Decorative geometry ── depth layer B (white tint) */}
      <View
        pointerEvents="none"
        style={[
          styles.decorCircle,
          {
            width:   decorB.size,
            height:  decorB.size,
            borderRadius: decorB.size / 2,
            backgroundColor: `rgba(255,255,255,${decorB.opacity})`,
            ...(decorB.t  !== undefined ? { top:    decorB.t  } : {}),
            ...(decorB.b  !== undefined ? { bottom: decorB.b  } : {}),
            ...(decorB.l  !== undefined ? { left:   decorB.l  } : {}),
            ...(decorB.r  !== undefined ? { right:  decorB.r  } : {}),
          },
        ]}
      />

      {/* ── Diagonal stripe — subtle texture */}
      <View pointerEvents="none" style={styles.diagonalStripe} />

      {/* Brand row */}
      <View style={styles.brandRow}>
        {/* Logo tile — gradient border wrapper */}
        <View style={styles.brandMarkGradientWrap}>
          <LinearGradient
            colors={["rgba(255,255,255,0.30)", "rgba(255,255,255,0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandMarkGradientBorder}>
            <View style={styles.brandMark}>
              <AppLogo size="sm" />
            </View>
          </LinearGradient>
        </View>

        <View style={styles.brandCopy}>
          <Text weight="black" style={styles.brandName}>
            United Pharmacy
          </Text>
          <Text variant="eyebrow" style={styles.brandSub}>
            {t(slide.eyebrowKey)}
          </Text>
        </View>
      </View>

      <View style={styles.slideContent}>
        <VisualCard slide={slide} compact={compact} animStyle={heroAnim} />

        <View style={styles.copyBlock}>
          {/* Eyebrow pill — staggered entrance first */}
          <Animated.View style={eyebrowAnim}>
            <View style={[styles.eyebrowPill, { backgroundColor: slide.accentSoft }]}>
              <Ionicons name={slide.icon} size={13} color={slide.accent} />
              <Text variant="caption" weight="black" style={[styles.eyebrowText, { color: slide.accent }]}>
                {t(slide.eyebrowKey)}
              </Text>
            </View>
          </Animated.View>

          {/* Title — staggered entrance second */}
          <Animated.View style={titleAnim}>
            <Text style={styles.title}>
              {t(slide.titleKey)}
            </Text>
          </Animated.View>

          {/* Body — staggered entrance third */}
          <Animated.View style={bodyAnim}>
            <Text variant="body" style={styles.body}>
              {t(slide.bodyKey)}
            </Text>
          </Animated.View>
        </View>
      </View>
    </LinearGradient>
  );
});

// ─── OnboardingScreen ─────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const flatRef = useRef<FlatList<Slide>>(null);
  const [current, setCurrent] = useState(0);

  const progress       = useSharedValue(1 / SLIDES.length);
  const ctaScale       = useSharedValue(1);
  const progressWidth  = Math.max(1, width - theme.layout.pagePaddingH * 2);

  const finish = useCallback(async () => {
    ctaScale.value = withSpring(0.94, theme.animation.spring.press, () => {
      ctaScale.value = withSpring(1, theme.animation.spring.gentle);
    });
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  }, [ctaScale, router]);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= SLIDES.length) return;
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
  }, []);

  const goNext = useCallback(() => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1);
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    void finish();
  }, [current, finish, goTo]);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const idx = viewableItems[0]?.index;
      if (idx == null) return;
      setCurrent(idx);
      progress.value = withTiming((idx + 1) / SLIDES.length, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    },
  );

  // current in deps so renderItem gets the latest active index
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Slide>) => (
      <SlidePage
        slide={item}
        width={width}
        height={height}
        topInset={insets.top}
        bottomInset={insets.bottom}
        isActive={current === index}
      />
    ),
    [height, insets.bottom, insets.top, width, current],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width],
  );

  const progressStyle = useAnimatedStyle(() => ({
    width: progress.value * progressWidth,
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const isLast = current === SLIDES.length - 1;
  const skipEdgeStyle = useMemo(
    () => ({ [edgeEnd(IS_RTL)]: theme.layout.pagePaddingH }),
    [],
  );

  return (
    <View style={styles.root}>
      {/* Skip button — fades in with a short delay; hidden on final slide */}
      {!isLast && (
        <Animated.View
          entering={FadeIn.duration(280).delay(200)}
          exiting={FadeOut.duration(200)}
          style={[styles.skipBtn, { top: insets.top + 14 }, skipEdgeStyle]}>
          <Pressable
            onPress={() => void finish()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("onboarding.skipLabel")}>
            <Text variant="caption" weight="black" style={styles.skipText}>
              {t("onboarding.skip")}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(slide) => String(slide.id)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={1}
        removeClippedSubviews
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
      />

      {/* Footer — slides up from the bottom on mount */}
      <Animated.View
        entering={FadeIn.duration(320).delay(500)}
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.spacing[1]) + theme.spacing[1.5] },
        ]}>
        {/* Progress track — the primary progress indicator */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>

        {/* Dots nav row */}
        <View
          style={styles.dotsRow}
          accessibilityRole="progressbar"
          accessibilityLabel={t("onboarding.slideProgress", { n: current + 1, total: SLIDES.length })}
          accessibilityValue={{ min: 0, max: SLIDES.length - 1, now: current }}>
          {SLIDES.map((slide, index) => (
            <ProgressDot
              key={slide.id}
              active={current === index}
              onPress={() => goTo(index)}
            />
          ))}
        </View>

        {/* CTA button — gradient treatment */}
        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <Pressable
            onPress={goNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? t("onboarding.start") : t("onboarding.next")}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <LinearGradient
              colors={[theme.colors.teal[400], theme.colors.teal[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}>
              <Text variant="body" weight="black" style={styles.ctaText}>
                {isLast ? t("onboarding.start") : t("onboarding.next")}
              </Text>
              <View style={styles.ctaIconWrap}>
                <Ionicons
                  name={isLast ? "checkmark" : FORWARD_ICON}
                  size={17}
                  color={theme.colors.teal[700]}
                />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.hero,
  },
  page: {
    overflow: "hidden",
    paddingHorizontal: theme.layout.pagePaddingH,
  },
  // Decorative blurred circle — unique per slide via inline style overrides
  decorCircle: {
    position: "absolute",
  },
  // Subtle diagonal stripe — 1.5px white line at -10 degrees
  diagonalStripe: {
    position: "absolute",
    top: -20,
    left: -60,
    right: -60,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.06)",
    transform: [{ rotate: "-10deg" }],
  },
  skipBtn: {
    position: "absolute",
    zIndex: theme.zIndex.toast,
    minHeight: 40,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,9,20,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  skipText: {
    color: theme.colors.surface,
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: "center",
  },
  // Brand row — logo tile + name/sub
  brandRow: {
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.md,
    paddingEnd: 92,
  },
  // Gradient border wrapper (1.5px padding acts as the gradient border)
  brandMarkGradientWrap: {
    borderRadius: 17.5,
    overflow: "hidden",
    flexShrink: 0,
  },
  brandMarkGradientBorder: {
    padding: 1.5,
    borderRadius: 17.5,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 16,
    overflow: "hidden",
  },
  brandCopy: {
    flex: 1,
    gap: 1,
  },
  brandName: {
    color: theme.colors.surface,
    textAlign: START_ALIGN,
    includeFontPadding: false,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.fonts.black,
    textAlignVertical: "center",
  },
  brandSub: {
    color: "rgba(255,255,255,0.58)",
    textAlign: START_ALIGN,
    includeFontPadding: false,
    lineHeight: 15,
    textAlignVertical: "center",
  },
  slideContent: {
    flex: 1,
    justifyContent: "center",
    gap: theme.spacing["2xl"],
  },
  copyBlock: {
    gap: theme.spacing.md,
  },
  eyebrowPill: {
    alignSelf: IS_RTL ? "flex-end" : "flex-start",
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.xs,
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  eyebrowText: {
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: "center",
    fontSize: 11,
  },
  title: {
    fontFamily:         theme.fonts.black,
    fontSize:           42,
    lineHeight:         50,
    color:              theme.colors.surface,
    textAlign:          START_ALIGN,
    includeFontPadding: false,
    textAlignVertical:  "center",
    letterSpacing:      -1.0,
  },
  body: {
    color: "rgba(255,255,255,0.72)",
    textAlign: START_ALIGN,
    lineHeight: 26,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  // Dark-glass footer — sits above the FlatList (zIndex), overlays the slide.
  footer: {
    position:            "absolute",
    left:                0,
    right:               0,
    bottom:              0,
    zIndex:              theme.zIndex.overlay,
    paddingTop:          20,
    paddingHorizontal:   theme.layout.pagePaddingH,
    gap:                 theme.spacing.md,
    backgroundColor:     "rgba(2, 9, 20, 0.90)",
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    borderTopWidth:       1,
    borderTopColor:       "rgba(255,255,255,0.12)",
    // Web: apply backdrop blur; native ignores this gracefully
    ...({ backdropFilter: "blur(20px)" } as any),
    ...theme.shadow["2xl"],
  },
  progressTrack: {
    height:          4,
    borderRadius:    2,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow:        "hidden",
  },
  progressFill: {
    height:          4,
    borderRadius:    2,
    backgroundColor: theme.colors.teal[400],
  },
  dotsRow: {
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    minHeight: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaWrap: {
    width: "100%",
  },
  // The Pressable itself — just overflow + borderRadius for clipping the gradient
  cta: {
    borderRadius:  20,
    overflow:      "hidden",
    ...theme.shadow.teal,
    shadowOpacity: 0.40,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  // LinearGradient fills the button interior
  ctaGradient: {
    minHeight:      62,
    borderRadius:   20,
    flexDirection:  flexRow(IS_RTL),
    alignItems:     "center",
    justifyContent: "center",
    gap:            theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  ctaText: {
    color:              theme.colors.surface,
    fontFamily:         theme.fonts.black,
    fontSize:           15,
    includeFontPadding: false,
    lineHeight:         22,
    textAlignVertical:  "center",
    letterSpacing:      -0.2,
  },
  ctaIconWrap: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems:      "center",
    justifyContent:  "center",
  },
});

// ─── VisualCard module-level StyleSheet ───────────────────────────────────────
// Separate from `styles` to keep style scope tight and aid tree-shaking.

const vc = StyleSheet.create({
  // Container — stronger frosted glass card
  card: {
    borderRadius:    28,
    padding:         20,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth:     1.5,
    borderColor:     "rgba(255,255,255,0.20)",
    gap:             18,
    overflow:        "hidden",
    ...theme.shadow.float,
  },
  cardCompact: {
    padding: 14,
    gap:     12,
  },

  // Shine overlay — top 40% of the card, very subtle white gradient
  shine: {
    position:        "absolute",
    top:             0,
    left:            0,
    right:           0,
    height:          "40%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
  },

  // Top pair — large orb on one side, metric on the other
  topPair: {
    flexDirection: flexRow(IS_RTL),
    alignItems:    "center",
    gap:           theme.spacing.lg,
  },

  // Icon orb — 120×120, borderRadius 36
  iconOrb: {
    width:          120,
    height:         120,
    borderRadius:   36,
    alignItems:     "center",
    justifyContent: "center",
    borderWidth:    1,
    borderColor:    "rgba(255,255,255,0.18)",
    flexShrink:     0,
  },

  // Subtle inner glow ring — position absolute, inset 4px
  orbGlowRing: {
    position:     "absolute",
    top:          4,
    left:         4,
    right:        4,
    bottom:       4,
    borderRadius: 32,
    borderWidth:  1,
  },

  // White clip for the AppLogo inside the orb
  logoInOrb: {
    width:           90,
    height:          90,
    borderRadius:    24,
    overflow:        "hidden",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: theme.colors.surface,
  },

  // Metric box — takes remaining horizontal space beside the orb
  metricBox: {
    flex:       1,
    gap:        6,
    paddingEnd: 4,
  },

  // 52px billboard numeral — the hero number
  metricNum: {
    fontFamily:         theme.fonts.black,
    fontSize:           52,
    lineHeight:         58,
    color:              theme.colors.surface,
    textAlign:          START_ALIGN,
    includeFontPadding: false,
    textAlignVertical:  "center",
    letterSpacing:      -2,
  },
  metricLabel: {
    color:              "rgba(255,255,255,0.65)",
    textAlign:          START_ALIGN,
    includeFontPadding: false,
    lineHeight:         16,
  },

  // Thin accent divider
  divider: {
    height:       1,
    borderRadius: 1,
  },

  // Proof row — two chips side-by-side
  proofRow: {
    flexDirection: flexRow(IS_RTL),
    gap:           8,
    flexWrap:      "wrap",
  },
  proofChip: {
    flex:              1,
    minWidth:          "40%" as any,
    minHeight:         48,
    flexDirection:     flexRow(IS_RTL),
    alignItems:        "center",
    gap:               8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical:   12,
    borderRadius:      999,
    backgroundColor:   "rgba(255,255,255,0.07)",
    borderWidth:       1,
  },
  proofIcon: {
    width:          26,
    height:         26,
    borderRadius:   13,
    alignItems:     "center",
    justifyContent: "center",
  },
  proofText: {
    flex:               1,
    color:              theme.colors.surface,
    includeFontPadding: false,
    lineHeight:         16,
    textAlign:          START_ALIGN,
  },
});
