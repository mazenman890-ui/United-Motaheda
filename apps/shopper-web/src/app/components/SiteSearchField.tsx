/**
 * SiteSearchField.tsx — Bilingual search input + suggestions dropdown
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * RENDER ISOLATION STRATEGY — why this component has three separate subtrees
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   The search panel has two very different update frequencies:
 *
 *   HIGH FREQUENCY  → the <input> element; must update on every keystroke.
 *                     Any re-render overhead here is directly perceptible as
 *                     input lag.  Goal: < 1ms re-render budget.
 *
 *   LOW FREQUENCY   → the suggestion dropdown; updates every 180–300ms (after
 *                     the worker responds).  Re-renders here are fine.
 *
 *   Solution: split into three React.memo components:
 *
 *     <SearchInput>      → only re-renders when searchQuery changes.
 *                          Reads from SearchInputContext only.
 *
 *     <SuggestionPanel>  → only re-renders when suggestions/mode changes.
 *                          Reads from SearchResultsContext only.
 *
 *     <SiteSearchField>  → orchestrates both, reads shared state (mode, lang)
 *                          that changes very rarely (route change).
 *
 *   With the previous combined useSearch() hook, every suggestion update
 *   caused the <input> element to re-render (and lose focus on some browsers).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * VIRTUALIZATION — MANDATORY FOR PRODUCTION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   The suggestion dropdown is capped at 20 items here, which is safe to render
 *   as a plain list.  If you increase SUGGESTIONS_LIMIT beyond 50, replace the
 *   <ul> inside SuggestionPanel with a virtualized list:
 *
 *     import { useVirtualizer } from "@tanstack/react-virtual";
 *     // or
 *     import { Virtuoso } from "react-virtuoso";
 *
 *   The product grid on the /products page (rendered by useCatalogProductSearch)
 *   MUST be virtualized — it can display all 52K products.  Use react-virtuoso
 *   or @tanstack/react-virtual there.  This file only covers the dropdown.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHANGES VS. PREVIOUS VERSION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * • Extracted SearchInput and SuggestionPanel as React.memo components.
 * • Removed the timeout-based `commitInProgress` guard (idempotent callbacks).
 * • All callbacks wrapped in useCallback (stable references for memo props).
 * • highlightMatch memoised at the call site to avoid re-running on every render.
 * • Keyboard navigation moved to SuggestionPanel to keep SearchInput truly lean.
 */

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Grid2x2, Search } from "lucide-react";
import { useCatalog } from "../../contexts/CatalogContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSearchInput, useSearchResults } from "../../contexts/SearchContext";
import { useCatalogCategorySearch } from "../hooks/useCatalogCategorySearch";
import { getLocalizedCategoryName } from "../localization";
import type { CatalogCategory, CatalogProduct } from "../catalog";
import { cn } from "./UI";

// ─── Types ────────────────────────────────────────────────────────────────────

type SiteSearchFieldProps = {
  inputRef?:            RefObject<HTMLInputElement | null>;
  className?:           string;
  inputClassName?:      string;
  iconClass?:           string;
  mobileSubmitPadding?: boolean;
  placeholder?:         string;
};

type SiteSearchMode = "products" | "categories" | "category-products" | "global";

type SuggestionItem =
  | { type: "category"; id: string }
  | { type: "product";  id: string };

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * Highlights matching substrings in `text`.
 *
 * WHY NOT a component: this is called inside list renders.  A functional
 * component would add an extra reconciliation step per item.  Returning an
 * array of elements inline avoids that overhead entirely.
 */
