import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'product' | 'image' | 'button';
  width?: string | number;
  height?: string | number;
  aspectRatio?: number;
  className?: string;
  count?: number;
  style?: React.CSSProperties;
}

/**
 * Base Skeleton — zero CLS via aspect-ratio, no motion lib dependency.
 * Pure CSS shimmer keeps bundle light and respects prefers-reduced-motion.
 */
export function Skeleton({
  variant = 'text',
  width = '100%',
  height = 'auto',
  aspectRatio,
  className = '',
  count = 1,
}: SkeletonProps) {
  const cls = [styles.skeleton, styles[variant], className].filter(Boolean).join(' ');

  const style: React.CSSProperties = {
    width:       typeof width  === 'number' ? `${width}px`  : width,
    height:      typeof height === 'number' ? `${height}px` : height,
    aspectRatio: aspectRatio ? String(aspectRatio) : undefined,
  };

  if (count > 1) {
    return (
      <div className={styles.skeletonList}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cls} style={style} />
        ))}
      </div>
    );
  }

  return <div className={cls} style={style} />;
}

/** Product card placeholder — standard 3:4 image ratio */
export function ProductCardSkeleton() {
  return (
    <div className={styles.productCardSkeleton}>
      <Skeleton variant="image" aspectRatio={3 / 4} />
      <div className={styles.productInfo}>
        <Skeleton variant="text" height={16} width="90%" />
        <Skeleton variant="text" height={13} width="65%" />
        <Skeleton variant="text" height={20} width="45%" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

/** Enhanced product grid skeleton with responsive layout */
export function ProductGridSkeleton({ 
  count = 24, 
  showHeader = true,
  showFilters = true 
}: { 
  count?: number; 
  showHeader?: boolean;
  showFilters?: boolean;
}) {
  return (
    <div className={styles.pageLayoutSkeleton}>
      {showHeader && <HeaderSkeleton />}
      
      <div className={styles.pageContent}>
        {showFilters && (
          <div className={styles.sidebar}>
            <div className={styles.filterSection}>
              <Skeleton variant="text" height={20} width="60%" />
              <div style={{ marginTop: '12px' }}>
                <ListItemSkeleton count={8} />
              </div>
            </div>
            
            <div className={styles.filterSection}>
              <Skeleton variant="text" height={20} width="50%" />
              <div style={{ marginTop: '12px' }}>
                <Skeleton variant="text" height={32} width="100%" className={styles.roundedSkeleton} />
                <Skeleton variant="text" height={32} width="100%" className={`${styles.roundedSkeleton} ${styles.marginTop}`} />
                <Skeleton variant="text" height={32} width="100%" className={`${styles.roundedSkeleton} ${styles.marginTop}`} />
              </div>
            </div>
          </div>
        )}
        
        <div className={styles.mainContent}>
          <div className={styles.productGridHeader}>
            <Skeleton variant="text" height={28} width="40%" />
            <Skeleton variant="text" height={32} width="120px" className={styles.roundedSkeleton} />
          </div>
          
          <div className={styles.productGrid}>
            {Array.from({ length: count }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Category card placeholder */
export function CategoryCardSkeleton() {
  return (
    <div className={styles.categoryCardSkeleton}>
      <Skeleton variant="image" aspectRatio={1} />
      <div style={{ padding: '0 10px' }}>
        <Skeleton variant="text" height={15} />
      </div>
    </div>
  );
}


/** Cart line-item skeleton */
export function CartItemSkeleton() {
  return (
    <div className={styles.cartItemSkeleton}>
      <Skeleton variant="image" width={80} height={80} aspectRatio={1} />
      <div className={styles.cartItemInfo}>
        <Skeleton variant="text" height={18} width="60%" />
        <Skeleton variant="text" height={14} width="40%" />
        <Skeleton variant="text" height={22} width="30%" />
      </div>
    </div>
  );
}

/** Topbar / header skeleton */
export function HeaderSkeleton() {
  return (
    <div className={styles.headerSkeleton}>
      <Skeleton variant="circle" width={36} height={36} />
      <Skeleton variant="text" height={18} width="18%" />
      <div style={{ display: 'flex', gap: '10px' }}>
        <Skeleton variant="circle" width={36} height={36} />
        <Skeleton variant="circle" width={36} height={36} />
      </div>
    </div>
  );
}

/** Search bar skeleton */
export function SearchBarSkeleton() {
  return (
    <div className={styles.searchBarSkeleton}>
      <Skeleton variant="text" height={38} width="100%" style={{ borderRadius: '9px' }} />
    </div>
  );
}

/** Sidebar list of items */
export function ListItemSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.listSkeleton}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.listItem}>
          <Skeleton variant="text" height={15} width={`${70 + (i % 3) * 10}%`} />
        </div>
      ))}
    </div>
  );
}

/** Full page layout skeleton — header + sidebar + grid */
export function PageLayoutSkeleton() {
  return (
    <ProductGridSkeleton count={24} showHeader={true} showFilters={true} />
  );
}

/** Search results skeleton */
export function SearchResultsSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className={styles.searchResultsSkeleton}>
      <div className={styles.searchHeader}>
        <Skeleton variant="text" height={32} width="60%" />
        <Skeleton variant="text" height={16} width="30%" />
      </div>
      
      <div className={styles.productGrid}>
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Category page skeleton */
export function CategoryPageSkeleton({ productCount = 18 }: { productCount?: number }) {
  return (
    <div className={styles.categoryPageSkeleton}>
      <div className={styles.categoryHeader}>
        <Skeleton variant="circle" width={64} height={64} />
        <div className={styles.categoryInfo}>
          <Skeleton variant="text" height={32} width="40%" />
          <Skeleton variant="text" height={16} width="60%" />
          <Skeleton variant="text" height={14} width="30%" />
        </div>
      </div>
      
      <div className={styles.productGrid}>
        {Array.from({ length: productCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}