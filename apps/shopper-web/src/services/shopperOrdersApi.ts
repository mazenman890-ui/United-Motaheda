/**
 * shopperOrdersApi.ts – United Pharmacies · Customer order fetch layer
 *
 * Features:
 *  • Exponential-backoff retry for transient network failures
 *  • Shared browser-side cache via `src/app/orders.ts`
 *  • Returns metadata alongside orders so the UI can show stale/offline/queued
 *    indicators without changing the primary `getCustomerOrders` signature
 *  • Fully typed — no `any`
 */

import {
  getCachedRemoteOrderSnapshots,
  isOrderCacheStale,
  markOrdersStale,
  readQueuedOrderMutations,
  readStoredOrdersSnapshot,
  syncRemoteOrders,
  toRemoteOrderSnapshot,
  type RemoteOrderSnapshot,
} from "../app/orders";
import { getSupabaseClient } from "../lib/supabaseClient";

/** Cache remains fresh for 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Maximum retry attempts for transient failures */
const MAX_RETRIES = 3;

/** Base delay for exponential backoff (ms) */
const RETRY_BASE_DELAY_MS = 400;

// ─── Internal types ───────────────────────────────────────────────────────────

type RawOrderRow = {
  id: string;
  customer_phone: string | null;
  customer_name: string | null;
  customer_address: Record<string, unknown> | null;
  note: string | null;
  total: number | string | null;
  created_at: string | null;
  status: string | null;
  qr_token: string | null;
  order_items?: Array<{
    product_id: string | null;
    quantity: number | null;
    product_snapshot?: Record<string, unknown> | null;
  }>;
};

export type CustomerOrdersResult = {
  orders: RemoteOrderSnapshot[];
  /** true when data is served from cache (offline or fetch failed) */
  isStale: boolean;
  /** ISO timestamp of the last successful network fetch */
  cachedAt: string | null;
  /** browser is currently offline */
  isOffline: boolean;
  /** one or more order mutations are queued locally */
  hasQueuedMutations: boolean;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff.
 * Only retries on network/timeout errors; re-throws application errors immediately.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = MAX_RETRIES,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isNetworkError =
        err instanceof TypeError &&
        (err.message === "Failed to fetch" || err.message === "Load failed");
      if (!isNetworkError) throw err;
      if (attempt < maxAttempts - 1) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }
  throw lastError;
}

function normalizeNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ─── Row mapper ───────────────────────────────────────────────────────────────

function mapRow(row: RawOrderRow): RemoteOrderSnapshot {
  const addressRecord = row.customer_address ?? {};
  const formattedAddress =
    typeof addressRecord.formatted === "string"
      ? addressRecord.formatted
      : typeof addressRecord.streetLine === "string"
        ? `${addressRecord.streetLine}${addressRecord.city ? `, ${addressRecord.city}` : ""}`
        : "";

  const productCodes = (row.order_items ?? []).flatMap((item) => {
    const qty = Math.max(1, item.quantity ?? 1);
    const snapshotCode =
      typeof item.product_snapshot?.code === "string"
        ? item.product_snapshot.code
        : null;
    const code = snapshotCode ?? item.product_id ?? "";
    return code ? Array.from<string>({ length: qty }).fill(code) : [];
  });

  return {
    id: row.id,
    customerPhone: row.customer_phone ?? "",
    customerName: row.customer_name ?? "",
    address: formattedAddress,
    note: row.note ?? "",
    totalPrice: normalizeNumber(row.total),
    orderDate: row.created_at ?? new Date().toISOString(),
    status: row.status ?? "pending",
    productCodes,
    qrToken: row.qr_token ?? undefined,
  };
}

// ─── Network fetch ────────────────────────────────────────────────────────────

async function fetchFromNetwork(): Promise<RemoteOrderSnapshot[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_phone,
      customer_name,
      customer_address,
      note,
      total,
      created_at,
      status,
      qr_token,
      order_items (
        product_id,
        quantity,
        product_snapshot
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as RawOrderRow[]).map(mapRow);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return the cached customer orders without a network round-trip.
 * Returns null if no cache exists.
 */
export function getCachedCustomerOrders(): RemoteOrderSnapshot[] | null {
  const snapshot = readStoredOrdersSnapshot();
  if (snapshot.orders.length === 0 && !snapshot.meta.lastSyncedAt) {
    return null;
  }

  return getCachedRemoteOrderSnapshots();
}

/**
 * Fetch the current user's orders.
 *
 * Strategy:
 *  1. If offline → serve cache immediately (isStale: true).
 *  2. If online and cache is fresh (< 5 min) and !force → serve cache.
 *  3. Otherwise → fetch from Supabase with retry.
 *     - On success: update cache.
 *     - On failure: serve stale cache if available; otherwise throw.
 */
export async function getCustomerOrders(
  force = false,
): Promise<RemoteOrderSnapshot[]> {
  const result = await getCustomerOrdersWithMeta(force);
  return result.orders;
}

/**
 * Extended version of `getCustomerOrders` that also exposes cache metadata.
 * Useful for showing "last updated" timestamps or offline banners in the UI.
 */
export async function getCustomerOrdersWithMeta(
  force = false,
): Promise<CustomerOrdersResult> {
  const cachedSnapshot = readStoredOrdersSnapshot();
  const cachedOrders = cachedSnapshot.orders.map(toRemoteOrderSnapshot);
  const cachedAt = cachedSnapshot.meta.lastSyncedAt ?? null;
  const hasQueuedMutations = readQueuedOrderMutations().length > 0;

  // ── Offline: always serve cache ───────────────────────────────────────────
  if (!isOnline()) {
    return {
      orders: cachedOrders,
      isStale: true,
      cachedAt,
      isOffline: true,
      hasQueuedMutations,
    };
  }

  // ── Online + fresh cache + no force refresh ───────────────────────────────
  if (!force && !isOrderCacheStale() && cachedOrders.length > 0) {
    return {
      orders: cachedOrders,
      isStale: false,
      cachedAt,
      isOffline: false,
      hasQueuedMutations,
    };
  }

  // ── Fetch from network ────────────────────────────────────────────────────
  try {
    const orders = await withRetry(fetchFromNetwork);
    const syncedOrders = syncRemoteOrders(orders);

    return {
      orders: syncedOrders.map(toRemoteOrderSnapshot),
      isStale: false,
      cachedAt: new Date().toISOString(),
      isOffline: false,
      hasQueuedMutations,
    };
  } catch (err) {
    // Network fetch failed — serve stale cache if we have one
    if (cachedOrders.length > 0) {
      markOrdersStale();
      return {
        orders: getCachedRemoteOrderSnapshots(),
        isStale: true,
        cachedAt,
        isOffline: false,
        hasQueuedMutations,
      };
    }
    throw err instanceof Error
      ? err
      : new Error("Unable to load orders. Please try again.");
  }
}
