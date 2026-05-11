import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Music2,
  PhoneCall,
  Send,
  Youtube,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { getServiceHoursSentence } from "../config";
import { BranchMap } from "../components/BranchMap";
import { InfoTile, PageHero, SectionIntro } from "../components/BrandPrimitives";
import { Reveal } from "../components/Reveal";
import { cn } from "../components/UI";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { locations, siteContact, siteSocials } from "../data";

// Web3Forms access key from environment
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;

export default function Contact() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const branchesSorted = [...locations].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const selectedBranchId = searchParams.get("branch") ?? branchesSorted[0]?.id ?? "cairo";
  const selectedBranch = branchesSorted.find((branch) => branch.id === selectedBranchId) ?? branchesSorted[0];
  const branchDetailHref = (branchId: string) => `/contact?branch=${branchId}#branch-details`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = lang === "ar" ? "الاسم مطلوب" : "Name is required";
    if (!form.email.trim()) e.email = lang === "ar" ? "البريد مطلوب" : "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = lang === "ar" ? "صيغة البريد غير صحيحة" : "Invalid email format";
    if (!form.message.trim()) e.message = lang === "ar" ? "الرسالة مطلوبة" : "Message is required";
    if (form.message.length > 500)
      e.message = lang === "ar" ? "الرسالة طويلة جداً (500 حرف كحد أقصى)" : "Message too long (max 500 chars)";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSending(true);
    setSubmitStatus("idle");

    try {
      const formData = new FormData();
      formData.append("access_key", WEB3FORMS_ACCESS_KEY ?? "");
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone || "Not provided");
      formData.append("subject", form.subject || "General Inquiry");
      formData.append("message", form.message);
      // Optional: Add a custom subject line for the email
      formData.append("_subject", `New Contact: ${form.subject || "General Inquiry"} from ${form.name}`);

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setSubmitStatus("success");
        setForm({ name: "", phone: "", email: "", subject: "", message: "" });
        // Auto-hide success after 6 seconds
        setTimeout(() => setSubmitStatus("idle"), 6000);
      } else {
        throw new Error(data.message || "Submission failed");
      }
    } catch (error) {
      console.error("Contact form error:", error);
      setSubmitStatus("error");
      setTimeout(() => setSubmitStatus("idle"), 6000);
    } finally {
      setSending(false);
    }
  };

  const subjects =
    lang === "ar"
      ? ["استفسار دوائي", "طلب توصيل", "مشكلة في الطلب", "شراكة أو تعاون", "أخرى"]
      : ["Medication Inquiry", "Delivery Request", "Order Issue", "Partnership", "Other"];

  return (
    <div className="contact-page medical-page medical-shell bg-[#F5FDFC]">
      <PageHero
        lang={lang}
        crumbs={[{ label: t("home"), to: "/" }, { label: t("contact") }]}
        eyebrow={
          <span className="badge-teal border-0 bg-teal-500/10 text-teal-700">
            <MessageSquare className="h-4 w-4" />
            {lang === "ar" ? "تواصل واضح ومباشر" : "Direct, Clear Communication"}
          </span>
        }
        title={t("contact_title")}
        description={t("contact_subtitle")}
        aside={
          <div className="contact-aside grid gap-4">
            <div className="contact-hotline-card panel-soft rounded-[1.75rem] p-6">
              <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                {lang === "ar" ? "الهاتف المباشر" : "Direct phone"}
              </p>
              <a
                href={`tel:${siteContact.phoneHref}`}
                dir="ltr"
                className="text-2xl font-black text-slate-900 transition-colors hover:text-teal-700"
              >
                {siteContact.phoneDisplay}
              </a>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {lang === "ar"
                  ? "للطلبات والاستفسارات وخدمة العملاء."
                  : "For orders, questions, and customer support."}
              </p>
            </div>
            <div className="contact-hours-card panel-soft rounded-[1.75rem] p-6">
              <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
                {lang === "ar" ? "ساعات العمل" : "Working Hours"}
              </p>
              <p className="text-lg font-black text-slate-900">{getServiceHoursSentence(lang)}</p>
              <a
                href={siteContact.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                {lang === "ar" ? "دعم واتساب" : "WhatsApp support"}
              </a>
            </div>
          </div>
        }
      />

      <section className="contact-content page-section py-10 md:py-14">
        <div className="contact-layout grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          {/* LEFT — info */}
          <div className="contact-info-column space-y-5">
            <SectionIntro
              spacing="compact"
              eyebrow={
                <span className="badge-teal">
                  <PhoneCall className="h-4 w-4" />
                  {lang === "ar" ? "قنوات الاتصال" : "Contact Channels"}
                </span>
              }
              title={lang === "ar" ? "طرق الوصول إلينا" : "Ways to Reach Us"}
              description={lang === "ar" ? "اختر القناة الأنسب لك." : "Choose the most convenient contact method."}
            />

            <Reveal direction="up">
              <div
                id="branch-details"
                className="space-y-5 rounded-[1.85rem] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              >
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {lang === "ar" ? "فروعنا على الخريطة" : "Our branches on the map"}
                  </p>
                  <h3 className="text-lg font-black tracking-tight text-slate-900">
                    {lang === "ar" ? "خريطة تفاعلية بدون ضوضاء بصرية" : "A cleaner interactive branch map"}
                  </h3>
                  <p className="text-sm font-semibold leading-6 text-slate-500">
                    {lang === "ar"
                      ? "اختر أي دبوس للانتقال مباشرة إلى تفاصيل الفرع وأرقام التواصل الخاصة به."
                      : "Select any marker to jump straight to that branch and its direct contact numbers."}
                  </p>
                </div>

                <BranchMap
                  locations={branchesSorted}
                  selectedBranchId={selectedBranch.id}
                  isArabic={lang === "ar"}
                  onSelectBranch={(branchId) => navigate(branchDetailHref(branchId))}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-[11px] font-black uppercase tracking-[0.16em]">
                        {lang === "ar" ? "الفرع المحدد" : "Selected branch"}
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {lang === "ar" ? selectedBranch.fullNameAr : selectedBranch.fullNameEn}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      {lang === "ar" ? selectedBranch.addressAr : selectedBranch.addressEn}
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="mb-2 flex items-center gap-2 text-slate-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-[11px] font-black uppercase tracking-[0.16em]">
                        {lang === "ar" ? "ساعات العمل" : "Working Hours"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-6 text-slate-700">
                      {lang === "ar" ? selectedBranch.hoursAr : selectedBranch.hoursEn}
                    </p>
                    <a
                      href={selectedBranch.mapsDirectionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-teal-700 underline-offset-2 hover:text-teal-600 hover:underline"
                    >
                      {lang === "ar" ? "افتح في خرائط جوجل" : "Open in Google Maps"}
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                </div>

                <Accordion
                  type="single"
                  collapsible
                  value={selectedBranch.id}
                  onValueChange={(value) => {
                    if (value) navigate(branchDetailHref(value));
                  }}
                >
                  {branchesSorted.map((location) => (
                    <AccordionItem
                      key={location.id}
                      value={location.id}
                      className={cn(
                        "overflow-hidden rounded-[1.35rem] border px-4",
                        location.id === selectedBranch.id
                          ? "border-teal-200 bg-teal-50/40"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <div className="text-start">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-950">
                              {lang === "ar" ? location.fullNameAr : location.fullNameEn}
                            </p>
                            {location.isPrimary ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 ring-1 ring-slate-200">
                                {lang === "ar" ? "الرئيسي" : "Main"}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-6 text-slate-500">
                            {lang === "ar" ? location.addressAr : location.addressEn}
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
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
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

            <div className="contact-info-tiles grid gap-4">
              <InfoTile
                icon={PhoneCall}
                tint="blue"
                title={lang === "ar" ? "الهاتف" : "Phone"}
                description={siteContact.phoneDisplay}
              />
              <InfoTile
                icon={Mail}
                tint="rose"
                title={lang === "ar" ? "البريد الإلكتروني" : "Email"}
                description={siteContact.email}
              />
              <InfoTile
                icon={Clock}
                tint="amber"
                title={lang === "ar" ? "ساعات العمل" : "Working Hours"}
                description={getServiceHoursSentence(lang)}
              />
            </div>

            <Reveal direction="up">
              <div className="grid gap-4 md:grid-cols-2">
                <a
                  href={siteContact.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="card-premium flex items-center gap-3 p-5 transition-colors hover:bg-slate-50/80"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#25D366]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      {lang === "ar" ? "واتساب" : "WhatsApp"}
                    </p>
                    <p className="truncate text-sm font-black text-slate-900" dir="ltr">
                      {siteContact.whatsappDisplay}
                    </p>
                  </div>
                </a>
                <a
                  href={`mailto:${siteContact.email}`}
                  className="card-premium flex items-center gap-3 p-5 transition-colors hover:bg-slate-50/80"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      {lang === "ar" ? "راسلنا" : "Email us"}
                    </p>
                    <p className="truncate text-sm font-black text-slate-900">{siteContact.email}</p>
                  </div>
                </a>
              </div>
            </Reveal>

            {/* Social */}
            <Reveal direction="up">
              <div className="contact-social-card card-premium p-5">
                <p className="mb-3 text-sm font-black text-slate-900">
                  {lang === "ar" ? "تابعنا" : "Follow Us"}
                </p>
                <div className="contact-social-grid grid gap-3 sm:grid-cols-2">
                  {siteSocials.map((s) => {
                    const Icon =
                      s.id === "facebook"
                        ? Facebook
                        : s.id === "instagram"
                        ? Instagram
                        : s.id === "youtube"
                        ? Youtube
                        : Music2;
                    const color =
                      s.id === "facebook"
                        ? "#1877F2"
                        : s.id === "instagram"
                        ? "#E4405F"
                        : s.id === "youtube"
                        ? "#FF0000"
                        : "#111111";
                    return (
                      <a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        <Icon className="h-4 w-4" style={{ color }} />
                        {s.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>

          {/* RIGHT — form */}
          <div className="contact-form-card card-premium p-6 md:p-8">
            <SectionIntro
              spacing="compact"
              eyebrow={
                <span className="badge-teal">
                  <Send className="h-4 w-4" />
                  {t("send_message")}
                </span>
              }
              title={lang === "ar" ? "أرسل رسالتك" : "Send Your Message"}
              description={lang === "ar" ? "سنعود إليك في أقرب وقت." : "We'll get back to you as soon as possible."}
            />

            {/* Success / Error Alerts */}
            {submitStatus === "success" && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm font-bold text-teal-800">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-teal-600" />
                {lang === "ar"
                  ? "تم إرسال رسالتك بنجاح! سنتواصل معك قريباً."
                  : "Your message has been sent successfully! We'll get back to you soon."}
              </div>
            )}
            {submitStatus === "error" && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
                {lang === "ar"
                  ? "حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى."
                  : "An error occurred. Please try again."}
              </div>
            )}

            <form onSubmit={handleSubmit} className="contact-form space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">{t("full_name")}</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder={lang === "ar" ? "الاسم الكامل" : "Full Name"}
                    className={cn(
                      "h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-teal-500/15",
                      errors.name ? "border-rose-300" : "border-slate-200 focus:border-teal-400"
                    )}
                  />
                  {errors.name && <p className="mt-1.5 text-xs font-bold text-rose-500">{errors.name}</p>}
                </div>
                {/* Phone */}
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">{t("phone")}</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="010XXXXXXXX"
                    dir="ltr"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/15"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">{t("email")}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                  dir="ltr"
                  className={cn(
                    "h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-teal-500/15",
                    errors.email ? "border-rose-300" : "border-slate-200 focus:border-teal-400"
                  )}
                />
                {errors.email && <p className="mt-1.5 text-xs font-bold text-rose-500">{errors.email}</p>}
              </div>

              {/* Subject */}
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  {lang === "ar" ? "الموضوع" : "Subject"}
                </label>
                <div className="flex flex-wrap gap-2" dir={lang === "ar" ? "rtl" : "ltr"}>
                  {subjects.map((subject) => {
                    const active = form.subject === subject;
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, subject: active ? "" : subject }))}
                        className={cn(
                          "inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-black transition-all",
                          active
                            ? "border-teal-300 bg-teal-50 text-teal-800 shadow-[0_10px_24px_rgba(20,184,166,0.12)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/60"
                        )}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  {lang === "ar" ? "الرسالة" : "Message"}
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  rows={5}
                  placeholder={t("message")}
                  className={cn(
                    "w-full resize-none rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-teal-500/15",
                    errors.message ? "border-rose-300" : "border-slate-200 focus:border-teal-400"
                  )}
                />
                <div className="mt-1.5 flex items-center justify-between">
                  {errors.message ? (
                    <p className="text-xs font-bold text-rose-500">{errors.message}</p>
                  ) : (
                    <span />
                  )}
                  <p className="text-xs font-bold text-slate-400">{form.message.length}/500</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 text-sm font-black text-white transition-all hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ height: "3.25rem" }}
              >
                {sending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {lang === "ar" ? "جارٍ الإرسال..." : "Sending..."}
                  </>
                ) : (
                  <>
                    <Send className={cn("h-4 w-4", lang === "ar" && "-scale-x-100")} />
                    {t("send_message")}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}