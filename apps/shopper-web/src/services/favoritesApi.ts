import { supabase } from "../lib/supabaseClient";

export async function fetchFavoriteProductIds(userId: string): Promise<string[]> {
  if (!supabase) {
    throw new Error("Wishlist is unavailable because Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => String(row.product_id));
}

export async function addFavoriteRow(userId: string, productId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("favorites").upsert(
    { user_id: userId, product_id: productId },
    { onConflict: "user_id,product_id" },
  );

  if (error) {
    throw error;
  }
}

export async function removeFavoriteRow(userId: string, productId: string) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    throw error;
  }
}
