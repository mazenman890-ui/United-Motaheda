// Home.tsx – noon-style redesign
import { useMemo, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  MapPin,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Zap,
} from "lucide-react";
import { cn } from "../components/UI";
import { ProductGrid } from "../components/ProductGrid";
import { Reveal } from "../components/Reveal";
import { SearchBar } from "../components/SearchBar";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { useCatalog } from "../../contexts/CatalogContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSearch } from "../../contexts/SearchContext";
import { locations } from "../data";
import { useCatalogCategorySearch } from "../hooks/useCatalogCategorySearch";
import { getLocalizedProductName } from "../localization";
import { getDeliveryWindowLabel, getServiceHoursSentence } from "../config";
import { HomeMobile } from "./HomeMobile";

/* ─── Skeleton ─────────────────────────────────────────────── */
function HomeSkeleton() {
  return (
    <div className="home-page min-h-screen bg-slate-50">
      <div className="h-[22rem] animate-pulse bg-gradient-to-br from-teal-600 to-emerald-500" />
      <div className="page-section py-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-[1.5rem] bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Category chip for the hero strip ─────────────────────── */
const CAT_COLORS = [
  "from-teal-400 to-cyan-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-green-500",
  "from-sky-400 to-blue-500",
  "from-red-400 to-rose-500",
  "from-indigo-400 to-violet-500",
  "from-lime-400 to-emerald-500",
  "from-orange-400 to-red-500",
];

function CategoryChip({
  category,
  index,
  lang,
}: {
  category: { id: string; name: string; nameEn?: string };
  index: number;
  lang: "ar" | "en";
}) {
  const color = CAT_COLORS[index % CAT_COLORS.length];
  const label = lang === "ar" ? category.name : (category.nameEn ?? category.name);
  const initials = label.slice(0, 2).toUpperCase();
  return (
    <Link
      to={`/categories/${category.id}`}
      className="group flex flex-shrink-0 flex-col items-center gap-2"
    >
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_4px_14px_rgba(0,0,0,0.12)] ring-2 ring-white/60 transition-all group-hover:-translate-y-1 group-hover:shadow-[0_8px_20px_rgba(0,0,0,0.16)]",
          color,
        )}
      >
        <span className="text-[13px] font-black tracking-tight">{initials}</span>
      </div>
      <span className="max-w-[4.5rem] truncate text-center text-[11px] font-bold leading-tight text-white/90">
        {label}
      </span>
    </Link>
  );
}

/* ─── Promo card (left column) ──────────────────────────────── */
function PromoCard({
  to,
  titleAr,
  titleEn,
  descAr,
  descEn,
  Icon,
  color,
  lang,
}: {
  to: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  Icon: React.ElementType;
  color: string;
  lang: "ar" | "en";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-[1.4rem] p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        color,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/25 backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-1" />
      </div>
      <div>
        <h3 className="text-sm font-black leading-tight text-white">
          {lang === "ar" ? titleAr : titleEn}
        </h3>
        <p className="mt-0.5 text-[11px] font-semibold leading-5 text-white/75">
          {lang === "ar" ? descAr : descEn}
        </p>
      </div>
    </Link>
  );
}

/* ─── Mini product card (center column) ─────────────────────── */
function MiniProductCard({
  product,
  lang,
}: {
  product: {
    id: string;
    nameAr?: string;
    nameEn?: string;
    price: number;
    inStock: boolean;
    categoryName?: string;
    categoryNameEn?: string;
  };
  lang: "ar" | "en";
}) {
  const isRtl = lang === "ar";
  const name = getLocalizedProductName(product as Parameters<typeof getLocalizedProductName>[0], lang);
  const catLabel = lang === "ar" ? product.categoryName : product.categoryNameEn;
  return (
    <Link
      to={`/products/${product.id}`}
      className="group flex flex-col gap-2 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        {catLabel && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-black text-teal-700">
            {catLabel}
          </span>
        )}
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black",
            product.inStock
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {isRtl ? (product.inStock ? "متاح" : "غير متاح") : (product.inStock ? "In stock" : "Out")}
        </span>
      </div>
      <p className="line-clamp-2 text-[12px] font-black leading-tight text-slate-900">
        {name}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="text-sm font-black text-teal-700">
          {product.price.toFixed(2)}{" "}
          <span className="text-[10px] font-bold text-slate-500">{isRtl ? "ج.م" : "EGP"}</span>
        </span>
        <ArrowRight className={cn("h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5", isRtl && "rotate-180")} />
      </div>
    </Link>
  );
}

