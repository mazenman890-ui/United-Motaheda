import React, { useEffect } from "react";
import { Dimensions, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";

const { width: SCREEN_W } = Dimensions.get("window");

interface SkeletonProps {
  width?:   number | `${number}%`;
  height?:  number;
  radius?:  number;
  style?:   StyleProp<ViewStyle>;
}

export function Skeleton({ width = "100%", height = 16, radius = theme.radius.md, style }: SkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [-SCREEN_W, SCREEN_W],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius:    radius,
          backgroundColor: theme.colors.slate[200],
          overflow:        "hidden",
        },
        style,
      ]}>
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: SCREEN_W }, animStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Preset skeletons ─────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius:    theme.layout.cardRadius,
      overflow:        "hidden",
      ...theme.shadow.card,
    }}>
      <Skeleton height={160} radius={0} />
      <View style={{ padding: 12, gap: 8 }}>
        <Skeleton height={13} width="75%" />
        <Skeleton height={11} width="50%" />
        <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 4 }}>
          <Skeleton height={16} width={60} />
          <Skeleton height={32} width={32} radius={theme.radius.md} />
        </View>
      </View>
    </View>
  );
}

export function CategoryCardSkeleton() {
  return <Skeleton width={102} height={172} radius={theme.radius['2xl']} />;
}

export function OrderCardSkeleton() {
  return (
    <View style={{
      backgroundColor: theme.colors.surface,
      borderRadius:    theme.layout.cardRadius,
      padding:         16,
      gap:             10,
      ...theme.shadow.card,
    }}>
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
        <Skeleton height={14} width="40%" />
        <Skeleton height={22} width={70} radius={theme.radius.full} />
      </View>
      <Skeleton height={11} width="60%" />
      <View style={{ flexDirection: "row-reverse", justifyContent: "space-between", marginTop: 4 }}>
        <Skeleton height={14} width={80} />
        <Skeleton height={14} width={100} />
      </View>
    </View>
  );
}
