import { useEffect, useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState, PageHero } from "../components/BrandPrimitives";
import { CatalogSkeletonGrid } from "../components/CatalogPrimitives";
import { ProductGrid } from "../components/ProductGrid";
import { useCatalog } from "../../contexts/CatalogContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { fetchProductsByIds } from "../../services/shopperCatalogApi";
import type { CatalogProduct } from "../catalog";

export default function Favorites() {
  const { t, lang } = useLanguage();
  const { productsById } = useCatalog();
  const { favoriteIds, isBusy, errorMessage } = useFavorites();

  // Products fetched directly from Supabase for favorite IDs not in page-1 cache.
  const [fetchedProducts, setFetchedProducts] = useState<Record<string, CatalogProduct>>({});
  const fetchedRef = useRef<Record<string, CatalogProduct>>({});
  const [isFetchingFavs, setIsFetchingFavs] = useState(false);

  useEffect(() => {
    if (favoriteIds.size === 0) return;

    const missingIds = Array.from(favoriteIds).filter(
      (id) => !productsById[id] && !fetchedRef.current[id],
    );

    if (missingIds.length === 0) return;

    setIsFetchingFavs(true);
    void fetchProductsByIds(missingIds).then((fetched) => {
      fetched.forEach((p) => { fetchedRef.current[p.id] = p; });
      setFetchedProducts({ ...fetchedRef.current });
      setIsFetchingFavs(false);
    });
  }, [favoriteIds, productsById]);

  const favoriteProducts = useMemo(() => {
    const allById: Record<string, CatalogProduct> = { ...fetchedProducts, ...productsById };
    return Array.from(favoriteIds)
      .map((id) => allById[id])
      .filter((p): p is CatalogProduct => Boolean(p));
  }, [favoriteIds, productsById, fetchedProducts]);

  const availableProducts = favoriteProducts.filter((product) => product.inStock).length;

  const isResolving = isBusy || isFetchingFavs;

  return (
    <div className="min-h-screen bg-[#F5FDFC]">
      <PageHero
        lang={lang}
        crumbs={[{ label: t("home"), to: "/" }, { label: t("favorites_nav") }]}
        eyebrow={
          <span className="badge-teal border-0 bg-white text-teal-700 shadow-sm">
            <Heart className="h-4 w-4" />
            {lang === "ar" ? "منتجات محفوظة" : "Saved products"}
          </span>
        }
        title={t("favorites_title")}
        description={t("favorites_subtitle")}
        stats={
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {lang === "ar" ? "إجمالي العناصر" : "Saved items"}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{favoriteProducts.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {lang === "ar" ? "المتاح الآن" : "Available now"}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{availableProducts}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {lang === "ar" ? "الإجراء" : "Next step"}
              </p>
              <p className="mt-2 text-base font-black text-slate-950">
                {lang === "ar" ? "راجع ثم أضف للسلة" : "Review then add to cart"}
              </p>
            </div>
          </div>
        }
      />

      <section className="page-section py-8 md:py-10">
        {errorMessage ? (
          <div className="mb-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
            {errorMessage}
          </div>
        ) : null}
        {isResolving ? (
          <CatalogSkeletonGrid count={6} />
        ) : favoriteProducts.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={t("favorites_empty")}
            description={
              lang === "ar"
                ? "احفظ المنتجات للرجوع إليها لاحقاً من صفحات المنتجات والعروض."
                : "Save products from the catalog or offers to review them later."
            }
            action={
              <Link
                to="/products"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--primary)] px-6 text-sm font-black text-white"
              >
                {t("browse_products")}
              </Link>
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="rounded-[1.8rem] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {lang === "ar"
                      ? `${favoriteProducts.length} منتجات محفوظة`
                      : `${favoriteProducts.length} saved products`}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {lang === "ar"
                      ? "يمكنك إزالة أي منتج من خلال زر القلب داخل البطاقة."
                      : "You can remove any item using the heart button on its card."}
                  </p>
                </div>
                <Link
                  to="/products"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {lang === "ar" ? "متابعة التصفح" : "Continue browsing"}
                </Link>
              </div>
            </div>
            <ProductGrid products={favoriteProducts} />
          </div>
        )}
      </section>
    </div>
  );
}