/* ─── In-focus banner card (right column) ───────────────────── */
function FocusBanner({
  to,
  eyebrowAr,
  eyebrowEn,
  titleAr,
  titleEn,
  descAr,
  descEn,
  color,
  Icon,
  lang,
}: {
  to: string;
  eyebrowAr: string;
  eyebrowEn: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  color: string;
  Icon: React.ElementType;
  lang: "ar" | "en";
}) {
  const isRtl = lang === "ar";
  return (
    <Link
      to={to}
      className={cn(
        "group relative flex min-h-[8rem] flex-col justify-between overflow-hidden rounded-[1.4rem] p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl",
        color,
      )}
    >
      <div className="absolute -end-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-xl" aria-hidden />
      <div className="absolute -bottom-6 -start-4 h-24 w-24 rounded-full bg-black/10 blur-2xl" aria-hidden />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white backdrop-blur-sm">
          <Icon className="h-3 w-3" />
          {lang === "ar" ? eyebrowAr : eyebrowEn}
        </div>
        <h3 className="mt-2.5 text-base font-black leading-tight text-white">
          {lang === "ar" ? titleAr : titleEn}
        </h3>
        <p className="mt-1 text-[11px] font-semibold leading-5 text-white/80">
          {lang === "ar" ? descAr : descEn}
        </p>
      </div>
      <div className={cn("relative z-10 mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-white/90 transition-all group-hover:gap-2.5", isRtl ? "flex-row-reverse" : "")}>
        {lang === "ar" ? "اكتشف الآن" : "Explore now"}
        <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
      </div>
    </Link>
  );
}

/* ─── Main export ───────────────────────────────────────────── */
export default function Home() {
  const isShopperShell = useIsShopperShell();
  if (isShopperShell) return <HomeMobile />;
  return <HomeDesktop />;
}

