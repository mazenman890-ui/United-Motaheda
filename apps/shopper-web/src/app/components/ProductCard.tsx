/**
 * ProductCard.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERFORMANCE FIXES IN THIS VERSION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * FIX 1 — Remove motion.article entrance animation on every card
 *   `initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}` runs a
 *   JS-driven WAAPI animation for every ProductCard that enters the DOM.
 *   With virtualization, cards enter the DOM every time the user scrolls —
 *   meaning every scroll event triggers N entrance animations simultaneously,
 *   causing a visual "flash" and competing with scroll compositing.
 *
 *   Fix: replaced with a single CSS keyframe `@keyframes product-card-in`
 *   (defined in global CSS / Tailwind safelist).  CSS animations are handed
 *   to the browser's compositor thread with zero JS involvement and respect
 *   `prefers-reduced-motion` automatically when wrapped in that media query.
 *
 *   The `animate` prop (default true) lets ProductGrid pass `animate={false}`
 *   to suppress the entrance animation entirely for virtualized contexts where
 *   recycled DOM nodes re-entering the viewport should not re-animate.
 *
 * FIX 2 — Remove isHovered / onHoverStart / onHoverEnd for Quick-view overlay
 *   Tracking hover state in React means every mouseenter/mouseleave fires a
 *   setState, triggering a full React re-render of the card subtree.  With
 *   36 cards in the viewport, rapid mousing produces 36× concurrent re-renders.
 *
 *   Fix: the Quick-view overlay now uses pure CSS with Tailwind's `group` /
 *   `group-hover:` utilities.  The card already carried `group` on its root
 *   element for the image scale effect — we extend the same pattern.
 *   Zero JS involved; the compositor handles the opacity transition.
 *
 * FIX 3 — Remove AnimatePresence from Quick-view overlay
 *   The Quick-view overlay used `<AnimatePresence>` driven by the `isHovered`
 *   boolean.  With the hover state removed, AnimatePresence is no longer
 *   needed for this element.  The `AnimatePresence` on the cart button is
 *   kept — it's per-interaction (one event at a time), not per-render.
 *
 * FIX 4 — layout prop was already removed in the previous version (preserved)
 * FIX 5 — StockBar CSS transition was already correct (preserved)
 * FIX 6 — animate-pulse replaces infinite JS opacity loop (preserved)
 *
 * NEW — ProductCardSkeleton export
 *   A skeleton placeholder with the same visual footprint as a real card.
 *   Used by ProductGrid during search-in-progress states.
 *   Pure CSS shimmer — no JS animation frame involved.
 */

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Eye, Package, ShoppingBag, Zap } from "lucide-react";
import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  formatStockQuantity,
  getCatalogProductImage,
  getProductAvailabilityLabel,
  type CatalogProduct,
} from "../catalog";
import { getLocalizedProductName } from "../localization";
import { FavoriteHeartButton } from "./FavoriteHeartButton";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { cn } from "./UI";

// ─── StockBar ────────────────────────────────────────────────────────────────
// CSS width + transition (not JS-driven motion.div). Preserved from prior fix.

