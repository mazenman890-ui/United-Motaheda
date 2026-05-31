import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  FlatList,
  I18nManager,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
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
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { AppLogo } from "@/shared/components/AppLogo";
import { Text } from "@/shared/ui";
import { theme } from "@/theme";
import { ONBOARDING_KEY } from "@/lib/onboardingKey";

// ──────────────────────────────────────────
// Dimensions & helpers
// ──────────────────────────────────────────
const { width: W, height: H } = Dimensions.get("window");
// Visual takes 44% — gives the content panel enough room for all text + controls
const VISUAL_H = Math.round(H * 0.44);
const TRACK_W = W - theme.spacing[3] * 2 - theme.spacing[2] * 2;
const isRTL = I18nManager.isRTL;

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface Slide {
  id: number;
  eyebrowKey: string;
  titleKey: string;
  bodyKey: string;
  icon?: IoniconsName;
  gradient: readonly [string, string, string];
  ringColor: string;
  accent: string;
  logoSlide: boolean;
}

// ──────────────────────────────────────────
// Data
// ──────────────────────────────────────────
const SLIDES: Slide[] = [
  {
    id:         1,
    eyebrowKey: "onboarding.slide1Eyebrow",
    titleKey:   "onboarding.slide1Title",
    bodyKey:    "onboarding.slide1Body",
    gradient:   ["#044039", "#087A6F", "#0DB8A8"],
    ringColor:  "rgba(92, 224, 210, 0.28)",
    accent:     "#5CE0D2",
    logoSlide:  true,
  },
  {
    id:         2,
    icon:       "flash" as IoniconsName,
    eyebrowKey: "onboarding.slide2Eyebrow",
    titleKey:   "onboarding.slide2Title",
    bodyKey:    "onboarding.slide2Body",
    gradient:   ["#07152A", "#0C2240", "#1A4570"],
    ringColor:  "rgba(8, 145, 178, 0.30)",
    accent:     "#2CCCBD",
    logoSlide:  false,
  },
  {
    id:         3,
    icon:       "shield-checkmark" as IoniconsName,
    eyebrowKey: "onboarding.slide3Eyebrow",
    titleKey:   "onboarding.slide3Title",
    bodyKey:    "onboarding.slide3Body",
    gradient:   ["#022C27", "#044039", "#065C54"],
    ringColor:  "rgba(153, 240, 230, 0.25)",
    accent:     "#99F0E6",
    logoSlide:  false,
  },
];

// ──────────────────────────────────────────
// Sub‑components (memoized where beneficial)
// ──────────────────────────────────────────

// Floating ambient circle
const DecoCircle = React.memo(
  ({
    top,
    right,
    left,
    bottom,
    size,
    opacity,
  }: {
    top?: number;
    right?: number;
    left?: number;
    bottom?: number;
    size: number;
    opacity: number;
  }) => (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        right,
        left,
        bottom,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `rgba(255,255,255,${opacity})`,
      }}
    />
  ),
);

// Pulsating ring around the medallion
const PulseRing = React.memo(
  ({ color, delay = 0 }: { color: string; delay?: number }) => {
    const scale = useSharedValue(0.5);
    const opacity = useSharedValue(0.8);

    useEffect(() => {
      scale.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: delay, easing: Easing.linear }),
          withTiming(2.4, { duration: 1900, easing: Easing.out(Easing.quad) }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: delay, easing: Easing.linear }),
          withTiming(0, { duration: 1900, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      );
      return () => {
        cancelAnimation(scale);
        cancelAnimation(opacity);
      };
    }, [delay]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: color,
          },
          animatedStyle,
        ]}
      />
    );
  },
);

// Medallion: glass layers + staggered pulse rings
const Medallion = React.memo(({ slide }: { slide: Slide }) => {
  const isLogo = slide.logoSlide;
  return (
    <View style={styles.medallionWrap}>
      <PulseRing color={slide.ringColor} delay={0} />
      <PulseRing color={slide.ringColor} delay={650} />
      <PulseRing color={slide.ringColor} delay={1300} />

      <View style={styles.medallionOuter}>
        <View
          style={[
            styles.medallionInner,
            isLogo && {
              backgroundColor: "#FFFFFF",
              borderColor: "rgba(255,255,255,0.6)",
            },
          ]}
        >
          {isLogo ? (
            <AppLogo size="md" />
          ) : (
            <Ionicons
              name={slide.icon as IoniconsName}
              size={46}
              color="#FFFFFF"
            />
          )}
        </View>
      </View>
    </View>
  );
});

