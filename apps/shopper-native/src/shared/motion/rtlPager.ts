/**
 * rtlPager — RTL-aware horizontal pager math.
 *
 * Confirmed on-device behaviour (Fabric / New Architecture, build 6fe824c which
 * used identity mapping): **Android RTL inverts the horizontal scroll-offset
 * origin** — raw offset 0 = the LAST logical page, increasing toward the first.
 * iOS keeps offset 0 = first page. (The screenshots showed the first slide
 * rendering with the *last* slide's progress dot + CTA, which is exactly this
 * inversion surfacing through `offset/width`.)
 *
 * So `RTL_ANDROID` is true on Android RTL and the helpers invert there. The
 * onboarding now drives its active index from `onViewableItemsChanged` (which
 * is layout-based and immune to this), and only uses `pagerOffset` for
 * dot-tap navigation via `scrollToOffset` — where the inverted offset is
 * required to land on the right page.
 */

import { I18nManager, Platform } from "react-native";

const IS_RTL = I18nManager.isRTL;

/** True where the native RTL horizontal scroll-offset origin is inverted. */
export const RTL_ANDROID = IS_RTL && Platform.OS === "android";

/**
 * Raw horizontal scroll offset → logical page progress (0 = first … lastIndex).
 * Worklet: callable from Reanimated UI-thread bodies.
 */
export function pagerProgress(offsetX: number, pageWidth: number, lastIndex: number): number {
  "worklet";
  const raw = offsetX / Math.max(pageWidth, 1);
  return RTL_ANDROID ? lastIndex - raw : raw;
}

/**
 * Logical page index → raw scroll offset for `scrollToOffset({ offset })`.
 * Inverse of {@link pagerProgress}. JS-thread helper (not a worklet).
 */
export function pagerOffset(index: number, pageWidth: number, lastIndex: number): number {
  return (RTL_ANDROID ? lastIndex - index : index) * pageWidth;
}
