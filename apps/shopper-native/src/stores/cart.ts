/**
 * Cart store — backed by the canonical checkout pricing engine.
 *
 * Items are persisted as `{productId, quantity, product}` (product cached for
 * offline UX). The pricing engine is the single source of truth for subtotal,
 * discount, tax, shipping and total — never compute these locally.
 */

import { create } from "zustand";
import { storageGet, storageSet, STORAGE_KEYS } from "@/utils/storage";
import type { NativeProduct } from "@/services/productsApi";
import {
  createCheckoutPricing,
  isPromoCodeEligible,
  type CheckoutLineInput,
  type CheckoutPricing,
} from "@/features/checkout";

export interface CartItem {
  productId: string;
  quantity:  number;
  product:   NativeProduct;
}

interface CartState {
  items:       CartItem[];
  promoCode:   string;
  shippingFee: number;
  isHydrated:  boolean;

  // mutations
  hydrate:        () => Promise<void>;
  addItem:        (product: NativeProduct, qty?: number) => void;
  removeItem:     (productId: string) => void;
  updateQty:      (productId: string, qty: number) => void;
  clearCart:      () => void;
  setPromoCode:   (code: string) => void;
  setShippingFee: (fee: number) => void;

  // selectors (use sparingly — prefer `usePricing` selector below)
  itemCount: () => number;
  subtotal:  () => number;
  pricing:   () => CheckoutPricing;
  toCheckoutLines: () => CheckoutLineInput[];
}

/**
 * Clamp quantity against product stock — mirrors web `clampQuantity`.
 * Returns 0 when item should be dropped (no product / out of stock).
 */
function clampQuantity(product: NativeProduct | undefined, requested: number): number {
  if (!product) return 0;
  if (!product.inStock || product.stock <= 0) return 0;
  return Math.min(requested, Math.max(1, Math.ceil(product.stock)));
}

function itemsToLines(items: CartItem[]): CheckoutLineInput[] {
  return items
    .filter((i) => i.product && i.product.inStock && i.product.stock > 0)
    .map((i) => ({
      productId: i.productId,
      quantity:  i.quantity,
      unitPrice: i.product.price ?? 0,
      name:      i.product.name,
      code:      i.product.code,
    }));
}

export const useCartStore = create<CartState>((set, get) => ({
  items:       [],
  promoCode:   "",
  shippingFee: 0,
  isHydrated:  false,

  hydrate: async () => {
    const saved = await storageGet<CartItem[]>(STORAGE_KEYS.cart);
    const items = Array.isArray(saved) ? saved : [];
    set({ items, isHydrated: true });
  },

  addItem: (product, qty = 1) => {
    set((s) => {
      const existing = s.items.find((i) => i.productId === product.id);
      const requested = existing ? existing.quantity + qty : qty;
      const clamped = clampQuantity(product, requested);
      if (clamped <= 0) return s;

      const next: CartItem[] = existing
        ? s.items.map((i) =>
            i.productId === product.id ? { ...i, quantity: clamped, product } : i,
          )
        : [...s.items, { productId: product.id, quantity: clamped, product }];

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
      const item = s.items.find((i) => i.productId === productId);
      const clamped = clampQuantity(item?.product, qty);
      const next = clamped <= 0
        ? s.items.filter((i) => i.productId !== productId)
        : s.items.map((i) => (i.productId === productId ? { ...i, quantity: clamped } : i));
      storageSet(STORAGE_KEYS.cart, next);
      return { items: next };
    });
  },

  clearCart: () => {
    storageSet(STORAGE_KEYS.cart, []);
    set({ items: [], promoCode: "" });
  },

  setPromoCode: (code) => set({ promoCode: code.trim() }),
  setShippingFee: (fee) => set({ shippingFee: Math.max(0, fee) }),

  itemCount: () => get().items.reduce((acc, i) => acc + i.quantity, 0),

  subtotal: () => get().pricing().subtotal,

  toCheckoutLines: () => itemsToLines(get().items),

  pricing: () => {
    const { items, promoCode, shippingFee } = get();
    return createCheckoutPricing(itemsToLines(items), {
      promoCode,
      shippingFee,
    });
  },
}));

// ─── Reactive selectors ─────────────────────────────────────────────────────
// Components should subscribe to these so they re-render on `items` changes.

export const selectPricing = (s: CartState): CheckoutPricing =>
  createCheckoutPricing(itemsToLines(s.items), {
    promoCode: s.promoCode,
    shippingFee: s.shippingFee,
  });

export const selectItemCount = (s: CartState): number =>
  s.items.reduce((acc, i) => acc + i.quantity, 0);

export const selectPromoApplied = (s: CartState): boolean =>
  isPromoCodeEligible(s.promoCode);
