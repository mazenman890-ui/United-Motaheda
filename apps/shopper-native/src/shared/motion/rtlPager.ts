/**
 * rtlPager — RTL-aware horizontal pager math.
 *
 * Why this exists
 * ───────────────
 * Historically (old/Paper architecture) **Android** inverted the
 * `contentOffset` origin of an RTL horizontal ScrollView: raw offset 0 = the
 * LAST logical page. iOS did not. That mismatch broke any scroll-driven
 * interpolation that assumed `offset / pageWidth === index`.
 *
 * This app runs on the **New Architecture (Fabric)** — `newArchEnabled: true`
 * in app.json. Fabric normalized RTL horizontal scrolling to match iOS:
 * **offset 0 = the FIRST logical page on every platform**, increasing as the
 * user advances. The old Android inversion no longer applies, and re-applying
 * it (as an earlier pass did) double-inverts — which made onboarding open on
 * the last slide and blanked pages because the opacity windows no longer lined
 * up with the visible slide.
 *
 * So under Fabric the helpers are the identity mapping: progress is the raw
 * scroll fraction and a page's offset is simply `index * pageWidth`. The
 * indirection is kept (one source of truth) so if a platform ever diverges
 * again it is a single edit here, not a sweep across every carousel.
 */

/**
 * True only where the native RTL scroll-offset origin is inverted.
 * Fabric is consistent with iOS, so this is false everywhere in this app.
 * Call sites gate RTL-specific seeding/correction on this flag, so flipping it
 * here is enough to re-enable the old-arch behaviour if ever needed.
 */
export const RTL_ANDROID = false;

/**
 * Raw horizontal scroll offset → logical page progress (0 = first page …
 * lastIndex = last). Worklet: callable from Reanimated UI-thread bodies.
 */
export function pagerProgress(offsetX: number, pageWidth: number, _lastIndex: number): number {
  "worklet";
  return offsetX / Math.max(pageWidth, 1);
}

/**
 * Logical page index → raw scroll offset for `scrollToOffset({ offset })`.
 * Inverse of {@link pagerProgress}. JS-thread helper (not a worklet).
 */
export function pagerOffset(index: number, pageWidth: number, _lastIndex: number): number {
  return index * pageWidth;
}
