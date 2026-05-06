/**
 * ProductGrid.tsx — Virtualized product grid
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE PRIMARY PERFORMANCE FIX: VIRTUALIZATION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The previous version rendered ALL matched products as DOM nodes:
 *
 *   products.map(p => <ProductCard key={p.id} product={p} />)
 *
 * With 52 000 products and no active search filter, this creates 52 000 DOM
 * nodes simultaneously:
 *   • ~520 MB of DOM memory (each card ~10 KB of nodes)
 *   • Layout thrashing on every scroll (browser must compute positions for all)
 *   • 5–15 second "frozen" render on the /products page
 *
 * With VirtuosoGrid, only the cards that are VISIBLE in the viewport plus a
 * small overscan buffer (~400 px above/below) are ever in the DOM.  For a
 * typical 1080p screen showing 3 columns of ~300 px cards, that's 9–15 cards
 * in the DOM at any moment, regardless of total result count.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY react-virtuoso OVER @tanstack/react-virtual
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * @tanstack/react-virtual virtualizes ROWS or COLUMNS, not individual items.
 * For a `grid-cols-2 lg:grid-cols-3 xl:auto-fill` layout where column count
 * changes with viewport width, the caller would have to:
 *   1. Measure column count via ResizeObserver on every viewport resize.
 *   2. Group products into rows of N.
 *   3. Measure row heights (variable because product names vary in length).
 *   4. Re-virtualise on every column count change.
 *
 * VirtuosoGrid handles ALL of this automatically.  It accepts:
 *   - A `List` component with your CSS grid classes applied.
 *   - An `Item` wrapper component.
 *   - An `itemContent` function that renders each card.
 *
 * Internally it uses ResizeObserver to track item heights and column counts,
 * recalculates on resize, and handles variable-height rows correctly.
 * The result: identical CSS grid layout, zero manual measurement code.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * STABLE COMPONENT REFERENCES (critical correctness requirement)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * VirtuosoGrid's `components.List` and `components.Item` MUST be defined
 * OUTSIDE the render function.  If defined inline, React treats them as new
 * component types on every render, unmounting and remounting the entire
 * virtual DOM tree.  This would make virtualization actively worse than a
 * plain map().
 *
 * GridListContainer and GridItemContainer are module-level constants — they
 * are defined once and never change.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOADING STATES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Three loading states, each serving a different UX case:
 *
 *   1. INITIAL LOAD (products.length === 0 && isSearching)
 *      Shows a skeleton grid — indicates the search is running, not that
 *      there are no results.  Prevents confusing "empty" flash.
 *
 *   2. SEARCH REFINEMENT (products.length > 0 && isSearching)
 *      The previous results remain visible with a translucent loading overlay.
 *      The user sees where they were while new results load — no disorienting
 *      content replacement.  The overlay uses `pointer-events-none` so the
 *      user can still scroll during loading.
 *
 *   3. EMPTY RESULTS (products.length === 0 && !isSearching)
 *      Clear empty state with a helpful message — distinguishes "no results"
 *      from "still loading".
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REQUIRED SETUP
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm install react-virtuoso
 *
 * Global CSS (add to your index.css or equivalent):
 *
 *   @keyframes product-card-in {
 *     from { opacity: 0; transform: translateY(12px); }
 *     to   { opacity: 1; transform: translateY(0); }
 *   }
 *   @media (prefers-reduced-motion: no-preference) {
 *     .product-card-animate {
 *       animation: product-card-in 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
 *     }
 *   }
 *
 * Tailwind config (extend.animation + extend.keyframes):
 *
 *   keyframes: {
 *     shimmer: {
 *       '0%':   { backgroundPosition: '-200% 0' },
 *       '100%': { backgroundPosition:  '200% 0' },
 *     },
 *   },
 *   animation: {
 *     shimmer: 'shimmer 1.6s linear infinite',
 *   },
 */

