/**
 * AdminSidebar.tsx — v3 redesign for light mode
 * Role-aware navigation sidebar with clean design:
 * light backgrounds, subtle borders, refined active states.
 */

import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  HomeIcon,
  InboxStackIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  Squares2X2Icon,
  TruckIcon,
  UsersIcon,
  BellIcon,
  VideoCameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../components/UI";
import type { AdminRole } from "./adminShared";

// ─── Nav data ─────────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  end?: boolean;
  labelAr: string;
  labelEn: string;
  hintAr: string;
  hintEn: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: AdminRole[];
}

interface NavSection {
  key: string;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: "teal" | "blue" | "amber" | "purple" | "sky";
  items: NavItem[];
}

const ALL_SECTIONS: NavSection[] = [
  {
    key: "overview",
    labelAr: "الرئيسية",
    labelEn: "Overview",
    icon: Squares2X2Icon,
    accentColor: "teal",
    items: [
      {
        to: "/admin",
        end: true,
        labelAr: "لوحة المؤشرات",
        labelEn: "Dashboard",
        hintAr: "النبض اليومي والمؤشرات",
        hintEn: "Live KPIs and daily pulse",
        icon: HomeIcon,
        allowedRoles: ["admin", "manager", "pharmacist"],
      },
    ],
  },
  {
    key: "orders",
    labelAr: "معالجة الطلبات",
    labelEn: "Order Processing",
    icon: ClipboardDocumentListIcon,
    accentColor: "blue",
    items: [
      {
        to: "/admin/orders",
        labelAr: "إدارة الطلبات",
        labelEn: "Orders",
        hintAr: "متابعة حالات الطلبات",
        hintEn: "Track and update order states",
        icon: ClipboardDocumentListIcon,
        allowedRoles: ["admin", "manager"],
      },
      {
        to: "/admin/special-orders",
        labelAr: "طلبات النواقص",
        labelEn: "Special Orders",
        hintAr: "طلبات تحتاج متابعة يدوية",
        hintEn: "Requests needing manual review",
        icon: InboxStackIcon,
        allowedRoles: ["admin", "manager", "pharmacist"],
      },
    ],
  },
  {
    key: "inventory",
    labelAr: "إدارة المخزون",
    labelEn: "Inventory",
    icon: CubeIcon,
    accentColor: "amber",
    items: [
      {
        to: "/admin/products/fast-entry",
        labelAr: "الإدخال السريع",
        labelEn: "Fast Entry",
        hintAr: "باركود وصورة وحفظ سريع",
        hintEn: "Barcode scan, snapshot, save",
        icon: VideoCameraIcon,
        allowedRoles: ["admin", "manager", "pharmacist"],
      },
      {
        to: "/admin/products",
        labelAr: "كتالوج المنتجات",
        labelEn: "Product Catalog",
        hintAr: "الكتالوج والمخزون الكامل",
        hintEn: "Full catalog and stock levels",
        icon: CubeIcon,
        allowedRoles: ["admin", "manager", "pharmacist"],
      },
    ],
  },
  {
    key: "operations",
    labelAr: "مركز العمليات",
    labelEn: "Operations",
    icon: ServerStackIcon,
    accentColor: "sky",
    items: [
      {
        to: "/admin/operations",
        labelAr: "لوحة التسليم",
        labelEn: "Operations Hub",
        hintAr: "تعيين السائقين وتتبع التسليم",
        hintEn: "Driver assignment and delivery tracking",
        icon: ServerStackIcon,
        allowedRoles: ["admin", "manager"],
      },
    ],
  },
  {
    key: "users",
    labelAr: "إدارة المستخدمين",
    labelEn: "User Management",
    icon: UsersIcon,
    accentColor: "purple",
    items: [
      {
        to: "/admin/staff",
        labelAr: "إدارة الموظفين",
        labelEn: "Staff",
        hintAr: "الفريق والصلاحيات والأدوار",
        hintEn: "Team, permissions, and roles",
        icon: UsersIcon,
        allowedRoles: ["admin"],
      },
    ],
  },
  {
    key: "notifications",
    labelAr: "الإشعارات",
    labelEn: "Notifications",
    icon: BellIcon,
    accentColor: "sky",
    items: [
      {
        to: "/admin/notifications",
        labelAr: "إرسال الإشعارات",
        labelEn: "Send Notifications",
        hintAr: "أرسل إشعارات فورية للمستخدمين عبر Supabase Realtime",
        hintEn: "Push real-time notifications to users via Supabase Realtime",
        icon: BellIcon,
        allowedRoles: ["admin", "manager"],
      },
    ],
  },
];

