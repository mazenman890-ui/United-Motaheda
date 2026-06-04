/**
 * Image prefetch — bounded-concurrency warmup queue around expo-image.
 *
 * Used by useInfiniteProducts to warm the next page's thumbnails while the
 * user is still scrolling the current one. Without this, every page break
 * causes a visible decode pause as the new cards' images jump from skeleton
 * to loaded.
 *
 * Bounded concurrency (4 in flight) prevents a thundering-herd that would
 * stall Metro on dev and saturate the radio on cellular.
 *
 * Dedup keyed by URL — re-prefetching an already-cached image is a no-op
 * to expo-image but still incurs a JS round-trip; the dedup set keeps it free.
 */

import { Image } from "expo-image";
import { addBreadcrumb, incCounter } from "@/features/observability";

const MAX_CONCURRENT = 4;
const seen           = new Set<string>();
let inFlight         = 0;
const queue: string[] = [];

export function prefetchImages(urls: ReadonlyArray<string | undefined | null>): void {
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    queue.push(u);
  }
  drain();
}

function drain(): void {
  while (inFlight < MAX_CONCURRENT && queue.length > 0) {
    const url = queue.shift()!;
    inFlight++;
    Image.prefetch(url)
      .then((ok) => {
        if (ok) {
          incCounter("image.prefetch.ok");
        } else {
          incCounter("image.prefetch.miss");
        }
      })
      .catch((e) => {
        incCounter("image.prefetch.error");
        addBreadcrumb({
          category: "network",
          level:    "warn",
          message:  "image prefetch failed",
          data:     { url: url.slice(0, 120), error: (e as Error)?.message ?? String(e) },
        });
      })
      .finally(() => {
        inFlight--;
        // Cap the dedup set so a long session can't grow it unbounded.
        // Reduced cap: 10 pages × 15 items = 150 visible max, so 300 is plenty.
        if (seen.size > 300) {
          // Drop ~half of the oldest. Set iteration is insertion-ordered.
          let toDrop = seen.size - 150;
          for (const v of seen) {
            seen.delete(v);
            if (--toDrop <= 0) break;
          }
        }
        if (queue.length > 0) drain();
      });
  }
}

/** Test/debug only — clears the in-memory dedup set, NOT expo-image's cache. */
export function _resetPrefetchSeen(): void {
  seen.clear();
}
