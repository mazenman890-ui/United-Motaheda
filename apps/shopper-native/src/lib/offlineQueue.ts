/**
 * Offline mutation queue — MMKV-persisted, idempotency-aware.
 *
 * Owns the FIFO of pending operations and the handler registry. The runner
 * (offlineQueueRunner.ts) drives this queue; it observes onlineManager and
 * AppState and triggers `tick()` when conditions allow.
 *
 * Design decisions:
 *
 *   * Single MMKV instance (appKV) — reuses slice 1's storage primitive.
 *   * Serial processing — avoids backend race conditions on the same user's
 *     account. The queue is short enough that head-of-line blocking isn't
 *     a real concern.
 *   * Persisted between every state change — a process kill loses at most
 *     the in-flight op (which is replayable via its idempotency key).
 *   * Each op carries an `idempotencyKey` provided by the producer. The
 *     server-side RPCs from slice 3 cache by this key, so a replay after
 *     restart returns the original response instead of double-debiting.
 *   * Exponential backoff with jitter (cap 5 min) and a max of 10 attempts.
 *     A 'failed' op sticks around for inspection — the user can manually
 *     drop it or retry from a settings screen.
 */

import { appKV } from "./mmkv";

const STORAGE_KEY = "offline-queue-v1";

/** Backoff parameters. Exposed for tests / settings. */
export const QUEUE_BACKOFF = {
  baseMs:      1_000,
  maxMs:       5 * 60 * 1_000,
  jitterRatio: 0.25,
  maxAttempts: 10,
} as const;

export type QueueStatus = "pending" | "in_flight" | "failed";

export interface QueuedOp<P = unknown> {
  id:              string;
  /** Handler discriminator — must match a key in the handler registry. */
  kind:            string;
  payload:         P;
  /** Server-side replay-protection key (loyalty RPCs require >= 16 chars). */
  idempotencyKey:  string;
  status:          QueueStatus;
  attempt:         number;
  enqueuedAt:      number;
  nextAttemptAt:   number;
  lastError?:      string;
}

export interface QueueHandlerCtx {
  signal: AbortSignal;
}

export type QueueHandler<P = unknown> = (payload: P, ctx: QueueHandlerCtx) => Promise<void>;

const handlers = new Map<string, QueueHandler<unknown>>();

export function registerQueueHandler<P>(kind: string, fn: QueueHandler<P>): void {
  handlers.set(kind, fn as QueueHandler<unknown>);
}

export function getQueueHandler(kind: string): QueueHandler<unknown> | undefined {
  return handlers.get(kind);
}

// ─── Persistence ────────────────────────────────────────────────────────────

function loadQueue(): QueuedOp[] {
  const raw = appKV.getString(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as QueuedOp[];
  } catch {
    appKV.delete(STORAGE_KEY);
    return [];
  }
}

