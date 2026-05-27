/**
 * Cart sync API — Supabase-backed `cart_items` table.
 *
 * The cart store treats its in-memory list as the live view and uses these
 * functions to mirror mutations server-side in the background. On sign-in,
 * `fetchUserCart` returns the server's view; the caller merges with any
 * local pre-sign-in items and pushes the merged result back via `replaceUserCart`.
 */

import { supabase } from "@/lib/supabase";
import { timed } from "@/lib/devTiming";
import type { NativeProduct } from "@/services/productsApi";
import type { CartItem } from "@/stores/cart";

interface CartItemRow {
  id:               string;
  user_id:          string;
  product_id:       string;
  quantity:         number;
  product_snapshot: NativeProduct;
  updated_at:       string;
}

function rowToCartItem(row: CartItemRow): CartItem {
  return {
    productId: row.product_id,
    quantity:  row.quantity,
    product:   row.product_snapshot,
  };
}

export async function fetchUserCart(userId: string): Promise<CartItem[]> {
  const { data, error } = await timed(
    "cart:fetchUserCart",
    () =>
      supabase
        .from("cart_items")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
  );
  if (error) throw error;
  return (data as CartItemRow[] | null ?? []).map(rowToCartItem);
}

/** Insert or update a single line. Uses the unique(user_id, product_id)
 *  constraint to upsert. */
export async function upsertCartItem(
  userId: string,
  item:   CartItem,
): Promise<void> {
  const { error } = await timed(
    "cart:upsertCartItem",
    () =>
      supabase
        .from("cart_items")
        .upsert(
          {
            user_id:          userId,
            product_id:       item.productId,
            quantity:         item.quantity,
            product_snapshot: item.product,
            updated_at:       new Date().toISOString(),
          },
          { onConflict: "user_id,product_id" },
        ),
  );
  if (error) throw error;
}

export async function removeCartItem(userId: string, productId: string): Promise<void> {
  const { error } = await timed(
    "cart:removeCartItem",
    () =>
      supabase
        .from("cart_items")
        .delete()
        .eq("user_id",    userId)
        .eq("product_id", productId),
  );
  if (error) throw error;
}

/** Wipe the user's server cart. Used by sign-out flow (NOT the wipe — server
 *  data should normally survive sign-out so re-sign-in restores it) and by
 *  checkout success (cart is "consumed" by the placed order). */
export async function clearUserCart(userId: string): Promise<void> {
  const { error } = await timed(
    "cart:clearUserCart",
    () =>
      supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId),
  );
  if (error) throw error;
}

/** Replace the user's entire cart with a new set of items. Used on sign-in
 *  to push the merged local+server cart back. Implemented as
 *  delete-then-insert in a sequence (not transactional; if the insert phase
 *  fails after delete succeeded, the cart is empty server-side and will be
 *  rebuilt by the next mutation). */
export async function replaceUserCart(userId: string, items: CartItem[]): Promise<void> {
  await clearUserCart(userId);
  if (items.length === 0) return;

  const rows = items.map((item) => ({
    user_id:          userId,
    product_id:       item.productId,
    quantity:         item.quantity,
    product_snapshot: item.product,
  }));
  const { error } = await timed(
    "cart:replaceUserCart insert",
    () => supabase.from("cart_items").insert(rows),
  );
  if (error) throw error;
}

/** Merge two cart lists by productId. Quantities sum; the LATEST product
 *  snapshot wins (because product data might have changed since the
 *  anonymous cart was filled). Used during sign-in to combine the
 *  anonymous-session local cart with whatever the user's server cart held. */
export function mergeCartItems(local: CartItem[], server: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  // Seed with server items so the snapshot they carry wins ties.
  for (const it of server) map.set(it.productId, { ...it });
  for (const it of local) {
    const existing = map.get(it.productId);
    if (existing) {
      map.set(it.productId, {
        ...existing,
        quantity: existing.quantity + it.quantity,
      });
    } else {
      map.set(it.productId, { ...it });
    }
  }
  return Array.from(map.values());
}