function StockBar({ stock, inStock }: { stock: number; inStock: boolean }) {
  if (!inStock) {
    return (
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-100">
        <div className="h-full w-full rounded-full bg-rose-300/80" />
      </div>
    );
  }

  const pct  = Math.min(100, Math.max(8, (stock / 40) * 100));
  const tone =
    stock <= 3  ? "bg-amber-400" :
    stock <= 10 ? "bg-teal-400"  :
                  "bg-emerald-400";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

function ProductBadge({
  tone,
  children,
  className,
}: {
  tone: "neutral" | "stock" | "danger" | "sale" | "new";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-[9px] font-black backdrop-blur-md transition-all duration-300",
        tone === "neutral" && "border-white/70 bg-white/85 text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
        tone === "stock"   && "border-emerald-200/70 bg-emerald-50/90 text-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.10)]",
        tone === "danger"  && "border-rose-200/70 bg-rose-50/90 text-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.10)]",
        tone === "sale"    && "border-amber-200/70 bg-amber-50/90 text-amber-700",
        tone === "new"     && "border-cyan-200/70 bg-cyan-50/90 text-cyan-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── useAddedFeedback ────────────────────────────────────────────────────────

function useAddedFeedback() {
  const [isAdded, setIsAdded] = useState(false);
  const resetRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (resetRef.current !== null) window.clearTimeout(resetRef.current); };
  }, []);

  const trigger = () => {
    setIsAdded(true);
    if (resetRef.current !== null) window.clearTimeout(resetRef.current);
    resetRef.current = window.setTimeout(() => {
      setIsAdded(false);
      resetRef.current = null;
    }, 1600);
  };

  return { isAdded, trigger };
}

// ─── ProductCardSkeleton ─────────────────────────────────────────────────────

/**
 * A shimmer placeholder that exactly matches the visual footprint of a real
 * ProductCard.  Displayed by ProductGrid while search results are loading.
 *
 * WHY CSS shimmer instead of a JS-animated pulse:
 * `animate-pulse` uses a CSS @keyframes that the compositor handles natively.
 * There is zero JS frame budget consumed, so 12 simultaneous skeletons cost
 * the same as one.  The shimmer gradient (`animate-shimmer`) requires one
 * custom Tailwind keyframe — add this to tailwind.config.js:
 *
 *   keyframes: {
 *     shimmer: {
 *       '0%':   { backgroundPosition: '-200% 0' },
 *       '100%': { backgroundPosition: '200% 0' },
 *     }
 *   },
 *   animation: {
 *     shimmer: 'shimmer 1.6s linear infinite',
 *   }
 *
 * Falls back gracefully to a solid `bg-slate-100` if the keyframe isn't
 * registered — visually identical at rest.
 */
export function ProductCardSkeleton({ className }: { className?: string }) {
  const shimmer = [
    "relative overflow-hidden",
    "before:absolute before:inset-0",
    "before:bg-[linear-gradient(90deg,transparent_25%,rgba(255,255,255,0.6)_50%,transparent_75%)]",
    "before:bg-[length:200%_100%]",
    "before:animate-shimmer",
  ].join(" ");

  return (
    <div
      aria-hidden
      className={cn(
        "product-card flex h-full min-h-0 flex-col overflow-hidden",
        "rounded-[1.6rem] border border-slate-100 bg-white/90",
        "shadow-[0_2px_12px_rgba(15,23,42,0.04)] ring-1 ring-slate-100",
        className,
      )}
    >
      {/* Image area */}
      <div className={cn("aspect-[1] w-full bg-slate-100", shimmer)} />

      {/* Content area */}
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3.5">
        {/* Title */}
        <div className={cn("h-4 w-4/5 rounded-lg bg-slate-100", shimmer)} />
        <div className={cn("h-3 w-1/2 rounded-lg bg-slate-100", shimmer)} />

        {/* Stock bar block */}
        <div className={cn("mt-1 h-[3.5rem] w-full rounded-xl bg-slate-100", shimmer)} />

        {/* Price + button */}
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className={cn("h-6 w-16 rounded-lg bg-slate-100", shimmer)} />
          <div className={cn("h-10 w-[7.5rem] rounded-xl bg-slate-100", shimmer)} />
        </div>
      </div>
    </div>
  );
}

// ─── ProductCard ─────────────────────────────────────────────────────────────

