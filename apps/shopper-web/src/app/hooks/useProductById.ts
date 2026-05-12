/**
 * useProductById.ts — Single-product direct Supabase fetch
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY THIS HOOK EXISTS (for Bara'a)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Before the pagination refactor, ProductDetails.tsx worked because all 52K
 * products were pre-loaded into allProductsById (a Map in CatalogContext).
 * After we removed the full 52K background load to fix the 30-second hang,
 * allProductsById became empty on cold start, making direct URL navigation
 * (e.g. opening /products/abc123 in a new tab) show "Product not found".
 *
 * This hook is completely independent of CatalogContext. It talks directly to
 * Supabase with a single .eq("id", id) row lookup — typically < 100 ms on a
 * warm DB connection. No loading of 52K products required.
 *
 * LOOKUP STRATEGY
 * ───────────────
 * 1. Query by `id` column (Supabase UUID — present on all Supabase-created tables)
 * 2. If not found, fall back to matching by the `Code` column (used when rows
 *    were created without an auto-generated UUID and the slug was derived from Code)
 */

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "../../lib/supabaseClient";
import { normalizeSupabaseProduct, type CatalogProduct } from "../catalog";

export interface UseProductByIdResult {
  product: CatalogProduct | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches a single product from Supabase by its ID.
 * Pass `undefined` to skip the fetch (e.g. when the product is already in cache).
 */
export function useProductById(id: string | undefined): UseProductByIdResult {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  // Track mount status so stale async callbacks don't update unmounted state.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      setProduct(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setProduct(null);

    const supabase = getSupabaseClient();

    void (async () => {
      try {
        // ── 1. Primary: look up by the DB `id` column (Supabase UUID) ──────
        const { data: rowById, error: errById } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .maybeSingle(); // null on no match instead of throwing

        if (!mountedRef.current) return;

        if (rowById && !errById) {
          setProduct(normalizeSupabaseProduct(rowById as Record<string, unknown>, 0));
          setIsLoading(false);
          return;
        }

        // ── 2. Fallback: match by `Code` column ────────────────────────────
        const { data: rowByCode } = await supabase
          .from("products")
          .select("*")
          .eq("Code", id)
          .maybeSingle();

        if (!mountedRef.current) return;

        if (rowByCode) {
          setProduct(normalizeSupabaseProduct(rowByCode as Record<string, unknown>, 0));
        } else {
          setError("Product not found");
        }
        setIsLoading(false);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to load product");
        setIsLoading(false);
      }
    })();
  }, [id]);

  return { product, isLoading, error };
}
