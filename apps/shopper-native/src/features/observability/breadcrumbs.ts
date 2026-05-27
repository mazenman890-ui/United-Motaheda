/**
 * Breadcrumb ring buffer.
 *
 * A bounded in-memory FIFO of recent events. When captureError is invoked,
 * the current buffer is snapshotted and attached as context — giving a
 * Sentry-style breadcrumb trail without taking a hard dependency on Sentry.
 *
 * The buffer is process-local; on app cold start it's empty. That's fine —
 * post-mortem breadcrumbs aren't a debugging mechanism for crash-on-launch
 * scenarios anyway (the platform itself captures those).
 */

const MAX_BREADCRUMBS = 32;

export interface Breadcrumb {
  ts:        number;
  category:  "nav" | "query" | "mutation" | "render" | "network" | "user" | "system";
  message:   string;
  level:     "info" | "warn" | "error";
  data?:     Record<string, unknown>;
}

const buffer: Breadcrumb[] = [];

export function addBreadcrumb(b: Omit<Breadcrumb, "ts">): void {
  buffer.push({ ...b, ts: Date.now() });
  if (buffer.length > MAX_BREADCRUMBS) buffer.shift();
}

export function getBreadcrumbs(): Breadcrumb[] {
  return buffer.slice();
}

export function clearBreadcrumbs(): void {
  buffer.length = 0;
}

/**
 * Format the buffer as a compact, human-readable string suitable for the
 * `breadcrumbs` field of a crash report. Each row is one line, oldest first.
 */
export function formatBreadcrumbsForCrash(): string {
  if (buffer.length === 0) return "";
  const now = Date.now();
  return buffer
    .map((b) => {
      const age = ((now - b.ts) / 1000).toFixed(1);
      const data = b.data ? ` ${JSON.stringify(b.data).slice(0, 120)}` : "";
      return `[-${age}s] ${b.category}/${b.level} ${b.message}${data}`;
    })
    .join("\n");
}
