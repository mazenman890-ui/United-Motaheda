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
    shell: {
      background: `linear-gradient(180deg, rgba(255,255,255,0.9), ${category.theme.accentSoft})`,
    } satisfies CSSProperties,
    mediaTint: {
      background: `linear-gradient(180deg, transparent 30%, ${category.theme.glow} 100%)`,
    } satisfies CSSProperties,
    iconShell: {
      backgroundColor: category.theme.accentSoft,
      color: category.theme.color,
      borderColor: `${category.theme.border}`,
      boxShadow: `0 8px 20px ${category.theme.glow}`,
    } satisfies CSSProperties,
    statShell: {
      backgroundColor: `${category.theme.accentSoft}`,
      borderColor: category.theme.border,
      color: category.theme.color,
    } satisfies CSSProperties,
    ctaShell: {
      background: `linear-gradient(135deg, ${category.theme.accentSoft}, rgba(255,255,255,0.95))`,
      borderColor: category.theme.border,
      color: category.theme.color,
    } satisfies CSSProperties,
    progressBar: {
      background: category.theme.color,
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
  const stockPct = category.count > 0
    ? Math.round((category.inStockCount / category.count) * 100)
    : 0;

  return (
    <Reveal className="h-full" direction="up">
      <Link
        to={`/categories/${category.id}`}
        className="category-card__link group block h-full"
      >
        <article
          className={cn(
            "category-card__surface relative flex h-full min-h-[18rem] flex-col overflow-hidden rounded-[1.6rem] border border-white/70 bg-white/85",
            "shadow-[0_2px_12px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/60 backdrop-blur-xl",
            "transition-all duration-350 ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.13)]",
            className,
          )}
          style={styles.shell}
        >
          {/* Sheen overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[1.6rem] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.55),transparent_32%)]"
          />

          {/* ── Image block ── */}
          <div className="relative flex-shrink-0 overflow-hidden border-b border-white/60">
            <div className="relative aspect-[1.08] overflow-hidden p-3">

              {/* Top badges row */}
              <div className="absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
                <div
                  className="inline-flex min-w-0 max-w-[65%] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black shadow-sm backdrop-blur-md"
                  style={styles.statShell}
                >
                  <IconComponent className="h-3 w-3 shrink-0" strokeWidth={2} />
                  <span className="truncate">
                    {lang === "ar" ? "قسم علاجي" : "Care section"}
                  </span>
                </div>

                <div className="rounded-full border border-white/60 bg-white/85 px-2.5 py-1 text-[9px] font-black text-slate-600 shadow-sm backdrop-blur-md">
                  {lang === "ar"
                    ? `${category.inStockCount} متاح`
                    : `${category.inStockCount} ready`}
                </div>
              </div>

              {/* Image */}
              <div className="relative h-full overflow-hidden rounded-[1.2rem] border border-white/70 bg-white/70">
                <ImageWithFallback
                  src={category.imageUrl}
                  alt={displayName}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                  style={
                    category.imagePosition
                      ? { objectPosition: category.imagePosition }
                      : undefined
                  }
                  loading="lazy"
                  decoding="async"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={styles.mediaTint}
                />
              </div>
            </div>
          </div>

          {/* ── Content block ── */}
          <div className="relative flex flex-1 flex-col p-4">

            {/* Category label + icon */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {lang === "ar" ? "تصنيف منظم" : "Curated category"}
                </p>
                <h3 className="category-card__title mt-1.5 line-clamp-2 text-[1rem] font-black leading-snug text-slate-950 transition-colors group-hover:text-[var(--primary)]">
                  {displayName}
                </h3>
              </div>

              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-md"
                style={styles.iconShell}
              >
                <IconComponent className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
            </div>

            {/* Description */}
            <p className="category-card__description mt-2 line-clamp-2 text-[0.81rem] font-semibold leading-[1.65] text-slate-500">
              {description}
            </p>

            {/* Availability progress bar */}
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[9px] font-black">
                <span className="text-slate-400">
                  {lang === "ar" ? "نسبة التوفر" : "Availability"}
                </span>
                <span style={{ color: category.theme.color }}>{stockPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full transition-all duration-800 ease-out"
                  style={{
                    ...styles.progressBar,
                    width: `${stockPct}%`,
                  }}
                />
              </div>
            </div>

            {/* ── Footer CTA ── */}
            <div className="mt-auto pt-3.5">
              <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/70 bg-white/65 px-3.5 py-2.5 backdrop-blur-md">
                {/* Stats */}
                <div className="flex items-center gap-3 text-[10px]">
                  <div>
                    <span className="font-black text-slate-500">
                      {lang === "ar" ? "الإجمالي " : "Total "}
                    </span>
                    <span className="font-black text-slate-900">{category.count}</span>
                  </div>
                  <div className="h-3 w-px bg-slate-200" />
                  <div>
                    <span className="font-black text-slate-500">
                      {lang === "ar" ? "المتاح " : "Ready "}
                    </span>
                    <span className="font-black text-slate-900">{category.inStockCount}</span>
                  </div>
                </div>

                {/* CTA */}
                <span
                  className="category-card__cta inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-black shadow-sm backdrop-blur-md transition-all duration-300 ease-out group-hover:-translate-y-0.5 group-hover:shadow-md"
                  style={styles.ctaShell}
                >
                  {lang === "ar" ? "استكشف" : "Explore"}
                  <ChevronRight
                    className={cn(
                      "h-3 w-3 transition-transform duration-300 ease-out group-hover:translate-x-0.5",
                      lang === "ar" &&
                        "rotate-180 group-hover:-translate-x-0.5 group-hover:translate-x-0",
                    )}
                  />
                </span>
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
      className="group relative flex w-[108px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/82 text-start shadow-sm ring-1 ring-slate-200/60 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] sm:w-[116px]"
      style={styles.shell}
    >
      <div className="relative overflow-hidden p-2.5">
        <div className="overflow-hidden rounded-[1rem] border border-white/70 bg-white/70">
          <ImageWithFallback
            src={category.imageUrl}
            alt={displayName}
            className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            style={
              category.imagePosition
                ? { objectPosition: category.imagePosition }
                : undefined
            }
            loading="lazy"
            decoding="async"
          />
        </div>
        <div
          className="absolute end-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm backdrop-blur-md"
          style={styles.iconShell}
        >
          <IconComponent className="h-3.5 w-3.5" strokeWidth={1.8} />
        </div>
      </div>

      <div className="flex min-h-[4.2rem] flex-1 flex-col justify-between px-2.5 pb-2.5">
        <span className="line-clamp-2 text-[10.5px] font-black leading-tight text-slate-800 transition-colors group-hover:text-[var(--primary)]">
          {displayName}
        </span>
        <span className="mt-1.5 text-[9.5px] font-black text-slate-400">
          {lang === "ar"
            ? `${category.inStockCount} متاح`
            : `${category.inStockCount} ready`}
        </span>
      </div>
    </Link>
  );
});