// Full‑screen gradient visual for each slide
const SlideVisual = React.memo(
  ({
    slide,
    width,
    height,
    topInset,
  }: {
    slide: Slide;
    width: number;
    height: number;
    topInset: number;
  }) => (
    <LinearGradient
      colors={slide.gradient}
      start={{ x: 0.35, y: 0 }}
      end={{ x: 0.65, y: 1 }}
      style={{ width, height }}
    >
      {/* Subtle ambient decorations */}
      <DecoCircle top={-70} right={-70} size={220} opacity={0.04} />
      <DecoCircle bottom={-30} right={-30} size={130} opacity={0.04} />

      {/* Soft border ring for texture */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -140,
          alignSelf: "center",
          width: width + 80,
          height: width + 80,
          borderRadius: (width + 80) / 2,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
        }}
      />

      {/* Medallion centered, pushed below status bar */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: topInset,
        }}
      >
        <Medallion slide={slide} />
      </View>
    </LinearGradient>
  ),
);

// Animated progress dot
const ProgressDot = React.memo(
  ({ active, onPress }: { active: boolean; onPress: () => void }) => {
    const width = useSharedValue(active ? 28 : 8);

    useEffect(() => {
      width.value = withSpring(active ? 28 : 8, theme.animation.spring.snappy);
    }, [active]);

    const dotStyle = useAnimatedStyle(() => ({
      width: width.value,
      backgroundColor: active
        ? theme.colors.brand.base
        : theme.colors.slate[200],
    }));

    return (
      <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button">
        <Animated.View style={[styles.dot, dotStyle]} />
      </Pressable>
    );
  },
);

