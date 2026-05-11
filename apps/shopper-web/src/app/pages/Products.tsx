"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpDown,
  CheckCircle2,
  LayoutGrid,
  PackageSearch,
  SlidersHorizontal,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSearchInput } from "../../contexts/SearchContext";
import { useCatalog } from "../../contexts/CatalogContext";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { getLocalizedCategoryName } from "../localization";
import { getMaxPriceCeiled } from "../hooks/useCatalogFilters";
import { ProductGrid } from "../components/ProductGrid";
import { CatalogSkeletonGrid } from "../components/CatalogPrimitives";
import {
  useCatalogProductSearch,
  type CatalogProductSort,
} from "../hooks/useCatalogProductSearch";
import { MobileProductsView } from "./ShopperMobileViews";
import { FilterSidebar } from "../components/FilterSidebar";
import type { FilterCategory } from "../components/FilterSidebar";
import { cn } from "../components/UI";

/* ─── Constants ─────────────────────────────────────────────── */
type SortOption = {
  value: CatalogProductSort;
  labelAr: string;
  labelEn: string;
  Icon: React.ElementType;
};

const SORT_OPTIONS: readonly SortOption[] = [
  { value: "relevant", labelAr: "الأكثر صلة", labelEn: "Relevant", Icon: Sparkles },
  { value: "price_asc", labelAr: "السعر ↑", labelEn: "Price ↑", Icon: TrendingUp },
  { value: "price_desc", labelAr: "السعر ↓", labelEn: "Price ↓", Icon: TrendingDown },
  { value: "name", labelAr: "الاسم أ–ي", labelEn: "Name A–Z", Icon: ArrowUpDown },
];

const PAGE_SIZE = 36;

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
        accent
          ? "border-teal-200/80 bg-gradient-to-br from-teal-50 to-emerald-50/60 shadow-[0_6px_20px_rgba(20,184,166,0.12)]"
          : "border-slate-200/80 bg-white/82 shadow-[0_2px_8px_rgba(15,23,42,0.06)]",
      )}
    >
      {Icon && (
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          accent ? "bg-teal-100/80 text-teal-600" : "bg-slate-100 text-slate-500",
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      )}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className={cn("mt-0.5 text-lg font-black leading-none tracking-tight", accent ? "text-teal-700" : "text-slate-900")}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ─── Sort Segment ───────────────────────────────────────────── */
function SortSegment({
  options,
  value,
  lang,
  onChange,
}: {
  options: readonly SortOption[];
  value: string;
  lang: "ar" | "en";
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200/70 bg-slate-100/60 p-1">
      {options.map((opt) => {
        const Icon = opt.Icon;
        const active = value === opt.value;
        const label = lang === "ar" ? opt.labelAr : opt.labelEn;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[11px] font-black transition-all duration-200",
              active
                ? "bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/60"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon className={cn("h-3 w-3 shrink-0", active ? "text-teal-500" : "text-slate-400")} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Category Rail ─────────────────────────────────────────── */
function CategoryRail({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={railRef}
      className="flex gap-1.5 overflow-x-auto pb-0.5"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <motion.button
            key={opt.id}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[11px] font-black transition-all duration-200 whitespace-nowrap",
              active
                ? "bg-slate-900 text-white shadow-[0_4px_14px_rgba(15,23,42,0.22)]"
                : "border border-slate-200/80 bg-white/82 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={cn(
                "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-black",
                active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
              )}>
                {opt.count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─── Stock Toggle ───────────────────────────────────────────── */
function StockToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-black transition-all duration-200",
        checked
          ? "border-teal-200 bg-teal-50 text-slate-900 shadow-[0_4px_14px_rgba(20,184,166,0.12)]"
          : "border-slate-200/70 bg-white/82 text-slate-600 hover:bg-white",
      )}
    >
      <div className="flex items-center gap-2.5">
        <motion.div
          animate={{ backgroundColor: checked ? "rgb(20,184,166)" : "rgb(241,245,249)" }}
          className="flex h-6 w-6 items-center justify-center rounded-lg"
        >
          <CheckCircle2 className={cn("h-3.5 w-3.5 transition-colors", checked ? "text-white" : "text-slate-400")} />
        </motion.div>
        <span>{label}</span>
      </div>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-all duration-300",
          checked ? "border-teal-400 bg-teal-500" : "border-slate-300 bg-slate-200",
        )}
      >
        <motion.span
          animate={{ x: checked ? 16 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-block h-3 w-3 rounded-full bg-white shadow-sm"
        />
      </span>
    </motion.button>
  );
}

/* ─── Price Slider ───────────────────────────────────────────── */
function PriceSlider({
  value,
  max,
  onChange,
  currency,
  label,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  currency: string;
  label: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 100;
  const isFiltered = value < max;

  return (
    <div className={cn(
      "rounded-xl border px-4 py-3 transition-all duration-200",
      isFiltered
        ? "border-amber-200 bg-amber-50/60 shadow-[0_4px_14px_rgba(245,158,11,0.10)]"
        : "border-slate-200/70 bg-white/82",
    )}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className={cn("h-3.5 w-3.5", isFiltered ? "text-amber-500" : "text-slate-400")} />
          <p className="text-[11px] font-black text-slate-700">{label}</p>
        </div>
        <span className={cn(
          "rounded-lg border px-2.5 py-1 text-[11px] font-black",
          isFiltered ? "border-amber-200 bg-amber-100/60 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-600",
        )}>
          {value.toFixed(0)} {currency}
        </span>
      </div>

      <div className="relative h-5 w-full">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className={cn("h-full rounded-full", isFiltered ? "bg-amber-400" : "bg-teal-400")}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
        <input
          type="range"
          min="0"
          max={max}
          step="25"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 bg-white shadow-md transition-colors",
            isFiltered ? "border-amber-500" : "border-teal-500",
          )}
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-400">
        <span>0</span>
        <span>{max.toFixed(0)} {currency}</span>
      </div>
    </div>
  );
}

/* ─── Filter Chip ────────────────────────────────────────────── */
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 pl-2.5 pr-1.5 text-[11px] font-black text-teal-700 transition-all"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-4 w-4 items-center justify-center rounded-md bg-teal-100 text-teal-600 transition-colors hover:bg-teal-200"
        aria-label="Remove filter"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </motion.span>
  );
}

