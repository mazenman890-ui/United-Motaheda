/**
 * PressableScale — a Pressable that springs its content down on touch.
 *
 * Consolidates the press-scale micro-interaction that was hand-rolled in the
 * splash skip pill, the onboarding CTA, and the onboarding skip button. One
 * implementation → consistent feel, correct reduced-motion handling, and no
 * duplicated shared-value plumbing per call site.
 *
 * The animated transform is applied to an inner Animated.View; pass the visual
 * style (background, padding, radius…) via `style` and it lands there. The
 * outer Pressable stays layout-neutral so hit area and visuals compose cleanly.
 *
 * Accessibility: respects OS "Reduce Motion" — the scale is skipped entirely
 * when reduced motion is on, so the control still responds instantly without
 * the spring. All Pressable a11y props pass straight through.
 */

import React, { useCallback } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type WithSpringConfig,
} from "react-native-reanimated";

const DEFAULT_SPRING: WithSpringConfig = { damping: 18, stiffness: 360, mass: 0.7 };

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  /** Scale applied while pressed (default 0.96). */
  scaleTo?: number;
  /** Spring config for press in/out (default: snappy, non-bouncy). */
  springConfig?: WithSpringConfig;
  /** Visual style — applied to the animated inner view. */
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function PressableScale({
  scaleTo = 0.96,
  springConfig = DEFAULT_SPRING,
  style,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps): React.ReactElement {
  const reduced = useReducedMotion();
  const scale   = useSharedValue(1);
  const anim    = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleIn = useCallback<NonNullable<PressableProps["onPressIn"]>>(
    (e) => {
      if (!reduced && !disabled) scale.value = withSpring(scaleTo, springConfig);
      onPressIn?.(e);
    },
    [reduced, disabled, scale, scaleTo, springConfig, onPressIn],
  );

  const handleOut = useCallback<NonNullable<PressableProps["onPressOut"]>>(
    (e) => {
      if (!reduced && !disabled) scale.value = withSpring(1, springConfig);
      onPressOut?.(e);
    },
    [reduced, disabled, scale, springConfig, onPressOut],
  );

  return (
    <Pressable onPressIn={handleIn} onPressOut={handleOut} disabled={disabled} {...rest}>
      <Animated.View style={[style, anim]}>{children}</Animated.View>
    </Pressable>
  );
}
