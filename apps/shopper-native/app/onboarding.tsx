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
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
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
import { edgeEnd, flexRow, isRtl, textAlignStart } from "@/utils/layout";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface SlideFeature {
  icon: IoniconsName;
  labelKey: string;
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
  },
];

const IS_RTL = isRtl();
const START_ALIGN = textAlignStart(IS_RTL);
const FORWARD_ICON: IoniconsName = IS_RTL ? "chevron-back" : "chevron-forward";

const ProgressDot = React.memo(function ProgressDot({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const width = useSharedValue(active ? 30 : 8);

  useEffect(() => {
    width.value = withSpring(active ? 30 : 8, theme.animation.spring.snappy);
  }, [active, width]);

  const dotStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: active ? theme.colors.brand.base : "rgba(15,23,42,0.14)",
  }));

  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button">
      <Animated.View style={[styles.dot, dotStyle]} />
    </Pressable>
  );
});

const FeatureChip = React.memo(function FeatureChip({
  feature,
}: {
  feature: SlideFeature;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.featureChip}>
      <View style={styles.featureIcon}>
        <Ionicons name={feature.icon} size={14} color={theme.colors.brand[700]} />
      </View>
      <Text variant="caption" weight="bold" style={styles.featureText} numberOfLines={1}>
        {t(feature.labelKey)}
      </Text>
    </View>
  );
});

const HeroPreview = React.memo(function HeroPreview({
  slide,
  compact,
}: {
  slide: Slide;
  compact: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Animated.View
      entering={FadeInUp.duration(420).delay(80)}
      style={[styles.heroPreview, compact && styles.heroPreviewCompact]}>
      <View style={styles.previewTopBar}>
        <View style={styles.previewSearch}>
          <Ionicons name="search" size={14} color="rgba(255,255,255,0.72)" />
          <View style={styles.previewSearchLine} />
        </View>
        <View style={[styles.previewStatus, { backgroundColor: slide.accentSoft }]}>
          <Ionicons name={slide.icon} size={16} color={slide.accent} />
        </View>
      </View>

      <View style={styles.previewBody}>
        <View style={styles.logoTile}>
          {slide.showLogo ? (
            <AppLogo size="md" />
          ) : (
            <Ionicons name={slide.icon} size={34} color={theme.colors.brand[700]} />
          )}
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{slide.metricValue}</Text>
          <Text variant="caption" style={styles.metricLabel} numberOfLines={1}>
            {t(slide.metricLabelKey)}
          </Text>
        </View>
      </View>

      <View style={styles.previewList}>
        <View style={styles.previewListItem}>
          <View style={styles.previewDotStrong} />
          <View style={styles.previewLineLong} />
          <Ionicons name="checkmark-circle" size={16} color={slide.accent} />
        </View>
        <View style={styles.previewListItem}>
          <View style={styles.previewDotSoft} />
          <View style={styles.previewLineShort} />
          <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.58)" />
        </View>
      </View>
    </Animated.View>
  );
});

