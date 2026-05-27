/**
 * Observability — public barrel.
 *
 * Mount once at root:
 *   installCrashEnrichment();          // hooks crashReporter
 *   attachQueryClientTelemetry(queryClient);
 *
 * Use in screens:
 *   useScreenTrace("products");
 *
 * Use around critical operations:
 *   await traced("loyalty.redeem", { batchId }, () => api.redeem(...));
 */

export { addBreadcrumb, getBreadcrumbs, clearBreadcrumbs, formatBreadcrumbsForCrash } from "./breadcrumbs";
export type { Breadcrumb } from "./breadcrumbs";

export { incCounter, recordDuration, snapshotMetrics, resetMetrics } from "./metrics";
export type { MetricsSnapshot } from "./metrics";

export { startSpan, traced } from "./tracing";
export type { Span } from "./tracing";

export { attachQueryClientTelemetry } from "./queryClientTelemetry";
export { useScreenTrace } from "./hooks/useScreenTrace";
export { installCrashEnrichment } from "./crashEnrichment";
