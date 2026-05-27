import { Link } from "react-router-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Clock, Globe2, HeartPulse, MapPin, Phone, ShieldCheck, Store, Truck, Users } from "lucide-react";
import unitedIcon from "@assets/brand/about-icon.png";
import { useLanguage } from "../../contexts/LanguageContext";
import { images, locations } from "../data";
import { getServiceHoursSentence } from "../config";
import { BranchMap } from "../components/BranchMap";
import { Reveal } from "../components/Reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { cn } from "../components/UI";

export function AboutMobile() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isArabic = lang === "ar";
  const brandName = isArabic ? "صيدليات المتحدة" : "United Pharmacies";
  const defaultBranchId = locations.find((branch) => branch.isPrimary)?.id ?? locations[0]?.id ?? "cairo";
  const selectedBranchId = searchParams.get("branch") ?? defaultBranchId;
  const defaultBranch = locations.find((branch) => branch.id === defaultBranchId) ?? locations[0];
  const selectedBranch = locations.find((location) => location.id === selectedBranchId) ?? defaultBranch;
  const branchDetailHref = (branchId: string) => `/about?branch=${branchId}#branch-details`;

  const storyCards = [
    {
      Icon: HeartPulse,
      titleAr: "رعاية عملية",
      titleEn: "Practical care",
      textAr: "نرتب التجربة حول الوضوح والسرعة والدعم المباشر.",
      textEn: "We shape the experience around clarity, speed, and direct support.",
    },
    {
      Icon: ShieldCheck,
      titleAr: "ثقة أوضح",
      titleEn: "Clearer trust",
      textAr: "معلومات الخدمة والمنتجات تُعرض بطريقة أبسط وأكثر هدوءاً.",
      textEn: "Product and service details are presented in a calmer, simpler way.",
    },
    {
      Icon: Truck,
      titleAr: "تنفيذ منظم",
      titleEn: "Structured fulfillment",
      textAr: "من التصفح إلى التوصيل داخل القاهرة، نحاول تقليل الاحتكاك في كل خطوة.",
      textEn: "From browsing to delivery in Cairo, we reduce friction at every step.",
    },
    {
      Icon: Users,
      titleAr: "أسهل للجميع",
      titleEn: "Easier for everyone",
      textAr: "واجهة يمكن قراءتها واستخدامها بسهولة على الجوال.",
      textEn: "A mobile interface that stays readable and easy to use.",
    },
  ];

  const promisePoints = [
    {
      Icon: ShieldCheck,
      textAr: "عرض أوضح للمنتجات والمعلومات الأساسية",
      textEn: "Clearer presentation of products and essential information",
    },
    {
      Icon: Truck,
      textAr: "تنظيم أفضل لمسار الطلب والتوصيل داخل القاهرة",
      textEn: "Better structure for ordering and delivery across Cairo",
    },
    {
      Icon: Globe2,
      textAr: "تجربة رقمية أهدأ وأسهل في الاستخدام",
      textEn: "A calmer digital experience that is easier to use",
    },
  ];

  return (
    <div
      className="about-page-mobile bg-[#F5FDFC] w-full"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* ── Hero section ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#f7fcfc_0%,#eef8f8_100%)] px-4 pb-8 pt-5 w-full">
        {/* Background blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 top-0 h-48 w-48 rounded-full bg-teal-200/45 blur-3xl" />
          <div className="absolute -right-8 top-20 h-40 w-40 rounded-full bg-cyan-100/60 blur-3xl" />
        </div>

        <div className="relative z-10 w-full space-y-4">
          <Reveal direction="up">
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] w-full">
              {/* Hero image */}
              <div className="relative h-[15rem] overflow-hidden">
                <img
                  src={images.pic0}
                  alt={brandName}
                  className="h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,13,22,0.14)_0%,rgba(2,13,22,0.76)_100%)]" />

                {/* "About us" badge */}
                <div className="absolute inset-x-0 top-0 p-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/88 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur-sm">
                    <Store className="h-3.5 w-3.5" />
                    {isArabic ? "من نحن" : "About us"}
                  </span>
                </div>

                {/* Brand identity card inside image */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="rounded-[1.5rem] border border-white/85 bg-white/92 p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-md">
                    <div className="flex items-center gap-3">
                      <img
                        src={unitedIcon}
                        alt={brandName}
                        className="h-14 w-14 rounded-[1rem] border border-white/15 bg-white/90 p-2"
                      />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          {isArabic ? "الهوية" : "Identity"}
                        </p>
                        <h1 className="mt-1 text-xl font-black text-slate-950">{brandName}</h1>
                      </div>
                    </div>
                    <p className="mt-3 text-[13px] font-semibold leading-6 text-slate-600">
                      {isArabic
                        ? "من صيدلية محلية موثوقة إلى تجربة رقمية أوضح وأكثر تنظيماً."
                        : "From a trusted local pharmacy to a clearer, more structured digital experience."}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="grid grid-cols-2 gap-3 p-4">
                <Link
                  to="/products"
                  className={cn(
                    "inline-flex h-12 items-center justify-center gap-2 rounded-[1.3rem]",
                    "bg-[var(--primary)] px-4 text-sm font-black text-white",
                    "shadow-[0_8px_24px_rgba(36,184,181,0.35)]",
                    "transition-all active:scale-95",
                  )}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {isArabic ? "تصفح المنتجات" : "Browse products"}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className={cn(
                    "inline-flex h-12 items-center justify-center rounded-[1.3rem]",
                    "border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700",
                    "transition-all active:scale-95",
                  )}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {isArabic ? "تواصل معنا" : "Contact us"}
                </Link>
              </div>
            </div>
          </Reveal>

          {/* Service overview chips */}
          <Reveal direction="up" delay={40}>
            <div className="grid gap-3">
              {[
                {
                  Icon: Clock,
                  titleAr: "الخدمة اليومية",
                  titleEn: "Daily service",
                  textAr: getServiceHoursSentence("ar"),
                  textEn: getServiceHoursSentence("en"),
                },
                {
                  Icon: Truck,
                  titleAr: "التوصيل داخل القاهرة",
                  titleEn: "Cairo delivery",
                  textAr: "تنفيذ أسرع ومسار أوضح للطلب",
                  textEn: "A faster, clearer delivery flow",
                },
                {
                  Icon: MapPin,
                  titleAr: "الفروع",
                  titleEn: "Branches",
                  textAr: "دليل مختصر للفروع مع خريطة تفاعلية وأرقام مباشرة",
                  textEn: "A compact branch directory with an interactive map and direct numbers",
                },
              ].map(({ Icon, titleAr, titleEn, textAr, textEn }) => (
                <div
                  key={titleEn}
                  className="flex items-start gap-3 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[var(--primary)]/8 text-[var(--primary)]">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-slate-950">
                      {isArabic ? titleAr : titleEn}
                    </p>
                    <p className="mt-0.5 text-[12px] font-semibold leading-5 text-slate-500">
                      {isArabic ? textAr : textEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Story cards ───────────────────────────────────────────────────── */}
      <section className="px-4 py-8 w-full">
        <div className="w-full">
          <Reveal direction="up">
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {isArabic ? "قصتنا" : "Our story"}
              </p>
              <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950">
                {isArabic ? "ما الذي نسعى إليه؟" : "What do we aim for?"}
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-2 gap-3">
            {storyCards.map(({ Icon, titleAr, titleEn, textAr, textEn }, idx) => (
              <Reveal key={titleEn} direction="up" delay={idx * 40}>
                <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-slate-50 text-slate-700">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-[13px] font-black text-slate-950">
                    {isArabic ? titleAr : titleEn}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
                    {isArabic ? textAr : textEn}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Branch directory ──────────────────────────────────────────────── */}
      <section className="px-4 pb-8 w-full">
        <div className="w-full">
          <Reveal direction="up">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                {isArabic ? "الفروع" : "Branches"}
              </p>
              <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950">
                {isArabic ? "بيانات الخدمة منظمة للجوال" : "Service details organized for mobile"}
              </h2>
            </div>
          </Reveal>

          <Reveal direction="up" delay={40}>
            <div
              id="branch-details"
              className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] w-full"
            >
              <BranchMap
                locations={locations}
                selectedBranchId={selectedBranch.id}
                isArabic={isArabic}
                onSelectBranch={(branchId) => navigate(branchDetailHref(branchId))}
              />

              {/* Selected branch details */}
              <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-black text-slate-950">
                    {isArabic ? selectedBranch.fullNameAr : selectedBranch.fullNameEn}
                  </p>
                  {selectedBranch.isPrimary ? (
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {isArabic ? "الرئيسي" : "Primary"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-[12px] font-semibold leading-5 text-slate-500">
                  {isArabic ? selectedBranch.addressAr : selectedBranch.addressEn}
                </p>
                <div className="mt-4 grid gap-2">
                  <div className="flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-black text-slate-700">
                    <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                    {isArabic ? selectedBranch.hoursAr : selectedBranch.hoursEn}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedBranch.phones.map((phone) => (
                      <a
                        key={phone}
                        href={`tel:${phone}`}
                        dir="ltr"
                        className={cn(
                          "inline-flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white",
                          "px-3 py-2.5 text-[12px] font-black text-slate-700",
                          "transition-all active:scale-95",
                        )}
                        style={{ WebkitTapHighlightColor: "transparent" }}
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        {phone}
                      </a>
                    ))}
                  </div>
                  <a
                    href={selectedBranch.mapsDirectionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "flex items-center justify-between rounded-[1rem] border border-slate-200 bg-white",
                      "px-3 py-2.5 text-[12px] font-black text-slate-700",
                      "transition-all active:scale-95",
                    )}
                    style={{ WebkitTapHighlightColor: "transparent" }}
                  >
                    <span>{isArabic ? "افتح على الخريطة" : "Open in Maps"}</span>
                    <ArrowUpRight className="h-4 w-4 text-slate-500" />
                  </a>
                </div>
              </div>

              {/* Branch accordion */}
              <Accordion
                type="single"
                collapsible
                value={selectedBranch.id}
                onValueChange={(value) => { if (value) navigate(branchDetailHref(value)); }}
                className="mt-4 space-y-2"
              >
                {locations.map((location) => (
                  <AccordionItem
                    key={location.id}
                    value={location.id}
                    className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white px-4"
                  >
                    <AccordionTrigger className="py-3.5 hover:no-underline">
                      <div className="text-start">
                        <p className="text-[13px] font-black text-slate-950">
                          {isArabic ? location.fullNameAr : location.fullNameEn}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-500">
                          {isArabic ? location.addressAr : location.addressEn}
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="flex flex-wrap gap-2">
                        {location.phones.map((phone) => (
                          <a
                            key={phone}
                            href={`tel:${phone}`}
                            dir="ltr"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700"
                          >
                            <Phone className="h-3.5 w-3.5 text-slate-500" />
                            {phone}
                          </a>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Promise section ───────────────────────────────────────────────── */}
      <section className="px-4 w-full">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-[linear-gradient(160deg,#ffffff_0%,#f4fbfb_56%,#eef9f7_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <Reveal direction="up">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {isArabic ? "وعد المتحدة" : "The United promise"}
            </p>
            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950">
              {isArabic ? "تجربة أهدأ وأقرب" : "A calmer, closer digital pharmacy"}
            </h2>
          </Reveal>

          <div className="mt-5 grid gap-3">
            {promisePoints.map(({ Icon, textAr, textEn }, index) => (
              <Reveal key={textEn} direction="up" delay={index * 40}>
                <div className="flex items-center gap-3 rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.9rem] bg-[var(--primary)]/8 text-[var(--primary)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[12px] font-semibold leading-5 text-slate-600">
                    {isArabic ? textAr : textEn}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              to="/products"
              className={cn(
                "inline-flex h-12 items-center justify-center gap-2 rounded-[1.3rem]",
                "bg-[var(--primary)] px-4 text-sm font-black text-white",
                "shadow-[0_8px_24px_rgba(36,184,181,0.35)]",
                "transition-all active:scale-95",
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isArabic ? "تصفح المنتجات" : "Browse products"}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className={cn(
                "inline-flex h-12 items-center justify-center rounded-[1.3rem]",
                "border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700",
                "transition-all active:scale-95",
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {isArabic ? "اتصل بنا" : "Contact us"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
