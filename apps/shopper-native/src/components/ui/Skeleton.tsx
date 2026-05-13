import React, { useEffect, useRef } from "react";
import { Animated, View, type ViewStyle, type StyleProp } from "react-native";
import { theme } from "@/theme";

interface SkeletonProps {
  width?:  number | string;
  height?: number;
  radius?: number;
  style?:  StyleProp<ViewStyle>;
}

export function Skeleton({ width = "100%", height = 16, radius = 8, style }: SkeletonProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.slate[200],
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 12, gap: 10, ...theme.shadow.sm }}>
      <Skeleton height={140} radius={12} />
      <Skeleton width="70%" height={14} />
      <Skeleton width="50%" height={12} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Skeleton width={60} height={18} />
        <Skeleton width={36} height={36} radius={10} />
      </View>
    </View>
  );
}
