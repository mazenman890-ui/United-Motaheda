/**
 * OrdersManager.tsx
 * Macro-level order operations list for admin and manager roles.
 */

import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  FunnelIcon,
  TruckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  type AdminOrder,
  type OrderStatus as ApiOrderStatus,
  getAdminOrders,
  updateOrderStatus,
} from "../../services/googleSheetsApi";
import { cn } from "../components/UI";
import {
  AdminEmptyState,
  AdminErrorBanner,
  AdminFilterChip,
  AdminMetricCard,
  AdminPaginationBar,
  AdminSearchField,
  AdminSectionCard,
  AdminTabBar,
  AdminTableSkeleton,
  AdminUnauthorized,
  type AdminRole,
  useDebouncedValue,
} from "./adminShared";

type OrderStatus = ApiOrderStatus;
type Language = "ar" | "en";
type DatePreset = "all" | "today" | "last7" | "last30" | "custom";
type TabKey = "all" | "attention" | "out" | "delivered" | "cancelled";

const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Processing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const ITEMS_PER_PAGE = 15;

function getStatusLabel(status: OrderStatus, lang: Language): string {
  const map: Record<OrderStatus, [string, string]> = {
    Pending: ["في الانتظار", "Pending"],
    Processing: ["قيد التجهيز", "Processing"],
    "Out for Delivery": ["خارج للتسليم", "Out for Delivery"],
    Delivered: ["تم التسليم", "Delivered"],
    Cancelled: ["ملغي", "Cancelled"],
  };
  return lang === "ar" ? map[status][0] : map[status][1];
}

function getStatusClasses(status: OrderStatus): string {
  if (status === "Delivered") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "Cancelled") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "Out for Delivery") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "Processing") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getStatusDot(status: OrderStatus): string {
  if (status === "Delivered") return "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]";
  if (status === "Cancelled") return "bg-rose-500";
  if (status === "Out for Delivery") return "bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.7)]";
  if (status === "Processing") return "bg-violet-500";
  return "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]";
}

function formatCurrency(value: number, lang: Language): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string, lang: Language): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value: string, lang: Language): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
  }).format(date);
}

function getPresetRange(preset: Exclude<DatePreset, "custom" | "all">) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === "last7") {
    start.setDate(start.getDate() - 6);
  } else if (preset === "last30") {
    start.setDate(start.getDate() - 29);
  }

  return { start, end };
}

function isWithinSelectedDateRange(orderDate: string, preset: DatePreset, dateFrom: string, dateTo: string) {
  const value = new Date(orderDate);
  if (Number.isNaN(value.getTime())) return false;

  if (preset === "all") return true;

  if (preset === "today" || preset === "last7" || preset === "last30") {
    const { start, end } = getPresetRange(preset);
    return value >= start && value <= end;
  }

  if (preset === "custom") {
    if (dateFrom) {
      const start = new Date(dateFrom);
      start.setHours(0, 0, 0, 0);
      if (value < start) return false;
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      if (value > end) return false;
    }
  }

  return true;
}

function allowedNextStatuses(current: OrderStatus, role: AdminRole): OrderStatus[] {
  if (role === "driver") {
    return current === "Out for Delivery" ? ["Delivered"] : [];
  }
  return ORDER_STATUSES.filter((status) => status !== current);
}

const StatusSelect = memo(function StatusSelect({
  order,
  lang,
  role,
  disabled,
  onChange,
}: {
  order: AdminOrder;
  lang: Language;
  role: AdminRole;
  disabled: boolean;
  onChange: (order: AdminOrder, next: OrderStatus) => void;
}) {
  const options = allowedNextStatuses(order.status, role);
  if (!options.length) {
    return (
      <span className={cn("admin-badge", getStatusClasses(order.status))}>
        <span className={cn("h-1.5 w-1.5 rounded-full", getStatusDot(order.status))} />
        {getStatusLabel(order.status, lang)}
      </span>
    );
  }

  return (
    <select
      value={order.status}
      disabled={disabled}
      onChange={(event) => onChange(order, event.target.value as OrderStatus)}
      className="admin-input h-10 min-w-[11rem] rounded-[1rem] border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
      aria-label={lang === "ar" ? "تغيير الحالة" : "Change status"}
    >
      <option value={order.status} disabled>{getStatusLabel(order.status, lang)}</option>
      {options.map((status) => (
        <option key={status} value={status}>{getStatusLabel(status, lang)}</option>
      ))}
    </select>
  );
});