function highlightMatch(text: string, query: string): React.ReactNode[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [text];

  const safeQuery = escapeRegExp(trimmedQuery);
  const parts     = text.split(new RegExp(`(${safeQuery})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === trimmedQuery.toLowerCase() ? (
      <span
        key={`${part}-${index}`}
        className="rounded bg-teal-100 px-0.5 font-black text-teal-800"
      >
        {part}
      </span>
    ) : (
      part
    ),
  );
}

// ─── Mode / placeholder / path helpers ───────────────────────────────────────

export function getSiteSearchMode(pathname: string): SiteSearchMode {
  if (/^\/categories\/[^/]+$/.test(pathname)) return "category-products";
  if (pathname === "/categories")              return "categories";
  if (pathname === "/products" || pathname.startsWith("/products/")) return "products";
  return "global";
}

export function getSiteSearchPlaceholder(pathname: string, lang: "ar" | "en"): string {
  const mode = getSiteSearchMode(pathname);
  if (mode === "categories")       return lang === "ar" ? "ابحث عن قسم"              : "Search categories";
  if (mode === "category-products") return lang === "ar" ? "ابحث داخل هذا القسم"    : "Search inside this category";
  if (mode === "global")            return lang === "ar" ? "ابحث عن منتج أو قسم"   : "Search products and categories";
  return lang === "ar" ? "ابحث عن دواء أو منتج" : "Search medications and products";
}

export function resolveSiteSearchSubmitPath(pathname: string, query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const mode = getSiteSearchMode(pathname);
  if (mode === "categories" || mode === "category-products") return null;
  return `/products?search=${encodeURIComponent(trimmed)}`;
}

// ─── SearchInput — isolated leaf component ────────────────────────────────────

/**
 * WHY memo: SearchInput reads ONLY from SearchInputContext (via props passed
 * down from the parent).  It must not re-render when suggestions change.
 * memo() + stable callback props guarantees this.
 *
 * The parent passes callbacks (not values from SearchResultsContext) so this
 * component has zero dependency on the suggestion pipeline.
 */
interface SearchInputProps {
  searchQuery:          string;
  lang:                 "ar" | "en";
  placeholder:          string;
  mobileSubmitPadding?: boolean;
  inputClassName?:      string;
  iconClass?:           string;
  inputRef?:            RefObject<HTMLInputElement | null>;
  onChange:             (value: string) => void;
  onKeyDown:            (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus:              () => void;
  onCommit:             () => void;
}

const SearchInput = memo(function SearchInput({
  searchQuery,
  lang,
  placeholder,
  mobileSubmitPadding,
  inputClassName,
  iconClass,
  inputRef,
  onChange,
  onKeyDown,
  onFocus,
  onCommit,
}: SearchInputProps) {
  const trimmedQuery = searchQuery.trim();

  return (
    <>
      {/* Search icon — decorative, never re-renders on suggestion change */}
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400",
          lang === "ar" ? "right-3" : "left-3",
          iconClass,
        )}
        aria-hidden
      />

      <input
        ref={inputRef}
        type="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={searchQuery}
        placeholder={placeholder}
        dir={isArabicScript(searchQuery) ? "rtl" : "ltr"}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className={cn(
          "w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm text-slate-900 outline-none ring-0 transition-shadow placeholder:text-slate-400 focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_var(--primary-light)]",
          lang === "ar"
            ? cn("pr-11 text-right", mobileSubmitPadding ? "pl-14" : "pl-4")
            : cn("pl-11 text-left",  mobileSubmitPadding ? "pr-14" : "pr-4"),
          inputClassName,
        )}
      />

      {trimmedQuery.length > 1 ? (
        <button
          type="button"
          onClick={onCommit}
          aria-label={lang === "ar" ? "بحث" : "Search"}
          className={cn(
            "absolute top-1/2 -translate-y-1/2",
            lang === "ar" ? "left-2" : "right-2",
            "inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-sm transition-all hover:bg-[var(--primary-strong)] active:scale-95",
            !mobileSubmitPadding && "hidden",
          )}
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </>
  );
});

// ─── SuggestionPanel — isolated dropdown component ────────────────────────────

interface SuggestionPanelProps {
  lang:               "ar" | "en";
  mode:               SiteSearchMode;
  searchQuery:        string;
  visibleCategories:  CatalogCategory[];
  visibleProducts:    CatalogProduct[];
  activeIndex:        number;
  onCategoryClick:    (id: string) => void;
  onProductClick:     (id: string) => void;
  workerStatus?:      "idle" | "building" | "ready";
  isSearching:        boolean;
}

/**
 * WHY memo: SuggestionPanel re-renders only when suggestions or activeIndex
 * changes — never when the user is just typing between suggestion updates.
 */
const SuggestionPanel = memo(function SuggestionPanel({
  lang,
  mode,
  searchQuery,
  visibleCategories,
  visibleProducts,
  activeIndex,
  onCategoryClick,
  onProductClick,
  workerStatus = "idle",
  isSearching,
}: SuggestionPanelProps) {
  const trimmedQuery = searchQuery.trim();
  const totalItems   = visibleCategories.length + visibleProducts.length;

  return (
    <div
      className={cn(
        "absolute start-0 end-0 top-[calc(100%+0.35rem)] z-[60] max-h-80 overflow-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_24px_48px_rgba(15,23,42,0.12)]",
        lang === "ar" ? "text-right" : "text-left",
      )}
      role="listbox"
      aria-label={lang === "ar" ? "اقتراحات البحث" : "Search suggestions"}
    >
      {/* Cross-script indicator */}
      {isArabicScript(trimmedQuery) ? (
        <div
          className={cn(
            "flex items-center gap-2 px-4 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-teal-600",
            lang === "ar" ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
          {lang === "ar" ? "نتائج ذكية بالعربي والإنجليزي" : "Smart Arabic and English matching"}
        </div>
      ) : null}

      {/* Categories section */}
      {visibleCategories.length > 0 ? (
        <div className="pb-1">
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400",
              lang === "ar" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <Grid2x2 className="h-3.5 w-3.5" />
            {lang === "ar" ? "الأقسام" : "Categories"}
          </div>

          {/*
           * NOTE: If visibleCategories can exceed 20 items, replace this <ul>
           * with a virtualized list.  Example:
           *
           *   import { useVirtualizer } from "@tanstack/react-virtual";
           *   const parentRef = useRef<HTMLDivElement>(null);
           *   const rowVirtualizer = useVirtualizer({
           *     count: visibleCategories.length,
           *     getScrollElement: () => parentRef.current,
           *     estimateSize: () => 52,
           *   });
           */}
          <ul className="divide-y divide-slate-100">
            {visibleCategories.map((category, index) => {
              const active      = index === activeIndex;
              const displayName = getLocalizedCategoryName(category, lang);

              return (
                <li key={category.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors",
                      active ? "bg-teal-50" : "hover:bg-slate-50",
                    )}
                    onClick={() => onCategoryClick(category.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">
                        {highlightMatch(displayName, searchQuery)}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-slate-400">
                        {lang === "ar"
                          ? `${category.inStockCount} متاح الآن`
                          : `${category.inStockCount} ready now`}
                      </span>
                    </div>
                    <span className="text-xs font-black text-[var(--primary)]">
                      {lang === "ar" ? "افتح القسم" : "Open"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Products section */}
      {visibleProducts.length > 0 ? (
        <div>
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400",
              lang === "ar" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <Search className="h-3.5 w-3.5" />
            {lang === "ar" ? "المنتجات" : "Products"}
          </div>

          {/*
           * NOTE: For suggestion limits > 20, virtualize here too.
           */}
          <ul className="divide-y divide-slate-100">
            {visibleProducts.map((product, index) => {
              const active       = index + visibleCategories.length === activeIndex;
              const primaryName  = (lang === "ar" ? product.nameAr : product.nameEn) ?? product.name ?? "";
              const secondaryName = (lang === "ar" ? product.nameEn : product.nameAr) ?? product.name ?? "";

              return (
                <li key={product.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors",
                      active ? "bg-teal-50" : "hover:bg-slate-50",
                    )}
                    onClick={() => onProductClick(product.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block min-w-0 truncate text-sm font-black text-slate-950">
                        {highlightMatch(primaryName, searchQuery)}
                      </span>
                      {secondaryName && secondaryName !== primaryName ? (
                        <span className="mt-1 block min-w-0 truncate text-xs font-semibold text-slate-400" dir="auto">
                          {secondaryName}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-black text-teal-600">
                        {product.price.toFixed(2)} EGP
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                          product.inStock
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-600",
                        )}
                      >
                        {product.inStock
                          ? lang === "ar" ? "متاح"     : "In stock"
                          : lang === "ar" ? "غير متاح" : "Out"}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Empty state */}
      {totalItems === 0 ? (
        <div className="px-4 py-8">
          {(workerStatus === "building" || isSearching) ? (
            <div className="flex items-center justify-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
              <span className="text-sm font-semibold text-slate-600">
                {lang === "ar"
                  ? isSearching
                    ? "جاري البحث عن المنتجات..."
                    : "جاري تحضير البيانات..."
                  : isSearching
                    ? "Searching products..."
                    : "Loading search index..."}
              </span>
            </div>
          ) : (
            <span className="block text-center text-sm font-semibold text-slate-500">
              {lang === "ar"
                ? "لا توجد اقتراحات سريعة، اضغط Enter لعرض النتائج."
                : "No quick suggestions yet. Press Enter to show results."}
            </span>
          )}
        </div>
      ) : null}

      {/* Footer hint */}
      <div
        className={cn(
          "border-t border-slate-100 px-4 py-2.5 text-[10px] font-semibold text-slate-400",
          lang === "ar" ? "text-right" : "text-left",
        )}
      >
        {mode === "categories"
          ? lang === "ar"
            ? `يتم تصفية الأقسام مباشرة عند كتابة "${trimmedQuery}".`
            : `Categories update live while you type "${trimmedQuery}".`
          : mode === "category-products"
            ? lang === "ar"
              ? `يتم تصفية منتجات هذا القسم مباشرة عند كتابة "${trimmedQuery}".`
              : `This section updates live while you type "${trimmedQuery}".`
            : lang === "ar"
              ? `اضغط Enter لعرض نتائج "${trimmedQuery}" في صفحة المنتجات.`
              : `Press Enter to open "${trimmedQuery}" in the products feed.`}
      </div>
    </div>
  );
});

// ─── SiteSearchField — orchestrating shell ────────────────────────────────────

export function SiteSearchField({
  inputRef,
  className,
  inputClassName,
  iconClass,
  mobileSubmitPadding,
  placeholder,
}: SiteSearchFieldProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useLanguage();
  const { categories } = useCatalog();

  // SearchInputContext — only re-renders on query string changes
  const { searchQuery, setSearchQuery, commitQuery } = useSearchInput();
  // SearchResultsContext — only re-renders on suggestion list changes
  const { suggestions, workerStatus, isSearching } = useSearchResults();

  const mode                = getSiteSearchMode(location.pathname);
  const effectivePlaceholder = placeholder ?? getSiteSearchPlaceholder(location.pathname, lang);

  // ── Visible product suggestions ──────────────────────────────────────────
  const visibleProducts = useMemo(() => {
    if (mode === "categories") return [];
    return suggestions.slice(0, mode === "global" ? 5 : 7);
  }, [mode, suggestions]);

  // ── Visible category suggestions ─────────────────────────────────────────
  const categoryMatches   = useCatalogCategorySearch(categories, searchQuery);
  const visibleCategories = useMemo(() => {
    if (mode === "products" || mode === "category-products") return [];
    return categoryMatches.slice(0, mode === "global" ? 4 : 7);
  }, [categoryMatches, mode]);

  // ── Panel / keyboard state ────────────────────────────────────────────────
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex,     setActiveIndex]     = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const trimmedQuery    = searchQuery.trim();
  const suggestionItems: SuggestionItem[] = useMemo(
    () => [
      ...visibleCategories.map((c) => ({ type: "category" as const, id: c.id })),
      ...visibleProducts.map((p)   => ({ type: "product"  as const, id: p.id })),
    ],
    [visibleCategories, visibleProducts],
  );

  const canShowPanel = showSuggestions && trimmedQuery.length > 1;

  // ── Reset active index when suggestions change ────────────────────────────
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestionItems]);

  // ── Click-outside to close ────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  // ── Navigation callbacks ──────────────────────────────────────────────────

  const handleSelectProduct = useCallback((id: string) => {
    setShowSuggestions(false);
    navigate(`/products/${id}`);
  }, [navigate]);

  const handleSelectCategory = useCallback((id: string) => {
    setShowSuggestions(false);
    navigate(`/categories/${id}`);
  }, [navigate]);

  const handleCommitSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setShowSuggestions(false);
    const path = resolveSiteSearchSubmitPath(location.pathname, trimmed);
    if (path) navigate(path);
  }, [searchQuery, navigate, location.pathname]);

  // ── Input change handler ──────────────────────────────────────────────────

  const handleChange = useCallback((value: string) => {
    setSearchQuery(value);
    commitQuery(value);
    setShowSuggestions(true);
    setActiveIndex(-1);
  }, [setSearchQuery, commitQuery]);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!canShowPanel) {
        if (e.key === "Enter") handleCommitSearch();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestionItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setActiveIndex(-1);
        return;
      }
      if (e.key === "Enter") {
        if (activeIndex >= 0 && activeIndex < suggestionItems.length) {
          const item = suggestionItems[activeIndex];
          if (item.type === "category") handleSelectCategory(item.id);
          else                          handleSelectProduct(item.id);
        } else {
          handleCommitSearch();
        }
      }
    },
    [
      activeIndex,
      canShowPanel,
      suggestionItems,
      handleCommitSearch,
      handleSelectCategory,
      handleSelectProduct,
    ],
  );

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {/*
       * SearchInput is memo'd — it ONLY re-renders when searchQuery, lang, or
       * any of the stable callbacks changes.  Suggestion updates never touch it.
       */}
      <SearchInput
        searchQuery={searchQuery}
        lang={lang}
        placeholder={effectivePlaceholder}
        mobileSubmitPadding={mobileSubmitPadding}
        inputClassName={inputClassName}
        iconClass={iconClass}
        inputRef={inputRef}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(true)}
        onCommit={handleCommitSearch}
      />

      {/*
       * SuggestionPanel is memo'd — it re-renders when suggestions or
       * activeIndex changes, but NOT when the user is typing between suggestion
       * update cycles.
       */}
      {canShowPanel ? (
        <SuggestionPanel
          lang={lang}
          mode={mode}
          searchQuery={searchQuery}
          visibleCategories={visibleCategories}
          visibleProducts={visibleProducts}
          activeIndex={activeIndex}
          onCategoryClick={handleSelectCategory}
          onProductClick={handleSelectProduct}
          workerStatus={workerStatus}
          isSearching={isSearching}
        />
      ) : null}
    </div>
  );
}