/* ─── Empty State ───────────────────────────────────────────── */
function ProductEmptyState({
  lang,
  hasFilters,
  onReset,
}: {
  lang: "ar" | "en";
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.8rem] border border-slate-200/80 bg-white/92 p-12 text-center shadow-sm backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <PackageSearch className="h-7 w-7 text-slate-400" />
        </div>
        <h2 className="mt-5 text-xl font-black tracking-tight text-slate-900">
          {lang === "ar" ? "لا توجد نتائج" : "No results found"}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
          {lang === "ar"
            ? "جرّب توسيع البحث أو إزالة بعض الفلاتر."
            : "Try widening the search or clearing some filters."}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5"
          >
            <X className="h-3.5 w-3.5" />
            {lang === "ar" ? "إعادة الضبط" : "Reset filters"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main Export ───────────────────────────────────────────── */
export default function Products() {
  const isShopperShell = useIsShopperShell();
  if (isShopperShell) return <MobileProductsView />;
  return <ProductsDesktop />;
}

/* ─── Desktop View ─────────────────────────────────────────── */
function ProductsDesktop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, t } = useLanguage();
  const {
    categories,
    products,
    inStockProducts,
    isLoading,
    isLoadingMore,
    error,
    loadNextPage,
    hasNextPage,
    totalProductCount,
  } = useCatalog();
  const { searchQuery, setSearchQuery } = useSearchInput();
  const [sortBy, setSortBy] = useState<CatalogProductSort>("relevant");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [priceRange, setPriceRange] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const activeCategory = searchParams.get("category") || "all";

  const maxPrice = useMemo(
    () => getMaxPriceCeiled(products, 50),
    [products],
  );

  useEffect(() => {
    if (maxPrice > 0) {
      setPriceRange((cur) => (cur > 0 ? Math.min(cur, maxPrice) : maxPrice));
    }
  }, [maxPrice]);

  const categoryOptions = useMemo(
    () => [
      {
        id: "all",
        label: lang === "ar" ? "الكل" : "All",
        count: totalProductCount || products.length,
      },
      ...categories.map((c) => ({
        id: c.id,
        label: getLocalizedCategoryName(c, lang),
        count: c.count,
      })),
    ],
    [categories, products.length, totalProductCount, lang],
  );

  /* ✅ Destructure activeQuery and pass it to the grid */
  const {
    products: filteredProducts,
    resultCount,
    isSearching,
    activeQuery,
  } = useCatalogProductSearch(
    products,
    {
      category: activeCategory,
      query: searchQuery,
      onlyInStock,
      priceCap: priceRange,
    },
    sortBy,
    lang,
  );

  const activeCategoryLabel = categoryOptions.find((c) => c.id === activeCategory)?.label;
  const availableCount = inStockProducts.length;
  const isPriceFiltered = maxPrice > 0 && priceRange < maxPrice;
  const hasFilters = activeCategory !== "all" || onlyInStock || isPriceFiltered || searchQuery.trim().length > 0;

  const clearAll = () => {
    setSortBy("relevant");
    setOnlyInStock(false);
    setPriceRange(maxPrice);
    setSearchQuery("");
    setSearchParams(new URLSearchParams());
  };

  const updateCategory = (nextCat: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (nextCat) next.set("category", nextCat);
    else next.delete("category");
    setSearchParams(next);
  };

  const activeFilterTags = [
    activeCategory !== "all" && activeCategoryLabel
      ? { key: "cat", label: activeCategoryLabel, onRemove: () => updateCategory(null) }
      : null,
    searchQuery.trim()
      ? { key: "q", label: `"${searchQuery.trim()}"`, onRemove: () => setSearchQuery("") }
      : null,
    onlyInStock
      ? { key: "stock", label: lang === "ar" ? "المتاح فقط" : "In stock only", onRemove: () => setOnlyInStock(false) }
      : null,
    isPriceFiltered
      ? {
          key: "price",
          label:
            lang === "ar"
              ? `حتى ${priceRange.toFixed(0)} ${t("currency")}`
              : `Up to ${priceRange.toFixed(0)} ${t("currency")}`,
          onRemove: () => setPriceRange(maxPrice),
        }
      : null,
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[];

  const showLoadingState = isLoading && products.length === 0;

  const sidebarCategoryOptions: FilterCategory[] = categoryOptions;

  return (
    <div className="products-page min-h-screen bg-[linear-gradient(165deg,#f0fafa_0%,#f7fafb_50%,#fafafa_100%)]">
      <div className="page-section py-6 pb-14">
        {/* ── Hero Banner ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/92 shadow-[0_4px_28px_rgba(15,23,42,0.07)] backdrop-blur-xl"
        >
          <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-teal-200/80 bg-teal-50 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">
                  <LayoutGrid className="h-3 w-3" />
                  {lang === "ar" ? "كتالوج المنتجات" : "Product catalog"}
                </span>
                {isSearching && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700"
                  >
                    <Zap className="h-3 w-3" />
                    {lang === "ar" ? "ترتيب ذكي" : "Smart ranking"}
                  </motion.span>
                )}
              </div>

              <div>
                <h1 className="text-[1.75rem] font-black tracking-tight text-slate-950">
                  {lang === "ar" ? "تصفح الكتالوج الكامل" : "Browse the full catalog"}
                </h1>
                <p className="mt-1.5 max-w-xl text-[13px] font-semibold leading-6 text-slate-500">
                  {lang === "ar"
                    ? "ابحث وفلتر وصنّف المنتجات للعثور على ما تحتاجه بسرعة."
                    : "Search, filter, and sort products to find exactly what you need."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/categories"
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3.5 text-xs font-black text-slate-600 shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-teal-500" />
                  {lang === "ar" ? "خريطة الأقسام" : "Category map"}
                </Link>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 pl-3 pr-2 text-xs font-black text-teal-700 transition-colors hover:bg-teal-100"
                  >
                    {searchQuery.trim()}
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Stats */}
            <div className="grid grid-cols-3 gap-2 xl:w-64 xl:grid-cols-1 xl:gap-2">
              <StatCard
                label={lang === "ar" ? "إجمالي المنتجات" : "Catalog size"}
                value={totalProductCount || products.length}
                icon={Tag}
              />
              <StatCard
                label={lang === "ar" ? "المتاح الآن" : "In stock"}
                value={availableCount}
                accent
                icon={CheckCircle2}
              />
              <StatCard
                label={lang === "ar" ? "النتائج" : "Results"}
                value={resultCount}
                icon={Sparkles}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Sort bar + mobile filter toggle ─────────── */}
        <div className="catalog-controls-stick z-30 mb-6 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/97 px-5 py-3.5 shadow-[0_4px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50 px-3 text-[11px] font-black text-slate-700">
              <Tag className="h-3 w-3 text-teal-500" />
              {lang === "ar"
                ? `${resultCount} منتج`
                : `${resultCount} ${resultCount === 1 ? "item" : "items"}`}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-black text-rose-600 transition-colors hover:bg-rose-100"
              >
                <X className="h-3 w-3" />
                {lang === "ar" ? "مسح الكل" : "Clear all"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <SortSegment
                options={SORT_OPTIONS}
                value={sortBy}
                lang={lang}
                onChange={(v) => setSortBy(v as CatalogProductSort)}
              />
            </div>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-black text-slate-700 shadow-sm transition-all hover:border-teal-200 hover:bg-teal-50 lg:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-500" />
              {lang === "ar" ? "الفلاتر" : "Filters"}
              {hasFilters && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[9px] font-black text-white">
                  {activeFilterTags.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="page-section-row pb-14" style={{ overflow: "visible" }}>
        <div className="flex gap-6 items-start">
          <FilterSidebar
            lang={lang}
            mobileOpen={mobileFilterOpen}
            onMobileClose={() => setMobileFilterOpen(false)}
            onlyInStock={onlyInStock}
            onInStockChange={setOnlyInStock}
            categories={sidebarCategoryOptions}
            activeCategory={activeCategory}
            onCategoryChange={(id) => updateCategory(id === "all" ? null : id)}
            priceRange={[0, priceRange]}
            maxPrice={maxPrice}
            onPriceRangeChange={([, max]) => setPriceRange(max)}
            currency={t("currency")}
            totalResults={resultCount}
            hasFilters={hasFilters}
            onClearAll={clearAll}
          />

          <div className="min-w-0 flex-1">
            {error ? (
              <div className="rounded-[1.8rem] border border-rose-200/80 bg-rose-50/80 p-10 text-center shadow-sm">
                <p className="text-sm font-black text-rose-700">
                  {lang === "ar"
                    ? "حدث خطأ أثناء تحميل الكتالوج."
                    : "An error occurred while loading the catalog."}
                </p>
                <p className="mt-2 text-sm text-rose-600">{error}</p>
              </div>
            ) : showLoadingState ? (
              <CatalogSkeletonGrid count={8} />
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {lang === "ar" ? "شبكة المنتجات" : "Product grid"}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {lang === "ar"
                      ? `عرض ${filteredProducts.length} من ${resultCount}`
                      : `Showing ${filteredProducts.length} of ${resultCount}`}
                  </p>
                </div>

                <ProductGrid
                  products={filteredProducts}
                  isSearching={isSearching}
                  activeQuery={activeQuery}
                />

                {hasNextPage && (
                  <div ref={loadMoreRef} className="mt-10 flex flex-col items-center gap-3">
                    <p className="text-[11px] font-semibold text-slate-400">
                      {lang === "ar"
                        ? `${filteredProducts.length} من ${totalProductCount || resultCount} منتج`
                        : `${filteredProducts.length} of ${totalProductCount || resultCount} items`}
                    </p>
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => void loadNextPage()}
                      disabled={isLoadingMore}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-8 text-sm font-black text-slate-700 shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                    >
                      {isLoadingMore
                        ? (lang === "ar" ? "جارٍ التحميل..." : "Loading…")
                        : (lang === "ar" ? "عرض المزيد" : "Load more")}
                    </motion.button>
                  </div>
                )}
              </>
            ) : (
              <ProductEmptyState lang={lang} hasFilters={hasFilters} onReset={clearAll} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}