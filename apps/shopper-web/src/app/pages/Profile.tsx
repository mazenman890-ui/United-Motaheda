import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  LogOut,
  MapPin,
  Package,
  Phone,
  Settings,
  Shield,
  ShoppingBag,
  User,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { EmptyState } from "../components/BrandPrimitives";
import { readOrders, syncRemoteOrders, type StoredOrder } from "../orders";
import { cn } from "../components/UI";
import { useIsShopperShell } from "../components/ui/use-mobile";
import {
  getCachedCustomerOrders,
  getCustomerOrders,
} from "../../services/shopperOrdersApi";
import { MobileProfileView } from "./ShopperMobileViews";

const PROFILE_PREFERENCES_KEY = "united-pharmacies-profile-preferences-v1";

function readPreferences() {
  if (typeof window === "undefined") {
    return { orders: true, offers: true, news: false };
  }

  try {
    const rawValue = window.localStorage.getItem(PROFILE_PREFERENCES_KEY);

    if (!rawValue) {
      return { orders: true, offers: true, news: false };
    }

    const parsed = JSON.parse(rawValue) as Record<string, boolean>;
    return {
      orders: Boolean(parsed.orders),
      offers: Boolean(parsed.offers),
      news: Boolean(parsed.news),
    };
  } catch {
    return { orders: true, offers: true, news: false };
  }
}

function getStatusLabel(status: string, lang: "ar" | "en") {
  if (status.toLowerCase() === "pending") {
    return lang === "ar" ? "قيد المراجعة" : "Pending review";
  }

  return lang === "ar" ? "تم الاستلام" : "Received";
}

export default function Profile() {
  const isShopperShell = useIsShopperShell();

  if (isShopperShell) {
    return <MobileProfileView />;
  }

  return <ProfileDesktop />;
}

