/**
 * MMKV — synchronous, JSI-backed key/value storage.
 *
 * Two isolated instances so cache churn never evicts app prefs:
 *   - appKV         : small, durable settings (lang, feature flags, telemetry id)
 *   - queryCacheKV  : React Query persisted cache. Wiped on schema version bump.
 *
 * AsyncStorage is intentionally NOT replaced. Supabase auth, zustand persists,
 * and userDataWipe.ts still depend on it; ripping that out is a separate slice.
 *
 * Safety: both instances are created inside a try/catch. If the MMKV native
 * module fails to initialise (JSI not ready, corrupted DB file after a
 * force-kill, incompatible binary after an OTA update) the app falls back to
 * an in-memory Map so the JS thread can at least boot and show the error
 * boundary instead of dying before React starts.
 */

import { MMKV } from "react-native-mmkv";

// ─── In-memory fallback ──────────────────────────────────────────────────────
// Implements the subset of MMKV's API that this codebase actually calls.
// Data is not persisted across launches, but prevents a hard pre-React crash.
class MemoryKV {
  private readonly store = new Map<string, string>();
  getString(key: string): string | undefined { return this.store.get(key); }
  set(key: string, value: string | number | boolean): void {
    this.store.set(key, String(value));
  }
  delete(key: string): void { this.store.delete(key); }
}

type KV = MMKV | MemoryKV;

function createMMKV(id: string): KV {
  try {
    return new MMKV({ id });
  } catch (e) {
    // Log in every environment — this is a serious infra problem the developer
    // needs to know about, even in production (use your crash reporter here).
    console.error(`[MMKV] failed to create instance "${id}" — using memory fallback:`, e);
    return new MemoryKV();
  }
}

export const appKV      = createMMKV("united-app-v1");
export const queryCacheKV = createMMKV("united-query-cache-v1");

/**
 * SyncStorage interface compatible with @tanstack/query-sync-storage-persister.
 * MMKV is synchronous JSI; no Promise wrapping needed.
 */
export interface SyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function syncStorageFor(kv: KV): SyncStorage {
  return {
    getItem(key) {
      const v = kv.getString(key);
      return v === undefined ? null : v;
    },
    setItem(key, value) {
      kv.set(key, value);
    },
    removeItem(key) {
      kv.delete(key);
    },
  };
}

export const queryCacheStorage = syncStorageFor(queryCacheKV);
export const appStorage = syncStorageFor(appKV);

/**
 * Typed wrapper for JSON values in appKV. Use for small structured prefs
 * that need synchronous reads on cold boot (e.g. last-seen onboarding step).
 *
 * For larger values, use a zustand store backed by AsyncStorage — JSON parse
 * on the JS thread blocks rendering past ~50 KB.
 */
export function appKVGetJSON<T>(key: string): T | null {
  const raw = appKV.getString(key);
  if (raw === undefined) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    appKV.delete(key);
    return null;
  }
}

export function appKVSetJSON<T>(key: string, value: T): void {
  appKV.set(key, JSON.stringify(value));
}
