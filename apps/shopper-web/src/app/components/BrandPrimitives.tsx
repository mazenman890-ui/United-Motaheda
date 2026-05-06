import { type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronRight, Package, RefreshCw, WifiOff, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import { cn } from "./UI";

type Crumb = {
  label: string;
  to?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb separator — a refined chevron pill
// ─────────────────────────────────────────────────────────────────────────────

function BreadcrumbSeparator({ isRtl }: { isRtl: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
    >
      <ChevronRight
        className={cn(
          "h-3 w-3 text-slate-400/70 transition-colors",
          isRtl && "rotate-180",
        )}
        strokeWidth={2.5}
      />
    </span>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  lang,
  crumbs,
  actions,
  aside,
  stats,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  lang: "ar" | "en";
  crumbs?: Crumb[];
  actions?: ReactNode;
  aside?: ReactNode;
  stats?: ReactNode;
}) {
  const isRtl = lang === "ar";

  return (
    <section className="page-hero page-hero--professional relative overflow-hidden py-12 md:py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-6rem] h-56 w-56 rounded-full bg-slate-200/45 blur-3xl" />
        <div className="absolute right-[-6rem] top-10 h-48 w-48 rounded-full bg-cyan-100/18 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-56 w-56 rounded-full bg-teal-100/12 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.9) 1px,transparent 1px),linear-gradient(90deg,rgba(15,23,42,0.9) 1px,transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
      </div>

      <div className="page-section page-hero__inner relative z-10">
        {/* ── Redesigned Breadcrumbs ─────────────────────────────────────── */}
        {crumbs && crumbs.length > 0 ? (
          <Reveal className="mb-6" direction="down">
            <nav
              aria-label={isRtl ? "مسار التنقل" : "Breadcrumb"}
              dir={isRtl ? "rtl" : "ltr"}
            >
              {/*
               * Pill container: frosted-glass background, subtle border,
               * inline-flex so it only stretches as wide as its content.
               */}
              <ol
                className={cn(
                  "inline-flex flex-wrap items-center gap-0.5 rounded-full",
                  "border border-white/60 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur-sm",
                  "text-[11px] font-bold tracking-wide",
                )}
              >
                {crumbs.map((crumb, index) => {
                  const isLast = index === crumbs.length - 1;

                  return (
                    <li key={`${crumb.label}-${index}`} className="flex items-center gap-0.5">
                      {crumb.to && !isLast ? (
                        <Link
                          to={crumb.to}
                          className={cn(
                            "rounded-full px-2 py-0.5 transition-all",
                            "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50",
                          )}
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5",
                            isLast
                              ? "bg-slate-900 text-white shadow-sm"
                              : "text-slate-500",
                          )}
                          aria-current={isLast ? "page" : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}

                      {/* Separator between crumbs — NOT after the last one */}
                      {!isLast && (
                        <BreadcrumbSeparator isRtl={isRtl} />
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </Reveal>
        ) : null}

        <div
          className={cn(
            "page-hero__layout grid gap-8 xl:items-center",
            aside ? "xl:grid-cols-[minmax(0,1.08fr)_minmax(21rem,0.92fr)]" : "",
          )}
        >
          <Reveal className="page-hero__copy max-w-3xl" direction="up" delay={60}>
            {eyebrow ? <div className="mb-5">{eyebrow}</div> : null}
            <h1 className="page-hero__title text-4xl font-black tracking-tight text-slate-950 md:text-6xl">{title}</h1>
            {description ? (
              <p className="page-hero__description mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600 md:text-lg">
                {description}
              </p>
            ) : null}
            {actions ? <div className="app-strip mt-8">{actions}</div> : null}
            {stats ? (
              <div className="page-hero__stats mt-8 rounded-[1.7rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,251,0.96))] p-3 shadow-[0_18px_36px_rgba(15,23,42,0.05)] backdrop-blur-sm md:p-4">
                {stats}
              </div>
            ) : null}
          </Reveal>

          {aside ? (
            <Reveal className="page-hero__aside h-full" direction={isRtl ? "right" : "left"} delay={120}>
              <div className="h-full rounded-[1.8rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,251,0.96))] p-4 shadow-[0_22px_48px_rgba(15,23,42,0.06)] backdrop-blur-md md:p-5">
                {aside}
              </div>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  align = "start",
  actions,
  spacing = "default",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  actions?: ReactNode;
  spacing?: "default" | "compact";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "section-intro",
        spacing === "compact" ? "mb-6 md:mb-7" : "mb-8 md:mb-10",
        align === "center" ? "text-center" : "text-start",
        className,
      )}
      direction="up"
    >
      {eyebrow ? (
        <div className={cn("mb-4", align === "center" && "flex justify-center")}>
          {eyebrow}
        </div>
      ) : null}

      <div className={cn("flex flex-col gap-4", actions && "md:flex-row md:items-end md:justify-between")}>
        <div className={cn(align === "center" && "mx-auto max-w-3xl")}>
          <h2
            className={cn(
              "section-intro__title font-black tracking-tight text-slate-950",
              spacing === "compact" ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl",
            )}
          >
            {title}
          </h2>
          {description ? (
            <p
              className={cn(
                "section-intro__description mt-3 max-w-3xl font-semibold leading-7 text-slate-500",
                spacing === "compact" ? "text-sm md:text-[0.95rem]" : "text-base",
                align === "center" && "mx-auto max-w-2xl",
              )}
            >
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <div className={cn(align === "center" && "justify-center")}>{actions}</div> : null}
      </div>
    </Reveal>
  );
}

export function SurfacePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card-premium p-5 md:p-6", className)}>{children}</div>;
}

export function InfoTile({
  icon: Icon,
  title,
  description,
  tint = "teal",
  className,
  delay = 0,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  tint?: "teal" | "blue" | "rose" | "amber" | "slate";
  className?: string;
  delay?: number;
}) {
  const tone = {
    teal: { bg: "#F2F7F7", fg: "#0E7C78" },
    blue: { bg: "#F3F6FB", fg: "#315A8A" },
    rose: { bg: "#FFF5F6", fg: "#C2415A" },
    amber: { bg: "#FFF8EE", fg: "#B7791F" },
    slate: { bg: "#F3F6F8", fg: "#334155" },
  }[tint];

  return (
    <Reveal delay={delay} direction="up" className="h-full">
      <SurfacePanel className={cn("h-full", className)}>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: tone.bg, color: tone.fg }}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">{description}</p>
      </SurfacePanel>
    </Reveal>
  );
}

export function StatTile({
  value,
  label,
  dark = false,
  delay = 0,
}: {
  value: ReactNode;
  label: ReactNode;
  dark?: boolean;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} direction="up">
      <div className={cn("rounded-[1.35rem] border px-4 py-4", dark ? "border-white/10 bg-white/[0.05]" : "border-slate-200 bg-white/90")}>
        <p className={cn("text-2xl font-black tracking-tight", dark ? "text-white" : "text-slate-950")}>{value}</p>
        <p className={cn("mt-1 text-[11px] font-black uppercase tracking-[0.18em]", dark ? "text-slate-400" : "text-slate-500")}>
          {label}
        </p>
      </div>
    </Reveal>
  );
}

export function ActionBand({
  eyebrow,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}) {
  return (
    <Reveal direction="up">
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.9rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fb_58%,#ffffff_100%)] p-6 text-slate-950 shadow-[0_22px_48px_rgba(15,23,42,0.06)] md:p-8",
          className,
        )}
      >
        <div aria-hidden className="absolute inset-0">
          <div className="absolute -top-12 right-0 h-40 w-40 rounded-full bg-slate-200/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-36 w-36 rounded-full bg-teal-100/12 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? <div className="mb-4">{eyebrow}</div> : null}
            <h3 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{title}</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600 md:text-base">{description}</p>
          </div>
          {action || secondaryAction ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              {action}
              {secondaryAction}
            </div>
          ) : null}
        </div>
      </div>
    </Reveal>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Reveal direction="up">
      <div className="flex min-h-[340px] flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)] md:min-h-[380px] md:p-10">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-teal-600 shadow-[0_14px_30px_rgba(20,184,166,0.18)]">
          <Icon className="h-10 w-10" />
        </div>
        <h2 className="text-3xl font-black text-slate-950">{title}</h2>
        <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-slate-500">{description}</p>
        {action ? <div className="mt-8">{action}</div> : null}
      </div>
    </Reveal>
  );
}

type BrandActionVariant = "primary" | "secondary" | "ghost";

export type BrandActionItem = {
  to: string;
  label: ReactNode;
  icon?: LucideIcon;
  variant?: BrandActionVariant;
  className?: string;
};

export function BrandActionGroup({
  actions,
  className,
}: {
  actions: BrandActionItem[];
  className?: string;
}) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {actions.map(({ to, label, icon: Icon = ChevronRight, variant = "primary", className: itemClassName }) => (
        <Link
          key={`${to}-${String(label)}`}
          to={to}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-[1.1rem] px-5 text-sm font-black transition-all active:scale-[0.98]",
            variant === "primary" && "bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.2)] hover:-translate-y-0.5",
            variant === "secondary" && "border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50",
            variant === "ghost" && "text-[var(--primary)] hover:bg-[var(--primary)]/5",
            itemClassName,
          )}
        >
          <span>{label}</span>
          <Icon className="h-4 w-4 shrink-0" />
        </Link>
      ))}
    </div>
  );
}

