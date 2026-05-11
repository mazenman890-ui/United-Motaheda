import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
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
import {
  useCatalogProductSearch,
  type CatalogProductSort,
} from "../hooks/useCatalogProductSearch";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { CatalogSkeletonGrid } from "../components/CatalogPrimitives";
import { getLocalizedCategoryName } from "../localization";
import { MobileOffersView } from "./ShopperMobileViews";
import { FilterSidebar } from "../components/FilterSidebar";

/* ─── Constants ─────────────────────────────────────────────── */
const PAGE_SIZE = 48;

const SORT_OPTIONS = [
  { value: "relevant",   labelAr: "الأكثر صلة",   labelEn: "Relevant",      Icon: Sparkles   },
  { value: "price_desc", labelAr: "السعر ↓",       labelEn: "Price ↓",       Icon: TrendingDown },
  { value: "price_asc",  labelAr: "السعر ↑",       labelEn: "Price ↑",       Icon: TrendingUp  },
  { value: "name",       labelAr: "الاسم أ–ي",     labelEn: "Name A–Z",      Icon: ArrowUpDown },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: "teal" | "amber";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
        accent === "amber"
          ? "border-amber-200/80 bg-gradient-to-br from-amber-50 to-yellow-50/60 shadow-[0_6px_20px_rgba(245,158,11,0.12)]"
          : accent === "teal"
            ? "border-teal-200/80 bg-gradient-to-br from-teal-50 to-emerald-50/60 shadow-[0_6px_20px_rgba(20,184,166,0.12)]"
            : "border-slate-200/70 bg-white/90 shadow-[0_2px_8px_rgba(15,23,42,0.05)]",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          accent === "amber"
            ? "bg-amber-100/80 text-amber-600"
            : accent === "teal"
              ? "bg-teal-100/80 text-teal-600"
              : "bg-slate-100 text-slate-500",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-lg font-black leading-none tracking-tight",
            accent === "amber"
              ? "text-amber-700"
              : accent === "teal"
                ? "text-teal-700"
                : "text-slate-900",
          )}
        >
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
  const { categories, featuredProducts, isLoading } = useCatalog();

  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortValue>("relevant");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  /* ── Replace manual filter/sort/debounce with the unified hook ── */
  const {
    products: sortedProducts,
    resultCount,
    isSearching,
    activeQuery,
  } = useCatalogProductSearch(
    featuredProducts,
    {
      category: activeCategory === "all" ? undefined : activeCategory,
      query: searchInput,
      onlyInStock: false,
      priceCap: 0,
    },
    sortBy as CatalogProductSort,
    lang,
  );

  const isInitialLoading = isLoading && featuredProducts.length === 0;
  const availableCount = useMemo(
    () => featuredProducts.filter((p) => p.inStock).length,
    [featuredProducts],
  );

  const visibleProducts = useMemo(
    () => sortedProducts.slice(0, visibleCount),
    [sortedProducts, visibleCount],
  );

  /* Reset pagination when filters change */
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, searchInput, sortBy]);

  /* ── Category options for sidebar ───────────────────────── */
  const categoryOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of featuredProducts) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return [
      {
        id: "all",
        label: lang === "ar" ? "كل العروض" : "All offers",
        count: featuredProducts.length,
      },
      ...categories
        .filter((c) => (counts[c.id] ?? 0) > 0)
        .map((c) => ({
          id: c.id,
          label: getLocalizedCategoryName(c, lang),
          count: counts[c.id] ?? 0,
        })),
    ];
  }, [categories, featuredProducts, lang]);

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

          <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
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

            <div className="grid grid-cols-3 gap-2 xl:w-64 xl:grid-cols-1 xl:gap-2">
              <StatCard
                label={lang === "ar" ? "إجمالي العروض" : "Total offers"}
                value={featuredProducts.length}
                icon={Star}
                accent="amber"
              />
              <StatCard
                label={lang === "ar" ? "المتاح الآن" : "In stock"}
                value={availableCount}
                icon={CheckCircle2}
                accent="teal"
              />
              <StatCard
                label={lang === "ar" ? "النتائج" : "Results"}
                value={resultCount}
                icon={Sparkles}
              />
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
              {lang === "ar" ? `${resultCount} عرض` : `${resultCount} offers`}
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
            totalResults={resultCount}
            hasFilters={hasFilters}
            onClearAll={clearFilters}
          />

          <div className="min-w-0 flex-1">
            {isInitialLoading ? (
              <CatalogSkeletonGrid count={8} />
            ) : visibleProducts.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between gap-3 px-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {lang === "ar" ? "شبكة العروض" : "Offers grid"}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {lang === "ar"
                      ? `عرض ${visibleProducts.length} من ${resultCount}`
                      : `Showing ${visibleProducts.length} of ${resultCount}`}
                  </p>
                </div>

                {/* ✅ Pass isSearching and activeQuery */}
                <ProductGrid
                  products={visibleProducts}
                  isSearching={isSearching}
                  activeQuery={activeQuery}
                />

                {resultCount > visibleCount && (
                  <div className="mt-10 flex flex-col items-center gap-3">
                    <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${Math.round((visibleCount / resultCount) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {lang === "ar"
                        ? `${visibleCount} من ${resultCount} عرض`
                        : `${visibleCount} of ${resultCount} offers`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-8 text-sm font-black text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                    >
                      {lang === "ar" ? "عرض المزيد" : "Load more"}
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