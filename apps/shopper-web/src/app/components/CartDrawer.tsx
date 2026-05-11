import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { getCatalogProductImage } from "../catalog";
import { getDeliveryWindowSentence, getOrderPricing } from "../config";
import { getLocalizedProductName } from "../localization";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { cn } from "./UI";

export function CartDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { cart, summary, removeFromCart, updateQuantity } = useCart();
  const { lang, t } = useLanguage();

  if (!isOpen) {
    return null;
  }

  const pricing = getOrderPricing(summary.subtotal);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={lang === "ar" ? "إغلاق السلة" : "Close cart"}
        className="absolute inset-0 bg-slate-950/48 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        className={cn(
          "absolute inset-y-0 flex w-full max-w-md flex-col bg-white shadow-[0_30px_60px_rgba(15,23,42,0.18)]",
          lang === "ar" ? "left-0" : "right-0",
        )}
        aria-label={lang === "ar" ? "السلة" : "Cart drawer"}
      >
        <header className="border-b border-slate-200 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
                <ShoppingBag className="h-3.5 w-3.5" />
                {t("cart")}
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">{t("cart_title")}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {summary.itemCount} {lang === "ar" ? "قطعة" : summary.itemCount === 1 ? "item" : "items"}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {summary.itemCount > 0 && (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">{getDeliveryWindowSentence(lang)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {lang === "ar"
                    ? "راجع الكميات بسرعة ثم انتقل إلى الإتمام."
                    : "Review quantities quickly, then continue to checkout."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <ShoppingBag className="h-9 w-9" />
              </div>
              <h3 className="mt-5 text-2xl font-black text-slate-950">{t("empty_cart")}</h3>
              <p className="mt-2 max-w-xs text-sm font-semibold leading-7 text-slate-500">{t("empty_cart_desc")}</p>
              <Link
                to="/products"
                onClick={onClose}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--primary)] px-6 text-sm font-black text-white transition-colors hover:bg-slate-500"
              >
                {t("browse_products")}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_16px_30px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-start gap-4">
                    <Link
                      to={`/products/${item.product_id}`}
                      onClick={onClose}
                      className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-[1.3rem] bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.14),transparent_58%),linear-gradient(180deg,#ffffff_0%,#edf8f7_100%)]"
                    >
                      <ImageWithFallback
                        src={getCatalogProductImage(item.product)}
                        alt={getLocalizedProductName(item.product, lang)}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <Link to={`/products/${item.product_id}`} onClick={onClose} className="min-w-0">
                          <h3 className="line-clamp-2 text-sm font-black leading-6 text-slate-950">
                            {getLocalizedProductName(item.product, lang)}
                          </h3>
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          aria-label={lang === "ar" ? "إزالة المنتج" : "Remove item"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="mt-2 text-sm font-black text-slate-600">
                        {item.product.price.toFixed(2)} {t("currency")}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white"
                            aria-label={lang === "ar" ? "تقليل الكمية" : "Decrease quantity"}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="inline-flex min-w-8 items-center justify-center text-sm font-black text-slate-950">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white"
                            aria-label={lang === "ar" ? "زيادة الكمية" : "Increase quantity"}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-sm font-black text-slate-950">
                          {(item.product.price * item.quantity).toFixed(2)} {t("currency")}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="border-t border-slate-200 bg-white px-5 pb-5 pt-4">
            <div className="space-y-2 rounded-[1.5rem] bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
                <span>{t("subtotal")}</span>
                <span className="font-black text-slate-950">
                  {summary.subtotal.toFixed(2)} {t("currency")}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500">
                <span>{t("shipping")}</span>
                <span className="font-black text-slate-950">
                  {lang === "ar" ? "يُحسب عند الإتمام" : "Calculated at checkout"}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-base font-black text-slate-950">{t("total")}</span>
                <span className="text-xl font-black text-slate-600">
                  {pricing.total.toFixed(2)} {t("currency")}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                to="/cart"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
              >
                {lang === "ar" ? "مراجعة السلة" : "View cart"}
              </Link>
              <Link
                to="/checkout"
                onClick={onClose}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-sm font-black text-white transition-colors hover:bg-slate-500"
              >
                {t("checkout_btn")}
              </Link>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
