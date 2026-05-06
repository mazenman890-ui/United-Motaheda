import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  Clock3,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { getServiceHoursLabel } from "../config";
import { images } from "../data";
import { cn } from "../components/UI";

type AuthLayoutProps = {
  children: ReactNode;
  mode: "login" | "register";
  from?: string;
  loginSearch?: string;
  registerSearch?: string;
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.42,
      ease: "easeOut" as const,
    },
  },
};

export default function AuthLayout({
  children,
  mode,
  from = "",
  loginSearch = "?tab=login",
  registerSearch = "?tab=register",
}: AuthLayoutProps) {
  const { lang } = useLanguage();
  const isArabic = lang === "ar";
  const ReturnIcon = isArabic ? ArrowRight : ArrowLeft;
  const modeCopy = mode === "login"
    ? {
        badge: isArabic ? "دخول آمن" : "Secure sign in",
        title: isArabic ? "تشغيل الدخول للعملاء والإدارة من بوابة واحدة" : "One premium entry point for customers and operations",
        subtitle: isArabic
          ? "جلسة موثوقة مبنية على Supabase مع مسار أسرع للوصول إلى المتجر أو لوحة الإدارة."
          : "A Supabase-first session flow with faster access to the storefront and the admin workspace.",
        heading: isArabic ? "تسجيل الدخول" : "Sign in",
        description: isArabic
          ? "استخدم بريدك الإلكتروني وكلمة المرور للوصول إلى الحساب المرتبط بجلسة United Pharmacies."
          : "Use your email and password to access the United Pharmacies account tied to this session.",
      }
    : {
        badge: isArabic ? "إنشاء حساب عميل" : "Customer registration",
        title: isArabic ? "ابدأ حسابك الجديد بتجربة تسجيل أنظف وأكثر أمانًا" : "Create a customer account with a cleaner, safer auth flow",
        subtitle: isArabic
          ? "التسجيل مخصص للعملاء فقط، بينما صلاحيات الإدارة تُدار من بيانات Supabase الداخلية."
          : "Registration is customer-only while admin access stays controlled by Supabase role metadata.",
        heading: isArabic ? "إنشاء حساب جديد" : "Create account",
        description: isArabic
          ? "أدخل بياناتك الأساسية لبدء الحساب، ثم أكمل تسجيل الدخول من المسار المناسب حسب إعدادات التأكيد."
          : "Enter the essentials to open your account, then continue through the right sign-in path based on your confirmation settings.",
      };

  const stats = [
    {
      icon: Building2,
      label: isArabic ? "فروع عاملة" : "Active branches",
      value: isArabic ? "2 مواقع" : "2 locations",
    },
    {
      icon: Clock3,
      label: isArabic ? "ساعات الخدمة" : "Service hours",
      value: getServiceHoursLabel(lang),
    },
    {
      icon: Truck,
      label: isArabic ? "نطاق التوصيل" : "Delivery reach",
      value: isArabic ? "داخل القاهرة" : "Across Cairo",
    },
  ];

  const signals = [
    {
      icon: ShieldCheck,
      title: isArabic ? "جلسات محفوظة" : "Persistent sessions",
      description: isArabic ? "استعادة موثوقة بدون وميض على التحميل الأول." : "Reliable restore without first-load flicker.",
    },
    {
      icon: Activity,
      title: isArabic ? "وصول حسب الدور" : "Role-based access",
      description: isArabic ? "المتجر والواجهة الإدارية يعملان من نفس شجرة المسارات الحالية." : "Storefront and admin stay aligned with the existing route tree.",
    },
    {
      icon: Sparkles,
      title: isArabic ? "واجهة علاجية فاخرة" : "Clinical luxury UI",
      description: isArabic ? "تدرجات عميقة، زجاجية ناعمة، وتركيز واضح على الثقة." : "Deep gradients, soft glass layers, and a trust-first visual system.",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f7fcfc_0%,#eff8f8_55%,#ffffff_100%)] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(8,145,178,0.08),transparent_22%)]" />
      <div className="absolute inset-x-0 top-[-14rem] h-[24rem] bg-[radial-gradient(circle,rgba(255,255,255,0.72),transparent_56%)] blur-3xl" />

      <main className="relative mx-auto grid min-h-screen max-w-7xl gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(24rem,30rem)] lg:gap-6 lg:px-8 lg:py-8">
        <motion.section
          initial={{ opacity: 0, x: isArabic ? 28 : -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="order-2 relative overflow-hidden rounded-[2.25rem] border border-white/80 bg-[linear-gradient(155deg,#ffffff_10%,#f6fbfb_58%,#eef7f6_100%)] p-5 shadow-[0_28px_90px_rgba(15,23,42,0.08)] md:p-7 lg:order-1 lg:rounded-[2.4rem] lg:p-8"
        >
          <img
            src={images.homePortrait}
            alt="United Pharmacies interior"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.08]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(255,255,255,0.96)_8%,rgba(243,251,250,0.92)_45%,rgba(237,248,247,0.95)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.12),transparent_26%),radial-gradient(circle_at_80%_24%,rgba(125,211,252,0.1),transparent_22%)]" />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="relative flex h-full flex-col"
          >
            <motion.div variants={fadeUp} className="flex items-center justify-between gap-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.26em] text-slate-600 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                {modeCopy.badge}
              </div>

              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <ReturnIcon className="h-4 w-4" />
                {isArabic ? "العودة إلى المتجر" : "Back to store"}
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8">
              <div className="inline-flex items-center gap-3 rounded-[1.6rem] border border-slate-200 bg-white/90 px-4 py-3 shadow-[0_18px_36px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-slate-200 bg-slate-50">
                  <img src={images.logoMark} alt="United Pharmacies" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">
                    United Pharmacies
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {isArabic ? "عمليات يومية بتجربة أدق" : "Daily pharmacy operations with sharper flow"}
                  </p>
                </div>
              </div>

              <h1 className="mt-8 max-w-xl text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-[3.6rem]">
                {modeCopy.title}
              </h1>
              <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-600 md:text-base">
                {modeCopy.subtitle}
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950">{stat.value}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-auto pt-8">
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm md:p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  {signals.map((signal) => (
                    <div key={signal.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-4">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 ring-1 ring-teal-100">
                        <signal.icon className="h-4 w-4" />
                      </div>
                      <p className="mt-4 text-sm font-black text-slate-950">{signal.title}</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                        {signal.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: isArabic ? -28 : 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.06 }}
          className="order-1 relative rounded-[2.25rem] border border-white/90 bg-white/80 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:order-2 lg:rounded-[2.4rem]"
        >
          <div className="absolute inset-0 rounded-[2.4rem] bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.08),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.12),transparent_26%)]" />
          <div className="relative rounded-[1.9rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.985)_0%,rgba(247,250,251,0.96)_100%)] p-5 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:p-7 lg:rounded-[2rem]">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 p-1">
              {[
                { id: "login", label: isArabic ? "دخول" : "Login", to: `/login${loginSearch}` },
                { id: "register", label: isArabic ? "حساب جديد" : "Register", to: `/login${registerSearch}` },
              ].map((tab) => {
                const active = mode === tab.id;

                return (
                  <Link
                    key={tab.id}
                    to={tab.to}
                    state={from ? { from } : undefined}
                    className={cn(
                      "relative flex-1 rounded-full px-4 py-3 text-center text-sm font-black transition-colors",
                      active ? "text-white" : "text-slate-500 hover:text-slate-900",
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="auth-mode"
                        className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,#0f1f29_0%,#113746_52%,#17b6a4_100%)] shadow-[0_14px_34px_rgba(15,31,41,0.22)]"
                      />
                    ) : null}
                    <span className="relative">{tab.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-7 lg:mt-8">
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-600">
                United Auth
              </p>
              <h2 className="mt-3 text-[1.8rem] font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
                {modeCopy.heading}
              </h2>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-500">
                {modeCopy.description}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {isArabic ? "آمن" : "Secure"}
                  </p>
                  <p className="mt-1 text-xs font-black text-slate-900">
                    {isArabic ? "حساب محمي" : "Protected account"}
                  </p>
                </div>
                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {isArabic ? "سريع" : "Fast"}
                  </p>
                  <p className="mt-1 text-xs font-black text-slate-900">
                    {isArabic ? "دخول واضح" : "Clear sign-in"}
                  </p>
                </div>
                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {isArabic ? "الطلبات" : "Orders"}
                  </p>
                  <p className="mt-1 text-xs font-black text-slate-900">
                    {isArabic ? "متابعة أسهل" : "Easier tracking"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 lg:mt-8">{children}</div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
