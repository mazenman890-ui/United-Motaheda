import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2, LockKeyhole, LogIn, Mail } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../contexts/LanguageContext";
import { cn } from "../components/UI";
import { createLoginSchema, type LoginFormValues } from "./authSchemas";

type LoginFormProps = {
  defaultEmail?: string;
  from?: string;
  registrationComplete?: boolean;
};

export default function LoginForm({
  defaultEmail = "",
  from = "",
  registrationComplete = false,
}: LoginFormProps) {
  const { login } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const isArabic = lang === "ar";
  const schema = useMemo(() => createLoginSchema(lang), [lang]);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: defaultEmail,
      password: "",
    },
  });

  useEffect(() => {
    form.reset({
      email: defaultEmail,
      password: "",
    });
  }, [defaultEmail, form]);

  const isSubmitting = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await login({
        email: values.email,
        password: values.password,
      });
      toast.success(
        isArabic
          ? "تم تسجيل الدخول بنجاح."
          : "Signed in successfully.",
      );
      // Navigate to the page the user originally tried to visit, or to the
      // role-appropriate default. Without this navigate() call the user stays
      // on the login page (AuthLayout) after a successful sign-in — which was
      // the "stuck on Secure Session" symptom.
      const isStaff =
        result.user?.role === "admin" ||
        result.user?.role === "manager" ||
        result.user?.role === "pharmacist" ||
        result.user?.role === "driver";
      const destination = from.trim() || (isStaff ? "/ops" : "/");
      navigate(destination, { replace: true });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : isArabic
          ? "تعذر تسجيل الدخول الآن."
          : "Unable to sign in right now.";

      form.setError("root", { message });
      toast.error(message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="rounded-[1.6rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
        {isArabic
          ? "استخدم البريد الإلكتروني المرتبط بحسابك للعودة إلى التسوق أو متابعة الطلبات."
          : "Use the email linked to your account to continue shopping or review your orders."}
      </div>

      {defaultEmail ? (
        <div
          className={cn(
            "rounded-[1.6rem] px-4 py-3 text-sm font-semibold",
            registrationComplete
              ? "border border-emerald-200 bg-emerald-50/90 text-emerald-800"
              : "border border-slate-200 bg-slate-50/80 text-slate-900",
          )}
        >
          {registrationComplete
            ? isArabic
              ? "تم إنشاء الحساب. تحقق من بريدك الإلكتروني ثم سجل الدخول هنا باستخدام نفس العنوان."
              : "Your account is ready. Check your email, then sign in here with the same address."
            : isArabic
              ? "إذا كنت أكدت البريد الإلكتروني للتو، يمكنك المتابعة باستخدام نفس البريد هنا."
              : "If you just confirmed your email, continue here with the same address."}
        </div>
      ) : null}

      {rootError ? (
        <div className="rounded-[1.6rem] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-700">
          {rootError}
        </div>
      ) : null}

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
          className={cn(
            "h-14 w-full rounded-[1.6rem] border bg-white/90 ps-12 pe-4 text-sm font-semibold text-slate-950 outline-none transition-all placeholder:text-slate-400",
            form.formState.errors.email
              ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              : "border-slate-200 focus:border-teal-400 focus:ring-4 focus:ring-teal-100",
          )}
          {...form.register("email")}
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
          autoComplete="current-password"
          dir="ltr"
          placeholder={isArabic ? "أدخل كلمة المرور" : "Enter your password"}
          className={cn(
            "h-14 w-full rounded-[1.6rem] border bg-white/90 ps-12 pe-4 text-sm font-semibold text-slate-950 outline-none transition-all placeholder:text-slate-400",
            form.formState.errors.password
              ? "border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              : "border-slate-200 focus:border-teal-400 focus:ring-4 focus:ring-teal-100",
          )}
          {...form.register("password")}
        />
      </AuthField>

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
            <LogIn className="h-4 w-4" />
            {isArabic ? "تسجيل الدخول" : "Sign in"}
          </>
        )}
      </motion.button>

      <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm font-semibold text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {isArabic ? "هل تحتاج إلى حساب جديد؟" : "Need a new customer account?"}
          </span>
          <Link
            to="/login?tab=register"
            state={from ? { from } : undefined}
            className="font-black text-slate-600 transition-colors hover:text-slate-600"
          >
            {isArabic ? "إنشاء حساب" : "Create account"}
          </Link>
        </div>
      </div>
    </form>
  );
}

function AuthField({
  children,
  error,
  icon: Icon,
  isArabic,
  label,
}: {
  children: ReactNode;
  error?: string;
  icon: typeof Mail;
  isArabic: boolean;
  label: string;
}) {
  return (
    <label className="grid gap-2">
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