import React, { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseColorChannels(color: string) {
  const match = color.match(/rgba?\(([^)]+)\)/i);

  if (!match) {
    return null;
  }

  const [r = "255", g = "255", b = "255", alpha = "1"] = match[1]
    .split(",")
    .map((part) => part.trim());

  return {
    r: Number(r),
    g: Number(g),
    b: Number(b),
    alpha: Number(alpha),
  };
}

function getRelativeLuminance(color: string) {
  const channels = parseColorChannels(color);

  if (!channels) {
    return 1;
  }

  if (channels.alpha < 0.85) {
    return 1;
  }

  const normalize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * normalize(channels.r)
    + 0.7152 * normalize(channels.g)
    + 0.0722 * normalize(channels.b)
  );
}

function updateAutoContrast(root: ParentNode = document) {
  const targets = root.querySelectorAll<HTMLElement>(
    "button, a, [role='button'], input[type='submit'], input[type='button']",
  );

  targets.forEach((target) => {
    const computed = window.getComputedStyle(target);
    const hasSolidBackground = computed.backgroundImage === "none";
    const luminance = getRelativeLuminance(computed.backgroundColor);
    const isDarkSurface = hasSolidBackground && luminance < 0.34;
    const descendants = target.querySelectorAll<HTMLElement>("span, p, strong, small, svg");

    if (!isDarkSurface) {
      target.removeAttribute("data-auto-contrast");
      descendants.forEach((descendant) => descendant.removeAttribute("data-auto-contrast-text"));
      return;
    }

    target.setAttribute("data-auto-contrast", "light");
    descendants.forEach((descendant) => {
      const descendantStyles = window.getComputedStyle(descendant);
      const descendantBackground = getRelativeLuminance(descendantStyles.backgroundColor);
      const descendantColor = getRelativeLuminance(descendantStyles.color);
      const isTransparentSurface = parseColorChannels(descendantStyles.backgroundColor)?.alpha ?? 1;

      if (isTransparentSurface < 0.1 && descendantColor < 0.45) {
        descendant.setAttribute("data-auto-contrast-text", "light");
        return;
      }

      if (descendantBackground > 0.88) {
        descendant.removeAttribute("data-auto-contrast-text");
      }
    });
  });
}

export function AutoContrastTextGuard() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateAutoContrast();
      });
    };

    schedule();

    const observer = new MutationObserver(() => {
      schedule();
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-state", "data-active"],
    });

    window.addEventListener("resize", schedule);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return null;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'royal';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}) {
  const baseStyles = "inline-flex items-center justify-center font-bold transition-[background-color,border-color,color,box-shadow,transform] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:pointer-events-none disabled:opacity-50 rounded-2xl active:scale-[0.98]";
  
  const variants = {
    primary: "bg-teal-500 text-white hover:bg-teal-600 shadow-[0_12px_28px_rgba(36,184,181,0.22)]",
    secondary: "bg-slate-900 text-white hover:bg-slate-800 shadow-[0_14px_32px_rgba(16,23,34,0.18)]",
    royal: "bg-royal-700 text-white hover:bg-royal-800 shadow-md hover:shadow-lg shadow-royal-700/20",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 shadow-sm",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-700",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
  };

  const sizes = {
    sm: "h-10 px-4 text-sm",
    md: "h-11 px-6 text-sm",
    lg: "h-14 px-8 text-base",
    icon: "h-11 w-11",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function Badge({
  className,
  variant = 'default',
  children,
}: {
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  const variants = {
    default: "bg-slate-100 text-slate-800",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide", variants[variant], className)}>
      {children}
    </span>
  );
}

export function Input({
  className,
  icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode }) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
          {icon}
        </div>
      )}
      <input
        className={cn(
          "flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-400 transition-shadow shadow-sm",
          icon && "pr-10",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md", className)} {...props}>
      {children}
    </div>
  );
}
