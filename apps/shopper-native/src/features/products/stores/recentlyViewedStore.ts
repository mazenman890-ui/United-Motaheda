/**
 * Recently-viewed store — MMKV-persisted, capped LRU.
 *
 * Public, anonymous data — fine to live in MMKV (not user-scoped). On
 * sign-out we don't wipe it; recommendations stay relevant for the
 * device's primary user.
 *
 * Schema is intentionally minimal (id, name, price, image_url, ts) so it
 * stays small in MMKV. If you need the full product, look it up via
 * useProduct(id) — list cache will usually have it.
 */

import { create } from "zustand";
import { appKV } from "@/lib/mmkv";

const STORAGE_KEY = "recent-products-v1";
const MAX_ITEMS   = 20;

export interface RecentProduct {
  id:        string;
  name:      string;
  price:     number;
  imageUrl?: string;
  viewedAt:  number;
}

interface RecentState {
  items:   RecentProduct[];
  push:    (item: Omit<RecentProduct, "viewedAt">) => void;
  remove:  (id: string) => void;
  clear:   () => void;
}

function loadInitial(): RecentProduct[] {
  const raw = appKV.getString(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_ITEMS) as RecentProduct[];
  } catch {
    appKV.delete(STORAGE_KEY);
    return [];
  }
}

function persist(items: RecentProduct[]): void {
  try {
    appKV.set(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // MMKV throws when full — drop oldest half and retry once.
    try {
      appKV.set(STORAGE_KEY, JSON.stringify(items.slice(0, Math.floor(MAX_ITEMS / 2))));
    } catch {
      // give up — recent-viewed is non-critical.
    }
  }
}

export const useRecentlyViewedStore = create<RecentState>((set, get) => ({
  items: loadInitial(),

  push: (item) => {
    if (!item.id) return;
    const now      = Date.now();
    const existing = get().items;
    const filtered = existing.filter((i) => i.id !== item.id);
    const next     = [{ ...item, viewedAt: now }, ...filtered].slice(0, MAX_ITEMS);
    persist(next);
    set({ items: next });
  },

  remove: (id) => {
    const next = get().items.filter((i) => i.id !== id);
    persist(next);
    set({ items: next });
  },

  clear: () => {
    appKV.delete(STORAGE_KEY);
    set({ items: [] });
  },
}));
