/**
 * ProductCard.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PERFORMANCE & VISUAL ARCHITECTURE — v3
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * v3 Changes (on top of v2 fixes):
 *
 * PERF — Remove backdrop-blur from all card elements
 *   backdrop-blur on 24+ cards creates a separate GPU compositing layer per
 *   element. In a product grid this easily exceeds 100 compositing contexts.
 *   On mid-range and mobile GPUs this causes dropped frames and janky scroll.
 *   All bg-*\/opacity + backdrop-blur replaced with solid bg-white / bg-white/70.
 *
 * PERF — Remove radial-gradient sheen overlay
 *   The pointer-events:none sheen div was a full-card paint operation running
 *   on every scroll repaint. Removed entirely — the card border + shadow
 *   create enough visual depth without it.
 *
 * VISUAL — Clean premium white card design
 *   Moving from frosted-glass aesthetic to clean solid-surface cards with
 *   crisp shadows and tight typography. This is the modern ecommerce standard
 *   (matches reference designs). Visually cleaner, loads faster on mobile.
 *
 * All v2 fixes preserved:
 *   FIX 1 — CSS keyframe entrance (no JS-driven motion.article)
 *   FIX 2 — CSS group-hover for quick-view overlay (no hover setState)
 *   FIX 3 — AnimatePresence removed from quick-view (kept for cart button)
 *   FIX 5 — StockBar CSS transition (no JS motion.div)
 *   FIX 6 — animate-pulse for critical stock (no JS opacity loop)
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
} from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  formatStockQuantity,
  getCatalogProductImage,
  getProductAvailabilityLabel,
  getProductImageSrcset,
  type CatalogProduct,
} from "../catalog";
import { getLocalizedProductName } from "../localization";
import { FavoriteHeartButton } from "./FavoriteHeartButton";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { cn } from "./UI";

// ─── StockBar ────────────────────────────────────────────────────────────────

function StockBar({ stock, inStock }: { stock: number; inStock: boolean }) {
  if (!inStock) {
    return (
      <div className="h-1 w-full overflow-hidden rounded-full bg-rose-100">
        <div className="h-full w-full rounded-full bg-rose-300/70" />
      </div>
    );
  }

  const pct  = Math.min(100, Math.max(6, (stock / 40) * 100));
  const tone =
    stock <= 3  ? "bg-amber-400" :
    stock <= 10 ? "bg-teal-400"  :
                  "bg-emerald-400";

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tone)}
        style={{ width: `${pct}%` }}
      />
    </div>
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

export function ProductCardSkeleton({ className }: { className?: string }) {
  const shimmer = [
    "relative overflow-hidden",
    "before:absolute before:inset-0",
    "before:bg-[linear-gradient(90deg,transparent_25%,rgba(255,255,255,0.7)_50%,transparent_75%)]",
    "before:bg-[length:200%_100%]",
    "before:animate-shimmer",
  ].join(" ");

  return (
    <div
      aria-hidden
      className={cn(
        "product-card flex h-full flex-col overflow-hidden",
        "rounded-2xl border border-slate-100 bg-white",
        "shadow-[0_1px_3px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      <div className={cn("aspect-square w-full bg-slate-100", shimmer)} />
      <div className="flex flex-1 flex-col gap-3 p-3.5 pt-3">
        <div className={cn("h-3.5 w-4/5 rounded-md bg-slate-100", shimmer)} />
        <div className={cn("h-3 w-1/2 rounded-md bg-slate-100", shimmer)} />
        <div className={cn("mt-1 h-7 w-full rounded-lg bg-slate-100", shimmer)} />
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className={cn("h-6 w-16 rounded-md bg-slate-100", shimmer)} />
          <div className={cn("h-9 w-28 rounded-xl bg-slate-100", shimmer)} />
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
  animate?:   boolean;
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

  const handleAddToCart = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!product.inStock) return;
    await addToCart(product.id);
    trigger();
  };

  const stockLevel =
    !product.inStock    ? "out"      :
    product.stock <= 3  ? "critical" :
    product.stock <= 10 ? "low"      : "ok";

  return (
    <article
      style={{ ...(style || {}), WebkitTapHighlightColor: "transparent" } as CSSProperties}
      className={cn(
        "product-card group relative flex h-full flex-col overflow-hidden",
        "rounded-2xl border border-slate-100 bg-white",
        "shadow-[0_1px_4px_rgba(15,23,42,0.05)]",
        "transition-all duration-250 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)] hover:border-slate-200",
        "cursor-pointer",
        animate && "product-card-animate",
        className,
      )}
    >
      {/* ── Image area ── */}
      <div className="product-card__media relative flex-shrink-0">
        <Link
          to={`/products/${product.id}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400"
          style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
        >
          <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-slate-50">

            {/* Favorite — top end corner */}
            <div className="absolute end-2 top-2 z-20">
              <FavoriteHeartButton
                productId={product.id}
                size="sm"
                className="border-slate-100 bg-white shadow-sm"
              />
            </div>

            {/* Category chip — top start corner */}
            {displayCategoryName && (
              <div className="absolute start-2 top-2 z-20">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[9px] font-black text-slate-500 shadow-sm border border-slate-100">
                  <Package className="h-2.5 w-2.5 shrink-0 text-teal-400" />
                  <span className="max-w-[72px] truncate">{displayCategoryName}</span>
                </span>
              </div>
            )}

            {/* CSS quick-view overlay — zero setState, pure group-hover */}
            {product.inStock && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-md">
                  <Eye className="h-3.5 w-3.5 text-teal-500" />
                  {lang === "ar" ? "عرض المنتج" : "View product"}
                </span>
              </div>
            )}

            {/* Image — srcset supplies 320/640/960 WebP transforms for Supabase
                storage URLs; SVG placeholder falls through without srcset. */}
            <ImageWithFallback
              src={getCatalogProductImage(product)}
              srcSet={getProductImageSrcset(product.imageUrl ?? "") ?? undefined}
              sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
              alt={primaryName}
              className="h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
            />

            {/* Out-of-stock veil */}
            {!product.inStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                <span className="rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-600 shadow-sm">
                  {lang === "ar" ? "نفد المخزون" : "Out of stock"}
                </span>
              </div>
            )}

            {/* Critical stock pulse — CSS animate-pulse, no JS */}
            {stockLevel === "critical" && (
              <div className="absolute bottom-2 inset-x-2 z-10 flex justify-center">
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">
                  <Zap className="h-2.5 w-2.5" />
                  {lang === "ar" ? "كمية محدودة" : "Limited qty"}
                </span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Content ── */}
      <div className="product-card__body flex flex-1 flex-col px-3.5 pb-3.5 pt-3">

        <Link
          to={`/products/${product.id}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:rounded-lg"
          style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
        >
          <h3 className="line-clamp-2 text-[0.875rem] font-bold leading-snug text-slate-900 transition-colors group-hover:text-teal-700">
            {primaryName}
          </h3>
          {secondaryName && secondaryName !== primaryName ? (
            <p className="mt-0.5 line-clamp-1 text-[0.75rem] font-medium text-slate-400" dir="auto">
              {secondaryName}
            </p>
          ) : (
            <div className="mt-0.5 h-[1rem]" />
          )}
        </Link>

        {/* Availability + stock bar */}
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-slate-400">
              {getProductAvailabilityLabel(product, lang)}
            </span>
            <span
              className={cn(
                "text-[10px] font-black",
                stockLevel === "critical" ? "text-amber-500" :
                stockLevel === "out"      ? "text-rose-500"  : "text-slate-300",
              )}
            >
              {formatStockQuantity(product.stock)}
            </span>
          </div>
          <StockBar stock={product.stock} inStock={product.inStock} />
        </div>

        {/* Price + Add to cart */}
        <div className="product-card__footer mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[1.1rem] font-black leading-none tracking-tight text-slate-900">
              {product.price.toFixed(2)}
              <span className="ms-1 text-[10px] font-semibold text-slate-400">{t("currency")}</span>
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className={cn(
              "product-card__action inline-flex h-9 min-w-[6.5rem] items-center justify-center gap-1.5 rounded-xl text-[12px] font-black transition-all duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
              product.inStock
                ? isAdded
                  ? "bg-slate-900 text-white"
                  : "bg-teal-600 text-white hover:bg-teal-700"
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
    await addToCart(product.id);
    trigger();
  };

  return (
    <div
      className={cn(
        "product-card-compact group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-3",
        "shadow-[0_1px_3px_rgba(15,23,42,0.05)]",
        "transition-all duration-250 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200",
        animate && "product-card-animate",
      )}
      style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
    >
      <div className="relative flex items-start gap-3">
        {/* Thumbnail */}
        <Link
          to={`/products/${product.id}`}
          className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
          style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
        >
          <ImageWithFallback
            src={getCatalogProductImage(product)}
            srcSet={getProductImageSrcset(product.imageUrl ?? "") ?? undefined}
            sizes="72px"
            alt={primaryName}
            className="h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-105"
            loading="lazy"
            decoding="async"
          />
        </Link>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {displayCategoryName && (
              <span className="inline-flex items-center rounded-md border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] font-black text-slate-500 max-w-[72%] truncate">
                {displayCategoryName}
              </span>
            )}
            <FavoriteHeartButton
              productId={product.id}
              size="sm"
              className="border-slate-100 bg-white shadow-sm shrink-0"
            />
          </div>

          <Link
            to={`/products/${product.id}`}
            className="mt-1.5 block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            style={{ WebkitTapHighlightColor: "transparent" } as CSSProperties}
          >
            <p className="line-clamp-1 text-[0.85rem] font-bold leading-snug text-slate-900 transition-colors group-hover:text-teal-700">
              {primaryName}
            </p>
          </Link>

          {secondaryName && secondaryName !== primaryName ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-400" dir="auto">
              {secondaryName}
            </p>
          ) : null}

          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">
                {product.price.toFixed(2)}{" "}
                <span className="text-[10px] font-semibold text-slate-400">{t("currency")}</span>
              </p>
              <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-500">
                {getProductAvailabilityLabel(product, lang)}
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.93 }}
              type="button"
              onClick={() => void handleAddToCart()}
              disabled={!product.inStock}
              className={cn(
                "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-xl px-3 text-xs font-black transition-all duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                product.inStock
                  ? isAdded
                    ? "bg-slate-900 text-white"
                    : "bg-teal-600 text-white hover:bg-teal-700"
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
