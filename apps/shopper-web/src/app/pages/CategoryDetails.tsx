import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpDown,
  LayoutGrid,
  PackageSearch,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCatalog } from "../../contexts/CatalogContext";
import { useSearchInput } from "../../contexts/SearchContext";
import { ProductGrid } from "../components/ProductGrid";
import { cn } from "../components/UI";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { CatalogSkeletonGrid } from "../components/CatalogPrimitives";
import { getLocalizedCategoryName } from "../localization";
import { useCatalogProductSearch, type CatalogProductSort } from "../hooks/useCatalogProductSearch";
import { MobileCategoryDetailsView } from "./ShopperMobileViews";
import { FilterSidebar } from "../components/FilterSidebar";

const SORT_OPTIONS = [
  { value: "relevant", labelAr: "Ø§Ù„Ø£ÙƒØ«Ø± ØµÙ„Ø©", labelEn: "Relevant", Icon: Sparkles },
  { value: "price_asc", labelAr: "Ø§Ù„Ø³Ø¹Ø± â†‘", labelEn: "Price â†‘", Icon: TrendingUp },
  { value: "price_desc", labelAr: "Ø§Ù„Ø³Ø¹Ø± â†“", labelEn: "Price â†“", Icon: TrendingDown },
  { value: "name", labelAr: "Ø§Ù„Ø§Ø³Ù…", labelEn: "Name Aâ€“Z", Icon: ArrowUpDown },
] as const;

