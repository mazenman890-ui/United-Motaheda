import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  CheckCircle2,
  LayoutGrid,
  PackageSearch,
  X,
} from "lucide-react";
import { useCatalog } from "../../contexts/CatalogContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSearchInput } from "../../contexts/SearchContext";
import { CategoryGrid } from "../components/CategoryGrid";
import { CatalogSkeletonGrid } from "../components/CatalogPrimitives";
import { useCatalogCategorySearch } from "../hooks/useCatalogCategorySearch";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { MobileCategoriesView } from "./ShopperMobileViews";


/* ─── Empty State ────────────────────────────────────────────── */
function CategoryEmptyState({
  lang,
  hasSearch,
  onClear,
}: {
  lang: "ar" | "en";
  hasSearch: boolean;
  onClear?: () => void;
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
          {lang === "ar" ? "لا توجد أقسام مطابقة" : "No matching categories"}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
          {lang === "ar"
            ? "جرّب مصطلحًا آخر أو امسح البحث الحالي."
            : "Try a different term or clear the current search."}
        </p>
        {hasSearch && onClear && (
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onClear}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)] transition-all"
          >
            <X className="h-3.5 w-3.5" />
            {lang === "ar" ? "مسح البحث" : "Clear search"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main Export ───────────────────────────────────────────── */
export default function Categories() {
  const isShopperShell = useIsShopperShell();
  if (isShopperShell) return <MobileCategoriesView />;
  return <CategoriesDesktop />;
}

/* ─── Desktop View ──────────────────────────────────────────── */
function CategoriesDesktop() {
  const { categories, isLoading } = useCatalog();
  const { lang } = useLanguage();
  const { searchQuery, setSearchQuery } = useSearchInput();

  const isInitialLoading = isLoading && categories.length === 0;

  // Fuzzy-ranked, non-blocking via useDeferredValue inside the hook
  const filteredCategories = useCatalogCategorySearch(categories, searchQuery);

  return (
    <div className="categories-page min-h-screen bg-[linear-gradient(165deg,#f0fafa_0%,#f7fafb_50%,#fafafa_100%)]">
      <div className="page-section py-6 pb-14">
        {/* ── Hero Banner ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/92 shadow-[0_4px_28px_rgba(15,23,42,0.07)] backdrop-blur-xl"
        >
          <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-teal-200/80 bg-teal-50 px-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">
                  <Boxes className="h-3 w-3" />
                  {lang === "ar" ? "خريطة الأقسام" : "Category map"}
                </span>
                <span className="inline-flex h-7 items-center rounded-lg border border-slate-200/60 bg-slate-50 px-2.5 text-[10px] font-black text-slate-500">
                  {lang === "ar"
                    ? "البحث من الشريط الرئيسي أعلى الصفحة"
                    : "Search from the main header above"}
                </span>
              </div>

              <div>
                <h1 className="text-[1.75rem] font-black tracking-tight text-slate-950">
                  {lang === "ar" ? "تصفح الأقسام" : "Browse by category"}
                </h1>
                <p className="mt-1.5 max-w-xl text-[13px] font-semibold leading-6 text-slate-500">
                  {lang === "ar"
                    ? "استخدم البحث الرئيسي لاكتشاف الأقسام فورًا، ثم انتقل إلى المجموعة المناسبة."
                    : "Use the main search to discover categories instantly, then dive into the right section."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/products"
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/70 bg-white px-3.5 text-xs font-black text-slate-600 shadow-sm transition-all hover:-translate-y-px hover:shadow-md"
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-teal-500" />
                  {lang === "ar" ? "كل المنتجات" : "All products"}
                </Link>

                <AnimatePresence>
                  {searchQuery.trim() && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 pl-3 pr-2 text-xs font-black text-teal-700 transition-colors hover:bg-teal-100"
                    >
                      {searchQuery.trim()}
                      <X className="h-3 w-3" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
          </div>
        </motion.div>

        {/* ── Controls Bar ──────────────────────────────── */}
        <div className="catalog-controls-stick z-30 mb-6 overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/97 shadow-[0_4px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50 px-3 text-[11px] font-black text-slate-700">
                <Boxes className="h-3 w-3 text-teal-500" />
                {lang === "ar" ? "الأقسام" : "Categories"}
              </span>

              <AnimatePresence>
                {searchQuery.trim() && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 text-[11px] font-black text-teal-700"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {lang === "ar" ? "بحث نشط" : "Search active"}
                  </motion.span>
                )}
              </AnimatePresence>

              {!searchQuery.trim() && (
                <span className="inline-flex h-7 items-center rounded-lg border border-slate-200/60 bg-slate-50 px-3 text-[11px] font-semibold text-slate-400">
                  {lang === "ar" ? "شبكة موحّدة" : "Unified grid"}
                </span>
              )}
            </div>

            <p className="text-[11px] font-semibold text-slate-400">
              {lang === "ar"
                ? "ابحث من الأعلى وستتحدث الخريطة فورًا."
                : "Search from the header and this map updates instantly."}
            </p>
          </div>
        </div>

        {/* ── Category Grid ─────────────────────────────── */}
        {isInitialLoading ? (
          <CatalogSkeletonGrid variant="category" count={8} />
        ) : categories.length === 0 ? (
          <CategoryEmptyState lang={lang} hasSearch={false} />
        ) : filteredCategories.length > 0 ? (
          <CategoryGrid categories={filteredCategories} />
        ) : (
          <CategoryEmptyState
            lang={lang}
            hasSearch={searchQuery.trim().length > 0}
            onClear={() => setSearchQuery("")}
          />
        )}
      </div>
    </div>
  );
}
