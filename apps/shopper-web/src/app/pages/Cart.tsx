import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  DELIVERY_FEE_EGP,
  getDeliveryWindowLabel,
  getOrderPricing,
} from "../config";
import { EmptyState, PageHero, StatTile } from "../components/BrandPrimitives";
import { getCatalogProductImage } from "../catalog";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { cn } from "../components/UI";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { getLocalizedProductName } from "../localization";
import { MobileCartView } from "./ShopperMobileViews";

export default function Cart() {
  const isShopperShell = useIsShopperShell();

  if (isShopperShell) {
    return <MobileCartView />;
  }

  return <CartDesktop />;
}

function CartDesktop() {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  const pricing = getOrderPricing(subtotal);

  if (cart.length === 0) {
    return (
      <div className="cart-page min-h-screen bg-[#F5FDFC]">
        <div className="page-section py-16">
          <EmptyState
            icon={ShoppingBag}
            title={t("empty_cart")}
            description={t("empty_cart_desc")}
            action={
              <Link
                to="/products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 text-sm font-black text-white transition-colors hover:bg-[var(--primary-strong)]"
              >
                <Package className="h-4 w-4" />
                {t("browse_products")}
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page min-h-screen bg-[#F5FDFC]">
      <PageHero
        lang={lang}
        crumbs={[{ label: t("home"), to: "/" }, { label: t("cart_title") }]}
        eyebrow={
          <span className="badge-teal border-0 bg-slate-500/10 text-teal-200">
            <ShoppingBag className="h-4 w-4" />
            {lang === "ar" ? "سلة مرتبة وواضحة" : "A cleaner, structured cart"}
          </span>
        }
        title={t("cart_title")}
        description={
          lang === "ar"
            ? "كل منتج، الكمية، ورسوم التوصيل موضحة في مسار واحد واضح قبل الانتقال إلى الإتمام."
            : "Products, quantities, and delivery charges are organized into one clear review flow before checkout."
        }
        stats={
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile value={itemCount} label={lang === "ar" ? "إجمالي القطع" : "Total items"} />
            <StatTile value={`${pricing.subtotal.toFixed(2)} ${t("currency")}`} label={t("subtotal")} />
            <StatTile value={`${DELIVERY_FEE_EGP} ${t("currency")}`} label={lang === "ar" ? "رسوم التوصيل" : "Delivery fee"} />
            <StatTile value={getDeliveryWindowLabel(lang)} label={lang === "ar" ? "الوقت المتوقع" : "Delivery window"} />
          </div>
        }
      />

      <div className="page-section py-10 md:py-14">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_25rem]">
          <section className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
                <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(36,184,181,0.16),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f5fbfb_100%)] px-5 py-5 sm:px-6">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {lang === "ar" ? "مراجعة الطلب" : "Order review"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {lang === "ar" ? "كل ما اخترته في مساحة واحدة" : "Everything you picked in one workspace"}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                    {lang === "ar"
                      ? "يمكنك تعديل الكميات أو إزالة أي منتج قبل تثبيت الطلب النهائي."
                      : "Adjust quantities or remove products before confirming the final order."}
                  </p>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  {cart.map((item) => {
                    const lineTotal = (item.product?.price || 0) * item.quantity;

                    return (
                      <article
                        key={item.id}
                        className="group rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfb_100%)] p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.08)] sm:p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row">
                          <Link to={`/products/${item.product_id}`} className="sm:w-[9rem]">
                            <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-[1.45rem] border border-slate-100 bg-[radial-gradient(circle_at_top,rgba(36,184,181,0.18),transparent_55%),linear-gradient(180deg,#ffffff_0%,#effaf8_100%)] sm:h-32">
                              <ImageWithFallback
                                src={item.product ? getCatalogProductImage(item.product) : undefined}
                                alt={item.product ? getLocalizedProductName(item.product, lang) : undefined}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <Link to={`/products/${item.product_id}`}>
                                  <h3 className="line-clamp-2 text-lg font-black leading-8 text-slate-950 transition-colors hover:text-slate-700">
                                    {item.product ? getLocalizedProductName(item.product, lang) : undefined}
                                  </h3>
                                </Link>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-600 transition-colors hover:bg-rose-100"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t("remove")}
                              </button>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                              <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                  {lang === "ar" ? "سعر الوحدة" : "Unit price"}
                                </p>
                                <p className="mt-1 text-base font-black text-slate-900">
                                  {(item.product?.price || 0).toFixed(2)} {t("currency")}
                                </p>
                              </div>

                              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
                                    aria-label={lang === "ar" ? "تقليل الكمية" : "Decrease quantity"}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className="inline-flex min-w-10 items-center justify-center text-lg font-black text-slate-900">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
                                    aria-label={lang === "ar" ? "زيادة الكمية" : "Increase quantity"}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,#f4fbfb_0%,#ecf8f7_100%)] px-4 py-3 text-slate-950 md:min-w-[10rem]">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                                  {lang === "ar" ? "الإجمالي" : "Line total"}
                                </p>
                                <p className="mt-1 text-xl font-black text-slate-700">
                                  {lineTotal.toFixed(2)} {t("currency")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f2fbfa_100%)] p-5 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black">
                        {lang === "ar" ? "توصيل ثابت وواضح" : "Clear fixed delivery"}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                        {lang === "ar"
                          ? `رسوم التوصيل ثابتة ${DELIVERY_FEE_EGP} جنيه، والوقت المتوقع ${getDeliveryWindowLabel(lang)} داخل القاهرة.`
                          : `Delivery is fixed at ${DELIVERY_FEE_EGP} EGP with an expected window of ${getDeliveryWindowLabel(lang)} inside Cairo.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {lang === "ar" ? "التحقق قبل الإرسال" : "Validation before submission"}
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                        {lang === "ar"
                          ? "لن يتم إرسال الطلب قبل إدخال الاسم ورقم الهاتف والعنوان بشكل صحيح."
                          : "Orders cannot be submitted until the name, phone number, and address are entered correctly."}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  to="/products"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Package className="h-4 w-4" />
                  {t("continue_shopping")}
                </Link>
              </div>
            </div>
          </section>

          <aside className="xl:sticky xl:top-28 xl:self-start">
            <div className="overflow-hidden rounded-[2.2rem] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
              <div className="bg-[radial-gradient(circle_at_top_left,rgba(36,184,181,0.2),transparent_42%),linear-gradient(180deg,#ffffff_0%,#eef9f8_100%)] px-6 py-6 text-slate-900">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">
                  {lang === "ar" ? "ملخص نهائي" : "Final summary"}
                </p>
                <h2 className="mt-2 text-2xl font-black">{t("order_summary")}</h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {itemCount} {lang === "ar" ? "قطعة جاهزة للمراجعة" : itemCount === 1 ? "item ready to review" : "items ready to review"}
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-[1.25rem] border border-slate-100 bg-slate-50 p-3">
                      <ImageWithFallback
                        src={item.product ? getCatalogProductImage(item.product) : undefined}
                        alt=""
                        className="h-12 w-12 flex-shrink-0 rounded-xl border border-slate-100 bg-[radial-gradient(circle_at_top,rgba(36,184,181,0.16),transparent_55%),linear-gradient(180deg,#ffffff_0%,#effaf8_100%)] object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">
                          {item.product ? getLocalizedProductName(item.product, lang) : undefined}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">x{item.quantity}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">
                        {((item.product?.price || 0) * item.quantity).toFixed(2)} {t("currency")}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                  <SummaryRow label={t("subtotal")} value={`${pricing.subtotal.toFixed(2)} ${t("currency")}`} />
                  <SummaryRow label={t("shipping")} value={`${pricing.shipping.toFixed(2)} ${t("currency")}`} accent />
                  <SummaryRow label={lang === "ar" ? "الوقت المتوقع" : "Delivery window"} value={getDeliveryWindowLabel(lang)} />
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-lg font-black text-slate-950">{t("total")}</span>
                    <span className="text-2xl font-black text-slate-700">
                      {pricing.total.toFixed(2)} {t("currency")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/checkout")}
                  className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-sm font-black text-white shadow-[0_18px_38px_rgba(25,56,68,0.22)] transition-colors hover:bg-[var(--primary-strong)]"
                  style={{ height: "3.25rem" }}
                >
                  {t("checkout_btn")}
                  <ArrowRight className={cn("h-4 w-4", lang === "ar" && "rotate-180")} />
                </button>

                <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                    <ShieldCheck className="h-4 w-4 text-slate-600" />
                    {t("secure_checkout")}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className={cn("font-black", accent ? "text-slate-700" : "text-slate-900")}>{value}</span>
    </div>
  );
}
