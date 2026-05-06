import { ShoppingBag } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { cn } from "./UI";

export function FloatingCartButton({
  onClick,
  hidden = false,
}: {
  onClick: () => void;
  hidden?: boolean;
}) {
  const location = useLocation();
  const { summary } = useCart();
  const { lang, t } = useLanguage();

  if (summary.itemCount === 0 || ["/cart", "/checkout"].includes(location.pathname)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "fixed bottom-[5.9rem] z-40 inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#193844_0%,#1f4e5c_58%,#24b8b5_100%)] px-4 py-3 text-white shadow-[0_20px_40px_rgba(25,56,68,0.28)] transition-all active:scale-95 md:hidden",
        lang === "ar" ? "left-4" : "right-4",
        hidden && "pointer-events-none translate-y-6 opacity-0",
      )}
      aria-label={lang === "ar" ? `فتح السلة، ${summary.itemCount}` : `Open cart, ${summary.itemCount} items`}
    >
      <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
        <ShoppingBag className="h-5 w-5" />
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-teal-400 px-1 text-[10px] font-black text-slate-950">
          {summary.itemCount > 99 ? "99+" : summary.itemCount}
        </span>
      </span>
      <span className="text-start">
        <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
          {lang === "ar" ? `${summary.itemCount} قطعة` : `${summary.itemCount} items`}
        </span>
        <span className="block text-sm font-black">
          {summary.subtotal.toFixed(2)} {t("currency")}
        </span>
      </span>
    </button>
  );
}