function saveQueue(queue: readonly QueuedOp[]): void {
  try {
    appKV.set(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // MMKV throws when full. Truncate aggressively — losing a few failed
    // ops is better than losing the whole queue.
    try {
      appKV.set(STORAGE_KEY, JSON.stringify(queue.slice(-25)));
    } catch {
      // give up — runner will recreate from in-memory on next save.
    }
  }
}

let queueCache: QueuedOp[] | null = null;
function readQueue(): QueuedOp[] {
  if (queueCache === null) queueCache = loadQueue();
  return queueCache;
}
function writeQueue(next: QueuedOp[]): void {
  queueCache = next;
  saveQueue(next);
  notifyListeners();
}

// ─── Listeners ──────────────────────────────────────────────────────────────

type Listener = (snapshot: readonly QueuedOp[]) => void;
const listeners = new Set<Listener>();

export function subscribeQueue(fn: Listener): () => void {
  listeners.add(fn);
  fn(readQueue());
  return () => listeners.delete(fn);
}

function notifyListeners(): void {
  const snap = readQueue().slice();
  listeners.forEach((l) => {
    try { l(snap); } catch { /* listener errors must not poison the queue */ }
  });
}

// ─── Public ops ─────────────────────────────────────────────────────────────

export function getQueueSnapshot(): readonly QueuedOp[] {
  return readQueue().slice();
}

export function getQueueLength(): number {
  return readQueue().length;
}

export interface EnqueueArgs<P> {
  kind:            string;
  payload:         P;
  idempotencyKey:  string;
  id?:             string;
}

export function enqueueOp<P>({ kind, payload, idempotencyKey, id }: EnqueueArgs<P>): QueuedOp<P> {
  if (!idempotencyKey || idempotencyKey.length < 16) {
    throw new Error("offlineQueue: idempotencyKey >= 16 chars required");
  }
  const now = Date.now();
  const op: QueuedOp<P> = {
    id:             id ?? makeId(),
    kind,
    payload,
    idempotencyKey,
    status:         "pending",
    attempt:        0,
    enqueuedAt:     now,
    nextAttemptAt:  now,
  };
  writeQueue([...readQueue(), op as QueuedOp]);
  return op;
}

export function nextRunnableOp(now = Date.now()): QueuedOp | undefined {
  const q = readQueue();
  for (const op of q) {
    if (op.status === "pending" && op.nextAttemptAt <= now) return op;
  }
  return undefined;
}

export function markInFlight(id: string): void {
  mutate(id, (op) => ({ ...op, status: "in_flight" }));
}

export function markSuccess(id: string): void {
  writeQueue(readQueue().filter((o) => o.id !== id));
}

export function markFailure(id: string, error: unknown): { retried: boolean } {
  const q = readQueue();
  const idx = q.findIndex((o) => o.id === id);
  if (idx === -1) return { retried: false };
  const cur = q[idx];
  const attempt = cur.attempt + 1;
  const giveUp  = attempt >= QUEUE_BACKOFF.maxAttempts;
  const nextDelay = computeBackoff(attempt);
  const updated: QueuedOp = {
    ...cur,
    status:        giveUp ? "failed" : "pending",
    attempt,
    nextAttemptAt: giveUp ? cur.nextAttemptAt : Date.now() + nextDelay,
    lastError:     stringifyError(error),
  };
  const next = q.slice();
  next[idx] = updated;
  writeQueue(next);
  return { retried: !giveUp };
}

export function dropOp(id: string): void {
  writeQueue(readQueue().filter((o) => o.id !== id));
}

export function clearFailedOps(): number {
  const q = readQueue();
  const next = q.filter((o) => o.status !== "failed");
  const removed = q.length - next.length;
  if (removed > 0) writeQueue(next);
  return removed;
}

// ─── Internals ──────────────────────────────────────────────────────────────

function mutate(id: string, fn: (op: QueuedOp) => QueuedOp): void {
  const q    = readQueue();
  const idx  = q.findIndex((o) => o.id === id);
  if (idx === -1) return;
  const next = q.slice();
  next[idx]  = fn(q[idx]);
  writeQueue(next);
}

function computeBackoff(attempt: number): number {
  const exp     = Math.min(QUEUE_BACKOFF.baseMs * 2 ** (attempt - 1), QUEUE_BACKOFF.maxMs);
  const jitter  = exp * QUEUE_BACKOFF.jitterRatio * (Math.random() * 2 - 1);
  return Math.max(QUEUE_BACKOFF.baseMs, Math.floor(exp + jitter));
}

function stringifyError(e: unknown): string {
  if (!e) return "unknown";
  if (e instanceof Error) return e.message.slice(0, 240);
  if (typeof e === "string") return e.slice(0, 240);
  try { return JSON.stringify(e).slice(0, 240); }
  catch { return "[unserialisable]"; }
}

function makeId(): string {
  // Same algorithm as features/loyalty/api/idempotency — UUID-v4 hex, no
  // dashes. Non-cryptographic; uniqueness suffices.
  let out = "";
  for (let i = 0; i < 32; i++) {
    if (i === 12) { out += "4"; continue; }
    if (i === 16) { out += ((Math.floor(Math.random() * 16) & 0x3) | 0x8).toString(16); continue; }
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}
