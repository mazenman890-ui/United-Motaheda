-- =============================================================================
-- Migration: Add search_vector generated column to products
-- Date: 2026-06-03
--
-- Why:
--   search_products RPC (added 2026-06-01) references p.search_vector in both
--   its WHERE clause and relevance scoring.  If the column doesn't exist,
--   every call to the RPC fails at plpgsql compile-time with:
--     "column p.search_vector does not exist"
--   This causes every category/search page to show "تعذر التحميل".
--
-- What this does:
--   1. Adds search_vector as a STORED generated tsvector column.
--      Combines Name_En + Name_Ar + Code + Barcode in 'english' dictionary.
--      STORED means Postgres computes + stores it at INSERT/UPDATE time,
--      so the RPC SELECT never needs to recompute it per-row.
--   2. Creates a GIN index on search_vector for sub-millisecond @@ lookups.
--
-- Safe to re-run (IF NOT EXISTS guards everywhere).
-- =============================================================================

-- ─── Step 1: Add the generated column (no-op if it already exists) ───────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      COALESCE("Name_En", '')  || ' ' ||
      COALESCE("Name_Ar", '')  || ' ' ||
      COALESCE("Code",    '')  || ' ' ||
      COALESCE("Barcode", '')
    )
  ) STORED;

-- ─── Step 2: GIN index on search_vector (powers @@ operator) ─────────────────

CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON public.products USING gin (search_vector);

-- ─── Done ─────────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.products.search_vector IS
  'Auto-generated tsvector from Name_En + Name_Ar + Code + Barcode. Powers the search_products RPC full-text ranking.';
