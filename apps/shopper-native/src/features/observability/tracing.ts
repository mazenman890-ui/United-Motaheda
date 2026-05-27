/**
 * Span/timing primitive.
 *
 *   const span = startSpan("loyalty.redeem_coupon", { batchId });
 *   try {
 *     // ... do work
 *     span.ok();
 *   } catch (e) {
 *     span.fail(e);
 *     throw e;
 *   }
 *
 * Each `end()` records a duration metric + emits a breadcrumb. Failed spans
 * also bubble through captureError so the trail is preserved server-side.
 *
 * Deliberately minimal — no OTel SDK dependency. When the project adopts a
 * tracing backend, swap the internals; the call sites stay identical.
 */

import { addBreadcrumb } from "./breadcrumbs";
import { recordDuration, incCounter } from "./metrics";
import { captureError } from "@/lib/crashReporter";

const SLOW_THRESHOLD_MS = 1500;

export interface Span {
  /** Mark the span as successful + record metrics. */
  ok:    () => void;
  /** Mark the span as failed + record metrics + bubble to crashReporter. */
  fail:  (error: unknown, extra?: Record<string, unknown>) => void;
  /** Attach a tag to the span. Visible in the breadcrumb and crash report. */
  tag:   (key: string, value: unknown) => void;
  /** Read elapsed ms (does not end the span). */
  ms:    () => number;
}

export function startSpan(name: string, initialTags: Record<string, unknown> = {}): Span {
  const startedAt = Date.now();
  const tags: Record<string, unknown> = { ...initialTags };
  let settled = false;

  function elapsed(): number {
    return Date.now() - startedAt;
  }

  function settle(level: "info" | "warn" | "error", message: string, extra?: Record<string, unknown>): number {
    if (settled) return elapsed();
    settled = true;
    const dur = elapsed();
    recordDuration(name, dur);
    incCounter(`span.${name}.${message}`);
    if (message === "ok" && dur > SLOW_THRESHOLD_MS) {
      incCounter(`span.${name}.slow`);
      addBreadcrumb({
        category: "query",
        level:    "warn",
        message:  `slow ${name}`,
        data:     { ms: dur, ...tags },
      });
    } else {
      addBreadcrumb({
        category: name.includes("mutation") ? "mutation" : "query",
        level,
        message:  `${name} ${message}`,
        data:     { ms: dur, ...tags, ...(extra ?? {}) },
      });
    }
    return dur;
  }

  return {
    ok:   () => { settle("info", "ok"); },
    fail: (error, extra) => {
      const dur = settle("error", "fail", extra);
      captureError(error, {
        surface: "span",
        span:    name,
        ms:      dur,
        ...stringifyTags(tags),
        ...stringifyTags(extra ?? {}),
      });
    },
    tag:  (key, value) => { tags[key] = value; },
    ms:   elapsed,
  };
}

/**
 * Wrap a Promise-returning function so its lifetime is automatically traced.
 * Keeps call sites idiomatic when manual try/catch isn't needed.
 */
export async function traced<T>(
  name:  string,
  tags:  Record<string, unknown>,
  fn:    () => Promise<T>,
): Promise<T> {
  const span = startSpan(name, tags);
  try {
    const result = await fn();
    span.ok();
    return result;
  } catch (e) {
    span.fail(e);
    throw e;
  }
}

function stringifyTags(tags: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(tags)) {
    if (v === null || typeof v === "boolean" || typeof v === "number") out[k] = v;
    else if (typeof v === "string") out[k] = v.length > 200 ? v.slice(0, 200) + "…" : v;
    else {
      try { out[k] = JSON.stringify(v).slice(0, 200); }
      catch { out[k] = "[unserialisable]"; }
    }
  }
  return out;
}
