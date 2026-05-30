-- ─────────────────────────────────────────────────────────────────────────────
-- Add real rating, discount, and badge fields to the products table.
-- Run once in Supabase SQL Editor.
--
-- After running, update these fields via the admin panel or directly:
--   UPDATE "Product" SET rating_avg=4.5, rating_count=128 WHERE id='...';
--   UPDATE "Product" SET discount_percent=20, is_sale=true WHERE id='...';
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Ratings ──────────────────────────────────────────────────────────────────
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS rating_avg   numeric(3,2),  -- e.g. 4.75
  ADD COLUMN IF NOT EXISTS rating_count integer;       -- e.g. 128

-- ── Discounts ────────────────────────────────────────────────────────────────
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2); -- e.g. 20.00 (%)

-- ── Promotion badges ─────────────────────────────────────────────────────────
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS is_new        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sale       boolean NOT NULL DEFAULT false;

-- ── Indexes for badge queries ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS product_is_new_idx        ON "Product" (is_new)        WHERE is_new = true;
CREATE INDEX IF NOT EXISTS product_is_bestseller_idx ON "Product" (is_bestseller) WHERE is_bestseller = true;
CREATE INDEX IF NOT EXISTS product_is_sale_idx       ON "Product" (is_sale)       WHERE is_sale = true;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Product'
  AND column_name IN ('rating_avg','rating_count','discount_percent','is_new','is_bestseller','is_sale')
ORDER BY column_name;