const DRIVER_SECTIONS: NavSection[] = [
  {
    key: "deliveries",
    labelAr: "طلباتي",
    labelEn: "My Deliveries",
    icon: TruckIcon,
    accentColor: "teal",
    items: [
      {
        to: "/driver",
        end: false,
        labelAr: "طلباتي المسندة",
        labelEn: "My Assigned Orders",
        hintAr: "عرض الطلبات المسندة إليك",
        hintEn: "Orders assigned to you",
        icon: TruckIcon,
        allowedRoles: ["driver"],
      },
    ],
  },
];

// ─── Role → sections map ──────────────────────────────────────────────────────

function getAllowedSections(role: AdminRole): NavSection[] {
  if (role === "driver") return DRIVER_SECTIONS;
  
  return ALL_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.allowedRoles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

// ─── Accent colour tokens ─────────────────────────────────────────────────────
const ACCENT: Record<string, {
  sectionLabel: string;
  sectionDot: string;
  activeBg: string;
  activeIconBg: string;
  activeIconColor: string;
  activeBar: string;
  activeText: string;
}> = {
  teal:   { 
    sectionLabel: "text-teal-600", 
    sectionDot: "bg-teal-500", 
    activeBg: "bg-teal-50", 
    activeIconBg: "bg-teal-500", 
    activeIconColor: "text-white",
    activeBar: "bg-teal-500", 
    activeText: "text-teal-700" 
  },
  blue:   { 
    sectionLabel: "text-blue-600", 
    sectionDot: "bg-blue-500", 
    activeBg: "bg-blue-50", 
    activeIconBg: "bg-blue-500", 
    activeIconColor: "text-white",
    activeBar: "bg-blue-500", 
    activeText: "text-blue-700" 
  },
  amber:  { 
    sectionLabel: "text-amber-600", 
    sectionDot: "bg-amber-500", 
    activeBg: "bg-amber-50", 
    activeIconBg: "bg-amber-500", 
    activeIconColor: "text-white",
    activeBar: "bg-amber-500", 
    activeText: "text-amber-700" 
  },
  purple: { 
    sectionLabel: "text-purple-600", 
    sectionDot: "bg-purple-500", 
    activeBg: "bg-purple-50", 
    activeIconBg: "bg-purple-500", 
    activeIconColor: "text-white",
    activeBar: "bg-purple-500", 
    activeText: "text-purple-700" 
  },
  sky:    { 
    sectionLabel: "text-sky-600", 
    sectionDot: "bg-sky-500", 
    activeBg: "bg-sky-50", 
    activeIconBg: "bg-sky-500", 
    activeIconColor: "text-white",
    activeBar: "bg-sky-500", 
    activeText: "text-sky-700" 
  },
};

// ─── RoleBadge ────────────────────────────────────────────────────────────────

function RoleBadge({ role, lang }: { role: AdminRole; lang: "ar" | "en" }) {
  const config: Record<AdminRole, { label: string; cls: string }> = {
    admin:      { label: lang === "ar" ? "مدير"    : "Admin",      cls: "border-teal-200 bg-teal-50 text-teal-700" },
    manager:    { label: lang === "ar" ? "مشرف"    : "Manager",    cls: "border-amber-200 bg-amber-50 text-amber-700" },
    pharmacist: { label: lang === "ar" ? "صيدلي"   : "Pharmacist", cls: "border-violet-200 bg-violet-50 text-violet-700" },
    driver:     { label: lang === "ar" ? "سائق"    : "Driver",     cls: "border-sky-200 bg-sky-50 text-sky-700" },
    customer:   { label: lang === "ar" ? "عميل"    : "Customer",   cls: "border-slate-200 bg-slate-50 text-slate-600" },
  };
  const { label, cls } = config[role] ?? config.customer;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        cls,
      )}
    >
      {label}
    </span>
  );
}

// ─── Active item helper ───────────────────────────────────────────────────────

