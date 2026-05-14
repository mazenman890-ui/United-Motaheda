import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
  cancelAnimation,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BrandMark } from "@/components/ui/BrandMark";
import { theme } from "@/theme";
import { ONBOARDING_KEY } from "./index";

const { width: W } = Dimensions.get("window");

type SlideColors = [string, string, string];

interface Slide {
  id:       number;
  colors:   SlideColors;
  accent:   string;
  icon?:    React.ComponentProps<typeof Ionicons>["name"];
  eyebrow:  string;
  title:    string;
  body:     string;
}

const SLIDES: Slide[] = [
  {
    id:      1,
    colors:  [theme.colors.hero, theme.colors.heroMid, theme.colors.heroBright],
    accent:  theme.colors.brand[400],
    eyebrow: "صيدلية United Motaheda",
    title:   "صحتك\nأولويتنا",
    body:    "أكثر من 52,000 منتج صيدلاني أصلي في متناول يدك في أي وقت",
  },
  {
    id:      2,
    colors:  ["#062040", "#0a3a6e", "#0d5fa0"],
    accent:  "#22d3ee",
    icon:    "flash-outline",
    eyebrow: "توصيل سريع",
    title:   "في بابك\nبأسرع وقت",
    body:    "أدوية أصلية توصّل إلى باب منزلك في نفس اليوم مع دفع مريح عند الاستلام",
  },
  {
    id:      3,
    colors:  ["#061e2e", "#0c3d55", "#0e5875"],
    accent:  "#67e8f9",
    icon:    "shield-checkmark-outline",
    eyebrow: "ضمان الجودة",
    title:   "أصلي ومضمون\n100%",
    body:    "فريق صيدلاني محترف وأدوية معتمدة ومضمونة — لكل داء دواء",
  },
];

function PulseRing({ color, delay = 0 }: { color: string; delay?: number }) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    const run = () => {
      scale.value   = withRepeat(withSequence(withTiming(1, { duration: delay }), withTiming(1.8, { duration: 1400 })), -1, false);
      opacity.value = withRepeat(withSequence(withTiming(0.5, { duration: delay }), withTiming(0, { duration: 1400 })), -1, false);
    };
    run();
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform:  [{ scale: scale.value }],
    opacity:    opacity.value,
    borderColor: color,
  }));

  return (
    <Animated.View style={[{
      position:     "absolute",
      width:        130,
      height:       130,
      borderRadius: 65,
      borderWidth:  1.5,
    }, style]} />
  );
}

function FloatDot({ x, y, color, size, delay }: { x: number; y: number; color: string; size: number; delay: number }) {
  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(0, { duration: delay }),
        withTiming(-14, { duration: 2200 }),
        withTiming(0, { duration: 2200 }),
      ), -1, false,
    );
    return () => cancelAnimation(translateY);
  }, [delay, translateY]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color }, s]} />
  );
}

export default function OnboardingScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);
  const btnScale = useSharedValue(1);

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    router.replace("/(tabs)");
  }, [router]);

  const goNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (current < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (current + 1) * W, animated: true });
    } else {
      btnScale.value = withSpring(0.94, { damping: 10, stiffness: 400 }, () => {
        btnScale.value = withSpring(1, { damping: 12, stiffness: 300 });
      });
      finish();
    }
  }, [btnScale, current, finish]);

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    if (idx !== current) setCurrent(idx);
  }, [current]);

  const btnStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

  const slide = SLIDES[current];

  return (
    <View style={{ flex: 1 }}>
      {/* Paged scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}>
        {SLIDES.map((s, i) => (
          <SlideView key={s.id} slide={s} active={current === i} width={W} insets={insets} />
        ))}
      </ScrollView>

      {/* Bottom controls — float above slides */}
      <View
        style={{
          position:          "absolute",
          bottom:            0,
          left:              0,
          right:             0,
          paddingHorizontal: 28,
          paddingBottom:     insets.bottom + 28,
          gap:               20,
          alignItems:        "center",
        }}
        pointerEvents="box-none">

        {/* Dot indicators */}
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {SLIDES.map((s, i) => {
            const active = current === i;
            return (
              <View
                key={s.id}
                style={{
                  width:           active ? 24 : 6,
                  height:          6,
                  borderRadius:    3,
                  backgroundColor: active ? "#fff" : "rgba(255,255,255,0.30)",
                }}
              />
            );
          })}
        </View>

        {/* CTA row */}
        <View
          style={{
            flexDirection:  "row",
            width:          "100%",
            alignItems:     "center",
            justifyContent: "space-between",
          }}>
          {/* Skip */}
          {current < SLIDES.length - 1 ? (
            <Pressable onPress={finish} hitSlop={12}>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: "600" }}>
                تخطى
              </Text>
            </Pressable>
          ) : (
            <View />
          )}

          {/* Next / Get Started */}
          <Animated.View style={btnStyle}>
            <Pressable
              onPress={goNext}
              style={({ pressed }) => ({
                flexDirection:     "row",
                alignItems:        "center",
                gap:               10,
                backgroundColor:   "#fff",
                borderRadius:      20,
                paddingHorizontal: 28,
                paddingVertical:   15,
                opacity:           pressed ? 0.88 : 1,
                ...theme.shadow.brand,
              })}>
              <Text style={{ color: slide.colors[1], fontSize: 15, fontFamily: theme.fonts.black }}>
                {current === SLIDES.length - 1 ? "ابدأ الآن" : "التالي"}
              </Text>
              <Ionicons
                name={current === SLIDES.length - 1 ? "checkmark-circle" : "arrow-back"}
                size={18}
                color={slide.colors[1]}
              />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

