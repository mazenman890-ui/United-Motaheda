// Home.tsx – cleaned version
import { useMemo, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Barcode,
  Clock3,
  LayoutGrid,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { cn } from "../components/UI";
import { CategoryCard, CategoryPill } from "../components/CategoryCard";
import { ProductGrid } from "../components/ProductGrid";
import { Reveal } from "../components/Reveal";
import { SearchBar } from "../components/SearchBar";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { useCatalog } from "../../contexts/CatalogContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSearch } from "../../contexts/SearchContext";
import { images, locations } from "../data";
import { useCatalogCategorySearch } from "../hooks/useCatalogCategorySearch";
import { getLocalizedCategoryName, getLocalizedProductName } from "../localization";
import {
  getDeliveryWindowLabel,
  getServiceHoursSentence,
} from "../config";
import { HomeMobile } from "./HomeMobile";

function HomeSkeleton() {
  return (
    <div className="home-page min-h-screen bg-[#F5FDFC]">
      <div className="page-section py-6">
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="h-5 w-32 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-4 h-12 max-w-3xl animate-pulse rounded-3xl bg-slate-200" />
          <div className="mt-3 h-4 max-w-2xl animate-pulse rounded-full bg-slate-200" />
          <div className="mt-2 h-4 max-w-xl animate-pulse rounded-full bg-slate-200" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-[1.5rem] border border-slate-100 bg-slate-100"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const isShopperShell = useIsShopperShell();

  if (isShopperShell) {
    return <HomeMobile />;
  }

  return <HomeDesktop />;
}

function HomeDesktop() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const { searchQuery, setSearchQuery, commitQuery, suggestions } = useSearch();
  const { categories, featuredProducts, lastUpdated, isLoading, error } =
    useCatalog();
  const isInitialLoading = isLoading && featuredProducts.length === 0;
  const isRtl = lang === "ar";
  const categorySearchResults = useCatalogCategorySearch(categories, searchQuery);
  const heroCategorySuggestions = searchQuery.trim().length >= 2
    ? categorySearchResults.slice(0, 3)
    : [];
  const heroProductSuggestions = searchQuery.trim().length >= 2
    ? suggestions.slice(0, 5)
    : [];

  const primaryLocation =
    locations.find((location) => location.isPrimary) ?? locations[0];
  const categoryCards = categories.slice(0, 8);
  const topCategory = categories[0] ?? null;
  const topThreeCategories = categories.slice(0, 3);
  const heroProducts = featuredProducts.slice(0, 4);
  const offerProducts = featuredProducts.slice(4, 10);
  const deliveryWindowLabel = getDeliveryWindowLabel(lang);
  const serviceHoursText = getServiceHoursSentence(lang);
  const spotlightProduct =
    heroProducts.find((product) => product.inStock) ?? heroProducts[0] ?? null;
  const spotlightCategory = spotlightProduct
    ? (categories.find(
        (category) => category.id === spotlightProduct.category,
      ) ?? null)
    : null;

  const liveUpdatedLabel = useMemo(() => {
    if (!lastUpdated) {
      return lang === "ar"
        ? "متصل بالمصدر المباشر"
        : "Connected to live source";
    }

    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(lastUpdated));
  }, [lang, lastUpdated]);

  const spotlightName = spotlightProduct
    ? getLocalizedProductName(spotlightProduct, lang)
    : null;
  const spotlightPrice = spotlightProduct
    ? isRtl
      ? `${spotlightProduct.price.toFixed(2)} جنيه`
      : `${spotlightProduct.price.toFixed(2)} EGP`
    : null;
  const spotlightAvailabilityLabel = spotlightProduct
    ? spotlightProduct.inStock
      ? isRtl
        ? "جاهز للطلب"
        : "Ready to order"
      : isRtl
        ? "غير متاح حاليا"
        : "Currently unavailable"
    : null;

  const quickActions = [
    {
      titleAr: "كل المنتجات",
      titleEn: "All products",
      path: "/products",
      labelAr: "بحث وفلاتر حديثة",
      labelEn: "Modern search + filters",
      Icon: ShoppingBag,
    },
    {
      titleAr: "خريطة الأقسام",
      titleEn: "Category map",
      path: "/categories",
      labelAr: "الأقسام الرئيسية",
      labelEn: "Main categories",
      Icon: LayoutGrid,
    },
    {
      titleAr: "العناصر الجاهزة الآن",
      titleEn: "Ready-now picks",
      path: "/offers",
      labelAr: "العروض الحالية",
      labelEn: "Current offers",
      Icon: Sparkles,
    },
  ];

  const shoppingSteps = [
    {
      eyebrowAr: "الخطوة 1",
      eyebrowEn: "Step 1",
      titleAr: "ابدأ من القسم الصحيح",
      titleEn: "Start from the right section",
      descriptionAr:
        "ابدأ من القسم المناسب ثم انتقل إلى المنتجات المتاحة داخله.",
      descriptionEn:
        "Start from the relevant category, then move into the available products inside it.",
      path: "/categories",
      Icon: LayoutGrid,
    },
    {
      eyebrowAr: "الخطوة 2",
      eyebrowEn: "Step 2",
      titleAr: "راجع المنتج بوضوح",
      titleEn: "Review the item clearly",
      descriptionAr:
        "الاسم والسعر والمرجع وحالة الطلب مرتبة بشكل واضح داخل البطاقة.",
      descriptionEn:
        "Name, price, reference, and order status are clearly organized inside each card.",
      path: "/products",
      Icon: Barcode,
    },
    {
      eyebrowAr: "الخطوة 3",
      eyebrowEn: "Step 3",
      titleAr: "ابدأ من الجاهز للطلب",
      titleEn: "Begin from what is ready to order",
      descriptionAr:
        "تعرض الصفحة الرئيسية منتجات متاحة للطلب المباشر.",
      descriptionEn:
        "The homepage surfaces products that are ready for direct ordering.",
      path: "/offers",
      Icon: ShieldCheck,
    },
  ];

  const serviceHighlights = [
    {
      Icon: Truck,
      titleAr: "توصيل واضح وثابت",
      titleEn: "Clear fixed delivery",
      descriptionAr: `رسوم توصيل تنافسية داخل القاهرة خلال ${deliveryWindowLabel}.`,
      descriptionEn: `Competitive delivery fee in Cairo within ${deliveryWindowLabel}.`,
    },
    {
      Icon: MapPin,
      titleAr: "الفرع الرئيسي واضح",
      titleEn: "Primary branch clearly surfaced",
      descriptionAr: `${primaryLocation.fullNameAr} - ${primaryLocation.addressAr}`,
      descriptionEn: `${primaryLocation.fullNameEn} - ${primaryLocation.addressEn}`,
    },
    {
      Icon: Clock3,
      titleAr: "خدمة متاحة طوال الوقت",
      titleEn: "Always-on service",
      descriptionAr: `${serviceHoursText} مع مزامنة مباشرة: ${liveUpdatedLabel}`,
      descriptionEn: `${serviceHoursText} with live sync at ${liveUpdatedLabel}`,
    },
  ];

  const featuredSignals = [
    {
      label: lang === "ar" ? "منتجات معروضة" : "Visible picks",
      value: heroProducts.length.toString(),
    },
    {
      label: lang === "ar" ? "التوصيل" : "Delivery",
      value: deliveryWindowLabel,
    },
    {
      label: lang === "ar" ? "الخدمة" : "Service",
      value: "24/7",
    },
  ];

  const handleHeroSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchQuery.trim();

    if (!nextQuery) {
      navigate("/products");
      return;
    }

    commitQuery(nextQuery);
    navigate(`/products?search=${encodeURIComponent(nextQuery)}`);
  };

  if (isInitialLoading) {
    return <HomeSkeleton />;
  }

  return (
    <div className="home-page overflow-x-hidden bg-[#F5FDFC]">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#f7fcfc_0%,#eef8f8_100%)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute inset-y-0 start-0 w-[32rem] bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_68%)]" />
          <div className="absolute end-0 top-0 h-[26rem] w-[26rem] rounded-full bg-cyan-100/60 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(15,23,42,0.75) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,0.75) 1px,transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
        </div>

        <div className="page-section relative z-10 py-5 sm:py-8 xl:py-10">
          <div className="overflow-hidden rounded-[2.3rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
            <div className="grid xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
              <Reveal direction="up">
                <div
                  className={cn(
                    "relative p-6 sm:p-8 lg:p-10",
                    isRtl ? "text-right" : "text-left",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                      <Sparkles className="h-3.5 w-3.5" />
                      {isRtl ? "الرئيسية" : "Home"}
                    </div>
                    <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[11px] font-black text-slate-600 sm:inline-flex">
                      <Clock3 className="h-3.5 w-3.5 text-slate-600" />
                      {liveUpdatedLabel}
                    </div>
                  </div>

                  <div className="mt-6 max-w-3xl">
                    <h1
                      className={cn(
                        "text-[2rem] font-black text-slate-950 sm:text-[2.8rem] lg:text-[3.8rem]",
                        isRtl
                          ? "leading-[1.3] tracking-normal sm:leading-[1.26] lg:leading-[1.18]"
                          : "leading-[1.02] tracking-tight",
                      )}
                    >
                      {isRtl
                        ? "ابحث عن الدواء المناسب ثم ابدأ الطلب"
                        : "Search the right item, then place the order"}
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                      {isRtl
                        ? "ابدأ من البحث الذكي بالإنجليزية أو العربية، ثم انتقل مباشرة إلى المنتج أو القسم الأنسب بدون تشتيت."
                        : "Start with smart bilingual search, then move directly into the right product or category without extra friction."}
                    </p>
                  </div>

                  {error && (
                    <div className="mt-5 rounded-[1.45rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-900">
                      {isRtl
                        ? "يوجد تعذر مؤقت في تحديث الكتالوج المباشر، لكننا نعرض آخر بيانات متاحة حاليا."
                        : "There is a temporary issue refreshing the live catalog, but the latest available data is still being shown."}
                    </div>
                  )}

                  <form className="mt-6 max-w-3xl" onSubmit={handleHeroSearchSubmit}>
                    <SearchBar
                      value={searchQuery}
                      onChange={(value) => {
                        setSearchQuery(value);
                        commitQuery(value);
                      }}
                      onClear={() => {
                        setSearchQuery("");
                        commitQuery("");
                      }}
                      placeholder={
                        isRtl
                          ? "ابحث بالاسم أو الكود أو القسم"
                          : "Search by name, code, or category"
                      }
                      lang={lang}
                      shellClassName="rounded-[1.7rem] border-slate-200 bg-white shadow-[0_20px_42px_rgba(15,23,42,0.08)]"
                      suggestions={
                        heroProductSuggestions.length > 0 || heroCategorySuggestions.length > 0 ? (
                          <div className="absolute inset-x-0 top-[calc(100%+0.75rem)] z-20 rounded-[1.45rem] border border-slate-200 bg-white p-3 shadow-[0_26px_60px_rgba(15,23,42,0.12)]">
                            {heroProductSuggestions.length > 0 ? (
                              <div>
                                <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                  {isRtl ? "منتجات" : "Products"}
                                </p>
                                <div className="space-y-1.5">
                                  {heroProductSuggestions.map((product) => (
                                    <Link
                                      key={product.id}
                                      to={`/products/${product.id}`}
                                      className="flex items-center justify-between gap-3 rounded-[1rem] px-3 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-slate-900">
                                          {getLocalizedProductName(product, lang)}
                                        </p>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                          {lang === "ar" ? product.categoryName : product.categoryNameEn}
                                        </p>
                                      </div>
                                      <span className="shrink-0 text-xs font-black text-slate-400">
                                        {product.price.toFixed(2)} {isRtl ? "ج.م" : "EGP"}
                                      </span>
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {heroCategorySuggestions.length > 0 ? (
                              <div className={cn(heroProductSuggestions.length > 0 && "mt-3 border-t border-slate-100 pt-3")}>
                                <p className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                  {isRtl ? "أقسام" : "Categories"}
                                </p>
                                <div className="space-y-1.5">
                                  {heroCategorySuggestions.map((category) => (
                                    <Link
                                      key={category.id}
                                      to={`/products?category=${encodeURIComponent(category.id)}${searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : ""}`}
                                      className="flex items-center justify-between gap-3 rounded-[1rem] px-3 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/20"
                                    >
                                      <div>
                                        <p className="text-sm font-black text-slate-900">
                                          {isRtl ? category.name : category.nameEn}
                                        </p>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                          {isRtl ? `${category.inStockCount} منتج متاح` : `${category.inStockCount} items ready`}
                                        </p>
                                      </div>
                                      <ArrowRight className={cn("h-4 w-4 text-slate-400", isRtl && "rotate-180")} />
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null
                      }
                    />
                  </form>

                  <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      to={searchQuery.trim() ? `/products?search=${encodeURIComponent(searchQuery.trim())}` : "/products"}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 text-sm font-black text-white shadow-[0_18px_40px_rgba(20,184,166,0.28)] transition-all hover:bg-[var(--primary-strong)]"
                    >
                      {isRtl ? "تصفح المنتجات" : "Browse products"}
                      <ArrowRight
                        className={cn("h-4 w-4", isRtl && "rotate-180")}
                      />
                    </Link>
                    <Link
                      to="/offers"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-6 text-sm font-black text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {isRtl ? "العروض الحالية" : "View offers"}
                    </Link>
                    <Link
                      to="/categories"
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {isRtl ? "خريطة الأقسام" : "Browse categories"}
                    </Link>
                  </div>

                  <div className="mt-8 hidden gap-3 xl:grid xl:grid-cols-3">
                    {quickActions.map(
                      ({ titleAr, titleEn, labelAr, labelEn, Icon, path }) => (
                        <Link
                          key={path}
                          to={path}
                          className="group rounded-[1.55rem] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 ring-1 ring-teal-100">
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                              {isRtl ? labelAr : labelEn}
                            </span>
                          </div>
                          <h2 className="mt-4 text-base font-black text-slate-950">
                            {isRtl ? titleAr : titleEn}
                          </h2>
                          <div className="mt-4 inline-flex items-center gap-2 text-sm font-black text-slate-600 transition-all group-hover:gap-3">
                            {isRtl ? "افتح الآن" : "Open now"}
                            <ArrowRight
                              className={cn("h-4 w-4", isRtl && "rotate-180")}
                            />
                          </div>
                        </Link>
                      ),
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal direction="up" delay={90}>
                <div className="relative border-t border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f2fbfa_100%)] p-4 text-slate-900 sm:p-6 xl:border-s xl:border-t-0 xl:p-8">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                  >
                    <div className="absolute -end-16 -top-16 h-48 w-48 rounded-full bg-teal-400/12 blur-3xl" />
                    <div className="absolute -start-12 bottom-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
                  </div>

                  <div className="relative z-10">
                    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                      <div className="relative">
                        <img
                          src={images.homeWide}
                          alt={
                            isRtl
                              ? "لقطة من داخل الفرع الرئيسي"
                              : "View inside the primary branch"
                          }
                          className="h-[18rem] w-full object-cover object-center sm:h-[22rem]"
                          loading="eager"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(15,23,42,0.24)_100%)]" />
                        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4 sm:p-5">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/88 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 backdrop-blur-sm">
                            <MapPin className="h-3.5 w-3.5" />
                            {isRtl ? "الفرع الرئيسي" : "Primary branch"}
                          </span>
                          <span className="hidden items-center gap-2 rounded-full border border-white/75 bg-white/86 px-3 py-1.5 text-[10px] font-black text-slate-700 sm:inline-flex">
                            <Clock3 className="h-3.5 w-3.5 text-slate-600" />
                            {liveUpdatedLabel}
                          </span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                          <div className="rounded-[1.5rem] border border-white/80 bg-white/88 p-4 backdrop-blur-md">
                            <p className="text-lg font-black text-slate-950">
                              {isRtl
                                ? primaryLocation.fullNameAr
                                : primaryLocation.fullNameEn}
                            </p>
                            <p className="mt-1 hidden text-sm font-semibold text-slate-600 sm:block">
                              {isRtl
                                ? primaryLocation.addressAr
                                : primaryLocation.addressEn}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
                                <Clock3 className="h-3.5 w-3.5 text-slate-600" />
                                {isRtl
                                  ? primaryLocation.hoursAr
                                  : primaryLocation.hoursEn}
                              </span>
                              <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 sm:inline-flex">
                                <MapPin className="h-3.5 w-3.5 text-slate-600" />
                                {isRtl
                                  ? "تغطية داخل القاهرة"
                                  : "Cairo coverage"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white py-10 sm:py-16 md:py-20">
        <div className="page-section">
          <Reveal direction="up">
            <div
              className={cn(
                "mx-auto max-w-3xl",
                isRtl ? "text-right" : "text-center",
              )}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                <ShoppingBag className="h-3.5 w-3.5" />
                {isRtl ? "ابدأ التسوق" : "Start shopping"}
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                {isRtl
                  ? "من الصفحة الرئيسية إلى المنتج المناسب"
                  : "From the homepage to the right item"}
              </h2>
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 lg:grid-cols-3 sm:mt-10">
            {shoppingSteps.map(
              (
                {
                  eyebrowAr,
                  eyebrowEn,
                  titleAr,
                  titleEn,
                  descriptionAr,
                  descriptionEn,
                  path,
                  Icon,
                },
                index,
              ) => (
                <Reveal key={path} direction="up" delay={80 + index * 60}>
                  <Link
                    to={path}
                    className="group flex h-full flex-col rounded-[1.7rem] border border-slate-200 bg-[#f8fcfb] p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-600 ring-1 ring-teal-100 sm:h-14 sm:w-14">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_24px_rgba(20,184,166,0.22)]">
                        {index + 1}
                      </span>
                    </div>
                    <div className="mt-5">
                      <div className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        {isRtl ? eyebrowAr : eyebrowEn}
                      </div>
                      <h3 className="mt-3 text-lg font-black text-slate-950">
                        {isRtl ? titleAr : titleEn}
                      </h3>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                        {isRtl ? descriptionAr : descriptionEn}
                      </p>
                    </div>
                    <div className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-black text-slate-600 transition-all group-hover:gap-3">
                      {isRtl ? "انتقل الآن" : "Open now"}
                      <ArrowRight
                        className={cn("h-4 w-4", isRtl && "rotate-180")}
                      />
                    </div>
                  </Link>
                </Reveal>
              ),
            )}
          </div>

          <Reveal direction="up" delay={260}>
            <div className="mt-8 flex flex-col gap-4 rounded-[1.9rem] border border-slate-200 bg-slate-50 px-5 py-5 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <p className="text-base font-black text-slate-950">
                  {isRtl
                    ? "ابدأ الآن من الكتالوج أو من الأقسام"
                    : "Start now from the catalog or the sections"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {isRtl
                    ? `${primaryLocation.fullNameAr} - ${primaryLocation.hoursAr}`
                    : `${primaryLocation.fullNameEn} - ${primaryLocation.hoursEn}`}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/products"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white transition-all hover:bg-[var(--primary-strong)]"
                >
                  {isRtl ? "كل المنتجات" : "All products"}
                  <ArrowRight
                    className={cn("h-4 w-4", isRtl && "rotate-180")}
                  />
                </Link>
                <Link
                  to="/categories"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition-all hover:bg-slate-50"
                >
                  {isRtl ? "كل الأقسام" : "All sections"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#F8FDFC_0%,#F1FBF9_50%,#FFFFFF_100%)] py-10 sm:py-16 md:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute start-0 top-16 h-72 w-72 rounded-full bg-teal-200/25 blur-3xl" />
          <div className="absolute end-0 top-28 h-80 w-80 rounded-full bg-cyan-100/50 blur-3xl" />
        </div>

        <div className="page-section relative z-10">
          <Reveal direction="up">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div
                className={cn("max-w-3xl", isRtl ? "text-right" : "text-left")}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {isRtl ? "خريطة الأقسام" : "Category map"}
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                  {isRtl
                    ? "الأقسام الرئيسية"
                    : "Main categories"}
                </h2>
              </div>
            </div>
          </Reveal>

          {topCategory && (
            <Reveal direction="up" delay={40}>
              <div className="mt-8 grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)] sm:p-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]">
                <div className={cn(isRtl ? "text-right" : "text-left")}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                    <Sparkles className="h-3.5 w-3.5" />
                    {isRtl ? "القسم الأبرز" : "Leading section"}
                  </div>
                  <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {isRtl
                      ? getLocalizedCategoryName(topCategory, "ar")
                      : getLocalizedCategoryName(topCategory, "en")}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                    {isRtl
                      ? topCategory.descAr
                      : topCategory.descEn || topCategory.descAr}
                  </p>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-black text-slate-700">
                      <ShoppingBag className="h-4 w-4 text-slate-600" />
                      {isRtl ? "ابدأ من هذا القسم" : "Start from this section"}
                    </div>
                    <Link
                      to="/categories"
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white transition-all hover:bg-[var(--primary-strong)]"
                    >
                      {isRtl ? "استعرض كل الأقسام" : "Browse all sections"}
                      <ArrowRight
                        className={cn("h-4 w-4", isRtl && "rotate-180")}
                      />
                    </Link>
                  </div>
                </div>

                <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {isRtl ? "الأقسام الأعلى" : "Top sections"}
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {topThreeCategories.map((category, index) => (
                      <Link
                        key={category.id}
                        to={`/categories/${category.id}`}
                        className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 transition-all hover:border-slate-300 hover:bg-slate-50/60"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-black text-white">
                            {index + 1}
                          </span>
                          <span className="truncate text-sm font-black text-slate-900">
                            {isRtl
                              ? getLocalizedCategoryName(category, "ar")
                              : getLocalizedCategoryName(category, "en")}
                          </span>
                        </div>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                          <ArrowRight
                            className={cn("h-4 w-4", isRtl && "rotate-180")}
                          />
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {categoryCards.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                className={cn(index === 0 && "sm:col-span-2 xl:col-span-2")}
              />
            ))}
          </div>

          <Reveal direction="up" delay={120}>
            <div className="mt-6 rounded-[1.8rem] border border-slate-200 bg-white/90 p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:hidden">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {isRtl ? "الأقسام" : "Categories"}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400">
                    {isRtl
                      ? "انتقل إلى القسم المناسب"
                      : "Open the right section"}
                  </p>
                </div>
                <LayoutGrid className="h-5 w-5 text-slate-600" />
              </div>
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none" }}
              >
                {categoryCards.map((category) => (
                  <CategoryPill key={category.id} category={category} />
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#F5FDFC] py-10 sm:py-16 md:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-200/50 to-transparent" />
          <div className="absolute end-0 top-0 h-96 w-96 rounded-full bg-slate-100/40 blur-3xl" />
          <div className="absolute start-0 bottom-0 h-64 w-64 rounded-full bg-cyan-100/30 blur-3xl" />
        </div>

        <div className="page-section relative z-10">
          <Reveal direction="up">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div
                className={cn("max-w-2xl", isRtl ? "text-right" : "text-left")}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-rose-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isRtl
                    ? "منتجات مميزة من الكتالوج"
                    : "Featured items from the catalog"}
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                  {isRtl
                    ? "منتجات مميزة من الكتالوج"
                    : "Featured products from the catalog"}
                </h2>
              </div>
              <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
                {isRtl
                  ? `آخر مزامنة: ${liveUpdatedLabel}`
                  : `Latest sync: ${liveUpdatedLabel}`}
              </div>
            </div>
          </Reveal>

          {heroProducts.length > 0 ? (
            <div className="mt-8 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start">
              <Reveal direction="up" delay={40}>
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
                    <ShoppingBag className="h-3.5 w-3.5" />
                    {isRtl ? "المنتج الأبرز الآن" : "Current spotlight item"}
                  </div>

                  {spotlightProduct ? (
                    <>
                      <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                        {spotlightName}
                      </h3>

                      <div className="mt-5 rounded-[1.55rem] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          {isRtl ? "السعر الحالي" : "Current price"}
                        </p>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <p className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                            {spotlightPrice}
                          </p>
                          <span
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-black",
                              spotlightProduct.inStock
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-rose-200 bg-rose-50 text-rose-600",
                            )}
                          >
                            {spotlightAvailabilityLabel}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {featuredSignals.map((signal) => (
                          <span
                            key={signal.label}
                            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700"
                          >
                            {signal.label}: {signal.value}
                          </span>
                        ))}
                        {spotlightCategory && (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">
                            {isRtl
                              ? getLocalizedCategoryName(spotlightCategory, "ar")
                              : getLocalizedCategoryName(spotlightCategory, "en")}
                          </span>
                        )}
                        <span
                          className="hidden items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 sm:inline-flex"
                          dir="ltr"
                        >
                          {spotlightProduct.barcode ||
                            spotlightProduct.code ||
                            spotlightProduct.id}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-col gap-3">
                        <Link
                          to={`/products/${spotlightProduct.id}`}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white transition-all hover:bg-[var(--primary-strong)]"
                        >
                          {isRtl ? "عرض المنتج" : "Open item"}
                          <ArrowRight
                            className={cn("h-4 w-4", isRtl && "rotate-180")}
                          />
                        </Link>
                        <Link
                          to="/offers"
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        >
                          {isRtl ? "الجاهز الآن" : "Ready-now picks"}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="mt-5 rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-6">
                      <p className="text-base font-black text-slate-900">
                        {isRtl
                          ? "لا توجد منتجات مميزة معروضة حاليا"
                          : "No featured products are visible right now"}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                        {isRtl
                          ? "عند توفر بيانات كافية من الكتالوج المباشر ستظهر هنا تلقائيا."
                          : "Once enough live catalog data is available, featured items will appear here automatically."}
                      </p>
                    </div>
                  )}
                </div>
              </Reveal>

              <Reveal direction="up" delay={90}>
                <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-5 lg:p-6">
                  <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                        <Sparkles className="h-3.5 w-3.5" />
                        {isRtl ? "مختارات جاهزة الآن" : "Ready-now selection"}
                      </div>
                      <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                        {isRtl
                          ? "منتجات جاهزة للعرض"
                          : "Products ready to browse"}
                      </h3>
                    </div>
                    <Link
                      to="/products"
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {isRtl ? "كل المنتجات" : "All products"}
                      <ArrowRight
                        className={cn("h-4 w-4", isRtl && "rotate-180")}
                      />
                    </Link>
                  </div>
                  <ProductGrid products={heroProducts} />
                  {offerProducts.length > 0 ? (
                    <div className="mt-6 rounded-[1.7rem] border border-rose-100 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_100%)] p-4 sm:p-5">
                      <div className="flex flex-col gap-3 border-b border-rose-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-rose-600">
                            <Sparkles className="h-3.5 w-3.5" />
                            {isRtl ? "عروض حصرية" : "Exclusive offers"}
                          </div>
                          <h4 className="mt-3 text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                            {isRtl ? "منتجات بعرض أو سعر أقوى" : "Offers with stronger value"}
                          </h4>
                        </div>
                        <Link
                          to="/offers"
                          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-100 bg-white px-5 text-sm font-black text-slate-700 transition-all hover:border-rose-200 hover:bg-rose-50"
                        >
                          {isRtl ? "كل العروض" : "All offers"}
                          <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
                        </Link>
                      </div>
                      <div className="mt-5">
                        <ProductGrid products={offerProducts} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </Reveal>
            </div>
          ) : (
            <Reveal direction="up" delay={40}>
              <div className="mt-8 rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-black text-slate-900">
                  {isRtl
                    ? "لا توجد منتجات مميزة معروضة حاليا"
                    : "No featured products are visible right now"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-7 text-slate-500">
                  {isRtl
                    ? "عند توفر بيانات كافية من الكتالوج المباشر ستظهر هنا تلقائيا."
                    : "Once enough live catalog data is available, featured items will appear here automatically."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/products"
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white transition-all hover:bg-[var(--primary-strong)]"
                  >
                    {isRtl ? "تصفح المنتجات" : "Browse products"}
                    <ArrowRight
                      className={cn("h-4 w-4", isRtl && "rotate-180")}
                    />
                  </Link>
                  <Link
                    to="/categories"
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    {isRtl ? "عرض الأقسام" : "Browse sections"}
                  </Link>
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-slate-100 bg-[linear-gradient(180deg,#f8fdfc_0%,#eff8f8_52%,#ffffff_100%)] py-14 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,0.6) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute start-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-200/40 blur-3xl"
        />

        <div className="page-section relative z-10">
          <Reveal direction="up">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                {isRtl ? "الدعم والخدمة" : "Support & service"}
              </div>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                {isRtl
                  ? "الخدمة والدعم"
                  : "Service and support"}
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {serviceHighlights.map(
              (
                { Icon, titleAr, titleEn, descriptionAr, descriptionEn },
                index,
              ) => (
                <Reveal key={titleEn} direction="up" delay={index * 70}>
                  <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] sm:p-7">
                    <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-950 sm:text-xl">
                      {isRtl ? titleAr : titleEn}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                      {isRtl ? descriptionAr : descriptionEn}
                    </p>
                  </div>
                </Reveal>
              ),
            )}
          </div>

          <Reveal direction="up" delay={210}>
            <div className="mt-10 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between sm:text-start">
              <div>
                <p className="text-lg font-black text-slate-950">
                  {isRtl
                    ? "ابدأ الآن من الصفحة الرئيسية"
                    : "Start now from the homepage"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {isRtl
                    ? "انتقل من الصفحة الرئيسية إلى الأقسام والمنتجات والعروض."
                    : "Move from the homepage into categories, products, and offers."}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/products"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(36,184,181,0.3)] transition-all hover:bg-[var(--primary-strong)]"
                >
                  {isRtl ? "تسوق الآن" : "Shop now"}
                  <ArrowRight
                    className={cn("h-4 w-4", isRtl && "rotate-180")}
                  />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  {isRtl ? "تواصل معنا" : "Contact us"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
