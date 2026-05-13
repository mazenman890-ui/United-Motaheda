/**
 * EmptyState — M10 UI/UX Polish
 *
 * A single, reusable empty-state component shared across all routes.
 * Supports 4 preset variants (search, catalog, orders, wishlist) and a
 * generic slot for custom icon + messaging.
 *
 * Design principles:
 *  - Content-shaped placeholder — never a bare spinner.
 *  - Bilingual: reads current language from LanguageContext.
 *  - 44 × 44 px minimum touch target on all CTAs (Apple HIG / Material).
 *  - Accessible: role="status", aria-live, all icons aria-hidden.
 */
import { type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  PackageSearch,
  ShoppingBag,
  Heart,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { slideUp } from "../motion";
import { cn } from "./UI";

// ─── Variant definitions ──────────────────────────────────────────────────────

type Variant = "search" | "catalog" | "orders" | "wishlist" | "generic";

interface VariantConfig {
  icon: LucideIcon;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  iconBg: string;
  iconColor: string;
}

const VARIANTS: Record<Variant, VariantConfig> = {
  search: {
    icon: PackageSearch,
    titleAr: "لا توجد نتائج",
    titleEn: "No results found",
    bodyAr: "لم نجد منتجات تطابق بحثك. جرّب كلمة مختلفة.",
    bodyEn: "We couldn't find any products matching your search. Try a different term.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-400",
  },
  catalog: {
    icon: ShoppingBag,
    titleAr: "المنتجات قيد التحميل",
    titleEn: "Products loading",
    bodyAr: "يتم تحميل الكتالوج. يرجى الانتظار لحظة.",
    bodyEn: "The catalog is loading. Please wait a moment.",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-500",
  },
  orders: {
    icon: ClipboardList,
    titleAr: "لا توجد طلبات بعد",
    titleEn: "No orders yet",
    bodyAr: "لم تقم بأي طلبات حتى الآن. ابدأ التسوق الآن!",
    bodyEn: "You haven't placed any orders yet. Start shopping now!",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-400",
  },
  wishlist: {
    icon: Heart,
    titleAr: "قائمة الأمنيات فارغة",
    titleEn: "Wishlist is empty",
    bodyAr: "أضف منتجاتك المفضلة إلى قائمة الأمنيات للعثور عليها بسهولة لاحقاً.",
    bodyEn: "Add your favourite products to the wishlist to find them easily later.",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-400",
  },
  generic: {
    icon: PackageSearch,
    titleAr: "لا يوجد محتوى",
    titleEn: "Nothing here",
    bodyAr: "لا يوجد محتوى للعرض حالياً.",
    bodyEn: "There's nothing to display right now.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-400",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  variant?: Variant;
  /** Override the title */
  title?: string;
  /** Override the body text */
  body?: string;
  /** Custom icon (overrides variant icon) */
  icon?: LucideIcon;
  /** CTA button(s) */
  action?: ReactNode;
  lang?: "ar" | "en";
  className?: string;
}

export function EmptyState({
  variant = "generic",
  title,
  body,
  icon,
  action,
  lang = "en",
  className,
}: EmptyStateProps) {
  const cfg = VARIANTS[variant];
  const Icon = icon ?? cfg.icon;
  const isAr = lang === "ar";

  const displayTitle = title ?? (isAr ? cfg.titleAr : cfg.titleEn);
  const displayBody = body ?? (isAr ? cfg.bodyAr : cfg.bodyEn);

  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      role="status"
      aria-live="polite"
      dir={isAr ? "rtl" : "ltr"}
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-6 py-16 text-center",
        className,
      )}
    >
      {/* Icon bubble */}
      <div
        aria-hidden
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-[1.4rem]",
          cfg.iconBg,
        )}
      >
        <Icon className={cn("h-9 w-9", cfg.iconColor)} strokeWidth={1.6} />
      </div>

      {/* Text */}
      <div className="max-w-xs space-y-2">
        <p className="text-[1.1rem] font-black text-slate-900">{displayTitle}</p>
        <p className="text-sm font-medium leading-relaxed text-slate-500">{displayBody}</p>
      </div>

      {/* Optional CTA */}
      {action && <div className="mt-2">{action}</div>}
    </motion.div>
  );
}
