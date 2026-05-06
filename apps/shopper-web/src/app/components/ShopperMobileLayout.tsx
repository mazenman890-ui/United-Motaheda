import { ArrowUpRight, Globe2, MapPin, MessageCircle, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useSearchInput } from "../../contexts/SearchContext";
import { locations, siteContact } from "../data";
import { getDeliveryWindowCompactLabel } from "../config";
import { MobileBottomNav } from "./MobileBottomNav";
import { resolveSiteSearchSubmitPath, SiteSearchField } from "./SiteSearchField";
import { cn } from "./UI";

const SUPPORT_ROUTES = new Set([
  "/about",
  "/contact",
  "/shipping",
  "/returns",
  "/faq",
  "/terms",
  "/privacy",
]);

const FOCUSED_TASK_ROUTES = new Set([
  "/orders",
  "/special-orders",
]);

export function ShopperMobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, t, toggleLanguage } = useLanguage();
  const { user } = useAuth();
  const { searchQuery } = useSearchInput();
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const [headerShadow, setHeaderShadow] = useState(false);

  const primaryLocation = locations.find((branch) => branch.isPrimary) ?? locations[0];
  const isProductDetails = /^\/products\/[^/]+$/.test(location.pathname);
  const isCheckout = location.pathname === "/checkout";
  const isCart = location.pathname === "/cart";
  const isProfile = location.pathname === "/profile";
  const isSupportRoute = SUPPORT_ROUTES.has(location.pathname);
  const isFocusedTaskRoute = FOCUSED_TASK_ROUTES.has(location.pathname);
  const isCatalogBrowseRoute =
    location.pathname === "/products"
    || location.pathname === "/categories"
    || /^\/categories\/[^/]+$/.test(location.pathname);
  const showSearchBar =
    !isCheckout
    && !isCart
    && !isProfile
    && !isSupportRoute
    && !isProductDetails
    && !isFocusedTaskRoute;
  const showBottomNav = !isCheckout;
  const deliveryLabel = getDeliveryWindowCompactLabel(lang);
  const displayLocation =
    lang === "ar" ? primaryLocation.fullNameAr : primaryLocation.fullNameEn;
  const displayAddress =
    lang === "ar" ? primaryLocation.addressAr : primaryLocation.addressEn;

  // ── Compute header offset for sticky filter bars ──────────────────────────
  useEffect(() => {
    if (!shellRef.current || !headerRef.current) return;
    const shell = shellRef.current;
    const header = headerRef.current;

    const updateOffset = () => {
      shell.style.setProperty(
        "--shopper-header-offset",
        `${Math.ceil(header.getBoundingClientRect().height + 8)}px`,
      );
    };

    updateOffset();
    const ro = new ResizeObserver(updateOffset);
    ro.observe(header);
    window.addEventListener("resize", updateOffset);
    return () => { ro.disconnect(); window.removeEventListener("resize", updateOffset); };
  }, [lang, location.pathname, showSearchBar]);

  // ── Subtle shadow on scroll ───────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      setHeaderShadow(window.scrollY > 8);
      lastScrollY.current = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    const nextPath = resolveSiteSearchSubmitPath(location.pathname, trimmed);
    if (!trimmed || !nextPath) return;
    navigate(nextPath);
  };

  return (
    <div
      ref={shellRef}
      className="shopper-shell w-full"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      {!isCheckout ? (
        <header
          ref={headerRef}
          className={cn(
            "shopper-shell__header sticky top-0 z-30 w-full",
            "bg-white/90 backdrop-blur-2xl",
            "transition-shadow duration-300",
            headerShadow && "shadow-[0_1px_0_rgba(15,23,42,0.06),0_4px_20px_rgba(15,23,42,0.05)]",
          )}
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          } as React.CSSProperties}
        >
          {/* Top hairline gradient */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent"
          />

          <div
            className={cn(
              "shopper-shell__header-card w-full px-4 pt-3",
              isCatalogBrowseRoute ? "pb-1.5" : isFocusedTaskRoute ? "pb-2.5" : "pb-2",
            )}
          >
            {/* ── Top bar: location + actions ── */}
            <div className="shopper-shell__topbar flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-black text-slate-950">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                  <span className="truncate">{displayLocation}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                  {displayAddress}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Language toggle */}
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-full px-3",
                    "border border-slate-200 bg-white text-xs font-black text-slate-700",
                    "shadow-sm transition-all active:scale-95",
                  )}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  aria-label={lang === "ar" ? "تغيير اللغة إلى الإنجليزية" : "Switch to Arabic"}
                >
                  <Globe2 className="h-3.5 w-3.5" />
                  <span>{lang === "ar" ? "EN" : "AR"}</span>
                </button>

                {/* Profile button */}
                <button
                  type="button"
                  onClick={() => navigate(user ? "/profile" : "/login")}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full",
                    "border border-slate-200 bg-white text-slate-700",
                    "shadow-sm transition-all active:scale-95",
                    user && "border-[var(--primary)]/30 bg-[var(--primary)]/5",
                  )}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                  aria-label={user ? t("profile") : t("login")}
                >
                  {user ? (
                    <span className="text-[11px] font-black text-[var(--primary)]">
                      {(user.fullName || user.phone || "U").charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ── Search bar ── */}
            {showSearchBar ? (
              <>
                <form onSubmit={handleSearchSubmit} className="relative mt-3 h-13 w-full">
                  <SiteSearchField
                    className="h-13 w-full"
                    inputClassName={cn(
                      "!rounded-[1.5rem] h-13 border border-slate-200 bg-white/95",
                      "text-sm font-semibold",
                      "shadow-[0_4px_24px_rgba(15,23,42,0.06)]",
                      "focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10",
                      "transition-all duration-200",
                    )}
                    mobileSubmitPadding
                  />
                  <button
                    type="submit"
                    className={cn(
                      "absolute top-1/2 inline-flex h-9 w-9 -translate-y-1/2",
                      "items-center justify-center rounded-[1.1rem]",
                      "bg-[var(--primary)] text-white",
                      "shadow-[0_4px_16px_rgba(36,184,181,0.4)]",
                      "transition-all hover:bg-[var(--primary-strong)] active:scale-95",
                      lang === "ar" ? "left-2" : "right-2",
                    )}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                    aria-label={lang === "ar" ? "بحث" : "Search"}
                  >
                    <ArrowUpRight
                      className={cn("h-4 w-4", lang === "ar" && "rotate-180")}
                    />
                  </button>
                </form>

                {/* ── Meta rail: delivery chip + support ── */}
                {!isCatalogBrowseRoute ? (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="shopper-shell__meta-chip inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 shadow-sm">
                    {deliveryLabel}
                  </span>
                  <a
                    href={siteContact.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "shopper-shell__meta-chip--accent inline-flex items-center gap-1.5 rounded-full",
                      "bg-[var(--primary)] px-3 py-1.5 text-[11px] font-black text-white",
                      "shadow-[0_4px_14px_rgba(36,184,181,0.35)]",
                      "transition-all active:scale-95",
                    )}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{lang === "ar" ? "مساعدة مباشرة" : "Direct support"}</span>
                  </a>
                </div>
                ) : null}
              </>
            ) : null}
          </div>
        </header>
      ) : null}

      {/* ── Main content ── */}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "shopper-shell__main w-full outline-none",
          !showBottomNav && "shopper-shell__main--checkout",
        )}
        style={{
          paddingBottom: showBottomNav
            ? "calc(6.5rem + env(safe-area-inset-bottom, 0px))"
            : undefined,
          paddingTop: isFocusedTaskRoute ? "0.25rem" : undefined,
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}
      >
        <div className={cn("route-shell w-full px-4", isFocusedTaskRoute ? "pt-1" : "pt-2")}>
          <Outlet />
        </div>
      </main>

      {showBottomNav ? <MobileBottomNav /> : null}
    </div>
  );
}