function SlideView({
  slide,
  active,
  width,
  insets,
}: {
  slide:  Slide;
  active: boolean;
  width:  number;
  insets: { top: number; bottom: number };
}) {
  return (
    <LinearGradient
      colors={slide.colors}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ width, flex: 1, position: "relative", overflow: "hidden" }}>

      {/* Ambient floating dots */}
      <FloatDot x={width * 0.08} y={insets.top + 80}  color="rgba(255,255,255,0.07)" size={60}  delay={0}    />
      <FloatDot x={width * 0.70} y={insets.top + 40}  color="rgba(255,255,255,0.05)" size={90}  delay={600}  />
      <FloatDot x={width * 0.15} y={insets.top + 320} color="rgba(255,255,255,0.04)" size={44}  delay={300}  />
      <FloatDot x={width * 0.75} y={insets.top + 260} color="rgba(255,255,255,0.06)" size={30}  delay={900}  />

      {/* Grid overlay */}
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            position:        "absolute",
            left:            `${i * 25}%` as unknown as number,
            top:             0,
            bottom:          0,
            width:           1,
            backgroundColor: "rgba(255,255,255,0.025)",
          }}
        />
      ))}

      {/* Content — vertically centered in upper 65% */}
      <View
        style={{
          position:          "absolute",
          top:               insets.top + 40,
          left:              0,
          right:             0,
          bottom:            200,
          alignItems:        "center",
          justifyContent:    "center",
          paddingHorizontal: 36,
          gap:               28,
        }}>

        {/* Icon area */}
        {slide.id === 1 ? (
          active ? (
            <Animated.View entering={FadeIn.duration(600)}>
              <BrandMark size="xl" variant="onHero" showText={false} />
            </Animated.View>
          ) : (
            <BrandMark size="xl" variant="onHero" showText={false} />
          )
        ) : (
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <PulseRing color={slide.accent} delay={0}    />
            <PulseRing color={slide.accent} delay={700}  />
            <View
              style={{
                width:           96,
                height:          96,
                borderRadius:    32,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems:      "center",
                justifyContent:  "center",
                borderWidth:     1.5,
                borderColor:     "rgba(255,255,255,0.22)",
              }}>
              <Ionicons name={slide.icon!} size={46} color="#fff" />
            </View>
          </View>
        )}

        {/* Text */}
        <View style={{ alignItems: "center", gap: 12 }}>
          {active ? (
            <Animated.Text
              entering={FadeInDown.duration(400).delay(100)}
              style={{
                color:         slide.accent,
                fontSize:      11,
                fontFamily:    theme.fonts.extrabold,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}>
              {slide.eyebrow}
            </Animated.Text>
          ) : (
            <Text style={{ color: slide.accent, fontSize: 11, fontFamily: theme.fonts.extrabold, letterSpacing: 2.5 }}>
              {slide.eyebrow}
            </Text>
          )}

          {active ? (
            <Animated.Text
              entering={FadeInDown.duration(500).delay(180)}
              style={{
                color:      "#fff",
                fontSize:   36,
                fontFamily: theme.fonts.black,
                lineHeight: 46,
                textAlign:  "center",
              }}>
              {slide.title}
            </Animated.Text>
          ) : (
            <Text style={{ color: "#fff", fontSize: 36, fontFamily: theme.fonts.black, lineHeight: 46, textAlign: "center" }}>
              {slide.title}
            </Text>
          )}

          {active ? (
            <Animated.Text
              entering={FadeInUp.duration(500).delay(260)}
              style={{
                color:      "rgba(255,255,255,0.65)",
                fontSize:   15,
                fontFamily: theme.fonts.regular,
                lineHeight: 26,
                textAlign:  "center",
              }}>
              {slide.body}
            </Animated.Text>
          ) : (
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, fontFamily: theme.fonts.regular, lineHeight: 26, textAlign: "center" }}>
              {slide.body}
            </Text>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}
