import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Home,
  LayoutGrid,
  Loader2,
  Pill,
  Phone,
  ShoppingBag,
  User,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { normalizeEgyptianPhone } from "../config";
import { ActionBand, BrandActionGroup, PageHero } from "../components/BrandPrimitives";
import { cn } from "../components/UI";
import { useIsShopperShell } from "../components/ui/use-mobile";
import { ShopperActionCluster, ShopperPage, ShopperSectionHeader, ShopperStatusBanner, ShopperSurface } from "../components/ShopperPrimitives";

// Web3Forms access key from environment
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;

type FormData = {
  patientName: string;
  phone: string;
  medicationName: string;
  strengthForm: string;
  quantity: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function SpecialOrders() {
  const isShopperShell = useIsShopperShell();
  const { lang, t } = useLanguage();
  const { user } = useAuth();

  const [form, setForm] = useState<FormData>({
    patientName: "",
    phone: "",
    medicationName: "",
    strengthForm: "",
    quantity: "",
    notes: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const followUpActions = [
    {
      to: "/products",
      label: t("browse_products"),
      icon: ShoppingBag,
      variant: "primary" as const,
    },
    {
      to: "/categories",
      label: t("browse_categories_short"),
      icon: LayoutGrid,
      variant: "secondary" as const,
    },
    {
      to: "/orders",
      label: t("back_to_orders"),
      icon: ClipboardList,
      variant: "secondary" as const,
    },
    {
      to: "/",
      label: t("browse_home"),
      icon: Home,
      variant: "ghost" as const,
    },
  ];

  // Prefill phone and name from authenticated user
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        patientName: prev.patientName || user.fullName?.trim() || "",
        phone: prev.phone || normalizeEgyptianPhone(user.phone || ""),
      }));
    }
  }, [user]);

  const validateForm = (): FormErrors => {
    const errs: FormErrors = {};

    if (!form.patientName.trim()) {
      errs.patientName = lang === "ar" ? "الاسم مطلوب" : "Patient name is required";
    }

    if (!/^01[0125]\d{8}$/.test(normalizeEgyptianPhone(form.phone))) {
      errs.phone =
        lang === "ar"
          ? "رقم هاتف مصري صحيح مطلوب (يبدأ بـ 01)"
          : "Valid Egyptian mobile number required (starts with 01)";
    }

    if (!form.medicationName.trim() || form.medicationName.trim().length < 2) {
      errs.medicationName =
        lang === "ar"
          ? "يرجى إدخال اسم الدواء بشكل واضح"
          : "Please enter a clear medication name";
    }

    if (form.quantity && !/^\d+$/.test(form.quantity)) {
      errs.quantity = lang === "ar" ? "الكمية يجب أن تكون رقماً صحيحاً" : "Quantity must be a whole number";
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("access_key", WEB3FORMS_ACCESS_KEY);
      formData.append("subject", `طلب توفير دواء: ${form.medicationName}`);
      formData.append("from_name", "United Pharmacy Shortages");
      formData.append("Patient Name", form.patientName);
      formData.append("Phone", normalizeEgyptianPhone(form.phone));
      formData.append("Medication Name", form.medicationName);
      if (form.strengthForm) formData.append("Strength / Form", form.strengthForm);
      if (form.quantity) formData.append("Quantity", form.quantity);
      if (form.notes) formData.append("Notes", form.notes);

      // Additional context for email
      formData.append("_subject", `New Shortage Request: ${form.medicationName} from ${form.patientName}`);
      formData.append("_template", "box");

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        // Reset form except maybe phone/name?
        setForm({
          patientName: user?.fullName?.trim() || "",
          phone: user?.phone ? normalizeEgyptianPhone(user.phone) : "",
          medicationName: "",
          strengthForm: "",
          quantity: "",
          notes: "",
        });
        setErrors({});
        setTimeout(() => setStatus("idle"), 6000);
      } else {
        throw new Error(data.message || "Submission failed");
      }
    } catch (error) {
      console.error("Shortage request error:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : lang === "ar"
          ? "تعذر إرسال الطلب. حاول مرة أخرى."
          : "Could not send request. Please try again."
      );
      setTimeout(() => setStatus("idle"), 6000);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for that field on typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const formContent = (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm md:p-8">
      {/* Decorative gradient */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-teal-100/40 blur-3xl" />

      {status === "success" && (
        <div className="relative mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-bold text-emerald-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="font-black">
                {lang === "ar" ? "تم استلام طلبك بنجاح!" : "Request received successfully!"}
              </p>
              <p className="mt-1 text-xs font-medium">
                {lang === "ar"
                  ? "سيتواصل معك فريق الصيدلية خلال 1 إلى 24 ساعة لتأكيد التوافر."
                  : "Our pharmacy team will contact you within 1–24 hours to confirm availability."}
              </p>
            </div>
          </div>
          <div className="mt-4">
            {isShopperShell ? (
              <ShopperActionCluster actions={followUpActions} />
            ) : (
              <BrandActionGroup actions={followUpActions} />
            )}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="relative mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Patient Name */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-700">
              <User className="h-3.5 w-3.5 text-teal-600" />
              {lang === "ar" ? "اسم المريض" : "Patient Name"}
            </label>
            <input
              value={form.patientName}
              onChange={(e) => handleChange("patientName", e.target.value)}
              placeholder={lang === "ar" ? "الاسم الكامل" : "Full name"}
              className={cn(
                "h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-teal-500/15",
                errors.patientName ? "border-rose-300" : "border-slate-200 focus:border-teal-400"
              )}
            />
            {errors.patientName && (
              <p className="mt-1.5 text-xs font-bold text-rose-500">{errors.patientName}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-700">
              <Phone className="h-3.5 w-3.5 text-teal-600" />
              {lang === "ar" ? "رقم الهاتف" : "Phone Number"}
            </label>
            <input
              value={form.phone}
              onChange={(e) => handleChange("phone", normalizeEgyptianPhone(e.target.value))}
              placeholder="010XXXXXXXX"
              dir="ltr"
              className={cn(
                "h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-teal-500/15",
                errors.phone ? "border-rose-300" : "border-slate-200 focus:border-teal-400"
              )}
            />
            {errors.phone && <p className="mt-1.5 text-xs font-bold text-rose-500">{errors.phone}</p>}
          </div>

          {/* Medication Name (full width on mobile) */}
          <div className="md:col-span-2">
            <label className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-700">
              <Pill className="h-3.5 w-3.5 text-teal-600" />
              {lang === "ar" ? "اسم الدواء المطلوب" : "Medication Name"} <span className="text-rose-500">*</span>
            </label>
            <input
              value={form.medicationName}
              onChange={(e) => handleChange("medicationName", e.target.value)}
              placeholder={lang === "ar" ? "مثال: باراسيتامول" : "e.g., Paracetamol"}
              className={cn(
                "h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-teal-500/15",
                errors.medicationName ? "border-rose-300" : "border-slate-200 focus:border-teal-400"
              )}
            />
            {errors.medicationName && (
              <p className="mt-1.5 text-xs font-bold text-rose-500">{errors.medicationName}</p>
            )}
          </div>

          {/* Strength / Form */}
          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              {lang === "ar" ? "التركيز / الشكل" : "Strength / Form"}
              <span className="ml-1 text-xs font-medium text-slate-400">
                ({lang === "ar" ? "اختياري" : "optional"})
              </span>
            </label>
            <input
              value={form.strengthForm}
              onChange={(e) => handleChange("strengthForm", e.target.value)}
              placeholder={lang === "ar" ? "مثال: 500 مجم أقراص" : "e.g., 500mg tablets"}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/15"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              {lang === "ar" ? "الكمية المطلوبة" : "Quantity Needed"}
              <span className="ml-1 text-xs font-medium text-slate-400">
                ({lang === "ar" ? "اختياري" : "optional"})
              </span>
            </label>
            <input
              value={form.quantity}
              onChange={(e) => handleChange("quantity", e.target.value.replace(/\D/g, ""))}
              placeholder={lang === "ar" ? "مثال: 2" : "e.g., 2"}
              dir="ltr"
              className={cn(
                "h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:bg-white focus:ring-2 focus:ring-teal-500/15",
                errors.quantity ? "border-rose-300" : "border-slate-200 focus:border-teal-400"
              )}
            />
            {errors.quantity && <p className="mt-1.5 text-xs font-bold text-rose-500">{errors.quantity}</p>}
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-700">
              <MessageSquare className="h-3.5 w-3.5 text-teal-600" />
              {lang === "ar" ? "ملاحظات أو بدائل مقترحة" : "Additional Notes / Alternatives"}
              <span className="ml-1 text-xs font-medium text-slate-400">
                ({lang === "ar" ? "اختياري" : "optional"})
              </span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
              placeholder={
                lang === "ar"
                  ? "أي تفاصيل إضافية أو بدائل تفضلها..."
                  : "Any extra details or preferred alternatives..."
              }
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/15"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 text-sm font-black text-white transition-all hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ height: "3.25rem" }}
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {lang === "ar" ? "جارٍ إرسال الطلب..." : "Submitting request..."}
            </>
          ) : (
            <>
              <Pill className="h-4 w-4" />
              {lang === "ar" ? "إرسال طلب التوفير" : "Submit Request"}
            </>
          )}
        </button>

        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm font-medium leading-6 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            {lang === "ar"
              ? "سيقوم فريق الصيدلية بمراجعة طلبك والتواصل معك لتأكيد التوافر خلال 1 إلى 24 ساعة."
              : "Our pharmacy team will review your request and contact you within 1–24 hours to confirm availability."}
          </p>
        </div>
      </form>
    </div>
  );

  if (isShopperShell) {
    return (
      <ShopperPage docked={false} className="pb-8 pt-4">
        <ShopperSurface className="p-5">
          <ShopperSectionHeader
            eyebrow={t("special_orders_nav")}
            title={lang === "ar" ? "طلب توفير دواء" : "Request a Medication"}
            description={
              lang === "ar"
                ? "إذا لم تجد الصنف المطلوب، اترك لنا التفاصيل وسنساعدك في المتابعة والبحث والتواصل."
                : "If you cannot find the item you need, leave the details here and we will follow up with search, sourcing, and contact."
            }
          />
          {status !== "success" ? (
            <div className="mt-4">
              <ShopperStatusBanner
                tone="info"
                title={lang === "ar" ? "ارجع بسرعة للتسوق" : "Jump Back Into Shopping"}
                description={
                  lang === "ar"
                    ? "يمكنك أيضاً العودة إلى المنتجات أو الأقسام إذا أردت متابعة التسوق الآن."
                    : "You can also head back to products or categories if you want to continue shopping now."
                }
                actions={<ShopperActionCluster actions={followUpActions} />}
              />
            </div>
          ) : null}
          <div className="mt-5">{formContent}</div>
        </ShopperSurface>
      </ShopperPage>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5FDFC]">
      <PageHero
        lang={lang}
        crumbs={[{ label: t("home"), to: "/" }, { label: t("special_orders_nav") }]}
        eyebrow={
          <span className="badge-teal border-0 bg-teal-500/10 text-teal-700">
            <ClipboardList className="h-4 w-4" />
            {t("special_orders_nav")}
          </span>
        }
        title={lang === "ar" ? "مش لاقي دواك؟ هنوفرهولك" : "Can't find your medication? We'll source it for you."}
        description={
          lang === "ar"
            ? "املأ النموذج أدناه وسيبحث فريق الصيدلة لدينا عن الدواء ويتواصل معك خلال ٢٤ ساعة لتأكيد التوافر."
            : "Fill out the form below and our pharmacy team will search for your medication and contact you within 24 hours to confirm availability."
        }
      />

      <div className="page-section pb-16">
        <div className="mx-auto max-w-3xl">{formContent}</div>
        <div className="mx-auto mt-8 max-w-5xl">
          <ActionBand
            eyebrow={
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-teal-700">
                <ClipboardList className="h-3.5 w-3.5" />
                {t("special_orders_nav")}
              </span>
            }
            title={lang === "ar" ? "تسوّق الآن أو راجع طلباتك" : "Browse Now Or Return To Your Orders"}
            description={
              lang === "ar"
                ? "إذا كنت ما زلت تبحث عن صنف بديل أو تريد متابعة طلباتك الحالية، استخدم الروابط السريعة التالية."
                : "If you still want an alternative item or you want to check your current orders, use the quick actions below."
            }
            action={<BrandActionGroup actions={followUpActions.slice(0, 2)} />}
            secondaryAction={<BrandActionGroup actions={followUpActions.slice(2)} />}
          />
        </div>
      </div>
    </div>
  );
}