type StatusPanelTone = "info" | "warning" | "error" | "success" | "offline" | "reconnecting";

const STATUS_PANEL_TONES: Record<
  StatusPanelTone,
  {
    container: string;
    icon: string;
    title: string;
    description: string;
    Icon: LucideIcon;
  }
> = {
  info: {
    container: "border-sky-200 bg-sky-50/90",
    icon: "bg-white text-sky-600",
    title: "text-sky-950",
    description: "text-sky-800",
    Icon: Package,
  },
  warning: {
    container: "border-amber-200 bg-amber-50/90",
    icon: "bg-white text-amber-600",
    title: "text-amber-950",
    description: "text-amber-800",
    Icon: AlertCircle,
  },
  error: {
    container: "border-rose-200 bg-rose-50/95",
    icon: "bg-white text-rose-600",
    title: "text-rose-950",
    description: "text-rose-800",
    Icon: AlertCircle,
  },
  success: {
    container: "border-emerald-200 bg-emerald-50/95",
    icon: "bg-white text-emerald-600",
    title: "text-emerald-950",
    description: "text-emerald-800",
    Icon: CheckCircle2,
  },
  offline: {
    container: "border-slate-200 bg-slate-100/95",
    icon: "bg-white text-slate-700",
    title: "text-slate-950",
    description: "text-slate-700",
    Icon: WifiOff,
  },
  reconnecting: {
    container: "border-teal-200 bg-teal-50/95",
    icon: "bg-white text-teal-700",
    title: "text-teal-950",
    description: "text-teal-800",
    Icon: RefreshCw,
  },
};

export function StatusPanel({
  tone,
  title,
  description,
  actions,
  icon,
  className,
}: {
  tone: StatusPanelTone;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  const toneStyles = STATUS_PANEL_TONES[tone];
  const Icon = icon ?? toneStyles.Icon;

  return (
    <Reveal direction="up">
      <div className={cn("rounded-[1.8rem] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] md:p-6", toneStyles.container, className)}>
        <div className="flex items-start gap-4">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm", toneStyles.icon)}>
            <Icon className={cn("h-5 w-5", tone === "reconnecting" && "animate-spin")} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn("text-lg font-black md:text-xl", toneStyles.title)}>{title}</h3>
            {description ? (
              <div className={cn("mt-2 text-sm font-semibold leading-7", toneStyles.description)}>
                {description}
              </div>
            ) : null}
            {actions ? <div className="mt-5">{actions}</div> : null}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
