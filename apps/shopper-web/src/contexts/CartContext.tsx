import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { emitWorkflowEvent } from "@pharmacy/domain-core";
import type { CatalogProduct } from "../app/catalog";
import { createCheckoutPricing } from "../app/checkout/pricing";
import { useCatalogOptional } from "./CatalogContext";
import { fetchProductsByIds } from "../services/shopperCatalogApi";

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  lineTotal: number;
  product: CatalogProduct;
};

export type CartSummary = {
  itemCount: number;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
};

type CartContextType = {
  cart: CartItem[];
  summary: CartSummary;
  /** Pass the full product object — no ID lookup needed at add time. */
  addToCart: (product: CatalogProduct, quantity?: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
};

type StoredCartEntry = {
  product_id: string;
  quantity: number;
};

const LOCAL_CART_KEY = "united-pharmacies-cart-v3";

const CartContext = createContext<CartContextType>({
  cart: [],
  summary: { itemCount: 0, subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 },
  addToCart:      async () => {},
  removeFromCart: async () => {},
  updateQuantity: async () => {},
  clearCart:      async () => {},
  isLoading: false,
});

function readLocalCart() {
  if (typeof window === "undefined") {
    return [] as StoredCartEntry[];
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_CART_KEY);

    if (!rawValue) {
      return [] as StoredCartEntry[];
    }

    const parsed = JSON.parse(rawValue) as StoredCartEntry[];

    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry.product_id === "string" && typeof entry.quantity === "number")
      : [];
  } catch {
    return [] as StoredCartEntry[];
  }
}

function writeLocalCart(entries: StoredCartEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(entries));
}

function normalizeEntries(entries: StoredCartEntry[]) {
  const merged = new Map<string, number>();

  entries.forEach(({ product_id, quantity }) => {
    if (!product_id || quantity <= 0) {
      return;
    }

    merged.set(product_id, (merged.get(product_id) ?? 0) + quantity);
  });

  return Array.from(merged, ([product_id, quantity]) => ({
    product_id,
    quantity,
  }));
}

function clampQuantity(product: CatalogProduct | undefined, quantity: number) {
  if (!product) {
    return 0;
  }

  const normalizedQuantity = Math.max(0, Math.floor(quantity));

  if (!product.inStock) {
    return 0;
  }

  if (product.stock <= 0) {
    return 0;
  }

  return Math.min(normalizedQuantity, Math.max(1, Math.ceil(product.stock)));
}

function replaceEntry(entries: StoredCartEntry[], productId: string, quantity: number) {
  const nextEntries = entries.filter((entry) => entry.product_id !== productId);

  if (quantity > 0) {
    nextEntries.push({ product_id: productId, quantity });
  }

  return normalizeEntries(nextEntries);
}

function inflateEntries(entries: StoredCartEntry[], productsById: Record<string, CatalogProduct>) {
  return normalizeEntries(entries)
    .map(({ product_id, quantity }) => {
      const product = productsById[product_id];

      if (!product || !product.inStock) {
        return null;
      }

      const clampedQuantity = clampQuantity(product, quantity);

      if (clampedQuantity <= 0) {
        return null;
      }

      return {
        id: product_id,
        product_id,
        quantity: clampedQuantity,
        lineTotal: Number((product.price * clampedQuantity).toFixed(2)),
        product,
      } satisfies CartItem;
    })
    .filter(Boolean) as CartItem[];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const catalog = useCatalogOptional();
  const productsById = catalog?.productsById ?? {};

  if (process.env.NODE_ENV !== "production" && !catalog) {
    console.warn(
      "[CartContext] CartProvider rendered without a CatalogProvider. " +
      "Cart hydration will continue once catalog data is available.",
    );
  }

  const [entries, setEntries] = useState<StoredCartEntry[]>(() => readLocalCart());

  // Products fetched from Supabase for cart entries whose IDs are not in the
  // page-1 cache (e.g. items added from page 2+, then reloaded).
  const [fetchedProducts, setFetchedProducts] = useState<Record<string, CatalogProduct>>({});
  const fetchedRef = useRef<Record<string, CatalogProduct>>({});

  useEffect(() => {
    const missingIds = entries
      .map((e) => e.product_id)
      .filter((id) => !productsById[id] && !fetchedRef.current[id]);

    if (missingIds.length === 0) return;

    void fetchProductsByIds(missingIds).then((fetched) => {
      if (fetched.length === 0) return;
      fetched.forEach((p) => { fetchedRef.current[p.id] = p; });
      setFetchedProducts({ ...fetchedRef.current });
    });
  }, [entries, productsById]);

  const mergedProductsById = useMemo(
    () => ({ ...fetchedProducts, ...productsById }),
    [productsById, fetchedProducts],
  );

  const cart = useMemo(() => inflateEntries(entries, mergedProductsById), [entries, mergedProductsById]);

  // TRUE once we have loaded at least one product from the catalog or a
  // direct fetch. Used to gate the entry-sync effect below.
  const hasProductData = Object.keys(mergedProductsById).length > 0;

  useEffect(() => {
    // ─── Guard: never wipe stored entries before product data has loaded. ───
    // On a hard reload, `entries` comes from localStorage but `mergedProductsById`
    // is empty because the catalog hasn't hydrated yet.  Without this guard the
    // inflated `cart` is [] (no products found), which overwrites localStorage
    // with an empty array and permanently loses the user's cart.
    if (!hasProductData) return;

    const normalizedCartEntries = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    setEntries((current) => {
      const currentSerialized = JSON.stringify(normalizeEntries(current));
      const nextSerialized = JSON.stringify(normalizedCartEntries);
      return currentSerialized === nextSerialized ? current : normalizedCartEntries;
    });
  }, [cart, hasProductData]);

  useEffect(() => {
    writeLocalCart(entries);
  }, [entries]);

  const summary = useMemo<CartSummary>(() => {
    const pricing = createCheckoutPricing(
      cart.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        name: item.product.name,
        code: item.product.code || undefined,
      })),
      {
        shippingFee: 0,
      },
    );

    return {
      itemCount: pricing.itemCount,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      tax: pricing.tax,
      shipping: pricing.shipping,
      total: pricing.total,
    };
  }, [cart]);

  const addToCart = async (product: CatalogProduct, quantity = 1) => {
    if (!product.inStock) return;

    // Cache the product immediately so inflateEntries can resolve it on next
    // render — critical for products from page 2+ that aren't in productsById.
    if (!fetchedRef.current[product.id]) {
      fetchedRef.current[product.id] = product;
      setFetchedProducts((prev) => ({ ...prev, [product.id]: product }));
    }

    setEntries((current) => {
      const currentItem = current.find((entry) => entry.product_id === product.id);
      const nextQuantity = clampQuantity(product, (currentItem?.quantity ?? 0) + quantity);
      return replaceEntry(current, product.id, nextQuantity);
    });
    emitWorkflowEvent("CartUpdated", { mutation: "add", productId: product.id, quantity });
  };

  const removeFromCart = async (cartItemId: string) => {
    setEntries((current) => replaceEntry(current, cartItemId, 0));
    emitWorkflowEvent("CartUpdated", { mutation: "remove", productId: cartItemId });
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    const product = mergedProductsById[cartItemId];
    const nextQuantity = clampQuantity(product, quantity);
    setEntries((current) => replaceEntry(current, cartItemId, nextQuantity));
    emitWorkflowEvent("CartUpdated", { mutation: "update", productId: cartItemId, quantity: nextQuantity });
  };

  const clearCart = async () => {
    setEntries([]);
    emitWorkflowEvent("CartUpdated", { mutation: "clear" });
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        summary,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isLoading: false,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
