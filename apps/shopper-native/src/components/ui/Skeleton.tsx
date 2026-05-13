import React, { useEffect } from "react";
import { Dimensions, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/theme";

const W = Dimensions.get("window").width;

interface SkeletonProps {
  width?:  number | `${number}%`;
  height?: number;
  radius?: number;
  style?:  StyleProp<ViewStyle>;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, style }: SkeletonProps) {
  const x = useSharedValue(-W);

  useEffect(() => {
    x.value = withRepeat(withTiming(W, { duration: 1100 }), -1, false);
    return () => cancelAnimation(x);
  }, [x]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.slate[200],
          overflow: "hidden",
        },
        style,
      ]}>
      <Animated.View
        style={[
          { position: "absolute", top: 0, bottom: 0, width: W },
          shimmerStyle,
        ]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>
    </View>
  );
}

export function ProductCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.04)",
        ...theme.shadow.sm,
      }}>
      <Skeleton height={152} radius={0} />
      <View style={{ padding: 12, gap: 8 }}>
        <Skeleton width="75%" height={12} />
        <Skeleton width="55%" height={11} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <Skeleton width={56} height={18} radius={6} />
          <Skeleton width={36} height={36} radius={10} />
        </View>
      </View>
    </View>
  );
}

export function CategoryTileSkeleton() {
  return (
    <View
      style={{
        flex: 1,
        height: 140,
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.slate[200],
        overflow: "hidden",
      }}>
      <Skeleton height={140} radius={0} />
    </View>
  );
}
