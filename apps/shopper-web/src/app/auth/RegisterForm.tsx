import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../contexts/LanguageContext";
import { cn } from "../components/UI";
import {
  createRegisterSchema,
  getPasswordStrength,
  type RegisterFormValues,
} from "./authSchemas";

type RegisterFormProps = {
  from?: string;
};

export default function RegisterForm({ from = "" }: RegisterFormProps) {
  const { register: registerAccount } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const isArabic = lang === "ar";
  const schema = useMemo(() => createRegisterSchema(lang), [lang]);
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = form.watch("password");
  const strength = getPasswordStrength(password, lang);
  const isSubmitting = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  const passwordChecks = [
    {
      done: password.length >= 8,
      label: isArabic ? "8 أحرف على الأقل" : "At least 8 characters",
    },
    {
      done: /[a-z]/.test(password) && /[A-Z]/.test(password),
      label: isArabic ? "حروف كبيرة وصغيرة" : "Uppercase and lowercase",
    },
    {
      done: /\d/.test(password),
      label: isArabic ? "رقم واحد على الأقل" : "At least one number",
    },
    {
      done: /[^A-Za-z0-9]/.test(password),
      label: isArabic ? "رمز خاص واحد على الأقل" : "At least one special character",
    },
  ];

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await registerAccount({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        address: "",
      });

      if (result.session) {
        toast.success(
          isArabic
            ? "تم إنشاء الحساب وتسجيل الدخول مباشرة."
            : "Account created and signed in immediately.",
        );
        navigate("/", { replace: true });
        return;
      }

      toast.success(
        isArabic
          ? "تم إنشاء الحساب. راجع بريدك الإلكتروني ثم تابع من صفحة الدخول."
          : "Account created. Check your email, then continue from the login page.",
      );

      navigate(`/login?tab=login&registered=1&email=${encodeURIComponent(values.email.trim())}`, {
        replace: true,
        state: from ? { from } : undefined,
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : isArabic
          ? "تعذر إنشاء الحساب الآن."
          : "Unable to create your account right now.";

      form.setError("root", { message });
      toast.error(message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-[1.6rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
        {isArabic
          ? "أنشئ حساب العميل مرة واحدة لتسريع الطلبات ومتابعة بياناتك لاحقاً."
          : "Create your customer account once for faster future orders and easier account access."}
      </div>

      {rootError ? (
        <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700">
          {rootError}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <AuthField
          className="md:col-span-2"
          error={form.formState.errors.fullName?.message}
          icon={UserRound}
          isArabic={isArabic}
          label={isArabic ? "الاسم الكامل" : "Full name"}
        >
          <input
            type="text"
            autoComplete="name"
            placeholder={isArabic ? "الاسم كما سيظهر في الحساب" : "Your account display name"}
            className={inputClass(Boolean(form.formState.errors.fullName))}
            {...form.register("fullName")}
          />
        </AuthField>

        <AuthField
          error={form.formState.errors.email?.message}
          icon={Mail}
          isArabic={isArabic}
          label={isArabic ? "البريد الإلكتروني" : "Email"}
        >
          <input
            type="email"
            autoComplete="email"
            dir="ltr"
            placeholder="name@example.com"
            className={inputClass(Boolean(form.formState.errors.email))}
            {...form.register("email")}
          />
        </AuthField>

        <AuthField
          error={form.formState.errors.phone?.message}
          icon={Phone}
          isArabic={isArabic}
          label={isArabic ? "رقم الهاتف (اختياري)" : "Phone (optional)"}
        >
          <input
            type="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder={isArabic ? "01012345678 أو +201012345678" : "01012345678 or +201012345678"}
            className={inputClass(Boolean(form.formState.errors.phone))}
            {...form.register("phone")}
          />
        </AuthField>

        <AuthField
          error={form.formState.errors.password?.message}
          icon={LockKeyhole}
          isArabic={isArabic}
          label={isArabic ? "كلمة المرور" : "Password"}
        >
          <input
            type="password"
            autoComplete="new-password"
            dir="ltr"
            placeholder={isArabic ? "أنشئ كلمة مرور قوية" : "Create a strong password"}
            className={inputClass(Boolean(form.formState.errors.password))}
            {...form.register("password")}
          />
        </AuthField>

        <AuthField
          error={form.formState.errors.confirmPassword?.message}
          icon={ShieldCheck}
          isArabic={isArabic}
          label={isArabic ? "تأكيد كلمة المرور" : "Confirm password"}
        >
          <input
            type="password"
            autoComplete="new-password"
            dir="ltr"
            placeholder={isArabic ? "أعد إدخال كلمة المرور" : "Repeat your password"}
            className={inputClass(Boolean(form.formState.errors.confirmPassword))}
            {...form.register("confirmPassword")}
          />
        </AuthField>
      </div>

      <div className="rounded-[1.9rem] border border-slate-200 bg-slate-50/90 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">
              {isArabic ? "قوة كلمة المرور" : "Password strength"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {isArabic ? "حافظ على كلمة مرور قوية قبل إنشاء الحساب." : "Keep the password strong before creating the account."}
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-slate-600">
            {strength.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-2 rounded-full bg-slate-200 transition-colors",
                index < strength.score && strength.color,
              )}
            />
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {passwordChecks.map((check) => (
            <div
              key={check.label}
              className={cn(
                "flex items-center gap-2 rounded-[1.3rem] border px-3 py-2 text-sm font-semibold transition-colors",
                check.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500",
              )}
            >
              <CheckCircle2 className={cn("h-4 w-4", check.done ? "text-emerald-500" : "text-slate-300")} />
              <span>{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-900">
        {isArabic
          ? "إذا كانت ميزة تأكيد البريد مفعلة، سننقلك إلى صفحة الدخول مع تعبئة البريد تلقائيًا."
          : "If email confirmation is enabled, we will send you to login with your email prefilled."}
      </div>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.985 }}
        disabled={isSubmitting}
        className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-[1.7rem] bg-[linear-gradient(135deg,#0f1f29_0%,#12394a_55%,#17b6a4_100%)] px-6 text-sm font-black text-white shadow-[0_18px_36px_rgba(15,31,41,0.22)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" />
            {isArabic ? "إنشاء الحساب" : "Create account"}
          </>
        )}
      </motion.button>

      <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{isArabic ? "لديك حساب بالفعل؟" : "Already have an account?"}</span>
          <Link
            to="/login?tab=login"
            state={from ? { from } : undefined}
            className="font-black text-slate-600 transition-colors hover:text-slate-600"
          >
            {isArabic ? "الانتقال إلى الدخول" : "Go to login"}
          </Link>
        </div>
      </div>
    </form>
  );
}

function inputClass(hasError: boolean) {
  return cn(
    "h-14 w-full rounded-[1.6rem] border bg-white/90 ps-12 pe-4 text-sm font-semibold text-slate-950 outline-none transition-all placeholder:text-slate-400",
    hasError
      ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
      : "border-slate-200 focus:border-teal-400 focus:ring-4 focus:ring-teal-100",
  );
}

function AuthField({
  children,
  className,
  error,
  icon: Icon,
  isArabic,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  icon: typeof Mail;
  isArabic: boolean;
  label: string;
}) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="text-sm font-black text-slate-700">{label}</span>
      <div className="relative">
        <Icon
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600",
            isArabic ? "right-4" : "left-4",
          )}
        />
        {children}
      </div>
      {error ? <span className="text-sm font-semibold text-rose-600">{error}</span> : null}
    </label>
  );
}