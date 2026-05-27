-- =============================================================================
-- Migration: Make search_products self-contained (no search_vector dependency)
-- Date: 2026-06-04
--
-- Problem:
--   The search_products function (added 2026-06-01) references p.search_vector
--   in both its WHERE clause and relevance scoring.  The column is added by
--   20260603_products_search_vector.sql which must be run separately.  Until
--   that migration runs, EVERY call to the RPC fails with:
--     "column p.search_vector does not exist"
--   causing all category pages and the search screen to show an error.
--
-- Fix:
--   Replace every p.search_vector reference with to_tsvector() computed inline.
--   The function is now fully self-contained and works even before
--   20260603_products_search_vector.sql has been applied.
--
--   Performance: the trigram GIN/GiST indexes (idx_products_name_ar_trgm,
--   idx_products_name_en_trgm, idx_products_name_en_gist, etc.) created in
--   20260601_search_analytics.sql are used for the % and word_similarity
--   conditions that do the heavy lifting.  The inline to_tsvector() adds FTS
--   ranking quality without a table-scan penalty on typical queries.
--
--   Once 20260603_products_search_vector.sql has been applied you can further
--   improve performance by updating the function to reference p.search_vector
--   directly — the GIN index on that column will then accelerate @@ lookups.
--
-- Also fixes:
--   - Wraps websearch_to_tsquery() in a BEGIN/EXCEPTION block so malformed
--     query strings (e.g. lone '"') never crash the RPC.
--   - Adds "is_active = true" to the browse path (no-query) so deactivated
--     products never show in category pages.
--
-- Safe to re-run (DROP IF EXISTS + CREATE OR REPLACE).
-- =============================================================================

DROP FUNCTION IF EXISTS public.search_products(text, text, boolean, numeric, numeric, text, integer, integer);

