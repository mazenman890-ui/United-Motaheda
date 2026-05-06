import type { ButtonHTMLAttributes, FormEvent, ReactNode } from "react";
import { PanelLeftClose, type LucideIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { cn } from "./UI";
import { SearchBar } from "./SearchBar";

export function CatalogSearchForm({
  value,
  onChange,
  onSubmit,
  placeholder,
  lang,
  className,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  placeholder: string;
  lang: "ar" | "en";
  className?: string;
  autoFocus?: boolean;
}) {
  const inputPadding = lang === "ar" ? "pr-11 pl-11 text-right" : "pl-11 pr-11 text-left";

  return (
    <form onSubmit={onSubmit} className={className}>
      <SearchBar
        value={value}
        onChange={onChange}
        onClear={() => onChange("")}
        placeholder={placeholder}
        lang={lang}
        autoFocus={autoFocus}
        shellClassName="shadow-[0_12px_26px_rgba(15,23,42,0.05)]"
        inputClassName={inputPadding}
      />
    </form>
  );
}

export function CatalogControlButton({
  icon: Icon,
  label,
  active = false,
  accent = false,
  className,
  ...props
}: {
  icon: LucideIcon;
  label: ReactNode;
  active?: boolean;
  accent?: boolean;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-[1.2rem] border px-4 text-sm font-black transition-all active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20",
        accent
          ? "border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)]"
          : active
            ? "border-slate-300 bg-slate-100 text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

export function CatalogChip({
  selected,
  children,
  className,
  ...props
}: {
  selected?: boolean;
  children: ReactNode;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-black transition-all active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/20",
        selected
          ? "border-slate-300 bg-slate-100 text-slate-900 shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function FilterPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.6rem] border border-white/70 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100/80 pb-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            {title}
          </p>
          {description ? (
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

export function CatalogDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="bottom"
      shouldScaleBackground={false}
    >
      <DrawerContent className="max-h-[88vh] rounded-t-[2rem] border-slate-200 bg-white">
        <DrawerHeader className="gap-2 border-b border-slate-100 px-5 pb-4 pt-3">
          <DrawerTitle className="text-base font-black text-slate-950">{title}</DrawerTitle>
          {description ? (
            <DrawerDescription className="text-sm font-semibold leading-6 text-slate-500">
              {description}
            </DrawerDescription>
          ) : null}
        </DrawerHeader>

        <div className="overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <DrawerFooter className="border-t border-slate-100 bg-white px-5 py-4">
            {footer}
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

export function MobileFilterDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  lang: "ar" | "en";
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={lang === "ar" ? "left" : "right"}
      shouldScaleBackground={false}
    >
      <DrawerContent className="h-full max-w-[24rem] border-slate-200 bg-white">
        <DrawerHeader className="gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="text-base font-black text-slate-950">{title}</DrawerTitle>
              {description ? (
                <DrawerDescription className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  {description}
                </DrawerDescription>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100"
              aria-label={lang === "ar" ? "إغلاق الفلاتر" : "Close filters"}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <DrawerFooter className="border-t border-slate-100 bg-white px-5 py-4">
            {footer}
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}

export function CatalogSkeletonGrid({
  variant = "product",
  count = 8,
}: {
  variant?: "product" | "category";
  count?: number;
}) {
  const isCategory = variant === "category";

  return (
    <div className={cn(isCategory ? "catalog-category-grid" : "catalog-card-grid")}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "animate-pulse overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]",
            isCategory && "aspect-square",
          )}
        >
          {isCategory ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-5">
              <div className="h-14 w-14 rounded-[1.1rem] bg-slate-100" />
              <div className="h-4 w-24 rounded-full bg-slate-100" />
              <div className="h-3 w-16 rounded-full bg-slate-100" />
            </div>
          ) : (
            <>
              <div className="aspect-square bg-slate-100" />
              <div className="space-y-3 p-4">
                <div className="h-3 w-20 rounded-full bg-slate-100" />
                <div className="h-5 w-full rounded-full bg-slate-100" />
                <div className="h-5 w-3/4 rounded-full bg-slate-100" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-6 w-24 rounded-full bg-slate-100" />
                  <div className="h-11 w-11 rounded-[1rem] bg-slate-100" />
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
