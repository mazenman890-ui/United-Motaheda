import { motion } from 'framer-motion';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle' | 'product' | 'image' | 'button';
  width?: string | number;
  height?: string | number;
  aspectRatio?: number; // width / height ratio
  className?: string;
  count?: number; // For lists
}

/**
 * Skeleton component with aspect-ratio support
 * Prevents Cumulative Layout Shift (CLS) by maintaining exact dimensions
 */
export function Skeleton({
  variant = 'text',
  width = '100%',
  height = 'auto',
  aspectRatio,
  className,
  count = 1,
}: SkeletonProps) {
  const skeletonClass = `${styles.skeleton} ${styles[variant]} ${className || ''}`;

  const pulseAnimation = {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
  };

  if (count > 1) {
    return (
      <div className={styles.skeletonList}>
        {Array.from({ length: count }).map((_, i) => (
          <motion.div key={i} animate={pulseAnimation} className={skeletonClass} style={style} />
        ))}
      </div>
    );
  }

  return <motion.div animate={pulseAnimation} className={skeletonClass} style={style} />;
}

/**
 * Product Card Skeleton - prevents CLS for product grid
 * Uses standard product card dimensions
 */
export function ProductCardSkeleton() {
  return (
    <div className={styles.productCardSkeleton}>
      {/* Image with 3:4 aspect ratio (standard product image) */}
      <Skeleton variant="image" aspectRatio={3 / 4} />

      {/* Product Info */}
      <div className={styles.productInfo}>
        <Skeleton variant="text" height={20} />
        <Skeleton variant="text" height={16} width="80%" />
        <Skeleton variant="text" height={24} width="60%" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

/**
 * Category Card Skeleton
 */
export function CategoryCardSkeleton() {
  return (
    <div className={styles.categoryCardSkeleton}>
      <Skeleton variant="image" aspectRatio={1} />
      <Skeleton variant="text" height={18} />
    </div>
  );
}

/**
 * Product Grid Skeleton - multiple product cards
 */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.productGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Cart Item Skeleton
 */
export function CartItemSkeleton() {
  return (
    <div className={styles.cartItemSkeleton}>
      <Skeleton variant="image" width={80} height={80} aspectRatio={1} />
      <div className={styles.cartItemInfo}>
        <Skeleton variant="text" height={20} width="60%" />
        <Skeleton variant="text" height={16} width="40%" />
        <Skeleton variant="text" height={24} width="30%" />
      </div>
    </div>
  );
}

/**
 * Header Skeleton
 */
export function HeaderSkeleton() {
  return (
    <div className={styles.headerSkeleton}>
      <Skeleton variant="circle" width={40} height={40} />
      <Skeleton variant="text" height={20} width="20%" />
      <Skeleton variant="circle" width={40} height={40} />
    </div>
  );
}

/**
 * Search Bar Skeleton
 */
export function SearchBarSkeleton() {
  return (
    <div className={styles.searchBarSkeleton}>
      <Skeleton variant="text" height={40} width="100%" />
    </div>
  );
}

/**
 * List Item Skeleton - for categorized lists
 */
export function ListItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={styles.listSkeleton}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.listItem}>
          <Skeleton variant="text" height={18} width="100%" />
        </div>
      ))}
    </div>
  );
}

/**
 * Page Layout Skeleton - full page placeholder
 */
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
