import { create } from "zustand";
import { storageGet, storageSet, STORAGE_KEYS } from "@/utils/storage";
import type { NativeProduct } from "@/services/productsApi";

export interface CartItem {
  productId: string;
  quantity:  number;
  product:   NativeProduct;
}

interface CartState {
  items:       CartItem[];
  isHydrated:  boolean;
  hydrate:     () => Promise<void>;
  addItem:     (product: NativeProduct, qty?: number) => void;
  removeItem:  (productId: string) => void;
  updateQty:   (productId: string, qty: number) => void;
  clearCart:   () => void;
  itemCount:   () => number;
  subtotal:    () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items:      [],
  isHydrated: false,

  hydrate: async () => {
    const saved = await storageGet<CartItem[]>(STORAGE_KEYS.cart);
    set({ items: saved ?? [], isHydrated: true });
  },

  addItem: (product, qty = 1) => {
    set((s) => {
      const existing = s.items.find((i) => i.productId === product.id);
      let next: CartItem[];
      if (existing) {
        next = s.items.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + qty } : i
        );
      } else {
        next = [...s.items, { productId: product.id, quantity: qty, product }];
      }
      storageSet(STORAGE_KEYS.cart, next);
      return { items: next };
    });
  },

  removeItem: (productId) => {
    set((s) => {
      const next = s.items.filter((i) => i.productId !== productId);
      storageSet(STORAGE_KEYS.cart, next);
      return { items: next };
    });
  },

  updateQty: (productId, qty) => {
    set((s) => {
      const next = qty <= 0
        ? s.items.filter((i) => i.productId !== productId)
        : s.items.map((i) => i.productId === productId ? { ...i, quantity: qty } : i);
      storageSet(STORAGE_KEYS.cart, next);
      return { items: next };
    });
  },

  clearCart: () => {
    storageSet(STORAGE_KEYS.cart, []);
    set({ items: [] });
  },

  itemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),
  subtotal:  () => get().items.reduce((acc, i) => acc + i.product.price * i.quantity, 0),
}));
