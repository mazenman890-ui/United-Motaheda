-- OPTIMIZED DATABASE INDEXES FOR HIGH-PERFORMANCE PRODUCT CATALOG
-- 
-- These indexes ensure sub-3 second query performance for the optimized catalog
-- Run these SQL commands in your Supabase SQL editor to create the indexes

-- Primary product search index (covers most common queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_main 
ON products (in_stock DESC, stock DESC, name ASC) 
WHERE deleted_at IS NULL;

-- Category-specific product index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_by_category 
ON products (category_id, in_stock DESC, stock DESC, name ASC) 
WHERE deleted_at IS NULL;

-- Price-based sorting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_asc 
ON products (price ASC, in_stock DESC, name ASC) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price_desc 
ON products (price DESC, in_stock DESC, name ASC) 
WHERE deleted_at IS NULL;

-- Full-text search indexes for product names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_search 
ON products USING gin(to_tsvector('simple', name)) 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_ar_search 
ON products USING gin(to_tsvector('simple', COALESCE(name_ar, name))) 
WHERE deleted_at IS NULL;

-- Product code and barcode search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_code 
ON products (code) 
WHERE deleted_at IS NULL AND code IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_barcode 
ON products (barcode) 
WHERE deleted_at IS NULL AND barcode IS NOT NULL;

-- Composite index for search with filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_with_filters 
ON products (category_id, in_stock DESC, price, name ASC) 
WHERE deleted_at IS NULL;

-- Stock status index for "in stock" filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_in_stock 
ON products (in_stock, stock DESC) 
WHERE deleted_at IS NULL;

-- Category indexes for fast category lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name 
ON categories (name ASC, name_en ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_product_count 
ON categories (product_count DESC, in_stock_count DESC);

-- Partial index for products with images (often used in featured sections)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_with_images 
ON products (in_stock DESC, created_at DESC) 
WHERE deleted_at IS NULL AND image_url IS NOT NULL;

-- Low stock alert index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_low_stock 
ON products (stock ASC, category_id) 
WHERE deleted_at IS NULL AND stock > 0 AND stock < 10;

-- Recently updated products index (for cache invalidation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_updated_at 
ON products (updated_at DESC) 
WHERE deleted_at IS NULL;

-- Enable parallel query execution for large scans
ALTER TABLE products SET (parallel_workers = 4);
ALTER TABLE categories SET (parallel_workers = 2);

-- Update table statistics for better query planning
ANALYZE products;
ANALYZE categories;

-- Create a materialized view for category counts (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_category_stats AS
SELECT 
    c.id,
    c.name,
    c.name_en,
    COUNT(p.id) as total_products,
    COUNT(CASE WHEN p.in_stock = true AND p.stock > 0 THEN 1 END) as in_stock_products,
    MIN(p.price) as min_price,
    MAX(p.price) as max_price,
    AVG(p.price) as avg_price
FROM categories c
LEFT JOIN products p ON c.id = p.category_id AND p.deleted_at IS NULL
GROUP BY c.id, c.name, c.name_en;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_category_stats_id 
ON mv_category_stats (id);

-- Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_category_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_stats;
END;
$$ LANGUAGE plpgsql;

-- Set up automatic refresh (you can call this function periodically)
-- This would typically be called from a cron job or database trigger

-- Performance monitoring query (run this to check index usage)
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('products', 'categories')
ORDER BY idx_scan DESC;
*/

-- Query performance analysis (run this to check slow queries)
/*
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%products%' 
ORDER BY total_time DESC 
LIMIT 10;
*/