const SlidePage = React.memo(function SlidePage({
  slide,
  width,
  height,
  topInset,
  bottomInset,
}: {
  slide: Slide;
  width: number;
  height: number;
  topInset: number;
  bottomInset: number;
}) {
  const { t } = useTranslation();
  const compact = height < 720;
  const contentBottom = Math.max(bottomInset, theme.spacing[1]) + (compact ? 150 : 174);

  return (
    <LinearGradient
      colors={slide.gradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.page, { width, height, paddingTop: topInset + 18, paddingBottom: contentBottom }]}>
      <View pointerEvents="none" style={styles.topBand} />
      <View pointerEvents="none" style={styles.midBand} />

      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <AppLogo size="sm" />
        </View>
        <View style={styles.brandCopy}>
          <Text variant="caption" weight="black" style={styles.brandName}>
            United Pharmacy
          </Text>
          <Text variant="eyebrow" style={styles.brandSub}>
            {t(slide.eyebrowKey)}
          </Text>
        </View>
      </View>

      <View style={styles.slideContent}>
        <HeroPreview slide={slide} compact={compact} />

        <Animated.View
          entering={FadeInDown.duration(420).delay(130)}
          style={styles.copyBlock}>
          <View style={[styles.eyebrowPill, { backgroundColor: slide.accentSoft }]}>
            <Ionicons name={slide.icon} size={13} color={slide.accent} />
            <Text variant="caption" weight="black" style={[styles.eyebrowText, { color: slide.accent }]}>
              {t(slide.eyebrowKey)}
            </Text>
          </View>

          <Text style={styles.title}>
            {t(slide.titleKey)}
          </Text>

          <Text variant="body" style={styles.body}>
            {t(slide.bodyKey)}
          </Text>

          <View style={styles.featureRow}>
            {slide.features.map((feature) => (
              <FeatureChip key={feature.labelKey} feature={feature} />
            ))}
          </View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
});

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const flatRef = useRef<FlatList<Slide>>(null);
  const [current, setCurrent] = useState(0);

  const progress = useSharedValue(1 / SLIDES.length);
  const ctaScale = useSharedValue(1);
  const progressWidth = Math.max(1, width - theme.layout.pagePaddingH * 2);

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

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Slide>) => (
      <SlidePage
        slide={item}
        width={width}
        height={height}
        topInset={insets.top}
        bottomInset={insets.bottom}
      />
    ),
    [height, insets.bottom, insets.top, width],
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
      {!isLast && (
        <Pressable
          onPress={() => void finish()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.skipLabel")}
          style={[styles.skipBtn, { top: insets.top + 14 }, skipEdgeStyle]}>
          <Text variant="caption" weight="black" style={styles.skipText}>
            {t("onboarding.skip")}
          </Text>
        </Pressable>
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
        removeClippedSubviews
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
      />

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, theme.spacing[1]) + theme.spacing[1.5] },
        ]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>

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

        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <Pressable
            onPress={goNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? t("onboarding.start") : t("onboarding.next")}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <Text variant="body" weight="black" style={styles.ctaText}>
              {isLast ? t("onboarding.start") : t("onboarding.next")}
            </Text>
            <View style={styles.ctaIconWrap}>
              <Ionicons name={isLast ? "checkmark" : FORWARD_ICON} size={17} color={theme.colors.brand[700]} />
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.hero,
  },
  page: {
    overflow: "hidden",
    paddingHorizontal: theme.layout.pagePaddingH,
  },
  topBand: {
    position: "absolute",
    top: -80,
    left: -60,
    right: -60,
    height: 190,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    transform: [{ rotate: "-8deg" }],
  },
  midBand: {
    position: "absolute",
    top: 260,
    left: -80,
    right: -80,
    height: 120,
    backgroundColor: "rgba(255,255,255,0.035)",
    transform: [{ rotate: "10deg" }],
  },
  skipBtn: {
    position: "absolute",
    zIndex: theme.zIndex.toast,
    minHeight: 40,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  skipText: {
    color: theme.colors.surface,
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: "center",
  },
  brandRow: {
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.md,
    paddingEnd: 92,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  brandCopy: {
    flex: 1,
    gap: 1,
  },
  brandName: {
    color: theme.colors.surface,
    textAlign: START_ALIGN,
    includeFontPadding: false,
    lineHeight: 18,
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
  heroPreview: {
    minHeight: 274,
    borderRadius: 30,
    padding: theme.spacing.lg,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    ...theme.shadow.float,
  },
  heroPreviewCompact: {
    minHeight: 236,
    padding: theme.spacing.md,
  },
  previewTopBar: {
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.md,
  },
  previewSearch: {
    flex: 1,
    minHeight: 42,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  previewSearchLine: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  previewStatus: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  previewBody: {
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  logoTile: {
    width: 90,
    height: 90,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  metricCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 24,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
  },
  metricValue: {
    fontFamily: theme.fonts.black,
    fontSize: 34,
    lineHeight: 40,
    color: theme.colors.hero,
    textAlign: START_ALIGN,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  metricLabel: {
    color: theme.colors.text.muted,
    textAlign: START_ALIGN,
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: "center",
  },
  previewList: {
    gap: theme.spacing.sm,
  },
  previewListItem: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  previewDotStrong: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.teal[300],
  },
  previewDotSoft: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  previewLineLong: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  previewLineShort: {
    flex: 0.72,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  copyBlock: {
    gap: theme.spacing.md,
  },
  eyebrowPill: {
    alignSelf: IS_RTL ? "flex-end" : "flex-start",
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.xs,
    minHeight: 34,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  eyebrowText: {
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: "center",
  },
  title: {
    fontFamily: theme.fonts.black,
    fontSize: 34,
    lineHeight: 42,
    color: theme.colors.surface,
    textAlign: START_ALIGN,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  body: {
    color: "rgba(255,255,255,0.74)",
    textAlign: START_ALIGN,
    lineHeight: 24,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  featureRow: {
    flexDirection: flexRow(IS_RTL),
    gap: theme.spacing.sm,
    flexWrap: "wrap",
  },
  featureChip: {
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    gap: theme.spacing.sm,
    minHeight: 42,
    maxWidth: "100%",
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  featureIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  featureText: {
    maxWidth: 170,
    color: theme.colors.surface,
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.layout.pagePaddingH,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    ...theme.shadow["2xl"],
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.slate[100],
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.brand.base,
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
  cta: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.brand.base,
    flexDirection: flexRow(IS_RTL),
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    ...theme.shadow.teal,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: theme.colors.surface,
    includeFontPadding: false,
    lineHeight: 22,
    textAlignVertical: "center",
  },
  ctaIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
});
