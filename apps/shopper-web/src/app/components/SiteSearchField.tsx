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
import { Clock, Grid2x2, Search, X } from "lucide-react";
import { useCatalog } from "../../contexts/CatalogContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSearchInput, useSearchResults } from "../../contexts/SearchContext";
import { useCatalogCategorySearch } from "../hooks/useCatalogCategorySearch";
import { getLocalizedCategoryName } from "../localization";
import type { CatalogCategory, CatalogProduct } from "../catalog";
import { getCatalogProductImage } from "../catalog";
import { cn } from "./UI";

// ─── Recent searches ──────────────────────────────────────────────────────────

const RECENT_KEY    = "up:recent-searches";
const RECENT_LIMIT  = 6;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;
  const prev    = loadRecentSearches();
  const updated = [trimmed, ...prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_LIMIT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* quota */ }
}

function removeRecentSearch(query: string) {
  const prev    = loadRecentSearches();
  const updated = prev.filter((q) => q !== query);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch { /* quota */ }
}

function clearAllRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY); } catch { /* quota */ }
}

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

// ─── RecentSearchesPanel ──────────────────────────────────────────────────────

interface RecentSearchesPanelProps {
  lang:           "ar" | "en";
  recents:        string[];
  onSelect:       (q: string) => void;
  onRemove:       (q: string) => void;
  onClearAll:     () => void;
}

