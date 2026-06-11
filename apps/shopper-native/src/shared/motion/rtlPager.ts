/**
 * rtlPager — reusable RTL-aware horizontal pager math.
 *
 * Why this exists
 * ───────────────
 * On **Android**, an RTL horizontal ScrollView / FlatList inverts the
 * `contentOffset` origin: raw offset 0 = the LAST logical page (leftmost),
 * increasing toward the first. **iOS** keeps offset 0 = first page. Any
 * scroll-driven interpolation that assumes `offset / pageWidth === index`
 * is therefore wrong on Android RTL — which manifests as "opens on the last
 * page", "only one page renders", and "no swipe animation".
 *
 * These helpers normalize that difference in one place so every pager in the
 * app (onboarding today, any future carousel) shares the same correct math
 * instead of re-deriving it. The worklet helper is safe to call inside
 * Reanimated `useAnimatedStyle` / `useAnimatedScrollHandler` bodies.
 */

import { I18nManager, Platform } from "react-native";

const IS_RTL = I18nManager.isRTL;

/** True only where the native scroll offset origin is inverted (Android RTL). */
export const RTL_ANDROID = IS_RTL && Platform.OS === "android";

/**
 * Raw horizontal scroll offset → logical page progress.
 * Returns 0 at the first page, `lastIndex` at the last — on every platform.
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