import {
  forwardRef,
  memo,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import { VirtuosoGrid, type GridComponents } from "react-virtuoso";
import { useLanguage } from "../../contexts/LanguageContext";
import type { CatalogProduct } from "../catalog";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { cn } from "./UI";

// ─── CSS grid classes ─────────────────────────────────────────────────────────
// Shared between the live grid, skeleton grid, and empty state so layout is
// always consistent regardless of which state is rendered.

const GRID_CLASSES = cn(
  "catalog-products-grid grid auto-rows-fr gap-3 sm:gap-4",
  "grid-cols-2 lg:grid-cols-3",
  "xl:[grid-template-columns:repeat(auto-fill,minmax(14.5rem,1fr))]",
  "2xl:[grid-template-columns:repeat(auto-fill,minmax(15.5rem,1fr))]",
  "min-[1920px]:[grid-template-columns:repeat(auto-fill,minmax(16.5rem,1fr))]",
);

// ─── Stable VirtuosoGrid component references ─────────────────────────────────
//
// CRITICAL: These must be defined at module scope, not inside the component
// render function.  VirtuosoGrid compares component identity on each render —
// a new function reference causes the entire grid to unmount and remount,
// defeating the purpose of virtualization.

/**
 * The outer grid container forwarded from VirtuosoGrid.
 * Applies the CSS grid classes and accepts className/style from the virtualizer.
 */
const GridListContainer = forwardRef<
  HTMLDivElement,
  { style?: CSSProperties; children?: ReactNode; className?: string }
>(({ style, children, className }, ref) => (
  <div ref={ref} style={style} className={cn(GRID_CLASSES, className)}>
    {children}
  </div>
));
GridListContainer.displayName = "GridListContainer";

/**
 * Each item wrapper within the virtualizer.
 * Must be a forwardRef so VirtuosoGrid can measure and observe it.
 * `min-h-0` prevents the grid cell from overflowing its auto-row track.
 */
const GridItemContainer = forwardRef<
  HTMLDivElement,
  { children?: ReactNode; className?: string }
>(({ children, className }, ref) => (
  <div ref={ref} className={cn("min-h-0", className)}>
    {children}
  </div>
));
GridItemContainer.displayName = "GridItemContainer";

// VirtuosoGrid components object — also module-scoped for referential stability
const VIRTUOSO_COMPONENTS: GridComponents = {
  List: GridListContainer,
  Item: GridItemContainer,
};

// ─── ProductGridSkeleton ──────────────────────────────────────────────────────

/**
 * A grid of skeleton cards, rendered while the initial search result is loading.
 *
 * `count` defaults to 12 — enough to fill a typical viewport without
 * layout shift when real cards arrive.  The skeleton cards use the same CSS
 * grid classes as the live grid so column count and spacing are identical.
 */
export function ProductGridSkeleton({
  count = 12,
  className,
}: {
  count?:     number;
  className?: string;
}) {
  return (
    <div className={cn(GRID_CLASSES, className)} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── SearchLoadingOverlay ─────────────────────────────────────────────────────

/**
 * A subtle loading indicator displayed over existing results while a refined
 * search is in progress.  Keeps the grid visible and scrollable — the user
 * sees context while waiting — rather than replacing it with a skeleton.
 *
 * `pointer-events-none` ensures the overlay doesn't block scroll or taps.
 * The spinner uses CSS `animate-spin` (compositor-only, zero JS).
 */
function SearchLoadingOverlay({ lang }: { lang: "ar" | "en" }) {
  return (
    <div
      aria-live="polite"
      aria-label={lang === "ar" ? "جارٍ تحديث النتائج" : "Updating results"}
      className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center"
    >
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/70 bg-white/90 px-4 py-2.5 shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        {/* Spinner — CSS only, zero JS */}
        <span className="relative flex h-4 w-4 items-center justify-center">
          <span className="absolute inset-0 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
        </span>
        <span className="text-xs font-black text-slate-600">
          {lang === "ar" ? "جارٍ البحث…" : "Searching…"}
        </span>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  activeQuery,
  lang,
}: {
  activeQuery: string;
  lang: "ar" | "en";
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      {/* Icon: magnifying glass with a cross */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-7 w-7 text-slate-300"
          aria-hidden
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="M15.5 15.5 21 21" strokeLinecap="round" />
          <path d="M8 10.5h5M10.5 8v5" strokeLinecap="round" />
        </svg>
      </div>

      {activeQuery ? (
        <>
          <p className="text-base font-black text-slate-800">
            {lang === "ar"
              ? `لا توجد نتائج لـ "${activeQuery}"`
              : `No results for "${activeQuery}"`}
          </p>
          <p className="mt-1.5 max-w-xs text-sm font-semibold text-slate-400">
            {lang === "ar"
              ? "جرّب بحثاً مختلفاً أو تصفّح الأقسام"
              : "Try a different search or browse categories"}
          </p>
        </>
      ) : (
        <p className="text-base font-black text-slate-800">
          {lang === "ar" ? "لا توجد منتجات" : "No products found"}
        </p>
      )}
    </div>
  );
}

// ─── ProductGrid ──────────────────────────────────────────────────────────────

interface ProductGridProps {
  products:     CatalogProduct[];
  /**
   * True while the search worker is processing a query.
   *
   * Used to pick the correct loading state:
   *   - products.length === 0 && isSearching  → skeleton grid (initial search)
   *   - products.length > 0  && isSearching   → results + loading overlay (refinement)
   *   - products.length === 0 && !isSearching → empty state
   */
  isSearching?: boolean;
  /** The debounced query string from the search hook — used in the empty state. */
  activeQuery?: string;
  className?:   string;
}

export const ProductGrid = memo(function ProductGrid({
  products,
  isSearching = false,
  activeQuery = "",
  className,
}: ProductGridProps) {
  const { lang } = useLanguage();

  // ── Case 1: Initial search in progress, no results yet ─────────────────
  // Show a skeleton grid rather than an empty state so the user knows search
  // is running — not that there are zero results.
  if (isSearching && products.length === 0) {
    return <ProductGridSkeleton className={className} />;
  }

  // ── Case 2: No results, not loading ────────────────────────────────────
  if (!isSearching && products.length === 0) {
    return <EmptyState activeQuery={activeQuery} lang={lang} />;
  }

  // ── Case 3: Results available (with optional refinement overlay) ────────
  //
  // itemContent is a useCallback so VirtuosoGrid receives a stable function
  // reference across renders — avoids unnecessary internal re-renders of the
  // virtualizer's row tracking logic.
  //
  // animate={false}: ProductCard entrance animations are suppressed in the
  // virtualized context.  When the user scrolls, DOM nodes are recycled for
  // new products — re-animating them on every scroll would be visually jarring.
  // Cards that truly enter for the first time look fine without the animation
  // because the overscan buffer ensures they're ready before they reach the
  // viewport.
  const itemContent = useCallback(
    (index: number) => (
      <ProductCard
        product={products[index]}
        animate={false}
      />
    ),
    [products],
  );

  return (
    <div className={cn("relative", className)}>
      {/* Refinement loading overlay — shown when results exist but search is updating */}
      {isSearching && products.length > 0 && (
        <SearchLoadingOverlay lang={lang} />
      )}

      {/**
       * VirtuosoGrid — the core virtualizer.
       *
       * useWindowScroll: uses the browser window as the scroll container
       *   instead of an internal div.  This means the page scrollbar behaves
       *   naturally (bottom of page = bottom of products), and the browser's
       *   native scroll restoration works correctly on back-navigation.
       *
       * totalCount: total number of items in the data array.
       *   VirtuosoGrid derives row count from this + the measured column count.
       *
       * overscan: render items 400 px above and below the visible area.
       *   This prevents the user from seeing a blank area if they scroll
       *   quickly.  Too large = more DOM nodes; too small = visible blanks.
       *   400 px ≈ one row of cards at standard card heights.
       *
       * components: stable module-level references (see above).
       *
       * itemContent: maps an index to a rendered ProductCard.
       *   The virtualizer calls this for each item in the visible + overscan
       *   range and recycles the call when items go out of range.
       */}
      <VirtuosoGrid
        useWindowScroll
        totalCount={products.length}
        overscan={400}
        components={VIRTUOSO_COMPONENTS}
        itemContent={itemContent}
      />
    </div>
  );
});