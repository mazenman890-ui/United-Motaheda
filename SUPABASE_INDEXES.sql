-- ═══════════════════════════════════════════════════════════════════════════════
-- SUPABASE SQL INDEXES — Run these in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- FOR BARA'A: Run the commands below in your Supabase project at:
--   https://supabase.com/dashboard/project/<your-project-id>/sql/new
--
-- WHAT THESE DO:
--   The app now uses `.ilike('%query%')` for server-side search on the products
--   table. By default, PostgreSQL cannot use a B-tree index for a LEADING
--   wildcard pattern like `%query%` — it scans all 52K rows on every search.
--
--   A GIN trigram index (pg_trgm) breaks text into 3-character chunks ("trigrams")
--   and indexes them. This makes `ilike '%query%'` fast regardless of where the
--   search term appears in the string — typical speedup is 50–200× on large tables.
--
-- ORDER OF EXECUTION:
--   1. Enable the pg_trgm extension (only needed once per project)
--   2. Create GIN indexes on the search columns
--   3. Create B-tree indexes on filter/sort columns
--
-- SAFETY:
--   All commands use `CREATE INDEX CONCURRENTLY IF NOT EXISTS`.
--   - CONCURRENTLY: builds the index without locking reads/writes.
--     Other queries continue running while the index is built.
--   - IF NOT EXISTS: safe to re-run; no error if the index already exists.
--
-- EXPECTED BUILD TIME: ~30–120 seconds for a 52K-row table.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── Step 1: Enable pg_trgm extension ────────────────────────────────────────
-- Required for GIN trigram indexes. Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ─── Step 2: GIN trigram indexes for ilike search ────────────────────────────
-- These dramatically speed up the `.or("Name_Ar.ilike.%q%, Name_En.ilike.%q%")`
-- queries that the app uses for product search.
--
-- We index lower(column) to match the lowercase search terms the app sends.
-- Supabase PostgREST automatically lowercases the right-hand side of ilike,
-- so this is the correct approach.

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_name_ar_trgm_idx
  ON products USING GIN (lower("Name_Ar") gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_name_en_trgm_idx
  ON products USING GIN (lower("Name_En") gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_code_trgm_idx
  ON products USING GIN (lower("Code") gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_barcode_trgm_idx
  ON products USING GIN (lower("Barcode") gin_trgm_ops);


-- ─── Step 3: B-tree indexes for filter columns ───────────────────────────────
-- Used by the in-stock filter (.eq("is_active", true)) and price filter
-- (.lte("Price", maxPrice)). B-tree is the right choice for equality and
-- range comparisons on these columns.

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_is_active_idx
  ON products ("is_active");

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_price_idx
  ON products ("Price");


-- ─── Step 4: Composite B-tree for default sort order ─────────────────────────
-- The default sort in buildSupabaseQuery is:
--   .order("is_active", { ascending: false })
--   .order("Name_En", { ascending: true })
--
-- This composite index lets PostgreSQL avoid a sort entirely for the most
-- common query (no search, no filters — just "show me all products in order").

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_default_sort_idx
  ON products ("is_active" DESC, "Name_En" ASC);


-- ─── Step 5: B-tree for category name filtering ──────────────────────────────
-- Category filtering uses:
--   .or("Category_Name.ilike.%name%, Category_Name_En.ilike.%name%")
--
-- Since category names are exact (no leading wildcard in practice), a plain
-- B-tree index on the lower-cased column is sufficient and cheaper than GIN.

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_category_name_idx
  ON products (lower("Category_Name"));

CREATE INDEX CONCURRENTLY IF NOT EXISTS products_category_name_en_idx
  ON products (lower("Category_Name_En"));


-- ─── Verification ─────────────────────────────────────────────────────────────
-- Run this after the indexes are built to confirm they exist:

SELECT
  indexname,
  indexdef
FROM
  pg_indexes
WHERE
  tablename = 'products'
ORDER BY
  indexname;
