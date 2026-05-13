import {
  Baby,
  ChevronRight,
  Droplets,
  HeartPulse,
  Package,
  Pill,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { memo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import type { CatalogCategory } from "../catalog";
import { getLocalizedCategoryName } from "../localization";
import { Reveal } from "./Reveal";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { cn } from "./UI";

/* ─── Icon map ────────────────────────────────────────────────── */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Package,
  Pill,
  HeartPulse,
  Sparkles,
  Droplets,
  Baby,
  Stethoscope,
};

function getCategoryIcon(iconName: string) {
  return CATEGORY_ICONS[iconName] || Package;
}

/* ─── Theme styles ────────────────────────────────────────────── */
function getCategoryStyles(category: CatalogCategory) {
  return {
    iconShell: {
      backgroundColor: category.theme.accentSoft,
      color: category.theme.color,
      borderColor: category.theme.border,
    } satisfies CSSProperties,
    accentText: {
      color: category.theme.color,
    } satisfies CSSProperties,
    accentBg: {
      backgroundColor: category.theme.accentSoft,
      borderColor: category.theme.border,
    } satisfies CSSProperties,
  };
}

/* ─── Category Card ───────────────────────────────────────────── */
export const CategoryCard = memo(function CategoryCard({
  category,
  className,
}: {
  category: CatalogCategory;
  className?: string;
}) {
  const { lang } = useLanguage();
  const IconComponent = getCategoryIcon(category.icon);
  const displayName = getLocalizedCategoryName(category, lang);
  const description =
    lang === "ar" ? category.descAr : category.descEn || category.descAr;
  const styles = getCategoryStyles(category);

  return (
    <Reveal className="h-full" direction="up">
      <Link
        to={`/categories/${category.id}`}
        className="category-card__link group block h-full"
      >
        <article
          className={cn(
            "category-card__surface relative flex h-full min-h-[17rem] flex-col overflow-hidden",
            "rounded-2xl border border-slate-100 bg-white",
            "shadow-[0_1px_4px_rgba(15,23,42,0.05)]",
            "transition-all duration-250 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)] hover:border-slate-200",
            className,
          )}
        >
          {/* ── Image block ── */}
          <div className="relative flex-shrink-0 overflow-hidden rounded-t-2xl bg-slate-50">
            <div className="relative aspect-[1.1] overflow-hidden">

              {/* Category type chip */}
              <div className="absolute start-2.5 top-2.5 z-20">
                <div
                  className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[9px] font-black shadow-sm"
                  style={styles.accentBg}
                >
                  <IconComponent className="h-2.5 w-2.5 shrink-0" strokeWidth={2} style={styles.accentText} />
                  <span style={styles.accentText}>
                    {lang === "ar" ? "قسم" : "Section"}
                  </span>
                </div>
              </div>

              {/* Image */}
              <ImageWithFallback
                src={category.imageUrl}
                alt={displayName}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                style={
                  category.imagePosition
                    ? { objectPosition: category.imagePosition }
                    : undefined
                }
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          {/* ── Content block ── */}
          <div className="flex flex-1 flex-col p-4">

            {/* Icon + title */}
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                style={styles.iconShell}
              >
                <IconComponent className="h-4 w-4" strokeWidth={2} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {lang === "ar" ? "قسم علاجي" : "Care section"}
                </p>
                <h3 className="category-card__title mt-0.5 line-clamp-2 text-[0.9rem] font-black leading-snug text-slate-900 transition-colors group-hover:text-teal-700">
                  {displayName}
                </h3>
              </div>
            </div>

            {/* Description */}
            {description && (
              <p className="category-card__description mt-2.5 line-clamp-2 text-[0.78rem] font-medium leading-[1.65] text-slate-500">
                {description}
              </p>
            )}

            {/* CTA row */}
            <div className="mt-auto pt-3.5">
              <div
                className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-black transition-all duration-200 group-hover:-translate-y-px"
                style={styles.accentBg}
              >
                <span style={styles.accentText}>
                  {lang === "ar" ? "استكشف القسم" : "Explore section"}
                </span>
                <ChevronRight
                  className={cn(
                    "h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5",
                    lang === "ar" && "rotate-180 group-hover:-translate-x-0.5 group-hover:translate-x-0",
                  )}
                  style={styles.accentText}
                />
              </div>
            </div>
          </div>
        </article>
      </Link>
    </Reveal>
  );
});

/* ─── Category Pill ───────────────────────────────────────────── */
export const CategoryPill = memo(function CategoryPill({ category }: { category: CatalogCategory }) {
  const { lang } = useLanguage();
  const IconComponent = getCategoryIcon(category.icon);
  const displayName = getLocalizedCategoryName(category, lang);
  const styles = getCategoryStyles(category);

  return (
    <Link
      to={`/categories/${category.id}`}
      className="group relative flex w-[104px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white text-start shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-250 ease-out hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200 active:scale-[0.98] sm:w-[112px]"
    >
      <div className="relative overflow-hidden rounded-t-2xl bg-slate-50">
        <div className="relative aspect-square overflow-hidden">
          <ImageWithFallback
            src={category.imageUrl}
            alt={displayName}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            style={
              category.imagePosition
                ? { objectPosition: category.imagePosition }
                : undefined
            }
            loading="lazy"
            decoding="async"
          />
          <div
            className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm"
            style={styles.iconShell}
          >
            <IconComponent className="h-3 w-3" strokeWidth={2} />
          </div>
        </div>
      </div>

      <div className="flex min-h-[3.8rem] flex-1 flex-col justify-between px-2.5 py-2">
        <span className="line-clamp-2 text-[10px] font-bold leading-tight text-slate-800 transition-colors group-hover:text-teal-700">
          {displayName}
        </span>
        <span
          className="mt-1 inline-block text-[9px] font-black"
          style={styles.accentText}
        >
          {lang === "ar" ? "متاح" : "Available"}
        </span>
      </div>
    </Link>
  );
});
