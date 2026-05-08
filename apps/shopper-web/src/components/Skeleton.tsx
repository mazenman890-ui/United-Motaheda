import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'product' | 'image' | 'button';
  width?: string | number;
  height?: string | number;
  aspectRatio?: number;
  className?: string;
  count?: number;
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

/** Responsive product grid of skeletons */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.productGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
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
    <div className={styles.pageLayoutSkeleton}>
      <HeaderSkeleton />
      <SearchBarSkeleton />
      <div className={styles.pageContent}>
        <div className={styles.sidebar}>
          <ListItemSkeleton count={8} />
        </div>
        <div className={styles.mainContent}>
          <ProductGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}