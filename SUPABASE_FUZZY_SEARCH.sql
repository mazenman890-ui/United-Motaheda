-- ═══════════════════════════════════════════════════════════════════════════════
-- UNITED PHARMACY — FUZZY SEARCH RPC
-- Run this entire block once in the Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Step 1: Enable pg_trgm ───────────────────────────────────────────────────
-- pg_trgm ships with every Supabase project; this is a no-op if already enabled.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── Step 2: GIN trigram indexes ─────────────────────────────────────────────
-- CONCURRENTLY means the table stays fully readable while the index builds.
-- Skip any that already exist (IF NOT EXISTS guard).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_ar_trgm
  ON products USING gin ("Name_Ar" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_en_trgm
  ON products USING gin ("Name_En" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_code_trgm
  ON products USING gin ("Code" gin_trgm_ops);

-- ─── Step 3: RPC function ─────────────────────────────────────────────────────
-- Returns matching product rows ordered by fuzzy similarity score.
-- The caller receives every column that normalizeSupabaseProduct() needs
-- plus `similarity_score` (float, 0-1) and `total_count` (bigint, window fn).
--
-- Parameters
--   search_term     : the user's query (Arabic or English, with or without typos)
--   page_number     : 1-based page index
--   page_size       : rows per page (default 24)
--   category_ar     : Arabic category name fragment for optional pre-filter
--   category_en     : English category name fragment for optional pre-filter
--   in_stock_only   : pass TRUE to restrict to is_active = true rows
--   sort_order      : 'relevant' | 'price_asc' | 'price_desc' | 'name'
--   min_similarity  : trigram threshold (0.15 catches most Arabic typos)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_products_fuzzy(
  search_term     text,
  page_number     int     DEFAULT 1,
  page_size       int     DEFAULT 24,
  category_ar     text    DEFAULT NULL,
  category_en     text    DEFAULT NULL,
  in_stock_only   boolean DEFAULT NULL,
  sort_order      text    DEFAULT 'relevant',
  min_similarity  float4  DEFAULT 0.15
)
RETURNS TABLE (
  id                  uuid,
  "Name_Ar"           text,
  "Name_En"           text,
  "Name"              text,
  "Code"              text,
  "Barcode"           text,
  "Category_Name"     text,
  "Category_Name_En"  text,
  "Price"             numeric,
  is_active           boolean,
  image_url           text,
  similarity_score    float4,
  total_count         bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Lower the trigram similarity threshold for this transaction so that the %
  -- operator (used in the WHERE clause) benefits from the GIN index while still
  -- catching close Arabic/English typos (e.g. "بنادول" ≈ "بانادول").
  PERFORM set_config('pg_trgm.similarity_threshold', min_similarity::text, true);

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p."Name_Ar",
      p."Name_En",
      p."Name",
      p."Code",
      p."Barcode",
      p."Category_Name",
      p."Category_Name_En",
      p."Price",
      p.is_active,
      p.image_url,
      -- Highest similarity score across the three text columns (0–1 scale).
      GREATEST(
        similarity(COALESCE(p."Name_Ar", ''), search_term),
        similarity(COALESCE(p."Name_En", ''), search_term),
        similarity(COALESCE(p."Code",    ''), search_term)
      )::float4 AS sim
    FROM products p
    WHERE
      -- Trigram fuzzy match (uses GIN index, respects threshold set above).
      (
        p."Name_Ar" % search_term  OR
        p."Name_En" % search_term  OR
        p."Code"    % search_term
      )
      OR
      -- Exact substring match — catches short codes & phrases below trgm threshold.
      (
        p."Name_Ar" ILIKE '%' || search_term || '%' OR
        p."Name_En" ILIKE '%' || search_term || '%' OR
        p."Code"    ILIKE '%' || search_term || '%' OR
        p."Barcode" ILIKE '%' || search_term || '%'
      )
  ),
  category_filtered AS (
    SELECT f.*
    FROM filtered f
    WHERE
      (category_ar   IS NULL OR f."Category_Name"    ILIKE '%' || category_ar || '%')
      AND (category_en IS NULL OR f."Category_Name_En" ILIKE '%' || category_en || '%')
      AND (in_stock_only IS NULL OR f.is_active = in_stock_only)
  ),
  ranked AS (
    SELECT
      cf.*,
      COUNT(*) OVER () AS total
    FROM category_filtered cf
    ORDER BY
      -- 'relevant': highest similarity first, then active products first.
      -- Negating scores converts DESC to ASC so all branches share one
      -- multi-column ORDER BY without dynamic SQL.
      CASE WHEN sort_order = 'relevant'
           THEN -cf.sim                              END ASC NULLS LAST,
      CASE WHEN sort_order = 'relevant'
           THEN (CASE WHEN cf.is_active THEN 0 ELSE 1 END) END ASC NULLS LAST,
      -- 'price_asc': lowest price first.
      CASE WHEN sort_order = 'price_asc'
           THEN cf."Price"                           END ASC NULLS LAST,
      -- 'price_desc': highest price first (negate → ASC == DESC).
      CASE WHEN sort_order = 'price_desc'
           THEN -cf."Price"                          END ASC NULLS LAST,
      -- 'name': alphabetical by English name.
      CASE WHEN sort_order = 'name'
           THEN cf."Name_En"                         END ASC NULLS LAST,
      -- Final tiebreaker: alphabetical.
      cf."Name_En" ASC NULLS LAST
  )
  SELECT
    r.id,
    r."Name_Ar",
    r."Name_En",
    r."Name",
    r."Code",
    r."Barcode",
    r."Category_Name",
    r."Category_Name_En",
    r."Price",
    r.is_active,
    r.image_url,
    r.sim                AS similarity_score,
    r.total::bigint      AS total_count
  FROM ranked r
  LIMIT  page_size
  OFFSET (page_number - 1) * page_size;
END;
$$;

-- ─── Step 4: Grant execute rights ────────────────────────────────────────────
-- Adjust roles to match your Supabase project's auth setup.
GRANT EXECUTE ON FUNCTION search_products_fuzzy(
  text, int, int, text, text, boolean, text, float4
) TO anon, authenticated;