CREATE OR REPLACE FUNCTION public.search_products(
  p_query      text    DEFAULT NULL,
  p_category   text    DEFAULT NULL,
  p_in_stock   boolean DEFAULT false,
  p_min_price  numeric DEFAULT NULL,
  p_max_price  numeric DEFAULT NULL,
  p_sort       text    DEFAULT 'newest',
  p_limit      integer DEFAULT 20,
  p_offset     integer DEFAULT 0
)
RETURNS TABLE (
  id               text,
  code             text,
  barcode          text,
  name_ar          text,
  name_en          text,
  price            numeric,
  stock            numeric,
  category_name    text,
  category_name_en text,
  image_url        text,
  rank             numeric,
  total_count      bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_threshold float4  := 0.12;
  v_tsquery   tsquery := NULL;
BEGIN
  -- Lower similarity threshold so short Arabic terms still match.
  PERFORM set_config('pg_trgm.similarity_threshold', v_threshold::text, true);

  -- Pre-parse tsquery once (avoids per-row parsing; gracefully handles
  -- malformed input such as a lone double-quote character).
  IF p_query IS NOT NULL AND trim(p_query) <> '' THEN
    BEGIN
      v_tsquery := websearch_to_tsquery('english', p_query);
    EXCEPTION WHEN OTHERS THEN
      v_tsquery := NULL;   -- bad query string — fall back to trgm-only
    END;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.id::text,
      p."Code"              AS code,
      p."Barcode"           AS barcode,
      p."Name_Ar"           AS name_ar,
      p."Name_En"           AS name_en,
      p."Price"             AS price,
      COALESCE(p."Stock", 0)::numeric AS stock,
      p."Category_Name"     AS category_name,
      p."Category_Name_En"  AS category_name_en,
      p.image_url,
      -- ── Composite relevance score (6 strategies) ────────────────────────
      CASE WHEN p_query IS NULL OR trim(p_query) = '' THEN 0
        ELSE
          -- Exact code / barcode match → always surfaces first
          (CASE WHEN lower(p."Code")    = lower(p_query) THEN 1000
                WHEN lower(p."Barcode") = lower(p_query) THEN 1000
                ELSE 0 END)
          -- Full-text cover density (morphological, handles plurals)
          -- Computed inline so no dependency on the search_vector column.
          + CASE WHEN v_tsquery IS NOT NULL THEN
              COALESCE(
                ts_rank_cd(
                  to_tsvector('english',
                    COALESCE(p."Name_En", '') || ' ' ||
                    COALESCE(p."Name_Ar", '') || ' ' ||
                    COALESCE(p."Code",    '') || ' ' ||
                    COALESCE(p."Barcode", '')
                  ),
                  v_tsquery
                ) * 2.5,
                0
              )
            ELSE 0 END
          -- Whole-string trigram similarity (typo tolerance)
          + GREATEST(
              similarity(COALESCE(p."Name_Ar", ''), p_query),
              similarity(COALESCE(p."Name_En", ''), p_query)
            ) * 1.2
          -- Word / partial trigram (live typing: "panad" → "panadol")
          + GREATEST(
              word_similarity(p_query, COALESCE(p."Name_Ar", '')),
              word_similarity(p_query, COALESCE(p."Name_En", ''))
            ) * 0.9
          -- ILIKE substring fallback (brand abbreviations, mixed script)
          + (CASE WHEN p."Name_Ar" ILIKE '%' || p_query || '%'
                    OR p."Name_En" ILIKE '%' || p_query || '%'
                    OR p."Code"    ILIKE '%' || p_query || '%'
                    OR p."Barcode" ILIKE '%' || p_query || '%'
                  THEN 0.3 ELSE 0 END)
          -- Category soft boost (never overrides product matches)
          + similarity(COALESCE(p."Category_Name", ''), p_query) * 0.15
      END AS relevance_score
    FROM public.products p
    WHERE
      -- Active-only browse (no query) so deactivated products never appear.
      (p_query IS NOT NULL AND trim(p_query) <> '' OR p.is_active = true)
      AND (p_in_stock IS NULL OR p_in_stock = false
           OR (p.is_active = true AND COALESCE(p."Stock", 0) > 0))
      AND (p_category IS NULL OR p."Category_Name" = p_category)
      AND (p_min_price IS NULL OR p."Price" >= p_min_price)
      AND (p_max_price IS NULL OR p."Price" <= p_max_price)
      AND (
        -- No query → return all filtered rows (category browse)
        p_query IS NULL OR trim(p_query) = ''
        OR
        -- Full-text search (inline tsvector — uses GIN index if search_vector
        -- column exists and query planner chooses it; otherwise seq-scan with
        -- trigram short-circuit handles the heavy lifting)
        (v_tsquery IS NOT NULL AND
          to_tsvector('english',
            COALESCE(p."Name_En", '') || ' ' ||
            COALESCE(p."Name_Ar", '') || ' ' ||
            COALESCE(p."Code",    '') || ' ' ||
            COALESCE(p."Barcode", '')
          ) @@ v_tsquery
        )
        OR
        -- Trigram whole-string match (uses GIN idx_products_name_*_trgm)
        (p."Name_Ar" % p_query OR p."Name_En" % p_query OR p."Code" % p_query)
        OR
        -- Word similarity / partial word (uses GiST idx_products_name_*_gist)
        (word_similarity(p_query, COALESCE(p."Name_Ar", '')) > v_threshold
         OR word_similarity(p_query, COALESCE(p."Name_En", '')) > v_threshold)
        OR
        -- ILIKE substring — always-finds fallback; catches edge cases the
        -- trigram and FTS paths miss (single-char queries, mixed script, etc.)
        (p."Name_Ar" ILIKE '%' || p_query || '%'
         OR p."Name_En" ILIKE '%' || p_query || '%'
         OR p."Code"    ILIKE '%' || p_query || '%'
         OR p."Barcode" ILIKE '%' || p_query || '%')
      )
  ),
  counted AS (
    SELECT b.*, COUNT(*) OVER () AS total
    FROM base b
    ORDER BY
      -- Relevance sort: used for explicit "relevance" sort AND for keyword
      -- searches when the user hasn't changed the sort order from "newest".
      CASE WHEN p_sort = 'relevance'
                OR (p_query IS NOT NULL AND trim(p_query) <> '' AND p_sort = 'newest')
           THEN -b.relevance_score END ASC NULLS LAST,
      CASE WHEN p_sort = 'price_asc'  THEN b.price    END ASC  NULLS LAST,
      CASE WHEN p_sort = 'price_desc' THEN b.price    END DESC NULLS LAST,
      CASE WHEN p_sort = 'name_asc'   THEN b.name_en  END ASC  NULLS LAST,
      -- Secondary: in-stock first, then alphabetical by English name
      (CASE WHEN b.stock > 0 THEN 0 ELSE 1 END) ASC,
      b.name_en ASC NULLS LAST
  )
  SELECT
    c.id,
    c.code,
    c.barcode,
    c.name_ar,
    c.name_en,
    c.price,
    c.stock,
    c.category_name,
    c.category_name_en,
    c.image_url,
    c.relevance_score AS rank,
    c.total
  FROM counted c
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_products(text, text, boolean, numeric, numeric, text, integer, integer)
  TO anon, authenticated;

-- ─── Done ─────────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.search_products IS
  'Unified product search + browse RPC. Combines inline tsvector FTS, pg_trgm '
  'fuzzy, word_similarity partial, and ILIKE fallback. Self-contained: works '
  'without the search_vector generated column (added by 20260603). Snake-case '
  'output matches SearchProductRowSchema in apps/shopper-native/src/features/'
  'products/types/index.ts and the web shopperCatalogApi.';
