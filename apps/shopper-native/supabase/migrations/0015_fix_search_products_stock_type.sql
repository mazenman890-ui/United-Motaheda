-- =============================================================================
-- Migration: 0015_fix_search_products_stock_type.sql
--
-- Root cause:  The products."Stock" column is stored as double precision in
--              Supabase.  The function's CASE expression mixes double precision
--              (from similarity / ts_rank_cd) with numeric literals (1000.0),
--              causing PostgreSQL to promote the whole expression to double
--              precision — which then does not match the declared return type.
--
-- Fixes:
--   1. Explicitly CAST p."Stock" to numeric in every SELECT so the return
--      slot (stock numeric) is always satisfied.
--   2. Wrap the entire ranking expression in ::real so the return slot
--      (rank real) is always satisfied, regardless of intermediate types.
--   3. Drop ALL overloads of search_products before recreating so no
--      stale signature with a mismatched return table remains in the catalog.
-- =============================================================================

-- ─── 1. Extensions (idempotent) ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- ─── 2. Drop ALL overloads of search_products ───────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS proc
    FROM   pg_proc
    WHERE  proname         = 'search_products'
      AND  pronamespace    = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.proc;
  END LOOP;
END
$$;

-- ─── 3. Recreate search_products with correct type casts ─────────────────────
CREATE OR REPLACE FUNCTION public.search_products(
  p_query      text     DEFAULT NULL,
  p_category   text     DEFAULT NULL,
  p_in_stock   boolean  DEFAULT false,
  p_min_price  numeric  DEFAULT NULL,
  p_max_price  numeric  DEFAULT NULL,
  p_sort       text     DEFAULT 'relevance',
  p_limit      int      DEFAULT 24,
  p_offset     int      DEFAULT 0
)
RETURNS TABLE (
  id                text,
  code              text,
  barcode           text,
  name_ar           text,
  name_en           text,
  price             numeric,
  stock             numeric,       -- declared numeric; cast applied below
  category_name     text,
  category_name_en  text,
  image_url         text,
  rank              real,          -- declared real; entire rnk expr cast to ::real
  total_count       bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_q      text := nullif(trim(coalesce(p_query, '')), '');
  v_uq     text;
  v_tsq    tsquery;
  v_limit  int  := least(greatest(coalesce(p_limit, 24), 1), 100);
  v_offset int  := greatest(coalesce(p_offset, 0), 0);
BEGIN
  IF v_q IS NOT NULL THEN
    v_uq := unaccent(v_q);

    -- websearch_to_tsquery handles quoted phrases, +/- operators safely.
    -- Falls back through plainto_tsquery then NULL on any failure.
    BEGIN
      v_tsq := websearch_to_tsquery('simple', v_uq);
    EXCEPTION WHEN others THEN
      BEGIN
        v_tsq := plainto_tsquery('simple', v_uq);
      EXCEPTION WHEN others THEN
        v_tsq := NULL;
      END;
    END;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p."Code"              AS code,
      p."Barcode"           AS barcode,
      p."Name_Ar"           AS name_ar,
      p."Name_En"           AS name_en,
      p."Price"             AS price,
      -- FIX: explicit cast to numeric; the physical column is double precision
      p."Stock"::numeric    AS stock,
      p."Category_Name"     AS category_name,
      p."Category_Name_En"  AS category_name_en,
      p.image_url,
      -- FIX: cast entire expression to real so mixed numeric/real arithmetic
      --      never silently promotes the CASE result to double precision.
      (CASE
        WHEN v_q IS NULL THEN 0.0

        ELSE
          -- Exact code / barcode match → always surfaces first
          (CASE
            WHEN p."Code"    ILIKE v_q  THEN 1000.0
            WHEN p."Barcode" ILIKE v_q  THEN 1000.0
            WHEN p."Code"    ILIKE v_uq THEN  999.0
            WHEN p."Barcode" ILIKE v_uq THEN  999.0
            ELSE 0.0
          END)

          -- Full-text (cover-density rank — prefers compact matches)
          + (CASE
               WHEN v_tsq IS NOT NULL AND p.search_vector IS NOT NULL
               THEN ts_rank_cd(p.search_vector, v_tsq)::float8 * 2.5
               ELSE 0.0
             END)

          -- Whole-string trigram similarity
          + 1.2 * greatest(
              coalesce(similarity(coalesce(p."Name_Ar", ''), v_uq), 0.0),
              coalesce(similarity(coalesce(p."Name_En", ''), v_uq), 0.0)
            )

          -- Partial / word similarity ("panad" → "panadol")
          + 0.9 * greatest(
              coalesce(word_similarity(v_uq, coalesce(p."Name_Ar", '')), 0.0),
              coalesce(word_similarity(v_uq, coalesce(p."Name_En", '')), 0.0)
            )

          -- Light category signal
          + 0.15 * greatest(
              coalesce(similarity(coalesce(p."Category_Name",    ''), v_uq), 0.0),
              coalesce(similarity(coalesce(p."Category_Name_En", ''), v_uq), 0.0)
            )
      END)::real   AS rnk   -- ← explicit ::real cast resolves the type mismatch

    FROM public.products p
    WHERE coalesce(p.is_active, true) = true

      -- Category filter
      AND (
        p_category IS NULL
        OR p."Category_Name"    =     p_category
        OR p."Category_Name"    ILIKE p_category
        OR p."Category_Name_En" ILIKE p_category
      )

      -- Stock filter
      AND (NOT p_in_stock OR coalesce(p."Stock", 0) > 0)

      -- Price filters
      AND (p_min_price IS NULL OR p."Price" >= p_min_price)
      AND (p_max_price IS NULL OR p."Price" <= p_max_price)

      -- Text search (7 complementary strategies)
      AND (
        v_q IS NULL

        -- 1. Full-text vector
        OR (v_tsq IS NOT NULL AND p.search_vector IS NOT NULL
            AND p.search_vector @@ v_tsq)

        -- 2. Whole-string trigram fuzzy
        OR p."Name_Ar" %  v_uq
        OR p."Name_En" %  v_uq

        -- 3. Partial / word trigram ("panad" ∈ "panadol")
        OR v_uq <% p."Name_Ar"
        OR v_uq <% p."Name_En"

        -- 4. ILIKE substring — raw query (Arabic direct input)
        OR p."Name_Ar"          ILIKE '%' || v_q  || '%'
        OR p."Name_En"          ILIKE '%' || v_q  || '%'

        -- 5. ILIKE substring — unaccented
        OR p."Name_Ar"          ILIKE '%' || v_uq || '%'
        OR p."Name_En"          ILIKE '%' || v_uq || '%'

        -- 6. Code / barcode prefix
        OR p."Code"             ILIKE v_q || '%'
        OR p."Barcode"          ILIKE v_q || '%'

        -- 7. Category substring
        OR p."Category_Name"    ILIKE '%' || v_q || '%'
        OR p."Category_Name_En" ILIKE '%' || v_q || '%'
      )
  ),
  counted AS (
    SELECT f.*, count(*) OVER () AS total_count
    FROM   filtered f
  )
  SELECT
    c.id::text,
    c.code,
    c.barcode,
    c.name_ar,
    c.name_en,
    c.price,
    c.stock,           -- already numeric from the cast above
    c.category_name,
    c.category_name_en,
    c.image_url,
    c.rnk,             -- already real from the ::real cast above
    c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN p_sort = 'price_asc'  THEN c.price   END ASC  NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN c.price   END DESC NULLS LAST,
    CASE WHEN p_sort = 'name_asc'   THEN c.name_ar END ASC  NULLS LAST,
    CASE WHEN p_sort = 'newest'     THEN c.id      END DESC NULLS LAST,
    c.rnk DESC,
    c.id  DESC
  LIMIT  v_limit
  OFFSET v_offset;
END;
$$;

-- ─── 4. Permissions ──────────────────────────────────────────────────────────
REVOKE ALL    ON FUNCTION public.search_products(text,text,boolean,numeric,numeric,text,int,int) FROM public;
GRANT  EXECUTE ON FUNCTION public.search_products(text,text,boolean,numeric,numeric,text,int,int) TO anon, authenticated;

-- ─── 5. Reload PostgREST schema cache ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