const OrderCard = memo(function OrderCard({
  order,
  lang,
  updating,
  onStatusChange,
}: {
  order: AdminOrder;
  lang: Language;
  updating: boolean;
  onStatusChange: (order: AdminOrder, next: OrderStatus) => void;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{lang === "ar" ? "رقم الطلب" : "Order ID"}</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900" dir="ltr">{order.id}</p>
        </div>
        <span className={cn("admin-badge shrink-0", getStatusClasses(order.status))}>
          <span className={cn("h-1.5 w-1.5 rounded-full", getStatusDot(order.status))} />
          {getStatusLabel(order.status, lang)}
        </span>
      </div>

      <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
        <p className="text-sm font-bold text-slate-900">{order.customerName || (lang === "ar" ? "عميل" : "Customer")}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500" dir="ltr">{order.customerPhone}</p>
        {order.customerAddress && <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{order.customerAddress}</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-bold text-slate-950">{formatCurrency(order.totalPrice, lang)}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{formatDate(order.orderDate, lang)}</p>
          {order.assignedDriver && <p className="mt-1 text-xs font-semibold text-slate-500">🚚 {order.assignedDriver}</p>}
        </div>
        <div className="flex items-center gap-2">
          {updating && <ArrowPathIcon className="h-4 w-4 animate-spin text-teal-600" />}
          <StatusSelect order={order} lang={lang} role="manager" disabled={updating} onChange={onStatusChange} />
        </div>
      </div>
    </article>
  );
});

const OrderTableRow = memo(function OrderTableRow({
  order,
  lang,
  updating,
  onStatusChange,
}: {
  order: AdminOrder;
  lang: Language;
  updating: boolean;
  onStatusChange: (order: AdminOrder, next: OrderStatus) => void;
}) {
  return (
    <tr className="border-b border-slate-100 transition-colors hover:bg-slate-50/60">
      <td className="px-5 py-4"><p className="text-sm font-bold text-slate-900" dir="ltr">{order.id}</p></td>
      <td className="px-5 py-4">
        <p className="text-sm font-bold text-slate-900">{order.customerName || "—"}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500" dir="ltr">{order.customerPhone}</p>
      </td>
      <td className="px-5 py-4">
        <span className={cn("admin-badge", getStatusClasses(order.status))}>
          <span className={cn("h-1.5 w-1.5 rounded-full", getStatusDot(order.status))} />
          {getStatusLabel(order.status, lang)}
        </span>
      </td>
      <td className="px-5 py-4 text-sm font-bold text-slate-900">{formatCurrency(order.totalPrice, lang)}</td>
      <td className="px-5 py-4 text-xs font-semibold text-slate-500">{formatDate(order.orderDate, lang)}</td>
      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
        {order.assignedDriver || <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-400">{lang === "ar" ? "غير محدد" : "Not assigned"}</span>}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {updating && <ArrowPathIcon className="h-4 w-4 animate-spin text-teal-600" />}
          <StatusSelect order={order} lang={lang} role="manager" disabled={updating} onChange={onStatusChange} />
        </div>
      </td>
    </tr>
  );
});

export default function OrdersManager() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const userRole = (user?.role ?? "customer") as AdminRole;

  if (!["admin", "manager"].includes(userRole)) {
    return <AdminUnauthorized lang={lang} />;
  }

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [pendingById, setPendingById] = useState<Record<string, true>>({});
  const firstLoadRef = useRef(true);

  const debouncedSearch = useDebouncedValue(search, 250);
  const hasInvalidCustomRange = datePreset === "custom" && Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const loadOrders = useCallback(async (force = false) => {
    if (!firstLoadRef.current) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const data = await getAdminOrders(force);
      startTransition(() => {
        setOrders(data);
        setLoading(false);
        setRefreshing(false);
        firstLoadRef.current = false;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load orders.");
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const setRowPending = useCallback((orderId: string, value: boolean) => {
    setPendingById((current) => {
      if (value) {
        return { ...current, [orderId]: true };
      }
      const next = { ...current };
      delete next[orderId];
      return next;
    });
  }, []);

  const handleStatusChange = useCallback(async (order: AdminOrder, nextStatus: OrderStatus) => {
    if (order.status === nextStatus || pendingById[order.id]) return;

    const previousOrder = order;
    setRowPending(order.id, true);
    startTransition(() => {
      setOrders((current) => current.map((entry) => (
        entry.id === order.id ? { ...entry, status: nextStatus } : entry
      )));
    });

    try {
      const updatedOrder = await updateOrderStatus(order.id, nextStatus);
      startTransition(() => {
        setOrders((current) => current.map((entry) => (
          entry.id === updatedOrder.id ? updatedOrder : entry
        )));
      });
      toast.success(
        lang === "ar"
          ? `تم تحديث حالة الطلب إلى "${getStatusLabel(nextStatus, lang)}"`
          : `Order status updated to "${getStatusLabel(nextStatus, lang)}"`,
      );
    } catch {
      startTransition(() => {
        setOrders((current) => current.map((entry) => (
          entry.id === previousOrder.id ? previousOrder : entry
        )));
      });
      toast.error(lang === "ar" ? "فشل تحديث حالة الطلب" : "Failed to update order status");
    } finally {
      setRowPending(order.id, false);
    }
  }, [lang, pendingById, setRowPending]);

  const filteredOrders = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const tabMatches =
        activeTab === "all"
          ? true
          : activeTab === "attention"
            ? order.status === "Pending" || order.status === "Processing"
            : activeTab === "out"
              ? order.status === "Out for Delivery"
              : activeTab === "delivered"
                ? order.status === "Delivered"
                : order.status === "Cancelled";

      if (!tabMatches) return false;
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (hasInvalidCustomRange) return false;
      if (!isWithinSelectedDateRange(order.orderDate, datePreset, dateFrom, dateTo)) return false;
      if (!query) return true;

      return [
        order.id,
        order.customerName,
        order.customerPhone,
        order.customerAddress,
        order.assignedDriver,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [activeTab, dateFrom, datePreset, dateTo, debouncedSearch, hasInvalidCustomRange, orders, statusFilter]);

  const summary = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === "Pending").length,
    attention: orders.filter((order) => order.status === "Pending" || order.status === "Processing").length,
    out: orders.filter((order) => order.status === "Out for Delivery").length,
    delivered: orders.filter((order) => order.status === "Delivered").length,
    cancelled: orders.filter((order) => order.status === "Cancelled").length,
  }), [orders]);

  const tabs = useMemo(() => ([
    { key: "all", label: lang === "ar" ? "الكل" : "All", count: summary.total },
    { key: "attention", label: lang === "ar" ? "معلّقة / تجهيز" : "Pending / In progress", count: summary.attention },
    { key: "out", label: lang === "ar" ? "خارج للتسليم" : "Out for delivery", count: summary.out },
    { key: "delivered", label: lang === "ar" ? "تم التسليم" : "Delivered", count: summary.delivered },
    { key: "cancelled", label: lang === "ar" ? "ملغي" : "Cancelled", count: summary.cancelled },
  ] satisfies Array<{ key: TabKey; label: string; count: number }>), [lang, summary]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, dateFrom, datePreset, dateTo, statusFilter]);

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, filteredOrders]);

  const hasActiveFilters = activeTab !== "all"
    || debouncedSearch !== ""
    || statusFilter !== "all"
    || datePreset !== "all"
    || dateFrom !== ""
    || dateTo !== "";

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setActiveTab("all");
    setDatePreset("all");
    setDateFrom("");
    setDateTo("");
  }, []);

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; tone?: "teal" | "amber" | "rose"; onRemove: () => void }> = [];

    if (activeTab !== "all") {
      chips.push({
        key: "tab",
        label: tabs.find((tab) => tab.key === activeTab)?.label ?? "",
        tone: "teal",
        onRemove: () => setActiveTab("all"),
      });
    }

    if (debouncedSearch) {
      chips.push({
        key: "search",
        label: lang === "ar" ? `بحث: ${debouncedSearch}` : `Search: ${debouncedSearch}`,
        tone: "teal",
        onRemove: () => setSearch(""),
      });
    }

    if (statusFilter !== "all") {
      chips.push({
        key: "status",
        label: `${lang === "ar" ? "الحالة" : "Status"}: ${getStatusLabel(statusFilter, lang)}`,
        tone: "amber",
        onRemove: () => setStatusFilter("all"),
      });
    }

    if (datePreset === "today" || datePreset === "last7" || datePreset === "last30") {
      const labelMap = {
        today: lang === "ar" ? "اليوم" : "Today",
        last7: lang === "ar" ? "آخر 7 أيام" : "Last 7 days",
        last30: lang === "ar" ? "آخر 30 يومًا" : "Last 30 days",
      } as const;
      chips.push({
        key: "preset",
        label: `${lang === "ar" ? "التاريخ" : "Date"}: ${labelMap[datePreset]}`,
        tone: "amber",
        onRemove: () => setDatePreset("all"),
      });
    }

    if (datePreset === "custom" && (dateFrom || dateTo)) {
      chips.push({
        key: "custom-date",
        label: lang === "ar"
          ? `نطاق مخصص: ${dateFrom ? formatDateOnly(dateFrom, lang) : "…"} - ${dateTo ? formatDateOnly(dateTo, lang) : "…"}`
          : `Custom range: ${dateFrom ? formatDateOnly(dateFrom, lang) : "…"} - ${dateTo ? formatDateOnly(dateTo, lang) : "…"}`,
        tone: hasInvalidCustomRange ? "rose" : "amber",
        onRemove: () => {
          setDatePreset("all");
          setDateFrom("");
          setDateTo("");
        },
      });
    }

    return chips;
  }, [activeTab, dateFrom, datePreset, dateTo, debouncedSearch, hasInvalidCustomRange, lang, statusFilter, tabs]);

  const thClass = "px-5 py-3.5 text-start text-xs font-black uppercase tracking-[0.18em] text-slate-500";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard label={lang === "ar" ? "إجمالي الطلبات" : "Total orders"} value={summary.total} icon={ClipboardDocumentListIcon} />
        <AdminMetricCard label={lang === "ar" ? "في الانتظار" : "Pending"} value={summary.pending} tone="amber" />
        <AdminMetricCard label={lang === "ar" ? "قيد المتابعة" : "Needs attention"} value={summary.attention} tone="violet" />
        <AdminMetricCard label={lang === "ar" ? "خارج للتسليم" : "Out for delivery"} value={summary.out} icon={TruckIcon} tone="sky" />
        <AdminMetricCard label={lang === "ar" ? "تم التسليم" : "Delivered"} value={summary.delivered} icon={CheckCircleIcon} tone="emerald" />
      </div>

      <AdminErrorBanner message={error} />

      <AdminSectionCard
        eyebrow={lang === "ar" ? "إدارة الطلبات" : "Order management"}
        title={lang === "ar" ? "قائمة الطلبات" : "Orders list"}
        description={lang === "ar" ? "عرض تشغيلي واسع للطلبات مع تبويبات حالات وتصفية تاريخية وتحديث متفائل آمن." : "A broad operational order list with status tabs, date filtering, and safe optimistic updates."}
        bodyClassName="space-y-5 px-0 py-0"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-[1.2rem] border px-4 text-sm font-bold transition-colors",
                showFilters ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              <FunnelIcon className="h-4 w-4" />
              {lang === "ar" ? "الفلاتر" : "Filters"}
              {hasActiveFilters && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white">!</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => void loadOrders(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[1.2rem] border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <ArrowPathIcon className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {lang === "ar" ? "تحديث" : "Refresh"}
            </button>
          </div>
        )}
      >
        <div className="border-b border-slate-100 px-4 pt-4 md:px-6">
          <AdminTabBar
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as TabKey)}
            className="pb-4"
          />
        </div>

        {showFilters && (
          <div className="border-b border-slate-100 px-4 py-4 md:px-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminSearchField
                value={search}
                onChange={setSearch}
                placeholder={lang === "ar" ? "ابحث بالرقم أو الاسم أو الهاتف" : "Search by ID, name, or phone"}
                className="w-full sm:min-w-0"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")}
                className="admin-input h-11 rounded-[1.2rem] border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                <option value="all">{lang === "ar" ? "كل الحالات" : "All statuses"}</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>{getStatusLabel(status, lang)}</option>
                ))}
              </select>
              <select
                value={datePreset}
                onChange={(event) => {
                  const nextPreset = event.target.value as DatePreset;
                  setDatePreset(nextPreset);
                  if (nextPreset !== "custom") {
                    setDateFrom("");
                    setDateTo("");
                  }
                }}
                className="admin-input h-11 rounded-[1.2rem] border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                <option value="all">{lang === "ar" ? "كل التواريخ" : "All dates"}</option>
                <option value="today">{lang === "ar" ? "اليوم" : "Today"}</option>
                <option value="last7">{lang === "ar" ? "آخر 7 أيام" : "Last 7 days"}</option>
                <option value="last30">{lang === "ar" ? "آخر 30 يومًا" : "Last 30 days"}</option>
                <option value="custom">{lang === "ar" ? "نطاق مخصص" : "Custom range"}</option>
              </select>
              <div className="inline-flex items-center gap-2 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600">
                <CalendarDaysIcon className="h-4 w-4 text-teal-500" />
                {filteredOrders.length} {lang === "ar" ? "طلب مطابق" : "matching orders"}
              </div>
            </div>

            {datePreset === "custom" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="admin-input h-11 rounded-[1.2rem] border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                  aria-label={lang === "ar" ? "من تاريخ" : "Date from"}
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="admin-input h-11 rounded-[1.2rem] border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
                  aria-label={lang === "ar" ? "إلى تاريخ" : "Date to"}
                />
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip) => (
                <AdminFilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} tone={chip.tone} />
              ))}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"
                >
                  <XCircleIcon className="h-3.5 w-3.5" />
                  {lang === "ar" ? "مسح الكل" : "Clear all"}
                </button>
              )}
            </div>

            {hasInvalidCustomRange && (
              <p className="mt-3 text-sm font-semibold text-rose-600">
                {lang === "ar" ? "تاريخ البداية يجب أن يسبق تاريخ النهاية." : "The start date must be before the end date."}
              </p>
            )}
          </div>
        )}

        <div className="px-4 pb-2 pt-4 md:px-6">
          {loading ? (
            <AdminTableSkeleton rows={8} />
          ) : paginatedOrders.length === 0 ? (
            <AdminEmptyState
              title={lang === "ar" ? "لا توجد طلبات مطابقة" : "No matching orders"}
              description={lang === "ar" ? "جرّب تغيير التبويب أو الفلاتر أو عبارة البحث." : "Try a different tab, filter, or search term."}
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:hidden">
                {paginatedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    lang={lang}
                    updating={Boolean(pendingById[order.id])}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>

              <div className="hidden xl:block">
                <div className="overflow-hidden rounded-[1.6rem] border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="admin-table w-full min-w-[62rem]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <th className={thClass}>{lang === "ar" ? "رقم الطلب" : "Order ID"}</th>
                          <th className={thClass}>{lang === "ar" ? "العميل" : "Customer"}</th>
                          <th className={thClass}>{lang === "ar" ? "الحالة" : "Status"}</th>
                          <th className={thClass}>{lang === "ar" ? "الإجمالي" : "Total"}</th>
                          <th className={thClass}>{lang === "ar" ? "التاريخ" : "Date"}</th>
                          <th className={thClass}>{lang === "ar" ? "السائق" : "Driver"}</th>
                          <th className={thClass}>{lang === "ar" ? "إجراء" : "Action"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedOrders.map((order) => (
                          <OrderTableRow
                            key={order.id}
                            order={order}
                            lang={lang}
                            updating={Boolean(pendingById[order.id])}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <AdminPaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredOrders.length}
          itemsPerPage={ITEMS_PER_PAGE}
          lang={lang}
          onPageChange={setCurrentPage}
        />
      </AdminSectionCard>
    </div>
  );
}
