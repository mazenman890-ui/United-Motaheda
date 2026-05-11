import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { buildMedicalInfo } from "@pharmacy/domain-catalog";
import {
  ArrowRight,
  Barcode,
  CheckCircle2,
  ChevronRight,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Zap,
} from "lucide-react";
import { useLanguage }           from "../../contexts/LanguageContext";
import { useCart }               from "../../contexts/CartContext";
import { useCatalog, useFullCatalog } from "../../contexts/CatalogContext";
import { ProductGrid }           from "../components/ProductGrid";
import { useAlternativeProducts } from "../hooks/useAlternativeProducts";
import { cn }                    from "../components/UI";
import { useIsShopperShell }     from "../components/ui/use-mobile";
import { ImageWithFallback }     from "../components/figma/ImageWithFallback";
import { getCatalogProductImage } from "../catalog";
import { getDeliveryWindowSentence } from "../config";
import { getLocalizedProductName } from "../localization";
import { FavoriteHeartButton }   from "../components/FavoriteHeartButton";
import { MobileProductDetailsView } from "./ShopperMobileViews";
export default function ProductDetails() {
  const isShopperShell = useIsShopperShell();
  if (isShopperShell) return <MobileProductDetailsView />;
  return <ProductDetailsDesktop />;
}

function ProductDetailsDesktop() {
  const { id }                                          = useParams();
  const { lang, t }                                     = useLanguage();
  const { addToCart }                                   = useCart();
  const { productsById, featuredProducts }               = useCatalog();
  const { allProducts, allProductsById }                 = useFullCatalog();
  const [added, setAdded]                               = useState(false);
  const [activeImageZoom, setActiveImageZoom]           = useState(false);

  const product = id ? (allProductsById[id] ?? productsById[id]) : undefined;

  // allProducts is the stable full-catalog reference — prevents worker re-init
  // thrash when the display-layer products slice changes (e.g. due to filters on
  // another route).
  const { alternatives: alternativeProducts } =
    useAlternativeProducts(product, allProducts, allProductsById, 4);

  const medicalInfo = useMemo(
    () =>
      product
        ? buildMedicalInfo({
            nameAr:        product.nameAr ?? product.name,
            nameEn:        product.nameEn ?? product.name,
            categoryNameEn: product.categoryNameEn,
          })
        : null,
    [product],
  );

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return featuredProducts
      .filter((item) => item.category === product.category && item.id !== product.id)
      .slice(0, 3);
  }, [featuredProducts, product]);

  // ── Off‑thread alternative ranking using the pre‑built pool ──

  useEffect(() => {
    if (!added) return undefined;
    const timeout = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [added]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F5FDFC] px-4 py-20">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <PackageSearch className="h-7 w-7" />
          </div>
          <h1 className="mb-3 text-3xl font-black text-slate-900">
            {lang === "ar" ? "المنتج غير متوفر" : "Product not found"}
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-sm font-semibold leading-7 text-slate-500">
            {lang === "ar"
              ? "تعذر العثور على هذا المنتج داخل الكتالوج الحالي."
              : "We couldn't find this item inside the current catalog."}
          </p>
          <Link
            to="/products"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 text-sm font-black text-white transition-colors hover:bg-[var(--primary-strong)]"
          >
            <ArrowRight className={cn("h-4 w-4", lang === "ar" && "rotate-180")} />
            {lang === "ar" ? "العودة إلى المنتجات" : "Back to products"}
          </Link>
        </div>
      </div>
    );
  }

  const displayName       = getLocalizedProductName(product, lang);
  const categoryLabel     = lang === "en" ? product.categoryNameEn || product.categoryName : product.categoryName;
  const availabilityLabel = product.inStock
    ? lang === "ar" ? "متاح للطلب"    : "Ready to order"
    : lang === "ar" ? "غير متاح حاليا" : "Currently unavailable";
  const deliveryWindowSentence = getDeliveryWindowSentence(lang);

  const metaCards = [
    {
      labelAr: "كود الصنف",
      labelEn: "Item code",
      value:   product.code || (lang === "ar" ? "غير متاح" : "Not available"),
      dir:     "ltr" as const,
    },
    {
      labelAr: "الباركود",
      labelEn: "Barcode",
      value:   product.barcode || (lang === "ar" ? "غير متاح" : "Not available"),
      dir:     "ltr" as const,
    },
    {
      labelAr: "حالة الطلب",
      labelEn: "Order status",
      value:   availabilityLabel,
      dir:     undefined,
    },
  ];

  const highlights = [
    { Icon: ShieldCheck, label: lang === "ar" ? "بيانات مباشرة من الكتالوج" : "Direct live-catalog data" },
    { Icon: Barcode,     label: lang === "ar" ? "مرجع واضح وسريع"           : "Clear quick reference" },
    { Icon: Truck,       label: lang === "ar" ? "توصيل داخل القاهرة" : "Delivery across Cairo" },
  ];

  const handleAdd = async () => {
    if (!product.inStock) return;
    await addToCart(product.id);
    setAdded(true);
  };

  return (
    <div className="product-details-page min-h-screen bg-[#F5FDFC] pb-16 sm:pb-20">
      {/* Breadcrumb */}
      <div className="hidden border-b border-slate-200 bg-white/90 backdrop-blur sm:block">
        <div className="product-details-breadcrumbs page-section flex items-center gap-2 py-4 text-sm font-bold text-slate-500">
          <Link to="/" className="transition-colors hover:text-slate-600">{t("home")}</Link>
          <ChevronRight className={cn("h-4 w-4 text-slate-300", lang === "ar" && "rotate-180")} />
          <Link to="/products" className="transition-colors hover:text-slate-600">{t("products")}</Link>
          <ChevronRight className={cn("h-4 w-4 text-slate-300", lang === "ar" && "rotate-180")} />
          <span className="truncate text-slate-900">{displayName}</span>
        </div>
      </div>

      <div className="product-details-shell page-section py-5 sm:py-10 md:py-14">
        <Link
          to="/products"
          className="product-details-back-link mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm sm:hidden"
        >
          <ArrowRight className={cn("h-4 w-4", lang === "ar" ? "rotate-0" : "rotate-180")} />
          {lang === "ar" ? "العودة إلى المنتجات" : "Back to products"}
        </Link>

        <div className="product-details-layout grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] xl:items-start">
          {/* ── Gallery ── */}
          <motion.section
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="product-details-gallery overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
          >
            <div className="relative bg-[linear-gradient(180deg,#f7fcfc_0%,#eef8f8_100%)] p-4 sm:p-6 md:p-8">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(44,190,181,0.1),transparent_45%)]" />
              <div className="relative flex flex-wrap items-center justify-between gap-2 pb-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {categoryLabel}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black shadow-sm",
                  product.inStock ? "bg-emerald-500 text-white" : "bg-rose-500 text-white",
                )}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {availabilityLabel}
                </span>
              </div>
              <motion.div
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.3 }}
                className="product-details-gallery-hero relative cursor-zoom-in overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-sm sm:p-6"
                onClick={() => setActiveImageZoom(!activeImageZoom)}
              >
                <ImageWithFallback
                  src={getCatalogProductImage(product)}
                  alt={displayName}
                  className="mx-auto aspect-square w-full max-w-[34rem] object-contain"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute bottom-4 end-4 rounded-full border border-white/70 bg-white/90 px-2.5 py-1.5 text-[10px] font-black text-slate-500 shadow-sm backdrop-blur-sm">
                  {lang === "ar" ? "انقر للتكبير" : "Click to zoom"}
                </div>
              </motion.div>
            </div>
            <div className="border-t border-slate-100 p-4 sm:p-6">
              <div className="product-details-benefits grid gap-3 sm:grid-cols-3">
                {highlights.map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-3 rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:bg-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-teal-600 ring-1 ring-slate-200 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-black text-slate-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ── Info Panel ── */}
          <motion.section
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="product-details-info rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:p-8 xl:sticky xl:top-24"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
              <ShieldCheck className="h-4 w-4" />
              {lang === "ar" ? "بيانات حية من الكتالوج" : "Live catalog data"}
            </div>
            <h1 className="mt-5 text-3xl font-black leading-tight text-slate-900 sm:text-4xl md:text-5xl">
              {displayName}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700">
                {categoryLabel}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black",
                product.inStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
              )}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {availabilityLabel}
              </span>
              {product.stock > 0 && product.stock <= 5 && (
                <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                  <Zap className="h-3.5 w-3.5" />
                  {lang === "ar" ? "كمية محدودة" : "Limited stock"}
                </span>
              )}
            </div>
            <p className="mt-5 text-sm font-semibold leading-7 text-slate-600 sm:text-base sm:leading-8">
              {lang === "ar"
                ? `هذا المنتج ضمن قسم ${product.categoryName} مع عرض مرتب للسعر والجاهزية والمرجع.`
                : `This item belongs to ${product.categoryNameEn} with a clear presentation of price, readiness, and reference.`}
            </p>

            {/* Price card */}
            <div className="product-details-price-card mt-6 rounded-[1.8rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {lang === "ar" ? "السعر الحالي" : "Current price"}
              </p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight text-slate-800 md:text-5xl">
                    {product.price.toFixed(2)}
                  </span>
                  <span className="text-base font-black text-slate-400">{t("currency")}</span>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-black",
                  product.inStock
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-600",
                )}>
                  <CheckCircle2 className="h-4 w-4" />
                  {availabilityLabel}
                </span>
              </div>
              <div className="product-details-delivery-grid mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {lang === "ar" ? "التوصيل" : "Delivery"}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">{deliveryWindowSentence}</p>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {lang === "ar" ? "الرسوم" : "Fee"}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-800">
                    {lang === "ar" ? "حسب المنطقة" : "By area"}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <FavoriteHeartButton productId={product.id} size="md" className="h-14 w-14 flex-shrink-0 rounded-2xl" />
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAdd}
                  disabled={!product.inStock}
                  className={cn(
                    "product-details-primary-action flex h-14 min-w-0 flex-1 items-center justify-center gap-3 rounded-2xl text-base font-black text-white transition-all",
                    product.inStock
                      ? added
                        ? "bg-emerald-500 shadow-[0_8px_24px_rgba(16,185,129,0.30)]"
                        : "bg-[var(--primary)] hover:bg-[var(--primary-strong)] shadow-[0_8px_24px_rgba(20,184,166,0.24)] hover:shadow-[0_12px_32px_rgba(20,184,166,0.32)] hover:-translate-y-0.5"
                      : "cursor-not-allowed bg-slate-300 text-slate-600",
                  )}
                >
                  <AnimatePresence mode="wait">
                    {product.inStock ? (
                      added ? (
                        <motion.span
                          key="added"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3"
                        >
                          <CheckCircle2 className="h-5 w-5" />
                          {lang === "ar" ? "تمت الإضافة إلى السلة" : "Added to cart"}
                        </motion.span>
                      ) : (
                        <motion.span
                          key="add"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3"
                        >
                          <ShoppingCart className="h-5 w-5" />
                          {t("add_to_cart")}
                        </motion.span>
                      )
                    ) : (
                      <motion.span key="unavailable" className="flex items-center gap-3">
                        <PackageSearch className="h-5 w-5" />
                        {lang === "ar" ? "غير متاح حاليا" : "Currently unavailable"}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            {/* Meta cards */}
            <div className="product-details-meta mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {metaCards.map(({ labelAr, labelEn, value, dir }) => (
                <div key={labelEn} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50/50">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {lang === "ar" ? labelAr : labelEn}
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-800" dir={dir}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Medical Info */}
        {medicalInfo ? (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10 grid gap-6 xl:grid-cols-3"
          >
            {[
              { title: lang === "ar" ? "طريقة الاستخدام" : "Usage",           items: medicalInfo.usageInstructions },
              { title: lang === "ar" ? "إرشادات الجرعة" : "Dosage guidance",  items: medicalInfo.dosageGuidance },
              { title: lang === "ar" ? "تنبيهات السلامة" : "Safety warnings", items: medicalInfo.safetyWarnings, disclaimer: medicalInfo.generalDisclaimer },
            ].map(({ title, items, disclaimer }) => (
              <article key={title} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600">{title}</p>
                <ul className="mt-4 space-y-3 text-sm font-semibold leading-7 text-slate-600">
                  {items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                {disclaimer && (
                  <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                    {disclaimer}
                  </p>
                )}
              </article>
            ))}
          </motion.section>
        ) : null}

        {/* Alternatives */}
        {alternativeProducts.length > 0 ? (
          <section className="product-details-related mt-14">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                  {lang === "ar" ? "بدائل أوضح" : "Clearer alternatives"}
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  {lang === "ar" ? "منتجات بديلة" : "Alternative products"}
                </h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                {lang === "ar" ? "نفس المادة أو قسم قريب" : "Same ingredient or nearby section"}
              </span>
            </div>
            <ProductGrid
              products={alternativeProducts}
              className="product-details-related-grid lg:grid-cols-3 xl:grid-cols-4"
            />
          </section>
        ) : null}

        {/* Related */}
        {relatedProducts.length > 0 && (
          <section className="product-details-related mt-14">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                  {lang === "ar" ? "من نفس القسم" : "From the same category"}
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  {lang === "ar" ? "منتجات ذات صلة" : "Related products"}
                </h2>
              </div>
              <Link
                to={`/categories/${product.category}`}
                className="inline-flex items-center gap-2 text-sm font-black text-slate-600 transition-colors hover:text-slate-900"
              >
                {lang === "ar" ? "عرض القسم" : "Open category"}
                <ArrowRight className={cn("h-4 w-4", lang === "ar" && "rotate-180")} />
              </Link>
            </div>
            <ProductGrid
              products={relatedProducts}
              className="product-details-related-grid lg:grid-cols-3 xl:grid-cols-3"
            />
          </section>
        )}
      </div>
    </div>
  );
}