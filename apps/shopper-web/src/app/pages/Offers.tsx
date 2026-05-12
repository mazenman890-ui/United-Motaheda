import { useState } from "react";
import {
  ArrowUpDown,
  PackageSearch,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { ProductGrid } from "../components/ProductGrid";
import { cn } from "../components/UI";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCatalog } from "../../contexts/CatalogContext";
import { useOffers } from "../hooks/useOffers";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { CatalogSkeletonGrid } from "../components/CatalogPrimitives";
import { getLocalizedCategoryName } from "../localization";
import { MobileOffersView } from "./ShopperMobileViews";
import { FilterSidebar } from "../components/FilterSidebar";

/* ─── Constants ─────────────────────────────────────────────── */

const SORT_OPTIONS = [
  { value: "relevant",   labelAr: "الأكثر صلة",   labelEn: "Relevant",      Icon: Sparkles   },
  { value: "price_desc", labelAr: "السعر ↓",       labelEn: "Price ↓",       Icon: TrendingDown },
  { value: "price_asc",  labelAr: "السعر ↑",       labelEn: "Price ↑",       Icon: TrendingUp  },
  { value: "name",       labelAr: "الاسم أ–ي",     labelEn: "Name A–Z",      Icon: ArrowUpDown },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/* ─── Sort Segment ───────────────────────────────────────────── */
function SortSegment({
  options,
  value,
  lang,
  onChange,
}: {
  options: typeof SORT_OPTIONS;
  value: SortValue;
  lang: "ar" | "en";
  onChange: (v: SortValue) => void;
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
            <Icon
              className={cn(
                "h-3 w-3 shrink-0",
                active ? "text-amber-500" : "text-slate-400",
              )}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Inline Search ──────────────────────────────────────────── */
function OffersSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full rounded-xl border border-slate-200/70 bg-white/90 pe-3 ps-9 text-[13px] font-semibold text-slate-900 placeholder:text-slate-400",
          "shadow-[0_2px_6px_rgba(15,23,42,0.05)] transition-all duration-200",
          "focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200/60",
          value && "border-amber-200 bg-amber-50/30",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute end-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────── */
function OffersEmptyState({
  lang,
  hasFilters,
  onReset,
}: {
  lang: "ar" | "en";
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-12 text-center shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 shadow-[0_8px_24px_rgba(245,158,11,0.12)]">
          <PackageSearch className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="mt-5 text-xl font-black tracking-tight text-slate-900">
          {lang === "ar" ? "لا توجد عروض مطابقة" : "No matching offers"}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
          {lang === "ar"
            ? "جرّب تغيير البحث أو عرض كل الأقسام."
            : "Try a different search term or show all categories."}
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
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────── */
export default function Offers() {
  const isShopperShell = useIsShopperShell();
  if (isShopperShell) return <MobileOffersView />;
  return <OffersDesktop />;
}

/* ─── Desktop View ─────────────────────────────────────────── */
function OffersDesktop() {
  const { lang } = useLanguage();
  const { categories } = useCatalog();

  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortValue>("relevant");
  const [searchInput, setSearchInput] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const {
    products,
    isLoading,
    isFetchingNext,
    fetchNextPage,
    hasNextPage,
    totalCount,
    activeQuery,
  } = useOffers({
    query: searchInput,
    categoryId: activeCategory !== "all" ? activeCategory : undefined,
    sortBy,
  });

  /* ── Category sidebar options ────────────────────────────── */
  const categoryOptions = [
    {
      id: "all",
      label: lang === "ar" ? "كل العروض" : "All offers",
      count: totalCount,
    },
    ...categories.map((c) => ({
      id: c.id,
      label: getLocalizedCategoryName(c, lang),
      count: c.count,
    })),
  ];

  const hasFilters =
    activeCategory !== "all" ||
    searchInput.trim().length > 0 ||
    sortBy !== "relevant";

  const clearFilters = () => {
    setActiveCategory("all");
    setSortBy("relevant");
    setSearchInput("");
  };

  return (
    <div className="offers-page min-h-screen bg-[linear-gradient(165deg,#fffbf0_0%,#fafaf8_50%,#fafafa_100%)]">
      <div className="page-section py-6 pb-14">
        {/* ── Hero Banner ──────────────────────────────────── */}
        <div className="mb-5 overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-[1.6rem] bg-gradient-to-r from-amber-300/60 via-yellow-300/40 to-amber-400/60"
          />

          <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-amber-200/90 bg-gradient-to-r from-amber-50 to-yellow-50 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {lang === "ar" ? "العروض المميزة" : "Featured offers"}
                </span>
                {activeQuery && (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">
                    <Sparkles className="h-3 w-3" />
                    {lang === "ar" ? "بحث نشط" : "Search active"}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-[1.75rem] font-black tracking-tight text-slate-950">
                  {lang === "ar" ? "العروض الحالية" : "Current offers"}
                </h1>
                <p className="mt-1.5 max-w-xl text-[13px] font-semibold leading-6 text-slate-500">
                  {lang === "ar"
                    ? "استعرض المنتجات المميزة، وابحث بداخلها، ورتبها حسب القسم أو السعر."
                    : "Browse featured products, search within them, and sort by category or price."}
                </p>
              </div>
          </div>
        </div>

        {/* ── Controls bar ───────────────────────────────── */}
        <div className="catalog-controls-stick z-30 mb-6 flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/95 px-5 py-3.5 shadow-[0_4px_20px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2">
            <OffersSearch
              value={searchInput}
              onChange={setSearchInput}
              placeholder={lang === "ar" ? "ابحث في العروض…" : "Search offers…"}
            />
            <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50 px-3 text-[11px] font-black text-slate-600">
              <Tag className="h-3 w-3 text-amber-400" />
              {lang === "ar" ? "العروض" : "Offers"}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[11px] font-black text-rose-600 transition-colors hover:bg-rose-100"
              >
                <X className="h-3 w-3" />
                {lang === "ar" ? "مسح" : "Clear"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <SortSegment options={SORT_OPTIONS} value={sortBy} lang={lang} onChange={setSortBy} />
            </div>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[12px] font-black text-slate-700 shadow-sm transition-all hover:border-amber-200 hover:bg-amber-50 lg:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-amber-500" />
              {lang === "ar" ? "الفلاتر" : "Filters"}
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
            onlyInStock={false}
            onInStockChange={() => {}}
            categories={categoryOptions}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            priceRange={[0, 9999]}
            maxPrice={0}
            onPriceRangeChange={() => {}}
            totalResults={totalCount}
            hasFilters={hasFilters}
            onClearAll={clearFilters}
          />

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <CatalogSkeletonGrid count={8} />
            ) : products.length > 0 ? (
              <>
                <div className="mb-4 px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {lang === "ar" ? "شبكة العروض" : "Offers grid"}
                  </p>
                </div>

                <ProductGrid
                  products={products}
                  isSearching={isFetchingNext}
                  activeQuery={activeQuery}
                />

                {hasNextPage && (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={fetchNextPage}
                      disabled={isFetchingNext}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-8 text-sm font-black text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {isFetchingNext
                        ? (lang === "ar" ? "جارٍ التحميل…" : "Loading…")
                        : (lang === "ar" ? "عرض المزيد" : "Load more")}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <OffersEmptyState lang={lang} hasFilters={hasFilters} onReset={clearFilters} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