/* ─── Desktop view ──────────────────────────────────────────── */
function HomeDesktop() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { searchQuery, setSearchQuery, commitQuery, suggestions } = useSearch();
  const { categories, featuredProducts, lastUpdated, isLoading, error } = useCatalog();
  const isInitialLoading = isLoading && featuredProducts.length === 0;
  const isRtl = lang === "ar";

  const categorySearchResults = useCatalogCategorySearch(categories, searchQuery);
  const heroCategorySuggestions = searchQuery.trim().length >= 2 ? categorySearchResults.slice(0, 3) : [];
  const heroProductSuggestions = searchQuery.trim().length >= 2 ? suggestions.slice(0, 5) : [];

  const primaryLocation = locations.find((l) => l.isPrimary) ?? locations[0];
  const heroProducts = featuredProducts.slice(0, 4);
  const offerProducts = featuredProducts.slice(4, 10);
  const moreProducts = featuredProducts.slice(10, 22);
  const categoryChips = categories.slice(0, 16);
  const categoryCardGrid = categories.slice(0, 8);
  const deliveryWindowLabel = getDeliveryWindowLabel(lang);
  const serviceHoursText = getServiceHoursSentence(lang);

  const stripRef = useRef<HTMLDivElement>(null);

  const liveUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return lang === "ar" ? "متصل بالمصدر المباشر" : "Connected to live source";
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(lastUpdated));
  }, [lang, lastUpdated]);

  const scrollStrip = (dir: "start" | "end") => {
    const el = stripRef.current;
    if (!el) return;
    const amount = 280;
    el.scrollBy({ left: (isRtl ? -1 : 1) * (dir === "end" ? amount : -amount), behavior: "smooth" });
  };

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) { navigate("/products"); return; }
    commitQuery(q);
    navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  const promoCards = [
    { to: "/products", titleAr: "تصفح الكتالوج", titleEn: "Browse Catalog", descAr: "بحث متقدم وفلاتر ذكية", descEn: "Smart search & filters", Icon: ShoppingBag, color: "bg-gradient-to-br from-teal-500 to-cyan-600 shadow-[0_8px_24px_rgba(20,184,166,0.25)]" },
    { to: "/offers", titleAr: "العروض الحالية", titleEn: "Current Offers", descAr: "منتجات مميزة الآن", descEn: "Featured products now", Icon: Sparkles, color: "bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_8px_24px_rgba(244,63,94,0.22)]" },
    { to: "/categories", titleAr: "خريطة الأقسام", titleEn: "Category Map", descAr: "تصفح حسب القسم", descEn: "Browse by section", Icon: LayoutGrid, color: "bg-gradient-to-br from-violet-500 to-purple-600 shadow-[0_8px_24px_rgba(139,92,246,0.22)]" },
    { to: "/products", titleAr: "توصيل للقاهرة", titleEn: "Cairo Delivery", descAr: deliveryWindowLabel, descEn: deliveryWindowLabel, Icon: Truck, color: "bg-gradient-to-br from-emerald-500 to-green-600 shadow-[0_8px_24px_rgba(16,185,129,0.22)]" },
  ];

  const focusBanners = [
    { to: "/offers", eyebrowAr: "مميز", eyebrowEn: "Featured", titleAr: "العروض الحالية", titleEn: "Current Offers", descAr: "استعرض أحدث العروض المميزة في الكتالوج", descEn: "Browse the latest featured deals in the catalog", color: "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-[0_12px_36px_rgba(251,146,60,0.3)]", Icon: Star },
    { to: "/categories", eyebrowAr: "الأقسام", eyebrowEn: "Categories", titleAr: "تصفح بالقسم المناسب", titleEn: "Browse the right category", descAr: "ابدأ من القسم وانتقل للمنتج", descEn: "Start from a section, jump to the product", color: "bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 shadow-[0_12px_36px_rgba(139,92,246,0.28)]", Icon: LayoutGrid },
    { to: "/products", eyebrowAr: "سريع", eyebrowEn: "Fast", titleAr: "بحث فوري بالاسم أو الكود", titleEn: "Instant search by name or code", descAr: "اكتب واحصل على النتيجة فورًا", descEn: "Type and get results instantly", color: "bg-gradient-to-br from-teal-500 via-cyan-600 to-sky-700 shadow-[0_12px_36px_rgba(20,184,166,0.28)]", Icon: Zap },
  ];

  const serviceHighlights = [
    { Icon: Truck, titleAr: "توصيل داخل القاهرة", titleEn: "Cairo Delivery", descAr: "رسوم التوصيل حسب منطقتك وتُعرض قبل تأكيد الطلب.", descEn: "Delivery fee based on your area, shown before order confirmation." },
    { Icon: MapPin, titleAr: "نخدم كل القاهرة", titleEn: "Serving all of Cairo", descAr: primaryLocation.fullNameAr, descEn: primaryLocation.fullNameEn },
    { Icon: Clock3, titleAr: "خدمة متاحة طوال الوقت", titleEn: "Always-on service", descAr: `${serviceHoursText} — ${liveUpdatedLabel}`, descEn: `${serviceHoursText} — ${liveUpdatedLabel}` },
  ];

  if (isInitialLoading) return <HomeSkeleton />;

  return (
    <div className="home-page overflow-x-hidden bg-slate-50">

      {/* ══════════════ SECTION 1: HERO ══════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600">
        {/* Background decoration */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -end-32 -top-32 h-80 w-80 rounded-full bg-white/8 blur-3xl" />
          <div className="absolute -start-16 bottom-0 h-64 w-64 rounded-full bg-teal-900/30 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="page-section relative z-10 pb-6 pt-8 sm:pt-10">
          {/* Top row: eyebrow + live badge */}
          <div className={cn("flex flex-wrap items-center gap-2", isRtl ? "flex-row-reverse" : "")}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              {isRtl ? "صيدلية متحدة" : "United Pharmacy"}
            </span>
            <span className="hidden items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold text-white/80 sm:inline-flex">
              <Clock3 className="h-3 w-3" />
              {liveUpdatedLabel}
            </span>
          </div>

          {/* Headline */}
          <div className={cn("mt-5 max-w-2xl", isRtl ? "text-right" : "text-left")}>
            <h1 className={cn(
              "font-black text-white",
              isRtl
                ? "text-[1.9rem] leading-[1.3] sm:text-[2.6rem] sm:leading-[1.24]"
                : "text-[2rem] leading-[1.05] tracking-tight sm:text-[2.8rem]",
            )}>
              {isRtl ? "ابحث عن الدواء المناسب وابدأ الطلب" : "Find the right medicine and place your order"}
            </h1>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-white/75 sm:text-base">
              {isRtl
                ? "بحث ذكي بالعربية والإنجليزية — اسم، كود، أو قسم."
                : "Smart bilingual search — by name, code, or category."}
            </p>
          </div>

          {/* Search bar */}
          {error && (
            <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-400/20 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm">
              {isRtl ? "تعذر تحديث الكتالوج — تُعرض آخر البيانات المتاحة." : "Catalog refresh issue — showing latest available data."}
            </div>
          )}

          <form className="relative mt-5 max-w-2xl" onSubmit={handleSearch}>
            <SearchBar
              value={searchQuery}
              onChange={(v) => { setSearchQuery(v); commitQuery(v); }}
              onClear={() => { setSearchQuery(""); commitQuery(""); }}
              placeholder={isRtl ? "ابحث بالاسم أو الكود أو القسم…" : "Search by name, code, or category…"}
              lang={lang}
              shellClassName="rounded-[1.5rem] border-white/30 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
              suggestions={
                heroProductSuggestions.length > 0 || heroCategorySuggestions.length > 0 ? (
                  <div className="absolute inset-x-0 top-[calc(100%+0.6rem)] z-30 rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-[0_24px_56px_rgba(15,23,42,0.14)]">
                    {heroProductSuggestions.length > 0 && (
                      <div>
                        <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          {isRtl ? "منتجات" : "Products"}
                        </p>
                        <div className="space-y-1">
                          {heroProductSuggestions.map((p) => (
                            <Link
                              key={p.id}
                              to={`/products/${p.id}`}
                              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-900">{getLocalizedProductName(p, lang)}</p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">{lang === "ar" ? p.categoryName : p.categoryNameEn}</p>
                              </div>
                              <span className="shrink-0 text-xs font-black text-slate-400">{p.price.toFixed(2)} {isRtl ? "ج.م" : "EGP"}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {heroCategorySuggestions.length > 0 && (
                      <div className={cn(heroProductSuggestions.length > 0 && "mt-2 border-t border-slate-100 pt-2")}>
                        <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          {isRtl ? "أقسام" : "Categories"}
                        </p>
                        <div className="space-y-1">
                          {heroCategorySuggestions.map((c) => (
                            <Link
                              key={c.id}
                              to={`/products?category=${encodeURIComponent(c.id)}${searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : ""}`}
                              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                            >
                              <div>
                                <p className="text-sm font-black text-slate-900">{isRtl ? c.name : c.nameEn}</p>
                                <p className="text-xs font-semibold text-slate-500">{isRtl ? "قسم" : "Category"}</p>
                              </div>
                              <ArrowRight className={cn("h-4 w-4 text-slate-400", isRtl && "rotate-180")} />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null
              }
            />
          </form>

          {/* Category chip strip */}
          {categoryChips.length > 0 && (
            <div className="relative mt-7">
              {/* Scroll buttons */}
              <button
                type="button"
                onClick={() => scrollStrip("start")}
                className="absolute -start-3 top-1/2 z-10 -translate-y-1/2 hidden h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition hover:bg-white sm:flex"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => scrollStrip("end")}
                className="absolute -end-3 top-1/2 z-10 -translate-y-1/2 hidden h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition hover:bg-white sm:flex"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4 text-slate-700" />
              </button>

              <div
                ref={stripRef}
                className="flex gap-4 overflow-x-auto pb-2"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {/* "All products" anchor */}
                <Link
                  to="/products"
                  className="group flex flex-shrink-0 flex-col items-center gap-2"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/25 ring-2 ring-white/50 backdrop-blur-sm transition-all group-hover:-translate-y-1">
                    <ShoppingBag className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-white/90">{isRtl ? "الكل" : "All"}</span>
                </Link>

                {categoryChips.map((cat, i) => (
                  <CategoryChip key={cat.id} category={cat} index={i} lang={lang} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════ SECTION 2: PROMO GRID ══════════════ */}
      <section className="bg-slate-50 py-8 sm:py-10">
        <div className="page-section">
          <div className="grid gap-5 lg:grid-cols-3">

            {/* LEFT: More reasons to shop */}
            <div>
              <div className={cn("mb-4 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <h2 className="text-base font-black text-slate-900">
                  {isRtl ? "أسباب للتسوق هنا" : "More reasons to shop"}
                </h2>
                <Link to="/products" className="text-[11px] font-black text-teal-600 hover:text-teal-700">
                  {isRtl ? "تصفح الكل" : "View all"}
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {promoCards.map((card) => (
                  <PromoCard key={card.to + card.titleEn} lang={lang} {...card} />
                ))}
              </div>
            </div>

            {/* CENTER: Featured products (mega deals style) */}
            <div>
              <div className={cn("mb-4 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <h2 className="text-base font-black text-slate-900">
                  {isRtl ? "منتجات مميزة" : "Featured products"}
                </h2>
                <Link to="/offers" className="text-[11px] font-black text-teal-600 hover:text-teal-700">
                  {isRtl ? "كل العروض" : "All offers"}
                </Link>
              </div>
              {heroProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {heroProducts.map((p) => (
                    <MiniProductCard key={p.id} product={p} lang={lang} />
                  ))}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-[1.4rem] border border-dashed border-slate-200 bg-white">
                  <div className="text-center">
                    <PackageSearch className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-400">{isRtl ? "لا توجد منتجات بعد" : "No products yet"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: In focus banners */}
            <div>
              <div className={cn("mb-4 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <h2 className="text-base font-black text-slate-900">
                  {isRtl ? "في الواجهة" : "In focus"}
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {focusBanners.map((b) => (
                  <FocusBanner key={b.to + b.titleEn} lang={lang} {...b} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════ SECTION 3: CATEGORY GRID ══════════════ */}
      {categoryCardGrid.length > 0 && (
        <section className="border-t border-slate-200/60 bg-white py-8 sm:py-10">
          <div className="page-section">
            <Reveal direction="up">
              <div className={cn("mb-6 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                    <LayoutGrid className="h-3 w-3" />
                    {isRtl ? "الأقسام" : "Categories"}
                  </div>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    {isRtl ? "الأقسام الرئيسية" : "Main categories"}
                  </h2>
                </div>
                <Link
                  to="/categories"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                >
                  {isRtl ? "كل الأقسام" : "All categories"}
                  <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
                </Link>
              </div>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categoryCardGrid.map((cat, i) => {
                const color = CAT_COLORS[i % CAT_COLORS.length];
                const label = lang === "ar" ? cat.name : (cat.nameEn ?? cat.name);
                const desc = lang === "ar" ? cat.descAr : (cat.descEn ?? cat.descAr ?? "");
                return (
                  <Reveal key={cat.id} direction="up" delay={i * 40}>
                    <Link
                      to={`/categories/${cat.id}`}
                      className="group relative overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-transparent hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)]"
                    >
                      <div className="absolute -end-4 -top-4 h-20 w-20 rounded-full opacity-0 blur-2xl transition-all group-hover:opacity-100" style={{ background: `var(--tw-gradient-from, #14b8a6)` }} aria-hidden />
                      <div className={cn("mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", color)}>
                        <LayoutGrid className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900">{label}</h3>
                      {desc && (
                        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500">{desc}</p>
                      )}
                      <div className={cn("mt-3 inline-flex items-center gap-1.5 text-[11px] font-black text-teal-600 transition-all group-hover:gap-2.5", isRtl && "flex-row-reverse")}>
                        {isRtl ? "افتح القسم" : "Open section"}
                        <ArrowRight className={cn("h-3 w-3", isRtl && "rotate-180")} />
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════ SECTION 4: FULL PRODUCT GRID ══════════════ */}
      {offerProducts.length > 0 && (
        <section className="bg-slate-50 py-8 sm:py-10">
          <div className="page-section">
            <Reveal direction="up">
              <div className={cn("mb-6 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-rose-600">
                    <Sparkles className="h-3 w-3" />
                    {isRtl ? "مختارات جاهزة" : "Ready picks"}
                  </div>
                  <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                    {isRtl ? "منتجات جاهزة للعرض" : "Products ready to browse"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-600 sm:inline-flex">
                    {isRtl ? `آخر مزامنة: ${liveUpdatedLabel}` : `Synced: ${liveUpdatedLabel}`}
                  </span>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                  >
                    {isRtl ? "كل المنتجات" : "All products"}
                    <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
                  </Link>
                </div>
              </div>
            </Reveal>

            <div className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <ProductGrid products={offerProducts} />
            </div>

            {moreProducts.length > 0 && (
              <Reveal direction="up" delay={60}>
                <div className="mt-5 overflow-hidden rounded-[1.8rem] border border-teal-100 bg-gradient-to-br from-teal-50/60 to-cyan-50/40 p-5 sm:p-6">
                  <div className={cn("mb-4 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                    <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-teal-700">
                      <Star className="h-3 w-3" />
                      {isRtl ? "مزيد من المنتجات" : "More products"}
                    </div>
                    <Link to="/offers" className="text-[11px] font-black text-teal-600 hover:text-teal-700">
                      {isRtl ? "عرض المزيد" : "See more"}
                    </Link>
                  </div>
                  <ProductGrid products={moreProducts} />
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* ══════════════ SECTION 5: HOW IT WORKS ══════════════ */}
      <section className="border-t border-slate-200/60 bg-white py-10 sm:py-14">
        <div className="page-section">
          <Reveal direction="up">
            <div className={cn("mb-8 max-w-xl", isRtl ? "text-right" : "text-left")}>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                <Barcode className="h-3 w-3" />
                {isRtl ? "كيف تتسوق" : "How to shop"}
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                {isRtl ? "من الصفحة الرئيسية إلى المنتج المناسب" : "From the homepage to the right item"}
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: 1, path: "/categories", Icon: LayoutGrid, titleAr: "ابدأ من القسم الصحيح", titleEn: "Start from the right section", descAr: "ابدأ من القسم المناسب ثم انتقل إلى المنتجات المتاحة داخله.", descEn: "Start from the relevant category, then dive into the available products inside it." },
              { n: 2, path: "/products", Icon: Barcode, titleAr: "راجع المنتج بوضوح", titleEn: "Review the item clearly", descAr: "الاسم والسعر والمرجع وحالة الطلب مرتبة بشكل واضح داخل البطاقة.", descEn: "Name, price, reference, and order status are clearly organized inside each card." },
              { n: 3, path: "/offers", Icon: ShieldCheck, titleAr: "ابدأ من الجاهز للطلب", titleEn: "Begin from ready-to-order items", descAr: "تعرض صفحة العروض منتجات متاحة للطلب المباشر.", descEn: "The offers page surfaces products that are ready for direct ordering." },
            ].map(({ n, path, Icon, titleAr, titleEn, descAr, descEn }, i) => (
              <Reveal key={path} direction="up" delay={i * 70}>
                <Link
                  to={path}
                  className="group flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-teal-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-[11px] font-black text-white shadow">
                      {n}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-black text-slate-950">{isRtl ? titleAr : titleEn}</h3>
                  <p className="mt-1.5 text-[12px] font-semibold leading-6 text-slate-500">{isRtl ? descAr : descEn}</p>
                  <div className={cn("mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-black text-teal-600 transition-all group-hover:gap-2.5", isRtl && "flex-row-reverse")}>
                    {isRtl ? "انتقل الآن" : "Open now"}
                    <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          {/* CTA row */}
          <Reveal direction="up" delay={220}>
            <div className={cn("mt-6 flex flex-col items-start gap-4 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between", isRtl && "sm:flex-row-reverse")}>
              <div className={isRtl ? "text-right" : "text-left"}>
                <p className="text-sm font-black text-slate-950">{isRtl ? "ابدأ الآن من الكتالوج أو من الأقسام" : "Start now from the catalog or sections"}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-slate-500">{isRtl ? `${primaryLocation.fullNameAr} — ${primaryLocation.hoursAr}` : `${primaryLocation.fullNameEn} — ${primaryLocation.hoursEn}`}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link to="/products" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-xs font-black text-white shadow-[0_8px_20px_rgba(20,184,166,0.28)] transition-all hover:bg-teal-700">
                  {isRtl ? "كل المنتجات" : "All products"}
                  <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
                </Link>
                <Link to="/categories" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-600 transition-all hover:bg-slate-50">
                  {isRtl ? "كل الأقسام" : "All categories"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════════════ SECTION 6: SERVICE HIGHLIGHTS ══════════════ */}
      <section className="border-t border-slate-200/60 bg-gradient-to-b from-slate-50 to-white py-10 sm:py-14">
        <div className="page-section">
          <Reveal direction="up">
            <div className={cn("mb-8 text-center")}>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm">
                <ShieldCheck className="h-3 w-3" />
                {isRtl ? "الدعم والخدمة" : "Support & service"}
              </div>
              <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                {isRtl ? "لماذا تتسوق معنا" : "Why shop with us"}
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {serviceHighlights.map(({ Icon, titleAr, titleEn, descAr, descEn }, i) => (
              <Reveal key={titleEn} direction="up" delay={i * 70}>
                <div className={cn("flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md", isRtl && "items-end text-right")}>
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-teal-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-950">{isRtl ? titleAr : titleEn}</h3>
                  <p className="mt-1.5 text-[12px] font-semibold leading-6 text-slate-500">{isRtl ? descAr : descEn}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Bottom CTA */}
          <Reveal direction="up" delay={220}>
            <div className="mt-8 overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-teal-600 to-emerald-600 p-6 shadow-[0_16px_48px_rgba(20,184,166,0.25)] sm:p-8">
              <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between", isRtl && "sm:flex-row-reverse")}>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <p className="text-lg font-black text-white sm:text-xl">
                    {isRtl ? "ابدأ التسوق الآن" : "Start shopping now"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white/75">
                    {isRtl ? "انتقل من الصفحة الرئيسية إلى الأقسام والمنتجات والعروض." : "Move from the homepage into categories, products, and offers."}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link to="/products" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-black text-teal-700 shadow transition-all hover:bg-teal-50">
                    {isRtl ? "تسوق الآن" : "Shop now"}
                    <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
                  </Link>
                  <Link to="/contact" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-6 text-sm font-black text-white backdrop-blur-sm transition-all hover:bg-white/25">
                    {isRtl ? "تواصل معنا" : "Contact us"}
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  );
}
