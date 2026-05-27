/**
 * MMKV — synchronous, JSI-backed key/value storage.
 *
 * Two isolated instances so cache churn never evicts app prefs:
 *   - appKV         : small, durable settings (lang, feature flags, telemetry id)
 *   - queryCacheKV  : React Query persisted cache. Wiped on schema version bump.
 *
 * AsyncStorage is intentionally NOT replaced. Supabase auth, zustand persists,
 * and userDataWipe.ts still depend on it; ripping that out is a separate slice.
 */

import { MMKV } from "react-native-mmkv";

export const appKV = new MMKV({
  id: "united-app-v1",
});

export const queryCacheKV = new MMKV({
  id: "united-query-cache-v1",
});

/**
 * SyncStorage interface compatible with @tanstack/query-sync-storage-persister.
 * MMKV is synchronous JSI; no Promise wrapping needed.
 */
export interface SyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function syncStorageFor(kv: MMKV): SyncStorage {
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
