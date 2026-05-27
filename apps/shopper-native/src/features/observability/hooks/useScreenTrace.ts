/**
 * useScreenTrace — fires a breadcrumb on screen mount and records mount-to-
 * first-render latency. Drop into any screen's body:
 *
 *   export default function ProductsScreen() {
 *     useScreenTrace("products");
 *     ...
 *   }
 */

import { useEffect, useRef } from "react";
import { addBreadcrumb } from "../breadcrumbs";
import { recordDuration } from "../metrics";

export function useScreenTrace(screenName: string, extra?: Record<string, unknown>): void {
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    const dur = Date.now() - mountedAt.current;
    recordDuration(`screen.${screenName}.mount`, dur);
    addBreadcrumb({
      category: "nav",
      level:    "info",
      message:  `screen ${screenName} mounted`,
      data:     { ms: dur, ...(extra ?? {}) },
    });
    return () => {
      addBreadcrumb({
        category: "nav",
        level:    "info",
        message:  `screen ${screenName} unmounted`,
      });
    };
    // intentionally no deps — fires once per mount lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
