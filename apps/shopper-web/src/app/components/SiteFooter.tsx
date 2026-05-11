import { Link } from "react-router-dom";
import {
  Clock,
  HeartPulse,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  Send,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./Reveal";
import { getDeliveryWindowLabel } from "../config";
import { images, locations } from "../data";
import { useState } from "react";

type FooterNavLink = {
  name: string;
  path: string;
  icon: LucideIcon;
};

type FooterSocialLink = {
  href: string;
  Icon: LucideIcon;
  label: string;
};

export function SiteFooter({
  lang,
  t,
  brandNameAr,
  brandNameEn,
  phoneDisplay,
  phoneHref,
  whatsappDisplay,
  whatsappUrl,
  email,
  navLinks,
  socialLinks,
}: {
  lang: "ar" | "en";
  t: (key: "quick_links" | "support" | "faq" | "shipping_policy" | "returns_policy" | "terms" | "privacy" | "rights") => string;
  brandNameAr: string;
  brandNameEn: string;
  phoneDisplay: string;
  phoneHref: string;
  whatsappDisplay: string;
  whatsappUrl: string;
  email: string;
  navLinks: FooterNavLink[];
  socialLinks: FooterSocialLink[];
}) {
  const isArabic = lang === "ar";
  const brandName = isArabic ? brandNameAr : brandNameEn;
  const deliveryWindow = getDeliveryWindowLabel(lang);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const supportLinks = [
    { to: "/faq", label: t("faq") },
    { to: "/shipping", label: t("shipping_policy") },
    { to: "/returns", label: t("returns_policy") },
    { to: "/terms", label: t("terms") },
    { to: "/privacy", label: t("privacy") },
  ];

  const footerSignals = [
    { Icon: ShieldCheck, labelAr: "صرف آمن ومنظم", labelEn: "Safe and regulated service" },
    { Icon: Truck, labelAr: `${deliveryWindow} داخل القاهرة`, labelEn: `${deliveryWindow} in Cairo` },
    { Icon: Sparkles, labelAr: "رسوم توصيل تنافسية", labelEn: "Competitive delivery fee" },
    { Icon: HeartPulse, labelAr: "خدمة أقرب للاحتياج", labelEn: "Care closer to the need" },
  ];

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setNewsletterStatus("loading");
    // Simulate API call – replace with actual newsletter service if needed
    setTimeout(() => {
      setNewsletterStatus("success");
      setNewsletterEmail("");
      setTimeout(() => setNewsletterStatus("idle"), 3000);
    }, 800);
  };

  return (
    <footer className="site-footer relative overflow-hidden border-t border-slate-200 bg-gradient-to-b from-white via-slate-50/80 to-slate-100 pb-8 pt-12 text-slate-900">
      {/* Ambient blurs */}
      <div className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-teal-200/20 blur-3xl" />
      <div className="absolute bottom-[-140px] right-[-80px] h-80 w-80 rounded-full bg-cyan-100/30 blur-3xl" />

      <div className="page-section relative z-10">
        {/* Premium header card */}
        <Reveal direction="up">
          <div className="grid gap-4 rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="flex items-start gap-4">
              <div className="flex h-[4.5rem] w-[4.5rem] flex-shrink-0 items-center justify-center rounded-[1.45rem] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <img src={images.logoMark} alt={brandName} className="h-full w-full object-contain p-2" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-black tracking-[-0.03em] text-slate-950 md:text-2xl">{brandName}</p>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                    {isArabic ? "القاهرة" : "Cairo"}
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
                  {isArabic
                    ? "خدمة صيدلية رقمية لعرض المنتجات والطلبات والدعم داخل القاهرة."
                    : "A digital pharmacy service for products, ordering, and support within Cairo."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={`tel:${phoneHref}`}
                className="rounded-[1.45rem] border border-slate-200 bg-white p-4 transition-all hover:border-teal-200 hover:bg-teal-50/30"
              >
                <div className="mb-2 flex items-center gap-2 text-teal-700">
                  <Phone className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                    {isArabic ? "الخط الساخن" : "Hotline"}
                  </span>
                </div>
                <p className="text-lg font-black text-slate-950" dir="ltr">{phoneDisplay}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {isArabic ? "للطلبات والاستفسارات" : "Orders and support"}
                </p>
              </a>

              <div className="rounded-[1.45rem] border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-teal-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                    {isArabic ? "الخدمة" : "Service"}
                  </span>
                </div>
                <p className="text-sm font-black text-slate-950">{deliveryWindow}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {isArabic ? "رسوم توصيل متاحة داخل القاهرة" : "Delivery fee available in Cairo"}
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        {/* Main footer grid: Links + Contact + Social + Newsletter */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr]">
          {/* Column 1: Contact & Branches */}
          <Reveal direction="up">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">
                  {isArabic ? "التواصل والفروع" : "Contact & Branches"}
                </h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                  {isArabic
                    ? "اختر وسيلة التواصل المناسبة أو راجع عنوان الفرع الأقرب لك."
                    : "Choose the best way to reach us or review the nearest branch address."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {locations.slice(0, 2).map((location) => (
                  <div key={location.id} className="rounded-[1.2rem] border border-slate-200 bg-white/80 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-teal-600" />
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          {isArabic ? location.fullNameAr : location.fullNameEn}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          {isArabic ? location.addressAr : location.addressEn}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${phoneHref}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50/50"
                  dir="ltr"
                >
                  <Phone className="h-4 w-4 text-teal-600" />
                  {phoneDisplay}
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50/50"
                  dir="ltr"
                >
                  <MessageCircle className="h-4 w-4 text-teal-600" />
                  {whatsappDisplay}
                </a>
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-teal-200 hover:bg-teal-50/50"
                >
                  <Mail className="h-4 w-4 text-teal-600" />
                  <span className="truncate">{email}</span>
                </a>
              </div>
            </div>
          </Reveal>

          {/* Column 2: Quick Links */}
          <Reveal direction="up" delay={50}>
            <div>
              <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-500">{t("quick_links")}</h3>
              <ul className="space-y-3">
                {navLinks.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className="group flex items-center gap-2 text-sm font-bold text-slate-600 transition-colors hover:text-teal-700">
                      <item.icon className="h-4 w-4 text-teal-500 transition-transform group-hover:scale-110" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Column 3: Support Links */}
          <Reveal direction="up" delay={90}>
            <div>
              <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-slate-500">{t("support")}</h3>
              <ul className="space-y-3">
                {supportLinks.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="text-sm font-bold text-slate-600 transition-colors hover:text-teal-700">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Column 4: Newsletter + Social */}
          <Reveal direction="up" delay={130}>
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                  {isArabic ? "النشرة البريدية" : "Newsletter"}
                </h3>
                <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
                  {isArabic
                    ? "اشترك للحصول على آخر العروض والتحديثات."
                    : "Subscribe for exclusive offers and updates."}
                </p>
                <form onSubmit={handleNewsletterSubmit} className="relative">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={isArabic ? "بريدك الإلكتروني" : "Your email address"}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm font-medium text-slate-700 outline-none transition-all focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15"
                    disabled={newsletterStatus === "loading"}
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === "loading"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-teal-600 p-2 text-white transition-colors hover:bg-teal-700 disabled:opacity-60"
                  >
                    {newsletterStatus === "loading" ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
                {newsletterStatus === "success" && (
                  <p className="mt-2 text-xs font-bold text-teal-600">
                    {isArabic ? "تم الاشتراك بنجاح!" : "Subscribed successfully!"}
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                  {isArabic ? "تابعنا" : "Follow us"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {socialLinks.map(({ href, Icon, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-all hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Trust Signals */}
        <div className="site-footer-signals mt-10 grid gap-3 border-t border-slate-200 pt-8 sm:grid-cols-2 xl:grid-cols-4">
          {footerSignals.map(({ Icon, labelAr, labelEn }, index) => (
            <Reveal key={labelEn} delay={index * 40} direction="up">
              <div className="rounded-[1.35rem] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-black text-slate-800">{isArabic ? labelAr : labelEn}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Copyright & Legal */}
        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 text-center text-xs font-bold text-slate-500 md:flex-row md:items-center md:justify-between md:text-start">
          <p>
            © {new Date().getFullYear()} {brandName} - {t("rights")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-end">
            {supportLinks.slice(2).map((item) => (
              <Link key={item.to} to={item.to} className="transition-colors hover:text-teal-700">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