export const ProductCard = memo(function ProductCard({
  product,
  className,
  style,
  animate = true,
}: {
  product:    CatalogProduct;
  className?: string;
  style?:     CSSProperties;
  /**
   * Set to `false` in virtualized contexts to suppress the entrance animation.
   * When cards are recycled from the pool (DOM node re-used for a different
   * product as the user scrolls), the animation would re-trigger and create a
   * jarring flash.  ProductGrid passes `animate={false}`.
   */
  animate?:   boolean;
}) {
  const { lang, t }          = useLanguage();
  const { addToCart }        = useCart();
  const { isAdded, trigger } = useAddedFeedback();

  // FIX 2: isHovered state completely removed.
  // The Quick-view overlay is now CSS `group-hover:` — zero setState cost.

  const primaryName   = getLocalizedProductName(product, lang);
  const secondaryName =
    lang === "ar"
      ? (product.nameEn ?? product.name ?? "")
      : (product.nameAr ?? product.name ?? "");
  const displayCategoryName =
    lang === "ar" ? product.categoryName : product.categoryNameEn;

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!product.inStock) return;
    await addToCart(product);
    trigger();
  };

  const stockLevel =
    !product.inStock    ? "out"      :
    product.stock <= 3  ? "critical" :
    product.stock <= 10 ? "low"      : "ok";

  return (
    /**
     * FIX 1: motion.article entrance animation removed.
     *
     * Previously:
     *   <motion.article initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
     *
     * Now: a plain <article> with a CSS class `product-card-animate` that maps
     * to the `product-card-in` keyframe (add to your global CSS):
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
     * When `animate` is false (virtualized grid), the class is omitted and
     * cards appear instantly — correct behaviour for DOM-recycled items.
     *
     * The hover (-translate-y-1.5, shadow) is pure CSS Tailwind — no JS.
     */
    <article
      style={{ ...(style || {}), WebkitTapHighlightColor: "transparent" } as CSSProperties}
      className={cn(
        "product-card group relative flex h-full min-h-0 flex-col overflow-hidden",
        "rounded-[1.6rem] border border-white/70 bg-white/90",
        "shadow-[0_2px_12px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/60 backdrop-blur-xl",
        "transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.13)]",
        "cursor-pointer",
        // Entrance animation: only when animate=true (non-virtualized use)
        animate && "product-card-animate",
        className,
      )}
    >
      {/* Gradient sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[1.6rem] bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.09),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.65),transparent_60%)]"
      />

      {/* ── Media ── */}
      {/* aspect-square here gives Virtuoso a stable height before images load,
          eliminating dynamic row-height recalculation on image load. */}
      <div className="product-card__media relative aspect-square flex-shrink-0 overflow-hidden border-b border-white/60">
        <Link
          to={`/products/${product.id}`}
          className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20"
          style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
        >
          <div className="relative aspect-[1] overflow-hidden bg-gradient-to-b from-white/80 to-slate-50/70 p-3">
            {/* Top row: category badge + favorite */}
            <div className="absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
              <ProductBadge tone="neutral" className="max-w-[68%] min-w-0 gap-1">
                <Package className="h-3 w-3 shrink-0 text-teal-400" />
                <span className="truncate">{displayCategoryName}</span>
              </ProductBadge>

              <FavoriteHeartButton
                productId={product.id}
                size="sm"
                className="border-white/70 bg-white/92 shadow-[0_4px_14px_rgba(15,23,42,0.09)] backdrop-blur-md"
              />
            </div>

            {/**
             * FIX 2 + 3: Quick-view overlay converted from JS-state + AnimatePresence
             * to pure CSS group-hover.
             *
             * Before:
             *   <AnimatePresence>
             *     {isHovered && <motion.div initial/animate/exit ...>
             *
             * After: opacity-0 → group-hover:opacity-100 transition.
             *   The `group` class on <article> propagates into any descendant
             *   with `group-hover:*`.  Zero JS; zero setState; zero re-render.
             *
             * The transition-opacity + duration-200 gives the same 180ms feel
             * as the previous framer-motion `duration: 0.18` transition.
             */}
            {product.inStock ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-[1.1rem] bg-black/8 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-lg">
                  <Eye className="h-3.5 w-3.5 text-teal-500" />
                  {lang === "ar" ? "عرض المنتج" : "View product"}
                </span>
              </div>
            ) : null}

            {/* Image */}
            <div className="relative h-full overflow-hidden rounded-[1.1rem] border border-white/70 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <ImageWithFallback
                src={getCatalogProductImage(product)}
                alt={primaryName}
                className="relative h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                loading="lazy"
                decoding="async"
              />
            </div>

            {/* Out-of-stock veil */}
            {!product.inStock && (
              <div className="absolute inset-3 flex items-center justify-center rounded-[1.1rem] bg-white/50 backdrop-blur-[3px]">
                <ProductBadge tone="danger" className="text-[10px]">
                  {lang === "ar" ? "نفد المخزون" : "Out of stock"}
                </ProductBadge>
              </div>
            )}

            {/* FIX 6 (preserved): animate-pulse replaces infinite JS opacity loop */}
            {stockLevel === "critical" && product.inStock && (
              <div className="absolute bottom-3 inset-x-3 z-10 flex justify-center">
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-amber-200 bg-amber-50/95 px-2.5 py-1 text-[9px] font-black text-amber-700 shadow-sm backdrop-blur-md">
                  <Zap className="h-3 w-3" />
                  {lang === "ar" ? "كمية محدودة" : "Limited qty"}
                </span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Content ── */}
      <div className="product-card__body relative flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <Link
          to={`/products/${product.id}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20 focus-visible:rounded-lg"
          style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
        >
          <h3 className="line-clamp-2 text-[0.9rem] font-black leading-snug text-slate-950 transition-colors group-hover:text-teal-700">
            {primaryName}
          </h3>
          {secondaryName && secondaryName !== primaryName ? (
            <p className="mt-1 line-clamp-1 text-[0.78rem] font-semibold text-slate-400" dir="auto">
              {secondaryName}
            </p>
          ) : (
            <div className="mt-1 min-h-[1.1rem]" />
          )}
        </Link>

        {/* Stock indicator */}
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-slate-500">
              {getProductAvailabilityLabel(product, lang)}
            </p>
            <span
              className={cn(
                "text-[10px] font-black",
                stockLevel === "critical" ? "text-amber-500" :
                stockLevel === "out"      ? "text-rose-500"  : "text-slate-400",
              )}
            >
              {formatStockQuantity(product.stock)}
            </span>
          </div>
          {/* FIX 5 (preserved): CSS transition replaces JS-driven motion.div */}
          <StockBar stock={product.stock} inStock={product.inStock} />
        </div>

        {/* ── Footer: price + add to cart ── */}
        <div className="product-card__footer mt-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              {lang === "ar" ? "السعر" : "Price"}
            </p>
            <p className="mt-0.5 text-[1.15rem] font-black leading-none tracking-tight text-slate-950">
              {product.price.toFixed(2)}{" "}
              <span className="text-[10px] font-bold text-slate-400">{t("currency")}</span>
            </p>
          </div>

          {/**
           * motion.button with whileTap is kept here.
           * WHY: this is per-interaction (one button pressed at a time), not
           * per-render. The cost is negligible and the tap feedback is valuable UX.
           * AnimatePresence is also kept — it only fires when isAdded toggles
           * (1.6s cycle, not on every render or hover).
           */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className={cn(
              "product-card__action inline-flex h-10 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-xl text-sm font-black transition-all duration-300 ease-out",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20",
              product.inStock
                ? isAdded
                  ? "bg-slate-950 text-white shadow-[0_8px_20px_rgba(15,23,42,0.20)]"
                  : "bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] text-white shadow-[0_8px_22px_rgba(20,184,166,0.24)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(20,184,166,0.30)]"
                : "cursor-not-allowed bg-slate-100 text-slate-400",
            )}
            style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
            aria-label={lang === "ar" ? "إضافة إلى السلة" : "Add to cart"}
          >
            <AnimatePresence mode="wait">
              {isAdded ? (
                <motion.span
                  key="added"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{lang === "ar" ? "تمت الإضافة" : "Added"}</span>
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{t("add_to_cart")}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </article>
  );
});

// ─── ProductCardCompact ───────────────────────────────────────────────────────
// FIX: motion.div entrance animation removed for the same reason as ProductCard.
// Compact cards often appear in suggestion dropdowns where items enter/leave
// frequently — entrance animations would flash on every suggestion update.

export const ProductCardCompact = memo(function ProductCardCompact({
  product,
  animate = true,
}: {
  product:  CatalogProduct;
  animate?: boolean;
}) {
  const { lang, t }          = useLanguage();
  const { addToCart }        = useCart();
  const { isAdded, trigger } = useAddedFeedback();

  const primaryName   = getLocalizedProductName(product, lang);
  const secondaryName =
    lang === "ar"
      ? (product.nameEn ?? product.name ?? "")
      : (product.nameAr ?? product.name ?? "");
  const displayCategoryName =
    lang === "ar" ? product.categoryName : product.categoryNameEn;

  const handleAddToCart = async () => {
    if (!product.inStock) return;
    await addToCart(product);
    trigger();
  };

  return (
    <div
      className={cn(
        "product-card-compact group relative overflow-hidden rounded-2xl border border-white/70 bg-white/88 p-3",
        "shadow-[0_2px_10px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60 backdrop-blur-xl",
        "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg",
        // Entrance animation only for non-virtualized contexts
        animate && "product-card-animate",
      )}
      style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.08),transparent_30%)]" />

      <div className="relative flex items-start gap-3">
        {/* Thumbnail */}
        <Link
          to={`/products/${product.id}`}
          className="relative h-[4.8rem] w-[4.8rem] shrink-0 overflow-hidden rounded-[1rem] border border-white/70 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20"
          style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
        >
          <ImageWithFallback
            src={getCatalogProductImage(product)}
            alt={primaryName}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </Link>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <ProductBadge tone="neutral" className="max-w-[72%] min-w-0 gap-1 px-2 py-0.5">
              <span className="truncate text-[9px]">{displayCategoryName}</span>
            </ProductBadge>
            <FavoriteHeartButton
              productId={product.id}
              size="sm"
              className="border-white/70 bg-white/90 shadow-[0_3px_10px_rgba(15,23,42,0.07)]"
            />
          </div>

          <Link
            to={`/products/${product.id}`}
            className="mt-1.5 block rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20"
            style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
          >
            <p className="line-clamp-1 text-[0.85rem] font-black leading-snug text-slate-950 transition-colors group-hover:text-teal-700">
              {primaryName}
            </p>
          </Link>

          {secondaryName && secondaryName !== primaryName ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-slate-400" dir="auto">
              {secondaryName}
            </p>
          ) : null}

          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950">
                {product.price.toFixed(2)}{" "}
                <span className="text-[10px] font-bold text-slate-400">{t("currency")}</span>
              </p>
              <p className="mt-0.5 line-clamp-1 text-[10px] font-semibold text-slate-500">
                {getProductAvailabilityLabel(product, lang)}
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.93 }}
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={!product.inStock}
              className={cn(
                "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-3 text-xs font-black transition-all duration-300 ease-out",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20",
                product.inStock
                  ? isAdded
                    ? "bg-slate-950 text-white shadow-[0_6px_16px_rgba(15,23,42,0.16)]"
                    : "bg-[linear-gradient(135deg,var(--primary),var(--primary-strong))] text-white shadow-[0_6px_16px_rgba(20,184,166,0.22)] hover:-translate-y-0.5"
                  : "cursor-not-allowed bg-slate-100 text-slate-400",
              )}
              style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
              aria-label={lang === "ar" ? "إضافة إلى السلة" : "Add to cart"}
            >
              {isAdded ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <ShoppingBag className="h-3.5 w-3.5" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
});