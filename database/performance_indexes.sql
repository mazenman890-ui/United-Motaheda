-- PERFORMANCE OPTIMIZATION INDEXES FOR UNITED PHARMACY
-- 
-- Run these SQL commands in your Supabase SQL editor to achieve sub-3 second load times
-- These indexes are critical for the optimized product catalog performance

-- ==========================================
-- PRODUCTS TABLE INDEXES
-- ==========================================

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

-- Pagination optimization index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_pagination 
ON products (created_at DESC, id) 
WHERE deleted_at IS NULL;

-- Partial index for products with images
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_with_images 
ON products (in_stock DESC, created_at DESC) 
WHERE deleted_at IS NULL AND image_url IS NOT NULL;

-- Low stock alert index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_low_stock 
ON products (stock ASC, category_id) 
WHERE deleted_at IS NULL AND stock > 0 AND stock < 10;

-- ==========================================
-- CATEGORIES TABLE INDEXES
-- ==========================================

-- Category name search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name 
ON categories (name ASC, name_en ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name_ar 
ON categories USING gin(to_tsvector('simple', name_ar));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name_en 
ON categories USING gin(to_tsvector('simple', name_en));

-- Category sorting indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_product_count 
ON categories (product_count DESC, in_stock_count DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_sort_order 
ON categories (sort_order ASC, name ASC);

-- ==========================================
-- ORDERS TABLE INDEXES
-- ==========================================

-- Order status and date indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_date 
ON orders (status DESC, created_at DESC) 
WHERE deleted_at IS NULL;

-- Customer order lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_phone 
ON orders (customer_phone, created_at DESC) 
WHERE deleted_at IS NULL;

-- Order tracking index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_qr_token 
ON orders (qr_token) 
WHERE deleted_at IS NULL AND qr_token IS NOT NULL;

-- Driver order assignment
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_driver_status 
ON orders (driver_id, status, created_at DESC) 
WHERE deleted_at IS NULL;

-- ==========================================
-- ORDER ITEMS TABLE INDEXES
-- ==========================================

-- Order items lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id 
ON order_items (order_id);

-- Product sales analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id 
ON order_items (product_id, created_at DESC);

-- ==========================================
-- OPTIMIZATION SETTINGS
-- ==========================================

-- Enable parallel query execution for large scans
ALTER TABLE products SET (parallel_workers = 4);
ALTER TABLE categories SET (parallel_workers = 2);
ALTER TABLE orders SET (parallel_workers = 2);

-- Update table statistics for better query planning
ANALYZE products;
ANALYZE categories;
ANALYZE orders;
ANALYZE order_items;

-- ==========================================
-- PERFORMANCE MONITORING VIEWS
-- ==========================================

-- Create a view for monitoring slow queries
CREATE OR REPLACE VIEW slow_product_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%products%' 
ORDER BY mean_time DESC;

-- Create a view for index usage monitoring
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_stat_user_indexes 
WHERE tablename IN ('products', 'categories', 'orders', 'order_items')
ORDER BY idx_scan DESC;

-- ==========================================
-- MAINTENANCE FUNCTIONS
-- ==========================================

-- Function to update product statistics
CREATE OR REPLACE FUNCTION update_product_stats()
RETURNS void AS $$
BEGIN
    -- Update category product counts
    UPDATE categories c 
    SET 
        product_count = sub.count,
        in_stock_count = sub.in_stock_count
    FROM (
        SELECT 
            category_id,
            COUNT(*) as count,
            COUNT(CASE WHEN in_stock = true AND stock > 0 THEN 1 END) as in_stock_count
        FROM products 
        WHERE deleted_at IS NULL
        GROUP BY category_id
    ) sub 
    WHERE c.id = sub.category_id;
    
    -- Analyze tables for updated statistics
    ANALYZE categories;
    ANALYZE products;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old data (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Archive orders older than 2 years (implement as needed)
    -- DELETE FROM orders WHERE created_at < NOW() - INTERVAL '2 years';
    
    -- Update statistics
    ANALYZE orders;
    ANALYZE order_items;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PERFORMANCE TIPS
-- ==========================================

/*
PERFORMANCE OPTIMIZATION CHECKLIST:

✅ Run these indexes in Supabase SQL editor
✅ Monitor query performance with the views above
✅ Call update_product_stats() after inventory changes
✅ Use EXPLAIN ANALYZE on slow queries
✅ Monitor cache hit rates in application

EXPECTED PERFORMANCE IMPROVEMENTS:
- Initial page load: 30+ seconds → < 3 seconds
- Search response: 5-10 seconds → < 500ms  
- Category filtering: 10+ seconds → < 200ms
- Overall user experience: Poor → Excellent

TROUBLESHOOTING:
- If still slow, check: SELECT * FROM index_usage_stats;
- For specific slow queries: SELECT * FROM slow_product_queries;
- Verify indexes are being used: EXPLAIN ANALYZE your_query;

REMEMBER: These indexes are essential for the optimized catalog performance!
*/
