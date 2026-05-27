-- ============================================================================
-- Add the missing image_url column to public.products.
--
-- Symptom this fixes:
--   * supabase db lint flags `column p.image_url does not exist` on every
--     RPC that returns it (search_products, get_featured_products,
--     get_related_products, get_trending_products, and the pre-existing
--     search_products_fuzzy).
--   * productsApi.ts normalises rows expecting `row.image_url`; without the
--     column, every product card shows a placeholder icon instead of its
--     thumbnail.
--
-- Root cause:
--   The products table was provisioned outside the migration system (CSV
--   import / Supabase Studio) without an image_url column. None of the
--   slice migrations created the column either — they referenced it on
--   the assumption that it existed.
--
-- This migration adds it as nullable text so existing rows are untouched.
-- Population of image URLs is a separate ETL step.
-- ============================================================================

alter table public.products add column if not exists image_url text;

-- Tell PostgREST to reload its schema cache so the REST API surfaces the
-- new column immediately (otherwise responses would still 404 the field
-- for up to ten minutes).
notify pgrst, 'reload schema';
