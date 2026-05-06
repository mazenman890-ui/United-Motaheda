import { Heart, Home, LayoutDashboard, LayoutGrid, Package, ShoppingBag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { cn } from "./UI";

export function MobileBottomNav({ hidden = false }: { hidden?: boolean }) {
  const location = useLocation();
  const { lang, t } = useLanguage();
  const { summary } = useCart();
  const { user } = useAuth();
  const ordersLabel = lang === "ar" ? "الطلبات" : "Orders";
  const adminLabel = lang === "ar" ? "الإدارة" : "Admin";

  const isStaff = user && user.role !== "customer";

  const links: Array<{
    path: string;
    icon: typeof Home;
    label: string;
    isCart?: boolean;
  }> = [
    { path: "/", icon: Home, label: t("home") },
    { path: "/categories", icon: LayoutGrid, label: t("categories") },
    { path: "/orders", icon: Package, label: ordersLabel },
    { path: "/wishlist", icon: Heart, label: t("favorites_nav") },
    { path: "/cart", icon: ShoppingBag, label: t("cart"), isCart: true },
  ];

  if (isStaff) {
    links.push({
      path: "/admin",
      icon: LayoutDashboard,
      label: adminLabel,
    });
  }

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/cart") {
      return location.pathname === "/cart" || location.pathname === "/checkout";
    }
    if (path === "/wishlist") {
      return location.pathname === "/wishlist" || location.pathname === "/favorites";
    }
    if (path === "/admin") {
      return location.pathname === "/admin" || location.pathname.startsWith("/admin/");
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      aria-label={lang === "ar" ? "التنقل السفلي" : "Bottom navigation"}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={cn(
        // Visible on mobile / tablet only — hidden on desktop and larger screens.
        "fixed inset-x-0 bottom-0 z-[70] lg:hidden",
        "transition-transform duration-500 will-change-transform",
        hidden && "pointer-events-none translate-y-full",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        transform: hidden
          ? "translateY(calc(100% + env(safe-area-inset-bottom, 0px)))"
          : "translateY(0)",
      }}
    >
      <div className="pointer-events-none mx-auto w-full max-w-[32rem] px-2 pb-2">
        <div
          className="pointer-events-auto relative overflow-hidden rounded-[1.35rem] border border-white/85 bg-white/92 p-1.5 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-2xl"
          style={{ WebkitBackdropFilter: "blur(24px) saturate(1.35)" }}
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0.96)),radial-gradient(circle_at_top,rgba(36,184,181,0.08),transparent_42%)]"
          />
          <div className="relative flex items-center gap-1">
            {links.map(({ path, icon: Icon, label, isCart }) => {
              const active = isActive(path);
              const cartCount = summary.itemCount;

              return (
                <Link
                  key={path}
                  to={path}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-[3.3rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-[0.95rem] px-1",
                    "transition-all duration-300 active:scale-[0.97]",
                    active
                      ? "bg-[linear-gradient(180deg,rgba(36,184,181,0.1),rgba(36,184,181,0.04))] text-[var(--primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                      : "text-slate-400",
                  )}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <span
                    className={cn(
                      "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
                      active ? "bg-white shadow-[0_6px_16px_rgba(36,184,181,0.14)]" : "bg-transparent",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[17px] w-[17px] transition-all duration-300",
                        active ? "text-[var(--primary)]" : "text-slate-400 group-hover:text-slate-600",
                      )}
                      strokeWidth={active ? 2.3 : 1.9}
                    />
                    {isCart && cartCount > 0 ? (
                      <span className="absolute -end-1.5 -top-1 inline-flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full border border-white bg-[var(--primary)] px-1 text-[8px] font-black leading-none text-white shadow-[0_5px_12px_rgba(36,184,181,0.24)]">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "max-w-[3.4rem] truncate text-[9px] font-black leading-none tracking-tight transition-colors duration-300",
                      active ? "text-[var(--primary)]" : "text-slate-400 group-hover:text-slate-600",
                    )}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
