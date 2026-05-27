/**
 * Offline queue runner — singleton that drains offlineQueue.
 *
 *  - Subscribes to React Query's onlineManager (already wired to NetInfo
 *    in slice 1 via NetworkBridge). When online flips true → tick.
 *  - On every successful tick, immediately schedules another so the queue
 *    drains as fast as the network allows.
 *  - On failed tick, sleeps until the next op's nextAttemptAt.
 *  - Each operation gets an AbortController whose signal is bound to the
 *    onlineManager flag, so going offline mid-flight cleanly aborts the
 *    in-flight Supabase request.
 *
 * Mount at root once via startOfflineQueueRunner().
 */

import { onlineManager } from "@tanstack/react-query";
import {
  getQueueHandler,
  markFailure,
  markInFlight,
  markSuccess,
  nextRunnableOp,
  subscribeQueue,
} from "./offlineQueue";
import { addBreadcrumb, incCounter, recordDuration } from "@/features/observability";

let started        = false;
let scheduledTimer: ReturnType<typeof setTimeout> | null = null;
let unsubOnline:    (() => void) | null = null;
let unsubQueue:     (() => void) | null = null;
let activeAbort:    AbortController | null = null;

export function startOfflineQueueRunner(): () => void {
  if (started) return stopOfflineQueueRunner;
  started = true;

  unsubOnline = onlineManager.subscribe((online) => {
    if (online) {
      tick();
    } else if (activeAbort) {
      // Going offline mid-flight: cancel the in-flight Supabase call cleanly.
      activeAbort.abort();
    }
  });

  unsubQueue = subscribeQueue(() => {
    // Any external enqueue should wake the runner.
    if (onlineManager.isOnline()) tick();
  });

  if (onlineManager.isOnline()) tick();
  return stopOfflineQueueRunner;
}

export function stopOfflineQueueRunner(): void {
  started = false;
  unsubOnline?.(); unsubOnline = null;
  unsubQueue?.();  unsubQueue  = null;
  if (scheduledTimer) { clearTimeout(scheduledTimer); scheduledTimer = null; }
  if (activeAbort)    { activeAbort.abort(); activeAbort = null; }
}

function scheduleTick(delayMs: number): void {
  if (scheduledTimer) clearTimeout(scheduledTimer);
  scheduledTimer = setTimeout(() => {
    scheduledTimer = null;
    tick();
  }, Math.max(0, delayMs));
}

let inFlight = false;

async function tick(): Promise<void> {
  if (!started || inFlight) return;
  if (!onlineManager.isOnline()) return;

  const op = nextRunnableOp();
  if (!op) return;

  const handler = getQueueHandler(op.kind);
  if (!handler) {
    // Misconfigured queue: an op was enqueued before its handler registered.
    // Defer briefly so registration races don't permanently park the op.
    addBreadcrumb({
      category: "system",
      level:    "warn",
      message:  `offline-queue: no handler for ${op.kind}`,
      data:     { opId: op.id, attempt: op.attempt },
    });
    scheduleTick(1_000);
    return;
  }

  inFlight = true;
  activeAbort = new AbortController();
  markInFlight(op.id);
  incCounter(`queue.${op.kind}.start`);

  const startedAt = Date.now();
  try {
    await handler(op.payload, { signal: activeAbort.signal });
    recordDuration(`queue.${op.kind}`, Date.now() - startedAt);
    incCounter(`queue.${op.kind}.success`);
    markSuccess(op.id);
    addBreadcrumb({
      category: "mutation",
      level:    "info",
      message:  `offline-queue: ${op.kind} ok`,
      data:     { opId: op.id, attempts: op.attempt + 1 },
    });
  } catch (e) {
    recordDuration(`queue.${op.kind}`, Date.now() - startedAt);
    const { retried } = markFailure(op.id, e);
    incCounter(retried ? `queue.${op.kind}.retry` : `queue.${op.kind}.failed`);
    addBreadcrumb({
      category: "mutation",
      level:    retried ? "warn" : "error",
      message:  `offline-queue: ${op.kind} ${retried ? "will retry" : "gave up"}`,
      data:     { opId: op.id, attempt: op.attempt + 1, error: stringifyError(e) },
    });
  } finally {
    inFlight    = false;
    activeAbort = null;
  }

  // Look at what's next; either drain immediately or sleep until its window.
  const upcoming = nextRunnableOp();
  if (!upcoming) return;
  const wait = Math.max(0, upcoming.nextAttemptAt - Date.now());
  scheduleTick(wait);
}

function stringifyError(e: unknown): string {
  if (!e) return "unknown";
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try { return JSON.stringify(e).slice(0, 200); }
  catch { return "[unserialisable]"; }
}

/** Bare hook target for screens that want to expose a "retry now" affordance. */
export function pokeQueue(): void {
  if (onlineManager.isOnline()) tick();
}

// Re-export for convenience so consumers don't have to import the core module
// just to enqueue.
export {
  enqueueOp,
  registerQueueHandler,
  getQueueSnapshot,
  getQueueLength,
  subscribeQueue,
  clearFailedOps,
  dropOp,
  type QueuedOp,
} from "./offlineQueue";
