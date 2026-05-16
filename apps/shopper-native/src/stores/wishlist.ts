import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeProduct } from "@/services/productsApi";

const WISHLIST_KEY = "um_wishlist_v1";

interface WishlistState {
  items:       NativeProduct[];
  isHydrated:  boolean;
  hydrate:     () => Promise<void>;
  toggle:      (product: NativeProduct) => void;
  has:         (productId: string) => boolean;
  clear:       () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items:      [],
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(WISHLIST_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const items  = Array.isArray(parsed) ? (parsed as NativeProduct[]) : [];
        set({ items, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  toggle: (product) => {
    const current = get().items;
    const exists  = current.some((p) => p.id === product.id);
    const next    = exists
      ? current.filter((p) => p.id !== product.id)
      : [product, ...current];
    set({ items: next });
    AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(next)).catch(() => {});
  },

  has: (productId) => get().items.some((p) => p.id === productId),

  clear: () => {
    set({ items: [] });
    AsyncStorage.removeItem(WISHLIST_KEY).catch(() => {});
  },
}));