/* â”€â”€â”€ Inline State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function InlineState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm"
    >
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          <PackageSearch className="h-7 w-7 text-slate-400" />
        </div>
        <h2 className="mt-5 text-xl font-black tracking-tight text-slate-900">{title}</h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </motion.div>
  );
}

/* â”€â”€â”€ Sort Segment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SortSegment({
  options,
  value,
  lang,
  onChange,
}: {
  options: typeof SORT_OPTIONS;
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

/* â”€â”€â”€ Main Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function CategoryDetails() {
  const isShopperShell = useIsShopperShell();
  if (isShopperShell) return <MobileCategoryDetailsView />;
  return <CategoryDetailsDesktop />;
}

/* â”€â”€â”€ Desktop View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CategoryDetailsDesktop() {
  const { id } = useParams();
  const { lang } = useLanguage();
  const {
    categories,
    categoriesById,
    products,
    isLoading,
    isLoadingMore,
    isFullCatalogReady,
    filterByCategory,
    loadNextPage,
    hasNextPage,
  } = useCatalog();
  const { searchQuery, setSearchQuery } = useSearchInput();
  const [sortBy, setSortBy] = useState<CatalogProductSort>("relevant");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Server-side filter only needed before full catalog loads; afterwards the
  // hook derives the category slice directly from the in-memory allProducts.
  useEffect(() => {
    if (id && !isFullCatalogReady) void filterByCategory(id);
  }, [id, isFullCatalogReady, filterByCategory]);

  const category = id ? categoriesById[id] : undefined;
  const relatedCategories = useMemo(
    () => categories.filter((entry) => entry.id !== id).slice(0, 10),
    [categories, id],
  );

  // products is already server-filtered to this category by the effect above
  const { products: filteredProducts, resultCount, isSearching } = useCatalogProductSearch(
    products,
    { query: searchQuery, onlyInStock },
    sortBy,
    lang,
  );

  /* â”€â”€ Not found â”€â”€ */
  if (!category) {
    return (
      <div className="category-details-page min-h-screen bg-[linear-gradient(165deg,#f0fafa_0%,#f7fafb_50%,#fafafa_100%)]">
        <div className="page-section py-16">
          <InlineState
            title={lang === "ar" ? "Ø§Ù„Ù‚Ø³Ù… ØºÙŠØ± Ù…ØªÙˆÙØ±" : "Category not found"}
            description={
              lang === "ar"
                ? "ØªØ¹Ø°Ø± Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù‡Ø°Ø§ Ø§Ù„Ù‚Ø³Ù…. ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ù„Ø¹ÙˆØ¯Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø£Ù‚Ø³Ø§Ù… Ø£Ùˆ Ù…ØªØ§Ø¨Ø¹Ø© ØªØµÙØ­ ÙƒÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª."
                : "We couldn't find this category. Return to categories or browse the full catalog."
            }
            action={
              <Link
                to="/categories"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5"
              >
                <LayoutGrid className="h-4 w-4" />
                {lang === "ar" ? "Ø§Ù„Ø¹ÙˆØ¯Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø£Ù‚Ø³Ø§Ù…" : "Back to categories"}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const displayName = getLocalizedCategoryName(category, lang);
  const description = lang === "ar" ? category.descAr : category.descEn;
  const hasFilters = onlyInStock || searchQuery.trim().length > 0;


  return (
    <div className="category-details-page min-h-screen bg-[linear-gradient(165deg,#f0fafa_0%,#f7fafb_50%,#fafafa_100%)]">
      <div className="page-section py-6 pb-14">

        {/* â”€â”€ Category Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="grid gap-0 xl:grid-cols-[1fr_10rem]">

            {/* Left: info */}
            <div className="space-y-4 p-5">
              {/* Breadcrumb chips */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/categories"
                  className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200/70 bg-white px-2.5 text-[10px] font-black text-slate-600 shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
                >
                  <ArrowLeft className={cn("h-3 w-3", lang === "ar" && "rotate-180")} />
                  {lang === "ar" ? "Ø§Ù„Ø£Ù‚Ø³Ø§Ù…" : "Categories"}
                </Link>
                <span className="text-slate-300">/</span>
                <span className="inline-flex h-7 items-center rounded-lg border border-teal-200/80 bg-teal-50 px-2.5 text-[10px] font-black text-teal-700">
                  {displayName}
                </span>
                <Link
                  to="/products"
                  className="ms-auto inline-flex h-7 items-center rounded-lg border border-slate-200/60 bg-slate-50 px-2.5 text-[10px] font-black text-slate-500 transition-all hover:bg-white"
                >
                  {lang === "ar" ? "ÙƒÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª" : "All products"}
                </Link>
              </div>

              {/* Title + description */}
              <div>
                <h1 className="text-[1.75rem] font-black tracking-tight text-slate-950">{displayName}</h1>
                <p className="mt-1.5 max-w-2xl text-[13px] font-semibold leading-6 text-slate-500">
                  {description}
                </p>
                <AnimatePresence>
                  {isSearching && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      className="mt-2 inline-flex h-6 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 text-[10px] font-black text-violet-700"
                    >
                      <Zap className="h-2.5 w-2.5" />
                      {lang === "ar" ? "ØªØ±ØªÙŠØ¨ Ø°ÙƒÙŠ Ù†Ø´Ø·" : "Smart ranking active"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

            </div>

            {/* Right: category image */}
            <div className="overflow-hidden border-s border-slate-100 bg-slate-50/50 xl:rounded-e-[1.7rem]">
              <ImageWithFallback
                src={category.imageUrl}
                alt={displayName}
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                style={category.imagePosition ? { objectPosition: category.imagePosition } : undefined}
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </motion.div>

        {/* â”€â”€ Related Categories Rail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {relatedCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {lang === "ar" ? "ØªÙ†Ù‚Ù„ Ø³Ø±ÙŠØ¹" : "Quick browse"}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {lang === "ar" ? "Ø£Ù‚Ø³Ø§Ù… Ø£Ø®Ø±Ù‰" : "Other sections"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {relatedCategories.map((entry) => (
                <Link
                  key={entry.id}
                  to={`/categories/${entry.id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white/90 px-3 text-[11px] font-black text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-md"
                >
                  {getLocalizedCategoryName(entry, lang)}
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* â”€â”€ Sort bar + mobile filter toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="catalog-controls-stick z-30 mb-6 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 items-center rounded-lg border border-slate-200/70 bg-slate-50 px-3 text-[11px] font-black text-slate-600">
              {lang === "ar" ? "Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª" : "Products"}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setOnlyInStock(false); setSortBy("relevant"); }}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-black text-rose-600 transition-colors hover:bg-rose-100"
              >
                <X className="h-3 w-3" />
                {lang === "ar" ? "Ù…Ø³Ø­ Ø§Ù„ÙƒÙ„" : "Clear all"}
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
              {lang === "ar" ? "Ø§Ù„ÙÙ„Ø§ØªØ±" : "Filters"}
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
            categories={[]}
            activeCategory="all"
            onCategoryChange={() => {}}
            priceRange={[0, 9999]}
            maxPrice={0}
            onPriceRangeChange={() => {}}
            totalResults={resultCount}
            hasFilters={hasFilters}
            onClearAll={() => { setSearchQuery(""); setOnlyInStock(false); setSortBy("relevant"); }}
          />

          <div className="min-w-0 flex-1">
            {isLoading && products.length === 0 ? (
              <CatalogSkeletonGrid count={8} />
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="mb-4 px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {lang === "ar" ? "Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù‚Ø³Ù…" : "Category feed"}
                  </p>
                </div>
                <ProductGrid products={filteredProducts} />
                {hasNextPage && (
                  <div ref={loadMoreRef} className="mt-10 flex flex-col items-center gap-3">
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => void loadNextPage()}
                      disabled={isLoadingMore}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-8 text-sm font-black text-slate-700 shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                    >
                      {isLoadingMore
                        ? (lang === "ar" ? "Ø¬Ø§Ø±Ù Ø§Ù„ØªØ­Ù…ÙŠÙ„..." : "Loadingâ€¦")
                        : (lang === "ar" ? "Ø¹Ø±Ø¶ Ø§Ù„Ù…Ø²ÙŠØ¯" : "Load more")}
                    </motion.button>
                  </div>
                )}
              </>
            ) : (
              <InlineState
                title={lang === "ar" ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†ØªØ¬Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø©" : "No matching products"}
                description={
                  lang === "ar"
                    ? "Ø¬Ø±Ù‘Ø¨ ØªØºÙŠÙŠØ± Ø§Ù„Ø¨Ø­Ø« Ø£Ùˆ ØªØ¹Ø·ÙŠÙ„ ÙÙ„ØªØ± Ø§Ù„ØªÙˆÙØ± Ù„Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰ Ù…Ù†ØªØ¬Ø§Øª Ø£ÙƒØ«Ø±."
                    : "Try another search term or disable the stock filter to reveal more products."
                }
                action={
                  <Link
                    to="/products"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-0.5"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    {lang === "ar" ? "Ø§Ø³ØªÙƒØ´Ø§Ù ÙƒÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª" : "Explore all products"}
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
