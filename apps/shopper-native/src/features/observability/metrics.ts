/**
 * Lightweight client-side metrics — counters and durations.
 *
 * Not a replacement for a real metrics backend; this is in-process aggregation
 * so screens can show timing in dev and the next captureError call can
 * include "what was happening" context.
 *
 * Histograms are kept tiny (last 100 samples per name) so memory pressure
 * is bounded even if a hot path fires thousands of times.
 */

const MAX_SAMPLES = 100;

const counters = new Map<string, number>();
const samples  = new Map<string, number[]>();

export function incCounter(name: string, by = 1): void {
  counters.set(name, (counters.get(name) ?? 0) + by);
}

export function recordDuration(name: string, ms: number): void {
  let arr = samples.get(name);
  if (!arr) {
    arr = [];
    samples.set(name, arr);
  }
  arr.push(ms);
  if (arr.length > MAX_SAMPLES) arr.shift();
}

export interface MetricsSnapshot {
  counters: Record<string, number>;
  /** Per-name p50/p95/last/count for the most recent samples. */
  durations: Record<string, { count: number; p50: number; p95: number; last: number; max: number }>;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

export function snapshotMetrics(): MetricsSnapshot {
  const c: Record<string, number> = {};
  counters.forEach((v, k) => { c[k] = v; });

  const d: MetricsSnapshot["durations"] = {};
  samples.forEach((arr, k) => {
    const sorted = arr.slice().sort((a, b) => a - b);
    d[k] = {
      count: arr.length,
      p50:   Math.round(percentile(sorted, 0.50)),
      p95:   Math.round(percentile(sorted, 0.95)),
      last:  Math.round(arr[arr.length - 1] ?? 0),
      max:   Math.round(sorted[sorted.length - 1] ?? 0),
    };
  });
  return { counters: c, durations: d };
}

export function resetMetrics(): void {
  counters.clear();
  samples.clear();
}
