/**
 * Supabase request helpers — timeout, abort, and typed error classification.
 *
 *  - withTimeout()      : wraps any Supabase builder in an AbortController so
 *                         a stuck request fails cleanly instead of hanging
 *                         until the OS gives up (~60 s on iOS).
 *  - classifyError()    : "transient" vs "terminal" so callers (and React
 *                         Query's retry fn) make the same retry decision.
 *
 * Usage:
 *
 *   const { data, error } = await withTimeout((signal) =>
 *     supabase
 *       .from("products")
 *       .select("id,name,price,thumbnail_url,stock_status")
 *       .range(0, 23)
 *       .abortSignal(signal),
 *   );
 */

import type { PostgrestError } from "@supabase/supabase-js";

const DEFAULT_TIMEOUT_MS = 12_000;

/** Subset of PostgrestBuilder we need — promise-shaped, with throwOnError. */
type ThenableLike<T> = PromiseLike<{ data: T | null; error: PostgrestError | null }>;

export class RequestTimeoutError extends Error {
  readonly code = "TIMEOUT";
  constructor(ms: number) {
    super(`Supabase request timed out after ${ms}ms`);
    this.name = "RequestTimeoutError";
  }
}

export class RequestAbortedError extends Error {
  readonly code = "ABORTED";
  constructor() {
    super("Supabase request was aborted");
    this.name = "RequestAbortedError";
  }
}

export interface WithTimeoutOptions {
  timeoutMs?: number;
  /** External signal — if it aborts, we abort too. Lets callers chain cancellations. */
  signal?: AbortSignal;
}

/**
 * Race a Supabase builder against an AbortController-driven timeout.
 *
 * The builder receives the signal so it can wire it into `.abortSignal()`.
 * Returns the data on success; throws a typed error on timeout / abort /
 * postgrest failure so React Query sees a real Error (not a `{error}` object).
 */
export async function withTimeout<T>(
  build: (signal: AbortSignal) => ThenableLike<T>,
  { timeoutMs = DEFAULT_TIMEOUT_MS, signal }: WithTimeoutOptions = {},
): Promise<T> {
  const controller = new AbortController();

  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      throw new RequestAbortedError();
    }
    signal.addEventListener("abort", onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await build(controller.signal);

    if (controller.signal.aborted) {
      // Determine whether it was a timeout or an external abort.
      throw signal?.aborted ? new RequestAbortedError() : new RequestTimeoutError(timeoutMs);
    }

    if (result.error) {
      throw result.error;
    }
    // PostgREST returns `data: null` only when the row was not found AND
    // .single() was used; callers usually want that to be an error.
    if (result.data === null) {
      throw new Error("No data returned from Supabase");
    }
    return result.data;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onExternalAbort);
  }
}

// ── Error classification ─────────────────────────────────────────────────────

export type ErrorKind = "transient" | "terminal" | "timeout" | "aborted" | "offline";

export function classifyError(error: unknown): ErrorKind {
  if (!error || typeof error !== "object") return "transient";

  if (error instanceof RequestTimeoutError) return "timeout";
  if (error instanceof RequestAbortedError) return "aborted";

  const e = error as { status?: number; code?: string; message?: string };

  if (typeof e.message === "string" && /network request failed|fetch failed/i.test(e.message)) {
    return "offline";
  }

  if (typeof e.status === "number") {
    if (e.status >= 500) return "transient";
    if (e.status >= 400) return "terminal";
  }

  // PostgREST codes that are caller errors, not service errors.
  if (e.code === "PGRST116" || e.code === "23505" || e.code === "42501") {
    return "terminal";
  }

  return "transient";
}

export function isRetryable(error: unknown): boolean {
  const k = classifyError(error);
  return k === "transient" || k === "timeout" || k === "offline";
}
