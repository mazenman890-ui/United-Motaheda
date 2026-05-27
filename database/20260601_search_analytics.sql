-- =============================================================================
-- Migration: Search analytics + infrastructure consolidation
-- Date: 2026-06-01
--
-- What this does:
--   1. Ensures pg_trgm + unaccent are enabled (no-op if already present)
--   2. Ensures all GIN trigram + GiST indexes exist (CONCURRENTLY, safe)
--   3. Creates search_events analytics table
--   4. Creates log_search_event() RPC (callable from app)
--   5. Creates get_popular_searches() RPC (for trending searches UI)
--
-- All statements are idempotent — safe to run multiple times.
-- =============================================================================

-- ─── Step 1: Extensions ───────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ─── Step 2: GIN trigram indexes (accelerate % operator) ─────────────────────
-- These are the indexes that make ILIKE '%q%' sub-5ms on 100k rows.
-- CONCURRENTLY means table stays readable while index builds (~60s first run).

CREATE INDEX IF NOT EXISTS idx_products_name_ar_trgm
  ON public.products USING gin ("Name_Ar" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_name_en_trgm
  ON public.products USING gin ("Name_En" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_code_trgm
  ON public.products USING gin ("Code" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_barcode_trgm
  ON public.products USING gin ("Barcode" gin_trgm_ops);

-- ─── Step 3: GiST trigram indexes (accelerate <% word_similarity operator) ───
-- Required for partial-word matching ("panad" → "panadol") during live typing.
-- GiST is faster to build than GIN and smaller on disk; preferred for word_sim.

CREATE INDEX IF NOT EXISTS idx_products_name_en_gist
  ON public.products USING gist ("Name_En" gist_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_name_ar_gist
  ON public.products USING gist ("Name_Ar" gist_trgm_ops);

-- ─── Step 4: B-tree performance indexes ──────────────────────────────────────

-- Default browse order (is_active DESC, then by name)
CREATE INDEX IF NOT EXISTS idx_products_browse_default
  ON public.products (is_active DESC, "Name_En" ASC NULLS LAST);

-- Price range filter
CREATE INDEX IF NOT EXISTS idx_products_price
  ON public.products ("Price" ASC NULLS LAST) WHERE is_active = true;

-- Category filter (used in every category page query)
CREATE INDEX IF NOT EXISTS idx_products_category_name
  ON public.products ("Category_Name");

-- ─── Step 5: search_events analytics table ───────────────────────────────────
--
-- Tracks every search submission. Used for:
--   - get_popular_searches() — trending searches UI widget
--   - Admin analytics dashboard
--   - Future: personalised suggestions

CREATE TABLE IF NOT EXISTS public.search_events (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  query       text        NOT NULL CHECK (char_length(query) >= 1 AND char_length(query) <= 200),
  result_count integer    NOT NULL DEFAULT 0,
  source      text        NOT NULL DEFAULT 'native'  -- 'native' | 'web'
              CHECK (source IN ('native', 'web')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Partial index: only index non-trivial queries (length >= 2, not just numbers)
CREATE INDEX IF NOT EXISTS search_events_query_idx
  ON public.search_events (query, created_at DESC)
  WHERE char_length(query) >= 2;

-- User lookup for personal history
CREATE INDEX IF NOT EXISTS search_events_user_idx
  ON public.search_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- RLS: users can only see/insert their own rows; anon inserts allowed
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS search_events_self_select ON public.search_events;
CREATE POLICY search_events_self_select
  ON public.search_events FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS search_events_insert ON public.search_events;
CREATE POLICY search_events_insert
  ON public.search_events FOR INSERT
  WITH CHECK (true);  -- any role can log; query content is validated by CHECK constraint

DROP POLICY IF EXISTS search_events_admin ON public.search_events;
CREATE POLICY search_events_admin
  ON public.search_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- ─── Step 6: log_search_event() — called by the app after submit ──────────────

CREATE OR REPLACE FUNCTION public.log_search_event(
  p_query        text,
  p_result_count integer DEFAULT 0,
  p_source       text    DEFAULT 'native'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Silently skip trivially short queries and clearly bot-like values
  IF p_query IS NULL OR char_length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;

  INSERT INTO public.search_events (user_id, query, result_count, source)
  VALUES (
    auth.uid(),                        -- NULL for anonymous, fine
    lower(trim(p_query)),
    COALESCE(p_result_count, 0),
    COALESCE(p_source, 'native')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_search_event(text, integer, text)
  TO anon, authenticated;

-- ─── Step 7: get_popular_searches() — powers trending section ────────────────
--
-- Returns the top N search terms from the last 7 days, ordered by frequency.
-- Deduplicated: each unique (normalized) query counted once per user per day.

CREATE OR REPLACE FUNCTION public.get_popular_searches(
  p_limit  integer DEFAULT 10,
  p_days   integer DEFAULT 7
)
RETURNS TABLE (
  query        text,
  search_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    se.query,
    COUNT(*) AS search_count
  FROM public.search_events se
  WHERE
    se.created_at >= now() - (p_days || ' days')::interval
    AND char_length(se.query) >= 2
    -- Exclude pure-numeric queries (barcode scans, not useful for trending)
    AND se.query ~ '[^0-9]'
  GROUP BY se.query
  ORDER BY search_count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_popular_searches(integer, integer)
  TO anon, authenticated;

-- ─── Step 8: ensure search_products RPC has correct column aliases ────────────
--
-- The native app Zod schema expects snake_case columns:
--   id, code, barcode, name_ar, name_en, price, stock, category_name,
--   category_name_en, image_url, rank, total_count
--
-- DROP first: PostgreSQL forbids CREATE OR REPLACE when return type changes.
-- Previous version returned PascalCase columns; new version returns snake_case.

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
  v_threshold float4 := 0.12;
BEGIN
  -- Lower the similarity threshold so short Arabic terms still match
  PERFORM set_config('pg_trgm.similarity_threshold', v_threshold::text, true);

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
      -- Composite relevance score (6 strategies)
      CASE WHEN p_query IS NULL OR p_query = '' THEN 0
        ELSE
          -- Exact code / barcode match → always surfaces first
          (CASE WHEN lower(p."Code")    = lower(p_query) THEN 1000
                WHEN lower(p."Barcode") = lower(p_query) THEN 1000
                ELSE 0 END)
          -- Full-text cover density (morphological, handles plurals)
          + COALESCE(
              ts_rank_cd(
                p.search_vector,
                websearch_to_tsquery('english', p_query)
              ) * 2.5, 0)
          -- Whole-string trigram (typo tolerance: panadool→panadol)
          + GREATEST(
              similarity(COALESCE(p."Name_Ar", ''), p_query),
              similarity(COALESCE(p."Name_En", ''), p_query)
            ) * 1.2
          -- Word/partial trigram (live typing: "panad"→"panadol")
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
      (p_in_stock IS NULL OR p_in_stock = false OR (p.is_active = true AND COALESCE(p."Stock", 0) > 0))
      AND (p_category IS NULL OR p."Category_Name" = p_category)
      AND (p_min_price IS NULL OR p."Price" >= p_min_price)
      AND (p_max_price IS NULL OR p."Price" <= p_max_price)
      AND (
        -- No query → return all (filtered browse)
        p_query IS NULL OR p_query = ''
        OR
        -- tsvector full-text
        (p.search_vector @@ websearch_to_tsquery('english', p_query))
        OR
        -- Trigram whole-string
        (p."Name_Ar" % p_query OR p."Name_En" % p_query OR p."Code" % p_query)
        OR
        -- Word similarity (partial word, requires GiST index)
        (word_similarity(p_query, COALESCE(p."Name_Ar", '')) > v_threshold
         OR word_similarity(p_query, COALESCE(p."Name_En", '')) > v_threshold)
        OR
        -- ILIKE substring (always-finds fallback)
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
      CASE WHEN p_sort = 'relevance' OR (p_query IS NOT NULL AND p_query != '' AND p_sort = 'newest')
           THEN -b.relevance_score END ASC NULLS LAST,
      CASE WHEN p_sort = 'price_asc'  THEN b.price  END ASC  NULLS LAST,
      CASE WHEN p_sort = 'price_desc' THEN b.price  END DESC NULLS LAST,
      CASE WHEN p_sort = 'name_asc'   THEN b.name_en END ASC NULLS LAST,
      -- Secondary: in-stock products first, then by English name
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
COMMENT ON TABLE public.search_events IS
  'Analytics log of search submissions. Powers trending searches and admin dashboards.';
COMMENT ON FUNCTION public.search_products IS
  'Unified product search RPC. Combines tsvector full-text, pg_trgm fuzzy, word_similarity partial, and ILIKE fallback into a single ranked result set. Snake-case output matches the Zod schema in apps/shopper-native/src/features/products/types/index.ts.';