// ──────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatRef = useRef<FlatList<Slide>>(null);

  const [current, setCurrent] = useState(0);
  const progress = useSharedValue(1 / SLIDES.length);
  const btnScale = useSharedValue(1);

  // Smooth content animation (no re‑mounting)
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);

  // Finish onboarding
  const finish = useCallback(async () => {
    btnScale.value = withSpring(0.91, theme.animation.spring.press, () => {
      btnScale.value = withSpring(1, theme.animation.spring.gentle);
    });
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  }, [btnScale, router]);

  // Navigate to a specific slide
  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= SLIDES.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
  }, []);

  // Next / start
  const goNext = useCallback(() => {
    if (current < SLIDES.length - 1) {
      goTo(current + 1);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      finish();
    }
  }, [current, finish, goTo]);

  // Animate content when slide changes
  useEffect(() => {
    contentOpacity.value = withTiming(0, { duration: 150 });
    contentTranslateY.value = withTiming(10, { duration: 150 });
    const timer = setTimeout(() => {
      contentOpacity.value = withTiming(1, { duration: 400 });
      contentTranslateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    }, 160);
    return () => clearTimeout(timer);
  }, [current]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  // Viewability configuration for accurate slide tracking
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 55 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setCurrent(idx);
        progress.value = withTiming((idx + 1) / SLIDES.length, {
          duration: 380,
          easing: Easing.out(Easing.cubic),
        });
      }
    },
  );

  // FlatList helpers
  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Slide>) => (
      <SlideVisual
        slide={item}
        width={W}
        height={VISUAL_H}
        topInset={insets.top}
      />
    ),
    [insets.top],
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: W,
      offset: W * index,
      index,
    }),
    [],
  );

  // Derived values
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: progress.value * TRACK_W,
  }));

  const isLast = current === SLIDES.length - 1;
  const slide = SLIDES[current];

  // Next/start icon – RTL‑aware
  const nextIcon = useMemo(() => {
    if (isLast) return "checkmark";
    return "chevron-forward";
  }, [isLast]);
  const nextIconStyle = useMemo(
    () => (!isLast && isRTL ? { transform: [{ scaleX: -1 }] } : undefined),
    [isLast],
  );

  return (
    <View style={styles.root}>
      {/* Visual area: full‑width horizontal slide deck */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => String(s.id)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
        bounces={false}
        windowSize={3}
        maxToRenderPerBatch={3}
        removeClippedSubviews
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        style={{ height: VISUAL_H, flexGrow: 0 }}
      />

      {/* Content panel with rounded top overlap */}
      <Animated.View
        entering={FadeIn.duration(280)}
        style={[
          styles.panel,
          { paddingBottom: Math.max(insets.bottom, theme.spacing[1]) + theme.spacing[2] },
        ]}
      >
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, barStyle]} />
        </View>

        {/* Dot navigation */}
        <View
          style={styles.dotsRow}
          accessibilityRole="progressbar"
          accessibilityLabel={t("onboarding.slideProgress", { n: current + 1, total: SLIDES.length })}
          accessibilityValue={{ min: 0, max: SLIDES.length - 1, now: current }}
        >
          {SLIDES.map((s, i) => (
            <ProgressDot
              key={s.id}
              active={current === i}
              onPress={() => goTo(i)}
            />
          ))}
        </View>

        {/* Slide content – smoothly animated via shared values */}
        <View style={styles.contentArea}>
          <Animated.View style={[{ alignItems: "center", gap: theme.spacing[1.5] }, contentAnimatedStyle]}>
            {/* Eyebrow pill */}
            <View style={[styles.eyebrowPill, { backgroundColor: `${slide.accent}28` }]}>
              <Text
                variant="caption"
                weight="extrabold"
                style={{ color: theme.colors.brand.strong, letterSpacing: 0.3 }}
              >
                {t(slide.eyebrowKey)}
              </Text>
            </View>

            {/* Title */}
            <Text style={styles.title}>{t(slide.titleKey)}</Text>

            {/* Body */}
            <Text
              variant="body"
              color="secondary"
              align="center"
              style={{ lineHeight: 29 }}
            >
              {t(slide.bodyKey)}
            </Text>
          </Animated.View>
        </View>

        {/* Controls */}
        <View style={styles.ctaRow}>
          {!isLast ? (
            <Pressable
              onPress={finish}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("onboarding.skipLabel")}
            >
              <Text variant="caption" color="tertiary" style={{ letterSpacing: 0.3 }}>
                {t("onboarding.skip")}
              </Text>
            </Pressable>
          ) : (
            <View />
          )}

          <Animated.View style={btnStyle}>
            <Pressable
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel={isLast ? t("onboarding.start") : t("onboarding.next")}
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.88 }]}
            >
              <Text variant="body" weight="extrabold" style={{ color: "#fff" }}>
                {isLast ? t("onboarding.start") : t("onboarding.next")}
              </Text>
              <View style={styles.ctaIconWrap}>
                <Ionicons
                  name={nextIcon}
                  size={16}
                  color={isLast ? "#fff" : theme.colors.brand.base}
                  style={nextIconStyle}
                />
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

// ──────────────────────────────────────────
// Styles
// ──────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Medallion
  medallionWrap: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  medallionOuter: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  medallionInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    ...theme.shadow.xl,
  },

  // Content panel
  panel: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -30,
    paddingTop: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    gap: theme.spacing[1],
    ...theme.shadow["2xl"],
  },

  // Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: theme.colors.slate[100],
    borderRadius: 2,
    overflow: "hidden",
    marginHorizontal: theme.spacing[2],
  },
  progressFill: {
    height: 3,
    backgroundColor: theme.colors.brand.base,
    borderRadius: 2,
  },

  // Navigation dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing[0.5],
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Text content area
  contentArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[1],
  },

  // Eyebrow pill
  eyebrowPill: {
    paddingHorizontal: theme.spacing[1.5],
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing[0.5],
  },

  // Title
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.size["7xl"].fontSize,
    lineHeight: 48,
    fontFamily: theme.fonts.black,
    textAlign: "center",
    // Removed letterSpacing for better Arabic rendering
  },

  // Controls row
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[0.5],
  },

  // CTA pill
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
    backgroundColor: theme.colors.brand.base,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
    ...theme.shadow.teal,
  },
  ctaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
});