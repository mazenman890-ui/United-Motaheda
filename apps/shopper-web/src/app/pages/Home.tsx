// Home.tsx – premium marketplace redesign
import { useMemo, useRef, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Apple,
  ArrowRight,
  Baby,
  Barcode,
  Brain,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Eye,
  FlaskConical,
  Heart,
  LayoutGrid,
  Leaf,
  MapPin,
  PackageSearch,
  Pill,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  Thermometer,
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

/* ─── Category icon pool (pharmacy-relevant) ────────────────── */
const CAT_ICONS = [
  Pill, Activity, Baby, Sparkles, Stethoscope,
  FlaskConical, Thermometer, Eye, Leaf, Apple,
  Dumbbell, Brain, ShieldCheck, Star, Zap, Heart,
];

const CAT_PALETTES = [
  { bg: "bg-teal-100",    icon: "text-teal-600",    ring: "ring-teal-200"    },
  { bg: "bg-rose-100",    icon: "text-rose-600",    ring: "ring-rose-200"    },
  { bg: "bg-violet-100",  icon: "text-violet-600",  ring: "ring-violet-200"  },
  { bg: "bg-amber-100",   icon: "text-amber-600",   ring: "ring-amber-200"   },
  { bg: "bg-emerald-100", icon: "text-emerald-600", ring: "ring-emerald-200" },
  { bg: "bg-sky-100",     icon: "text-sky-600",     ring: "ring-sky-200"     },
  { bg: "bg-pink-100",    icon: "text-pink-600",    ring: "ring-pink-200"    },
  { bg: "bg-indigo-100",  icon: "text-indigo-600",  ring: "ring-indigo-200"  },
  { bg: "bg-lime-100",    icon: "text-lime-600",    ring: "ring-lime-200"    },
  { bg: "bg-orange-100",  icon: "text-orange-600",  ring: "ring-orange-200"  },
];

/* ─── Skeleton ──────────────────────────────────────────────── */
function HomeSkeleton() {
  return (
    <div className="home-page min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-white py-10">
        <div className="page-section">
          <div className="mx-auto h-10 w-1/2 animate-pulse rounded-full bg-slate-100" />
          <div className="mx-auto mt-4 h-14 max-w-2xl animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="border-b border-slate-100 bg-white py-6">
        <div className="page-section flex gap-6 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-shrink-0 flex-col items-center gap-2">
              <div className="h-16 w-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-3 w-14 animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="py-8">
        <div className="page-section grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
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
  const navigate   = useNavigate();
  const { lang }   = useLanguage();
  const { searchQuery, setSearchQuery, commitQuery, suggestions } = useSearch();
  const { categories, featuredProducts, lastUpdated, isLoading, error } = useCatalog();
  const isRtl = lang === "ar";

  const isInitialLoading = isLoading && featuredProducts.length === 0;

  const categoryResults   = useCatalogCategorySearch(categories, searchQuery);
  const catSuggestions    = searchQuery.trim().length >= 2 ? categoryResults.slice(0, 3) : [];
  const prodSuggestions   = searchQuery.trim().length >= 2 ? suggestions.slice(0, 5) : [];

  const primaryLocation   = locations.find((l) => l.isPrimary) ?? locations[0];
  const categoryChips     = categories.slice(0, 18);
  const featuredA         = featuredProducts.slice(0, 4);   // center "mega deals"
  const featuredB         = featuredProducts.slice(4, 12);  // main product grid
  const featuredC         = featuredProducts.slice(12, 24); // second product grid
  const deliveryLabel     = getDeliveryWindowLabel(lang);
  const serviceHours      = getServiceHoursSentence(lang);
  const stripRef          = useRef<HTMLDivElement>(null);

  const liveLabel = useMemo(() => {
    if (!lastUpdated) return lang === "ar" ? "متصل" : "Live";
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }).format(new Date(lastUpdated));
  }, [lang, lastUpdated]);

  const scrollStrip = (dir: "start" | "end") => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: (isRtl ? -1 : 1) * (dir === "end" ? 240 : -240), behavior: "smooth" });
  };

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) { navigate("/products"); return; }
    commitQuery(q);
    navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  /* Reason cards */
  const reasonCards = [
    {
      to: "/products",
      titleAr: "تصفح الكتالوج",    titleEn: "Browse Catalog",
      descAr:  "بحث متقدم وفلاتر ذكية لكل المنتجات",
      descEn:  "Advanced search & smart filters",
      bg: "bg-teal-500", shadow: "shadow-[0_8px_24px_rgba(20,184,166,0.30)]",
      Icon: ShoppingBag,
    },
    {
      to: "/offers",
      titleAr: "العروض الحالية",   titleEn: "Current Offers",
      descAr:  "منتجات مميزة بأسعار تنافسية",
      descEn:  "Featured products at great prices",
      bg: "bg-rose-500", shadow: "shadow-[0_8px_24px_rgba(244,63,94,0.28)]",
      Icon: Sparkles,
    },
    {
      to: "/categories",
      titleAr: "خريطة الأقسام",   titleEn: "Category Map",
      descAr:  "تصفح حسب القسم المناسب",
      descEn:  "Browse by the right section",
      bg: "bg-violet-500", shadow: "shadow-[0_8px_24px_rgba(139,92,246,0.26)]",
      Icon: LayoutGrid,
    },
    {
      to: "/products",
      titleAr: "توصيل للقاهرة",   titleEn: "Cairo Delivery",
      descAr:  deliveryLabel,
      descEn:  deliveryLabel,
      bg: "bg-emerald-500", shadow: "shadow-[0_8px_24px_rgba(16,185,129,0.26)]",
      Icon: Truck,
    },
  ];

  /* Focus banners */
  const focusBanners = [
    {
      to: "/offers",
      labelAr: "مميز", labelEn: "Featured",
      titleAr: "العروض الحالية",         titleEn: "Current Offers",
      descAr:  "أحدث العروض من الكتالوج", descEn: "Latest deals from the catalog",
      from: "from-amber-400", via: "via-orange-500", to_color: "to-rose-500",
      Icon: Star,
    },
    {
      to: "/categories",
      labelAr: "الأقسام", labelEn: "Categories",
      titleAr: "تصفح بالقسم المناسب",   titleEn: "Browse by category",
      descAr:  "ابدأ من القسم وانتقل للمنتج", descEn: "Start from a section, jump to the item",
      from: "from-violet-500", via: "via-purple-600", to_color: "to-indigo-600",
      Icon: LayoutGrid,
    },
    {
      to: "/products",
      labelAr: "بحث فوري", labelEn: "Instant search",
      titleAr: "ابحث بالاسم أو الكود",  titleEn: "Search by name or code",
      descAr:  "اكتب واحصل على النتيجة فورًا", descEn: "Type and get results instantly",
      from: "from-teal-500", via: "via-cyan-500", to_color: "to-sky-600",
      Icon: Zap,
    },
  ];

  if (isInitialLoading) return <HomeSkeleton />;

  return (
    <div className="home-page overflow-x-hidden bg-white">

      {/* ══════ 1. HERO ══════ */}
      <section className="border-b border-slate-100 bg-white">
        <div className="page-section py-10 sm:py-14">
          <div className={cn("mx-auto max-w-3xl text-center")}>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-teal-700">
              <Sparkles className="h-3 w-3" />
              {isRtl ? "صيدلية متحدة — الكتالوج المباشر" : "United Pharmacy — Live Catalog"}
            </div>

            {/* Headline */}
            <h1 className={cn(
              "mt-5 font-black text-slate-950",
              isRtl
                ? "text-[2rem] leading-[1.32] sm:text-[2.8rem] sm:leading-[1.26]"
                : "text-[2.2rem] leading-[1.06] tracking-tight sm:text-[3.2rem]",
            )}>
              {isRtl
                ? "ابحث عن الدواء المناسب\nوابدأ الطلب بسهولة"
                : "Find the right medicine,\nplace your order with ease"}
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-[13px] font-semibold leading-7 text-slate-500 sm:text-base">
              {isRtl
                ? "عيَان و مش لاقي دواك؟ احنا معاك! اطلب اي نوع من الأدوية او الاحتياجات الطبية، وحنجيبلك اللي بتدور عليه."
                : "Smart bilingual search — by name, code, or category."}
            </p>

            {/* Error banner */}
            {error && (
              <div className="mx-auto mt-4 max-w-lg rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">
                {isRtl ? "تعذر تحديث الكتالوج — تُعرض آخر البيانات المتاحة." : "Catalog refresh issue — showing latest available data."}
              </div>
            )}

            {/* Search */}
            <form className="relative mx-auto mt-7 max-w-2xl" onSubmit={handleSearch}>
              <SearchBar
                value={searchQuery}
                onChange={(v) => { setSearchQuery(v); commitQuery(v); }}
                onClear={() => { setSearchQuery(""); commitQuery(""); }}
                placeholder={isRtl ? "ابحث بالاسم أو الكود أو القسم…" : "Search by name, code, or category…"}
                lang={lang}
                shellClassName="rounded-2xl border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.10)]"
                suggestions={
                  prodSuggestions.length > 0 || catSuggestions.length > 0 ? (
                    <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_48px_rgba(15,23,42,0.14)] text-start">
                      {prodSuggestions.length > 0 && (
                        <div>
                          <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{isRtl ? "منتجات" : "Products"}</p>
                          <div className="space-y-0.5">
                            {prodSuggestions.map((p) => (
                              <Link key={p.id} to={`/products/${p.id}`}
                                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-900">{getLocalizedProductName(p, lang)}</p>
                                  <p className="text-xs font-semibold text-slate-500">{lang === "ar" ? p.categoryName : p.categoryNameEn}</p>
                                </div>
                                <span className="shrink-0 text-xs font-black text-slate-400">{p.price.toFixed(2)} {isRtl ? "ج.م" : "EGP"}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {catSuggestions.length > 0 && (
                        <div className={cn(prodSuggestions.length > 0 && "mt-2 border-t border-slate-100 pt-2")}>
                          <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{isRtl ? "أقسام" : "Categories"}</p>
                          <div className="space-y-0.5">
                            {catSuggestions.map((c) => (
                              <Link key={c.id}
                                to={`/products?category=${encodeURIComponent(c.id)}${searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : ""}`}
                                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50">
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

            {/* Quick CTAs */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/products"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-black text-white shadow-[0_8px_20px_rgba(20,184,166,0.28)] transition-all hover:bg-teal-700 hover:-translate-y-0.5">
                {isRtl ? "تصفح المنتجات" : "Browse products"}
                <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
              </Link>
              <Link to="/offers"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50">
                {isRtl ? "العروض الحالية" : "Current offers"}
              </Link>
              <Link to="/categories"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition-all hover:border-slate-300">
                {isRtl ? "الأقسام" : "Categories"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ 2. CATEGORY ICON STRIP ══════ */}
      {categoryChips.length > 0 && (
        <section className="border-b border-slate-100 bg-white py-5">
          <div className="page-section">
            <div className="relative">
              {/* Scroll buttons */}
              <button type="button" onClick={() => scrollStrip("start")}
                className="absolute -start-4 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4 text-slate-600" />
              </button>
              <button type="button" onClick={() => scrollStrip("end")}
                className="absolute -end-4 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-md transition hover:bg-slate-50">
                <ChevronRight className="h-4 w-4 text-slate-600" />
              </button>

              <div ref={stripRef} className="flex gap-5 overflow-x-auto px-1" style={{ scrollbarWidth: "none" }}>
                {/* All anchor */}
                <Link to="/products" className="group flex flex-shrink-0 flex-col items-center gap-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-[0_4px_12px_rgba(20,184,166,0.25)] ring-2 ring-teal-100 transition-all group-hover:-translate-y-1 group-hover:shadow-[0_8px_20px_rgba(20,184,166,0.30)]">
                    <ShoppingBag className="h-7 w-7 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{isRtl ? "الكل" : "All"}</span>
                </Link>

                {categoryChips.map((cat, i) => {
                  const palette = CAT_PALETTES[i % CAT_PALETTES.length];
                  const IconComp = CAT_ICONS[i % CAT_ICONS.length];
                  const label = isRtl ? cat.name : (cat.nameEn ?? cat.name);
                  return (
                    <Link key={cat.id} to={`/categories/${cat.id}`}
                      className="group flex flex-shrink-0 flex-col items-center gap-2">
                      <div className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-2xl ring-2 transition-all group-hover:-translate-y-1 group-hover:shadow-lg",
                        palette.bg, palette.ring,
                      )}>
                        <IconComp className={cn("h-7 w-7", palette.icon)} />
                      </div>
                      <span className="max-w-[4rem] truncate text-center text-[11px] font-bold text-slate-700">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════ 3. THREE-COLUMN PROMO SECTION ══════ */}
      <section className="bg-slate-50 py-8 sm:py-10">
        <div className="page-section">
          <div className="grid gap-5 lg:grid-cols-3">

            {/* LEFT — "More reasons to shop" */}
            <div className="flex flex-col gap-4">
              <div className={cn("flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <h2 className="text-[15px] font-black text-slate-900">
                  {isRtl ? "أسباب للتسوق معنا" : "More reasons to shop"}
                </h2>
                <Link to="/products" className="text-[12px] font-black text-teal-600 hover:underline">
                  {isRtl ? "عرض الكل" : "View all"}
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {reasonCards.map((card) => {
                  const Icon = card.Icon;
                  return (
                    <Link key={card.to + card.titleEn} to={card.to}
                      className={cn(
                        "group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-white transition-all hover:-translate-y-0.5 hover:brightness-105",
                        card.bg, card.shadow,
                      )}>
                      {/* Decorative circle */}
                      <div className="absolute -end-4 -top-4 h-16 w-16 rounded-full bg-white/15" aria-hidden />
                      <div className="relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 backdrop-blur-sm">
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="relative z-10 mt-10">
                        <p className="text-[13px] font-black leading-tight">
                          {isRtl ? card.titleAr : card.titleEn}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold leading-5 text-white/80">
                          {isRtl ? card.descAr : card.descEn}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* CENTER — "Mega deals" / Featured products */}
            <div className="flex flex-col gap-4">
              <div className={cn("flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <h2 className="text-[15px] font-black text-slate-900">
                  {isRtl ? "منتجات مميزة" : "Featured products"}
                </h2>
                <Link to="/offers" className="text-[12px] font-black text-teal-600 hover:underline">
                  {isRtl ? "كل العروض" : "All offers"}
                </Link>
              </div>

              {featuredA.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-[#f5f0ff] p-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {featuredA.map((product) => {
                      const name = getLocalizedProductName(product, lang);
                      const catLabel = isRtl ? product.categoryName : product.categoryNameEn;
                      return (
                        <Link key={product.id} to={`/products/${product.id}`}
                          className="group flex flex-col gap-2 overflow-hidden rounded-xl border border-white bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                          {/* Category chip */}
                          <span className="inline-flex self-start items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">
                            {catLabel ?? (isRtl ? "منتج" : "Product")}
                          </span>
                          {/* Product name */}
                          <p className="line-clamp-2 text-[12px] font-black leading-tight text-slate-900 group-hover:text-teal-700">
                            {name}
                          </p>
                          {/* Price + badge */}
                          <div className="mt-auto flex items-end justify-between gap-1">
                            <span className="text-sm font-black text-slate-900">
                              {product.price.toFixed(2)}
                              <span className="ms-1 text-[10px] font-bold text-slate-500">{isRtl ? "ج.م" : "EGP"}</span>
                            </span>
                            <span className={cn(
                              "rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase",
                              product.inStock ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                            )}>
                              {isRtl ? (product.inStock ? "متاح" : "نفد") : (product.inStock ? "In stock" : "Out")}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
                  <div className="text-center">
                    <PackageSearch className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-400">{isRtl ? "لا توجد منتجات بعد" : "No products yet"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — "In focus" banners */}
            <div className="flex flex-col gap-4">
              <h2 className={cn("text-[15px] font-black text-slate-900", isRtl && "text-right")}>
                {isRtl ? "في الواجهة" : "In focus"}
              </h2>
              <div className="flex flex-col gap-3">
                {focusBanners.map((b) => {
                  const Icon = b.Icon;
                  return (
                    <Link key={b.to + b.titleEn} to={b.to}
                      className={cn(
                        "group relative flex min-h-[7rem] flex-col justify-between overflow-hidden rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl",
                        `bg-gradient-to-br ${b.from} ${b.via} ${b.to_color}`,
                      )}>
                      {/* Glow blobs */}
                      <div className="absolute -end-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" aria-hidden />
                      <div className="absolute -bottom-4 start-0 h-16 w-16 rounded-full bg-black/10 blur-xl" aria-hidden />

                      <div className="relative z-10 inline-flex items-center gap-1.5 self-start rounded-full bg-white/25 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-sm">
                        <Icon className="h-3 w-3" />
                        {isRtl ? b.labelAr : b.labelEn}
                      </div>
                      <div className="relative z-10 mt-3">
                        <p className="text-sm font-black leading-tight text-white">
                          {isRtl ? b.titleAr : b.titleEn}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-white/80">
                          {isRtl ? b.descAr : b.descEn}
                        </p>
                      </div>
                      <div className={cn(
                        "relative z-10 mt-2 inline-flex items-center gap-1.5 text-[11px] font-black text-white/90 transition-all group-hover:gap-2.5",
                        isRtl && "flex-row-reverse",
                      )}>
                        {isRtl ? "اكتشف الآن" : "Explore now"}
                        <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════ 4. FEATURED PRODUCT GRIDS ══════ */}
      {featuredB.length > 0 && (
        <section className="border-t border-slate-100 bg-white py-8 sm:py-10">
          <div className="page-section">
            <Reveal direction="up">
              <div className={cn("mb-6 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-rose-600">
                    <Sparkles className="h-3 w-3" />
                    {isRtl ? "مختارات جاهزة" : "Ready picks"}
                  </div>
                  <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                    {isRtl ? "منتجات جاهزة للعرض" : "Products ready to browse"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-500 sm:inline-flex">
                    {isRtl ? `آخر مزامنة: ${liveLabel}` : `Synced: ${liveLabel}`}
                  </span>
                  <Link to="/products"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
                    {isRtl ? "كل المنتجات" : "All products"}
                    <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
                  </Link>
                </div>
              </div>
            </Reveal>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <ProductGrid products={featuredB} />
            </div>

            {featuredC.length > 0 && (
              <Reveal direction="up" delay={60}>
                <div className="mt-5 overflow-hidden rounded-2xl border border-teal-100 bg-teal-50/40">
                  <div className={cn("flex items-center justify-between border-b border-teal-100 px-5 py-4", isRtl && "flex-row-reverse")}>
                    <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-700">
                      <Star className="h-3 w-3" />
                      {isRtl ? "مزيد من المنتجات" : "More products"}
                    </div>
                    <Link to="/offers" className="text-[12px] font-black text-teal-600 hover:underline">
                      {isRtl ? "عرض المزيد" : "See more"}
                    </Link>
                  </div>
                  <div className="p-4">
                    <ProductGrid products={featuredC} />
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* ══════ 5. CATEGORY GRID ══════ */}
      {categories.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50 py-8 sm:py-10">
          <div className="page-section">
            <Reveal direction="up">
              <div className={cn("mb-6 flex items-center justify-between", isRtl && "flex-row-reverse")}>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                    <LayoutGrid className="h-3 w-3" />
                    {isRtl ? "الأقسام" : "Categories"}
                  </div>
                  <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                    {isRtl ? "الأقسام الرئيسية" : "Main categories"}
                  </h2>
                </div>
                <Link to="/categories"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
                  {isRtl ? "كل الأقسام" : "All categories"}
                  <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
                </Link>
              </div>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {categories.slice(0, 8).map((cat, i) => {
                const palette  = CAT_PALETTES[i % CAT_PALETTES.length];
                const IconComp = CAT_ICONS[i % CAT_ICONS.length];
                const label    = isRtl ? cat.name : (cat.nameEn ?? cat.name);
                const desc     = isRtl ? cat.descAr : (cat.descEn ?? cat.descAr ?? "");
                return (
                  <Reveal key={cat.id} direction="up" delay={i * 35}>
                    <Link to={`/categories/${cat.id}`}
                      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.09)]">
                      <div className={cn("mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1", palette.bg, palette.ring)}>
                        <IconComp className={cn("h-5 w-5", palette.icon)} />
                      </div>
                      <h3 className="text-[13px] font-black text-slate-900">{label}</h3>
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

      {/* ══════ 6. HOW TO SHOP ══════ */}
      <section className="border-t border-slate-100 bg-white py-8 sm:py-12">
        <div className="page-section">
          <Reveal direction="up">
            <div className={cn("mb-7", isRtl ? "text-right" : "text-center")}>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                <Barcode className="h-3 w-3" />
                {isRtl ? "كيف تتسوق" : "How to shop"}
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                {isRtl ? "من الصفحة الرئيسية إلى المنتج المناسب" : "From the homepage to the right item"}
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { n: 1, path: "/categories", Icon: LayoutGrid,
                titleAr: "ابدأ من القسم الصحيح", titleEn: "Start from the right section",
                descAr: "ابدأ من القسم المناسب ثم انتقل إلى المنتجات المتاحة داخله.",
                descEn: "Start from the relevant category, then dive into available products." },
              { n: 2, path: "/products", Icon: Barcode,
                titleAr: "راجع المنتج بوضوح", titleEn: "Review the item clearly",
                descAr: "الاسم والسعر والمرجع وحالة الطلب مرتبة بشكل واضح داخل البطاقة.",
                descEn: "Name, price, reference, and order status are clearly organized." },
              { n: 3, path: "/offers", Icon: ShieldCheck,
                titleAr: "ابدأ من الجاهز للطلب", titleEn: "Begin from ready-to-order items",
                descAr: "تعرض صفحة العروض منتجات متاحة للطلب المباشر.",
                descEn: "The offers page surfaces products ready for direct ordering." },
            ].map(({ n, path, Icon, titleAr, titleEn, descAr, descEn }, i) => (
              <Reveal key={path} direction="up" delay={i * 70}>
                <Link to={path}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-all hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)]">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-teal-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-[11px] font-black text-white">
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

          <Reveal direction="up" delay={220}>
            <div className={cn("mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between", isRtl && "sm:flex-row-reverse")}>
              <div className={isRtl ? "text-right" : "text-left"}>
                <p className="text-sm font-black text-slate-950">{isRtl ? "ابدأ الآن من الكتالوج أو من الأقسام" : "Start now from the catalog or sections"}</p>
                <p className="mt-0.5 text-[12px] font-semibold text-slate-500">{isRtl ? `${primaryLocation.fullNameAr} — ${primaryLocation.hoursAr}` : `${primaryLocation.fullNameEn} — ${primaryLocation.hoursEn}`}</p>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <Link to="/products" className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-600 px-5 text-xs font-black text-white transition-all hover:bg-teal-700">
                  {isRtl ? "كل المنتجات" : "All products"}
                  <ArrowRight className={cn("h-3.5 w-3.5", isRtl && "rotate-180")} />
                </Link>
                <Link to="/categories" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-600 transition-all hover:bg-slate-50">
                  {isRtl ? "كل الأقسام" : "All categories"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ 7. SERVICE HIGHLIGHTS ══════ */}
      <section className="border-t border-slate-100 bg-slate-50 py-8 sm:py-12">
        <div className="page-section">
          <Reveal direction="up">
            <div className="mb-7 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 shadow-sm">
                <ShieldCheck className="h-3 w-3" />
                {isRtl ? "لماذا نحن" : "Why choose us"}
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                {isRtl ? "الخدمة والدعم" : "Service & support"}
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { Icon: Truck,      titleAr: "توصيل داخل القاهرة",    titleEn: "Cairo Delivery",      descAr: "رسوم التوصيل تُعرض قبل تأكيد الطلب.",      descEn: "Delivery fee shown before order confirmation." },
              { Icon: MapPin,     titleAr: "نخدم كل القاهرة",       titleEn: "Serving all of Cairo", descAr: primaryLocation.fullNameAr,                  descEn: primaryLocation.fullNameEn },
              { Icon: Clock3,     titleAr: "خدمة متاحة طوال الوقت", titleEn: "Always-on service",   descAr: `${serviceHours} — ${liveLabel}`,            descEn: `${serviceHours} — ${liveLabel}` },
            ].map(({ Icon, titleAr, titleEn, descAr, descEn }, i) => (
              <Reveal key={titleEn} direction="up" delay={i * 70}>
                <div className={cn("flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md", isRtl && "items-end text-right")}>
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-teal-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-950">{isRtl ? titleAr : titleEn}</h3>
                  <p className="mt-1.5 text-[12px] font-semibold leading-6 text-slate-500">{isRtl ? descAr : descEn}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Bottom gradient CTA */}
          <Reveal direction="up" delay={220}>
            <div className="mt-6 overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 p-6 shadow-[0_12px_36px_rgba(20,184,166,0.22)] sm:p-8">
              <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between", isRtl && "sm:flex-row-reverse")}>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <p className="text-lg font-black text-white sm:text-xl">
                    {isRtl ? "ابدأ التسوق الآن" : "Start shopping now"}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white/75">
                    {isRtl ? "انتقل من الصفحة الرئيسية إلى الأقسام والمنتجات والعروض." : "Move from the homepage into categories, products, and offers."}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link to="/products" className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-6 text-sm font-black text-teal-700 shadow transition-all hover:bg-teal-50">
                    {isRtl ? "تسوق الآن" : "Shop now"}
                    <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
                  </Link>
                  <Link to="/contact" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-6 text-sm font-black text-white backdrop-blur-sm transition-all hover:bg-white/25">
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