function getActiveItem(pathname: string, sections: NavSection[]) {
  for (const section of sections) {
    for (const item of section.items) {
      const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
      if (active) return { section, item };
    }
  }
  return sections.length ? { section: sections[0], item: sections[0].items[0] } : null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  lang: "ar" | "en";
  pathname: string;
  userFullName: string;
  userSecondary: string;
  userInitial: string;
  userRole?: AdminRole;
  mobile?: boolean;
  open?: boolean;
  collapsed?: boolean;
  onClose: () => void;
  onNavigateStore: () => void;
  onSignOut: () => void | Promise<void>;
  onToggleCollapse?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSidebar({
  lang,
  pathname,
  userFullName,
  userSecondary,
  userInitial,
  userRole = "admin",
  mobile = false,
  open = false,
  collapsed = false,
  onClose,
  onNavigateStore,
  onSignOut,
  onToggleCollapse,
}: AdminSidebarProps) {
  const isRtl = lang === "ar";
  const desktopCollapsed = !mobile && collapsed;
  const hiddenTransform = isRtl ? "translate-x-full" : "-translate-x-full";

  const visibleSections = useMemo(() => getAllowedSections(userRole), [userRole]);
  const activeMatch = useMemo(
    () => getActiveItem(pathname, visibleSections),
    [pathname, visibleSections],
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(visibleSections.map((s) => [s.key, true])),
  );

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const ActiveIcon = activeMatch?.item.icon ?? HomeIcon;
  const activeAccent = ACCENT[activeMatch?.section.accentColor ?? "teal"];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 z-50 transition-[width,transform] duration-300 ease-out",
        isRtl ? "right-0" : "left-0",
        mobile
          ? cn(
              "w-72 max-w-[calc(100vw-1rem)] lg:hidden",
              open ? "translate-x-0" : hiddenTransform,
            )
          : cn(
              "hidden lg:block",
              desktopCollapsed ? "lg:w-20" : "lg:w-64",
            ),
      )}
      aria-hidden={mobile ? !open : undefined}
    >
      <div
        className={cn(
          "flex h-screen flex-col overflow-hidden",
          "bg-white border-e border-slate-200",
          "shadow-lg",
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 px-3 pb-3 pt-4">
          <div className={cn("flex items-center gap-2", desktopCollapsed && "justify-center")}>
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 shadow-sm">
                <ShieldCheckIcon className="h-5 w-5 text-white" />
              </div>
            </div>

            {!desktopCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-teal-600">
                  {lang === "ar" ? "لوحة الإدارة" : "Admin workspace"}
                </p>
                <h1 className="mt-0.5 text-sm font-bold tracking-tight text-slate-700">
                  {lang === "ar" ? "مركز التحكم" : "Control Center"}
                </h1>
              </div>
            )}

            <div className="shrink-0">
              {mobile ? (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={lang === "ar" ? "إغلاق" : "Close"}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              ) : onToggleCollapse ? (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  aria-label={lang === "ar" ? (desktopCollapsed ? "توسيع" : "طي") : (desktopCollapsed ? "Expand" : "Collapse")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                >
                  {desktopCollapsed
                    ? isRtl ? <ChevronDoubleLeftIcon className="h-4 w-4" /> : <ChevronDoubleRightIcon className="h-4 w-4" />
                    : isRtl ? <ChevronDoubleRightIcon className="h-4 w-4" /> : <ChevronDoubleLeftIcon className="h-4 w-4" />}
                </button>
              ) : null}
            </div>
          </div>

          {!desktopCollapsed && activeMatch && (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <div className={cn("h-0.5", activeAccent.activeBar)} />
              <div className="flex items-center gap-2 px-3 py-2">
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    activeAccent.activeIconBg,
                    activeAccent.activeIconColor,
                  )}
                >
                  <ActiveIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-slate-700">
                    {lang === "ar" ? activeMatch.item.labelAr : activeMatch.item.labelEn}
                  </p>
                  <p className={cn("mt-0.5 truncate text-[10px] font-medium", activeAccent.activeText)}>
                    {lang === "ar" ? activeMatch.item.hintAr : activeMatch.item.hintEn}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-3 border-t border-slate-200" />
        </div>

        {/* ── Navigation ─────────────────────────────────────────────────────── */}
        <nav
          className={cn("relative flex-1 overflow-y-auto pb-2 pt-1", desktopCollapsed ? "px-2" : "px-3")}
          aria-label={lang === "ar" ? "القائمة الرئيسية" : "Main navigation"}
        >
          <div className="space-y-3">
            {visibleSections.map((section) => {
              const sectionExpanded = desktopCollapsed ? true : openSections[section.key] !== false;
              const accent = ACCENT[section.accentColor] ?? ACCENT.teal;

              return (
                <div key={section.key}>
                  {!desktopCollapsed && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.key)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-slate-50"
                      aria-expanded={sectionExpanded}
                    >
                      <span className={cn("h-1 w-3 rounded-full", accent.sectionDot)} />
                      <span className={cn("flex-1 text-start text-[9px] font-semibold uppercase tracking-wide", accent.sectionLabel)}>
                        {lang === "ar" ? section.labelAr : section.labelEn}
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          "h-3 w-3 text-slate-400 transition-transform duration-200",
                          sectionExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  )}

                  {sectionExpanded && (
                    <div className={cn("mt-0.5 space-y-0.5", desktopCollapsed && "space-y-1")}>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const itemLabel = lang === "ar" ? item.labelAr : item.labelEn;

                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={mobile ? onClose : undefined}
                            title={desktopCollapsed ? itemLabel : undefined}
                            className={({ isActive }) =>
                              cn(
                                "group relative flex items-center gap-2 rounded-md px-2 py-2 transition-all duration-150",
                                desktopCollapsed && "justify-center",
                                isActive
                                  ? cn(accent.activeBg, "ring-1 ring-slate-200")
                                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                                isActive && !desktopCollapsed && (
                                  isRtl
                                    ? "before:absolute before:inset-y-2 before:end-0 before:w-0.5 before:rounded-full before:bg-teal-500"
                                    : "before:absolute before:inset-y-2 before:start-0 before:w-0.5 before:rounded-full before:bg-teal-500"
                                ),
                              )
                            }
                            aria-label={desktopCollapsed ? itemLabel : undefined}
                          >
                            {({ isActive }) => (
                              <>
                                <span
                                  className={cn(
                                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-150",
                                    isActive
                                      ? cn(accent.activeIconBg, accent.activeIconColor)
                                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700",
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </span>

                                {!desktopCollapsed && (
                                  <span className="min-w-0 flex-1">
                                    <span
                                      className={cn(
                                        "block truncate text-sm font-medium",
                                        isActive ? "text-slate-800" : "text-slate-600 group-hover:text-slate-800",
                                      )}
                                    >
                                      {itemLabel}
                                    </span>
                                    <span
                                      className={cn(
                                        "mt-0.5 block truncate text-[10px] font-medium",
                                        isActive ? "text-slate-500" : "text-slate-400 group-hover:text-slate-500",
                                      )}
                                    >
                                      {lang === "ar" ? item.hintAr : item.hintEn}
                                    </span>
                                  </span>
                                )}
                              </>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* ── User footer ────────────────────────────────────────────────────── */}
        <div className="relative shrink-0 border-t border-slate-200 p-3">
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <div className={cn("flex items-center gap-2", desktopCollapsed && "justify-center")}>
              <div className="relative shrink-0">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 text-xs font-bold text-white shadow-sm">
                  {userInitial}
                </span>
              </div>

              {!desktopCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <RoleBadge role={userRole} lang={lang} />
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-700">
                    {userFullName || (lang === "ar" ? "مدير النظام" : "Administrator")}
                  </p>
                  <p className="truncate text-[10px] text-slate-400" dir="ltr">
                    {userSecondary}
                  </p>
                </div>
              )}
            </div>

            <div className={cn("mt-2 grid gap-1.5", desktopCollapsed ? "grid-cols-1" : "grid-cols-2")}>
              <button
                type="button"
                onClick={onNavigateStore}
                title={lang === "ar" ? "المتجر" : "Store"}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[10px] font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95"
              >
                <ArrowTopRightOnSquareIcon className="h-3 w-3 shrink-0" />
                {!desktopCollapsed && <span>{lang === "ar" ? "المتجر" : "Store"}</span>}
              </button>
              <button
                type="button"
                onClick={onSignOut}
                title={lang === "ar" ? "خروج" : "Sign out"}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 text-[10px] font-medium text-red-600 transition hover:bg-red-100 active:scale-95"
              >
                <ArrowLeftOnRectangleIcon className="h-3 w-3 shrink-0" />
                {!desktopCollapsed && <span>{lang === "ar" ? "خروج" : "Sign out"}</span>}
              </button>
            </div>
          </div>

          {!desktopCollapsed && (
            <p className="mt-2 text-center text-[9px] text-slate-400">
              United Pharmacies · Admin
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
