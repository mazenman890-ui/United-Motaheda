-- SUPABASE-COMPATIBLE INDEXES (WITHOUT SOFT DELETE FILTERS)
-- 
-- Run these SQL commands in your Supabase SQL editor
-- These indexes work without the deleted_at column

-- ==========================================
-- PRODUCTS TABLE INDEXES
-- ==========================================

-- Primary product search index
CREATE INDEX IF NOT EXISTS idx_products_search_main 
ON products (in_stock DESC, stock DESC, name ASC);

-- Category-specific product index
CREATE INDEX IF NOT EXISTS idx_products_by_category 
ON products (category_id, in_stock DESC, stock DESC, name ASC);

-- Price-based sorting indexes
CREATE INDEX IF NOT EXISTS idx_products_price_asc 
ON products (price ASC, in_stock DESC, name ASC);

CREATE INDEX IF NOT EXISTS idx_products_price_desc 
ON products (price DESC, in_stock DESC, name ASC);

-- Full-text search indexes for product names
CREATE INDEX IF NOT EXISTS idx_products_name_search 
ON products USING gin(to_tsvector('simple', name));

CREATE INDEX IF NOT EXISTS idx_products_name_ar_search 
ON products USING gin(to_tsvector('simple', COALESCE(name_ar, name)));

-- Product code and barcode search indexes
CREATE INDEX IF NOT EXISTS idx_products_code 
ON products (code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_barcode 
ON products (barcode) WHERE barcode IS NOT NULL;

-- Stock status index
CREATE INDEX IF NOT EXISTS idx_products_in_stock 
ON products (in_stock, stock DESC);

-- Pagination optimization index
CREATE INDEX IF NOT EXISTS idx_products_pagination 
ON products (created_at DESC, id);

-- Low stock alert index
CREATE INDEX IF NOT EXISTS idx_products_low_stock 
ON products (stock ASC, category_id) WHERE stock > 0 AND stock < 10;

-- ==========================================
-- CATEGORIES TABLE INDEXES
-- ==========================================

-- Category name search indexes
CREATE INDEX IF NOT EXISTS idx_categories_name 
ON categories (name ASC, name_en ASC);

CREATE INDEX IF NOT EXISTS idx_categories_name_ar 
ON categories USING gin(to_tsvector('simple', name_ar));

-- ==========================================
-- ORDERS TABLE INDEXES
-- ==========================================

-- Order status and date indexes
CREATE INDEX IF NOT EXISTS idx_orders_status_date 
ON orders (status DESC, created_at DESC);

-- Customer order lookup
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone 
ON orders (customer_phone, created_at DESC);

-- ==========================================
-- UPDATE STATISTICS
-- ==========================================

ANALYZE products;
ANALYZE categories;
ANALYZE orders;

/*
NOTES:
- These indexes work without the deleted_at soft-delete column
- If you later add deleted_at, you can add filtered indexes for better performance
- Run ANALYZE after creating indexes for optimal query planning
*/