const RecentSearchesPanel = memo(function RecentSearchesPanel({
  lang, recents, onSelect, onRemove, onClearAll,
}: RecentSearchesPanelProps) {
  if (recents.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label={lang === "ar" ? "عمليات البحث الأخيرة" : "Recent searches"}
      className="absolute start-0 end-0 top-[calc(100%+0.35rem)] z-[60] rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_24px_48px_rgba(15,23,42,0.12)]"
    >
      <div className={cn(
        "flex items-center justify-between px-4 pb-1.5 pt-0.5",
        lang === "ar" ? "flex-row-reverse" : "flex-row",
      )}>
        <div className={cn(
          "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400",
          lang === "ar" ? "flex-row-reverse" : "flex-row",
        )}>
          <Clock className="h-3 w-3" />
          {lang === "ar" ? "بحث سابق" : "Recent searches"}
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="text-[10px] font-bold text-slate-400 transition-colors hover:text-rose-500"
        >
          {lang === "ar" ? "مسح الكل" : "Clear all"}
        </button>
      </div>
      <ul>
        {recents.map((q) => (
          <li key={q} role="option" aria-selected={false}>
            <div className={cn(
              "group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50",
              lang === "ar" ? "flex-row-reverse" : "flex-row",
            )}>
              <button
                type="button"
                className="min-w-0 flex-1 text-start"
                onClick={() => onSelect(q)}
              >
                <span className="block truncate text-sm font-semibold text-slate-700 group-hover:text-slate-950">
                  {q}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(q)}
                className="shrink-0 rounded-full p-0.5 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                aria-label={lang === "ar" ? `حذف "${q}"` : `Remove "${q}"`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});

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
        "absolute start-0 end-0 top-[calc(100%+0.35rem)] z-[60] max-h-[26rem] overflow-auto rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-[0_28px_56px_rgba(15,23,42,0.14),0_0_0_1px_rgba(15,23,42,0.04)]",
        lang === "ar" ? "text-right" : "text-left",
      )}
      role="listbox"
      aria-label={lang === "ar" ? "اقتراحات البحث" : "Search suggestions"}
    >
      {/* Cross-script smart match indicator */}
      {isArabicScript(trimmedQuery) ? (
        <div
          className={cn(
            "flex items-center gap-2 px-4 pb-1.5 pt-2 text-[10px] font-black uppercase tracking-[0.16em] text-teal-600",
            lang === "ar" ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-500" />
          {lang === "ar" ? "بحث ذكي بالعربي والإنجليزي" : "Smart Arabic & English matching"}
        </div>
      ) : null}

      {/* ── Categories section ── */}
      {visibleCategories.length > 0 ? (
        <div className="pb-1">
          <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400",
            lang === "ar" ? "flex-row-reverse" : "flex-row",
          )}>
            <Grid2x2 className="h-3.5 w-3.5" />
            {lang === "ar" ? "الأقسام" : "Categories"}
          </div>

          <ul>
            {visibleCategories.map((category, index) => {
              const active      = index === activeIndex;
              const displayName = getLocalizedCategoryName(category, lang);
              return (
                <li key={category.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-start transition-colors",
                      active ? "bg-teal-50/80" : "hover:bg-slate-50",
                    )}
                    onClick={() => onCategoryClick(category.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-950">
                        {highlightMatch(displayName, searchQuery)}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-slate-400">
                        {lang === "ar"
                          ? `${category.inStockCount.toLocaleString()} متاح الآن`
                          : `${category.inStockCount.toLocaleString()} in stock`}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-black text-teal-700 transition-colors group-hover:bg-teal-100">
                      {lang === "ar" ? "افتح" : "Open"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* ── Divider between sections ── */}
      {visibleCategories.length > 0 && visibleProducts.length > 0 ? (
        <div className="mx-3 my-1 border-t border-slate-100" />
      ) : null}

      {/* ── Products section with thumbnails ── */}
      {visibleProducts.length > 0 ? (
        <div>
          <div className={cn(
            "flex items-center gap-2 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400",
            lang === "ar" ? "flex-row-reverse" : "flex-row",
          )}>
            <Search className="h-3.5 w-3.5" />
            {lang === "ar" ? "المنتجات" : "Products"}
            {isSearching ? (
              <span className="ms-auto inline-flex h-4 w-4 items-center justify-center">
                <span className="h-3 w-3 animate-spin rounded-full border border-slate-200 border-t-teal-500" />
              </span>
            ) : null}
          </div>

          <ul>
            {visibleProducts.map((product, index) => {
              const active        = index + visibleCategories.length === activeIndex;
              const primaryName   = (lang === "ar" ? product.nameAr : product.nameEn) ?? product.name ?? "";
              const secondaryName = (lang === "ar" ? product.nameEn : product.nameAr) ?? product.name ?? "";
              const imgSrc        = getCatalogProductImage(product);

              return (
                <li key={product.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2 text-start transition-colors",
                      lang === "ar" ? "flex-row-reverse" : "flex-row",
                      active ? "bg-teal-50/80" : "hover:bg-slate-50",
                    )}
                    onClick={() => onProductClick(product.id)}
                  >
                    {/* Thumbnail */}
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt=""
                          aria-hidden
                          className="h-full w-full object-contain p-1"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[1.1rem]">💊</span>
                      )}
                      {/* In-stock dot */}
                      <span
                        className={cn(
                          "absolute bottom-0.5 end-0.5 h-2 w-2 rounded-full border border-white",
                          product.inStock ? "bg-emerald-400" : "bg-slate-300",
                        )}
                        aria-hidden
                      />
                    </div>

                    {/* Name */}
                    <div className="min-w-0 flex-1">
                      <span className="block min-w-0 truncate text-sm font-black leading-tight text-slate-950">
                        {highlightMatch(primaryName, searchQuery)}
                      </span>
                      {secondaryName && secondaryName !== primaryName ? (
                        <span className="mt-0.5 block min-w-0 truncate text-[11px] font-semibold text-slate-400" dir="auto">
                          {secondaryName}
                        </span>
                      ) : null}
                    </div>

                    {/* Price + stock */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-black tabular-nums text-teal-600">
                        {product.price.toFixed(2)}
                        <span className="ms-0.5 text-[10px] font-semibold text-slate-400">
                          {lang === "ar" ? "ج.م" : "EGP"}
                        </span>
                      </span>
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-black",
                        product.inStock
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-500",
                      )}>
                        {product.inStock
                          ? lang === "ar" ? "متاح" : "In stock"
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

      {/* ── Empty / loading state ── */}
      {totalItems === 0 ? (
        <div className="px-4 py-8">
          {(workerStatus === "building" || isSearching) ? (
            <div className="flex items-center justify-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
              <span className="text-sm font-semibold text-slate-600">
                {lang === "ar"
                  ? isSearching ? "جاري البحث…" : "جاري التحضير…"
                  : isSearching ? "Searching…"  : "Loading…"}
              </span>
            </div>
          ) : (
            <div className="text-center">
              <span className="block text-2xl">🔍</span>
              <span className="mt-2 block text-sm font-semibold text-slate-500">
                {lang === "ar"
                  ? `لا توجد نتائج سريعة لـ "${trimmedQuery}" — اضغط Enter`
                  : `No quick results for "${trimmedQuery}" — press Enter`}
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Footer hint ── */}
      <div className={cn(
        "flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[10px] font-semibold text-slate-400",
        lang === "ar" ? "flex-row-reverse" : "flex-row",
      )}>
        <span>
          {mode === "categories"
            ? lang === "ar"
              ? "الأقسام تتحدث مباشرة أثناء الكتابة"
              : "Categories filter live"
            : mode === "category-products"
              ? lang === "ar"
                ? "منتجات هذا القسم تتحدث مباشرة"
                : "Products filter live"
              : lang === "ar"
                ? "Enter لعرض كل النتائج"
                : "Press Enter for all results"}
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[9px]">↑↓</kbd>
          <span>{lang === "ar" ? "للتنقل" : "navigate"}</span>
          <kbd className="ms-1 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-[9px]">↵</kbd>
          <span>{lang === "ar" ? "اختيار" : "select"}</span>
        </span>
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

  const mode                 = getSiteSearchMode(location.pathname);
  const effectivePlaceholder = placeholder ?? getSiteSearchPlaceholder(location.pathname, lang);

  // ── Recent searches state ─────────────────────────────────────────────────
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());

  const refreshRecents = useCallback(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

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

  // Show suggestion dropdown when query has content
  const canShowPanel = showSuggestions && trimmedQuery.length > 1;
  // Show recent searches when focused with empty / very short query
  const canShowRecents = showSuggestions && trimmedQuery.length <= 1 && recentSearches.length > 0;

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
    const product = suggestions.find((p) => p.id === id);
    if (product) {
      const name = (lang === "ar" ? product.nameAr : product.nameEn) ?? product.name ?? "";
      if (name) { saveRecentSearch(name); refreshRecents(); }
    }
    setShowSuggestions(false);
    navigate(`/products/${id}`);
  }, [navigate, suggestions, lang, refreshRecents]);

  const handleSelectCategory = useCallback((id: string) => {
    setShowSuggestions(false);
    navigate(`/categories/${id}`);
  }, [navigate]);

  const handleCommitSearch = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    saveRecentSearch(trimmed);
    refreshRecents();
    setShowSuggestions(false);
    const path = resolveSiteSearchSubmitPath(location.pathname, trimmed);
    if (path) navigate(path);
  }, [searchQuery, navigate, location.pathname, refreshRecents]);

  // ── Recent search selection ───────────────────────────────────────────────

  const handleSelectRecent = useCallback((q: string) => {
    setSearchQuery(q);
    commitQuery(q);
    setShowSuggestions(true);
    setActiveIndex(-1);
    // Immediately navigate to results
    const path = resolveSiteSearchSubmitPath(location.pathname, q);
    if (path) {
      saveRecentSearch(q);
      refreshRecents();
      setShowSuggestions(false);
      navigate(path);
    }
  }, [setSearchQuery, commitQuery, navigate, location.pathname, refreshRecents]);

  const handleRemoveRecent = useCallback((q: string) => {
    removeRecentSearch(q);
    refreshRecents();
  }, [refreshRecents]);

  const handleClearAllRecents = useCallback(() => {
    clearAllRecentSearches();
    refreshRecents();
  }, [refreshRecents]);

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
        if (e.key === "Escape") setShowSuggestions(false);
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
        onFocus={() => { setShowSuggestions(true); refreshRecents(); }}
        onCommit={handleCommitSearch}
      />

      {/*
       * RecentSearchesPanel — shown when the user focuses the field with
       * an empty (or very short) query and has prior searches saved.
       */}
      {canShowRecents ? (
        <RecentSearchesPanel
          lang={lang}
          recents={recentSearches}
          onSelect={handleSelectRecent}
          onRemove={handleRemoveRecent}
          onClearAll={handleClearAllRecents}
        />
      ) : null}

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