function ProfileDesktop() {
  const { user, signOut } = useAuth();
  const { cart } = useCart();
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"info" | "orders" | "preferences">("info");
  const [notifications, setNotifications] = useState(readPreferences);
  const [orders, setOrders] = useState<StoredOrder[]>(() => {
    if (!user) {
      return [];
    }

    const cachedOrders = getCachedCustomerOrders();

    if (cachedOrders?.length) {
      return syncRemoteOrders(cachedOrders, user.phone);
    }

    return readOrders().filter((order) => user.role !== "customer" || order.phone === user.phone);
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    if (!user || user.role !== "customer") {
      setOrders(user ? readOrders() : []);
      return;
    }

    setOrders(readOrders().filter((order) => order.phone === user.phone));

    let active = true;

    void getCustomerOrders(true)
      .then((remoteOrders) => {
        if (!active) {
          return;
        }

        setOrders(syncRemoteOrders(remoteOrders, user.phone));
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setOrders(readOrders().filter((order) => order.phone === user.phone));
      });

    return () => {
      active = false;
    };
  }, [user]);

  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear();
  const userInitial = user?.fullName?.charAt(0).toUpperCase() || user?.phone?.charAt(0).toUpperCase() || "U";
  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
        dateStyle: "medium",
      }),
    [lang],
  );

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const tabs = [
    { id: "info", icon: Settings, labelAr: "بيانات الحساب", labelEn: "Account Info" },
    { id: "orders", icon: Package, labelAr: "طلباتي", labelEn: "My Orders" },
    { id: "preferences", icon: Bell, labelAr: "التفضيلات", labelEn: "Preferences" },
  ] as const;

  return (
    <div className="profile-page min-h-screen bg-[#F6F8FB] py-8 md:py-14">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="profile-breadcrumbs mb-8 flex items-center gap-3 text-sm font-bold text-slate-500">
          <Link to="/" className="transition-colors hover:text-slate-600">{t("home")}</Link>
          <ChevronRight className={cn("h-4 w-4 text-slate-300", lang === "ar" && "rotate-180")} />
          <span style={{ color: "#0F1B2D" }}>{t("my_profile")}</span>
        </div>

        <div className="profile-layout flex flex-col gap-6 xl:flex-row">
          <div className="profile-sidebar w-full flex-shrink-0 space-y-4 xl:w-72">
            <div className="overflow-hidden rounded-[2.5rem] border bg-white shadow-sm" style={{ borderColor: "rgba(148,163,184,0.18)" }}>
              <div className="h-24" style={{ background: "linear-gradient(135deg, #182734 0%, #243847 52%, #516577 100%)" }} />
              <div className="-mt-10 px-6 pb-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white shadow-xl">
                  <span className="text-3xl font-black" style={{ color: "#193844" }}>{userInitial}</span>
                </div>
                <h2 className="mt-3 line-clamp-1 text-xl font-black" style={{ color: "#0F1B2D" }}>
                  {user.fullName || (lang === "ar" ? "المستخدم" : "User")}
                </h2>
                <p className="truncate text-sm font-bold text-slate-500" dir="ltr">
                  {user.phone}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black" style={{ background: "rgba(248,250,252,0.96)", color: "#334155", border: "1px solid rgba(148,163,184,0.18)" }}>
                  <CheckCircle2 className="h-3 w-3" />
                  {user.role === "admin"
                    ? (lang === "ar" ? "حساب موظف" : "Staff account")
                    : (lang === "ar" ? "حساب عميل" : "Customer account")}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4" style={{ borderTopColor: "rgba(148,163,184,0.18)" }}>
                  {[
                    { value: orders.length, labelAr: "طلبات", labelEn: "Orders" },
                    { value: cartCount, labelAr: "في السلة", labelEn: "In cart" },
                    { value: memberSince, labelAr: "منذ", labelEn: "Since" },
                  ].map((item) => (
                    <div key={item.labelEn} className="text-center">
                      <p className="text-lg font-black leading-none" style={{ color: "#0F1B2D" }}>{item.value}</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-500">{lang === "ar" ? item.labelAr : item.labelEn}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl p-3" style={{ background: "#F8FAFC", border: "1px solid rgba(148,163,184,0.18)" }}>
                  <p className="mb-0.5 text-xs font-bold text-slate-500">{lang === "ar" ? "إجمالي الطلبات" : "Order total"}</p>
                  <p className="text-lg font-black" style={{ color: "#193844" }}>{totalSpent.toFixed(2)} {t("currency")}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border bg-white p-3 shadow-sm" style={{ borderColor: "rgba(148,163,184,0.18)" }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition-all",
                    activeTab === tab.id ? "text-slate-600" : "text-slate-500 hover:bg-slate-50/60 hover:text-slate-600",
                  )}
                  style={activeTab === tab.id ? { background: "#F8FAFC" } : {}}
                >
                  <tab.icon className="h-5 w-5" style={activeTab === tab.id ? { color: "#193844" } : { color: "#94A3B8" }} />
                  {lang === "ar" ? tab.labelAr : tab.labelEn}
                </button>
              ))}
              <div className="mx-2 my-2 h-px" style={{ background: "rgba(148,163,184,0.18)" }} />
              <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-black text-rose-500 transition-all hover:bg-rose-50">
                <LogOut className="h-5 w-5" /> {t("logout")}
              </button>
            </div>

            <div className="rounded-[2rem] border bg-white p-4 shadow-sm" style={{ borderColor: "rgba(148,163,184,0.18)" }}>
              {[
                { to: "/products", icon: ShoppingBag, labelAr: "تصفح المنتجات", labelEn: "Browse Products" },
                { to: "/offers", icon: Shield, labelAr: "العروض الحالية", labelEn: "Current Offers" },
                { to: "/cart", icon: Package, labelAr: "مراجعة السلة", labelEn: "Review Cart" },
              ].map((item) => (
                <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-xl p-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-600">
                  <item.icon className="h-4 w-4" style={{ color: "#193844" }} />
                  {lang === "ar" ? item.labelAr : item.labelEn}
                  <ChevronRight className={cn("ms-auto h-3.5 w-3.5 text-slate-300", lang === "ar" && "rotate-180")} />
                </Link>
              ))}
            </div>
          </div>

          <div className="min-h-[500px] flex-1 overflow-hidden rounded-[2.5rem] border bg-white shadow-sm" style={{ borderColor: "rgba(148,163,184,0.18)" }}>
            {activeTab === "info" && (
              <div className="p-8 md:p-10">
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "#F8FAFC" }}>
                    <Settings className="h-5 w-5" style={{ color: "#193844" }} />
                  </div>
                  <div>
                    <h1 className="text-xl font-black" style={{ color: "#0F1B2D" }}>{t("personal_info")}</h1>
                    <p className="text-sm font-bold text-slate-500">
                      {lang === "ar"
                        ? "هذه البيانات مأخوذة من جلسة تسجيل الدخول الحالية."
                        : "This information comes from your current signed-in session."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InfoCard
                    icon={User}
                    label={t("full_name")}
                    value={user.fullName || (lang === "ar" ? "غير متوفر" : "Not available")}
                  />
                  <InfoCard
                    icon={Phone}
                    label={t("phone")}
                    value={user.phone || "--"}
                    dir="ltr"
                  />
                  <InfoCard
                    icon={Shield}
                    label={lang === "ar" ? "الدور" : "Role"}
                    value={user.role === "admin" ? (lang === "ar" ? "موظف / مدير" : "Admin / Staff") : (lang === "ar" ? "عميل" : "Customer")}
                  />
                  <InfoCard
                    icon={User}
                    label={lang === "ar" ? "اسم المستخدم" : "Username"}
                    value={user.username || (lang === "ar" ? "غير محدد" : "Not set")}
                    dir="ltr"
                  />
                  <InfoCard
                    icon={MapPin}
                    label={lang === "ar" ? "العنوان" : "Address"}
                    value={user.address || (lang === "ar" ? "لا يوجد عنوان محفوظ" : "No address saved")}
                  />
                  <InfoCard
                    icon={Shield}
                    label={lang === "ar" ? "حالة التكامل" : "Integration status"}
                    value={lang === "ar" ? "نشط" : "Active"}
                  />
                </div>
              </div>
            )}

            {activeTab === "orders" && (
              <div className="p-8 md:p-10">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-black" style={{ color: "#0F1B2D" }}>{t("my_orders")}</h1>
                    <p className="text-sm font-bold text-slate-500">
                      {orders.length} {lang === "ar" ? "طلب محفوظ" : "saved orders"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <p className="text-xs font-bold text-slate-500">{lang === "ar" ? "إجمالي الإنفاق" : "Total spent"}</p>
                    <p className="text-sm font-black" style={{ color: "#2CBEB5" }}>{totalSpent.toFixed(2)} {t("currency")}</p>
                  </div>
                </div>

                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="rounded-2xl border p-5" style={{ background: "#F8FFFE", borderColor: "rgba(44,190,181,0.12)" }}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black" style={{ color: "#0F1B2D" }}>{order.id}</p>
                            <p className="text-xs font-bold text-slate-500">
                              {formatDate.format(new Date(order.createdAt))} · {order.itemCount} {lang === "ar" ? "قطعة" : "items"}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-600">
                              <MapPin className="h-3 w-3" />
                              {order.address}
                            </p>
                          </div>
                          <div className="text-end">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {getStatusLabel(order.status, lang)}
                            </span>
                            <p className="mt-2 text-base font-black" style={{ color: "#2CBEB5" }}>
                              {order.total.toFixed(2)} <span className="text-xs text-slate-400">{t("currency")}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Package}
                    title={t("no_orders")}
                    description={t("no_orders_desc")}
                    action={
                      <Link to="/products">
                        <button className="inline-flex h-11 items-center gap-2 rounded-2xl px-8 text-sm font-black text-white shadow-lg transition-all hover:opacity-90" style={{ background: "linear-gradient(135deg, #0F1B2D, #1A2940)" }}>
                          <ShoppingBag className="h-4 w-4" />
                          {t("start_shopping")}
                          <ArrowRight className={cn("h-4 w-4", lang === "ar" && "rotate-180")} />
                        </button>
                      </Link>
                    }
                  />
                )}
              </div>
            )}

            {activeTab === "preferences" && (
              <div className="p-8 md:p-10">
                <div className="mb-8">
                  <h1 className="text-xl font-black" style={{ color: "#0F1B2D" }}>{lang === "ar" ? "تفضيلات الإشعارات" : "Notification Preferences"}</h1>
                  <p className="text-sm font-bold text-slate-500">{lang === "ar" ? "إعدادات محفوظة محلياً داخل المتصفح" : "Settings saved locally in the browser"}</p>
                </div>

                <div className="max-w-xl space-y-4">
                  {[
                    { key: "orders", icon: Package, labelAr: "تحديثات الطلبات", labelEn: "Order Updates", descAr: "إشعارات مرتبطة بسجل الطلبات", descEn: "Notices tied to your order history" },
                    { key: "offers", icon: Shield, labelAr: "العروض الحالية", labelEn: "Current Offers", descAr: "تنبيه عند مراجعة العروض داخل المتجر", descEn: "Prompting around current store offers" },
                    { key: "news", icon: Bell, labelAr: "أخبار المتجر", labelEn: "Store News", descAr: "تنبيهات عامة داخل الواجهة الحالية", descEn: "General notices inside the current interface" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-2xl border p-5" style={{ background: "#F8FFFE", borderColor: "rgba(44,190,181,0.12)" }}>
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#EDF9F8" }}>
                          <item.icon className="h-5 w-5" style={{ color: "#2CBEB5" }} />
                        </div>
                        <div>
                          <p className="text-sm font-black" style={{ color: "#0F1B2D" }}>{lang === "ar" ? item.labelAr : item.labelEn}</p>
                          <p className="text-xs font-bold text-slate-500">{lang === "ar" ? item.descAr : item.descEn}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifications((current) => ({ ...current, [item.key]: !current[item.key as keyof typeof current] }))}
                        className={cn("relative h-6 w-12 rounded-full transition-all", notifications[item.key as keyof typeof notifications] ? "bg-slate-500" : "bg-slate-200")}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all",
                            notifications[item.key as keyof typeof notifications]
                              ? (lang === "ar" ? "right-1" : "left-7")
                              : (lang === "ar" ? "right-7" : "left-1"),
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  dir,
}: {
  icon: typeof User;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-black text-slate-900" dir={dir}>{value}</p>
        </div>
      </div>
    </div>
  );
}
