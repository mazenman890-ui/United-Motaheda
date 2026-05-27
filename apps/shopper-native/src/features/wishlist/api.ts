/**
 * Wishlist sync API — Supabase-backed `wishlist_items` table.
 *
 * One row per (user, product). Unique constraint on the pair makes upsert
 * the natural insert operation; the toggle helper just inserts or deletes
 * depending on current presence.
 */

import { supabase } from "@/lib/supabase";
import { timed } from "@/lib/devTiming";
import type { NativeProduct } from "@/services/productsApi";

interface WishlistRow {
  id:               string;
  user_id:          string;
  product_id:       string;
  product_snapshot: NativeProduct;
  added_at:         string;
}

export async function fetchUserWishlist(userId: string): Promise<NativeProduct[]> {
  const { data, error } = await timed(
    "wishlist:fetchUserWishlist",
    () =>
      supabase
        .from("wishlist_items")
        .select("*")
        .eq("user_id", userId)
        .order("added_at", { ascending: false }),
  );
  if (error) throw error;
  return (data as WishlistRow[] | null ?? []).map((r) => r.product_snapshot);
}

export async function addWishlistItem(userId: string, product: NativeProduct): Promise<void> {
  const { error } = await timed(
    "wishlist:addWishlistItem",
    () =>
      supabase
        .from("wishlist_items")
        .upsert(
          {
            user_id:          userId,
            product_id:       product.id,
            product_snapshot: product,
          },
          { onConflict: "user_id,product_id" },
        ),
  );
  if (error) throw error;
}

export async function removeWishlistItem(userId: string, productId: string): Promise<void> {
  const { error } = await timed(
    "wishlist:removeWishlistItem",
    () =>
      supabase
        .from("wishlist_items")
        .delete()
        .eq("user_id",    userId)
        .eq("product_id", productId),
  );
  if (error) throw error;
}

export async function clearUserWishlist(userId: string): Promise<void> {
  const { error } = await timed(
    "wishlist:clearUserWishlist",
    () => supabase.from("wishlist_items").delete().eq("user_id", userId),
  );
  if (error) throw error;
}

/** Sign-in merge: union by productId, server snapshots win on tie. */
export function mergeWishlists(
  local:  NativeProduct[],
  server: NativeProduct[],
): NativeProduct[] {
  const map = new Map<string, NativeProduct>();
  for (const p of server) map.set(p.id, p);
  for (const p of local)  if (!map.has(p.id)) map.set(p.id, p);
  return Array.from(map.values());
}

export async function replaceUserWishlist(userId: string, items: NativeProduct[]): Promise<void> {
  await clearUserWishlist(userId);
  if (items.length === 0) return;
  const rows = items.map((p) => ({
    user_id:          userId,
    product_id:       p.id,
    product_snapshot: p,
  }));
  const { error } = await timed(
    "wishlist:replaceUserWishlist insert",
    () => supabase.from("wishlist_items").insert(rows),
  );
  if (error) throw error;
}
