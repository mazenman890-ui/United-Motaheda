/**
 * Zod schema mirroring `validateCheckoutInput` for RHF/Zod integration.
 *
 * Design note: every field is `z.string()` so the inferred type stays a
 * flat record of required strings — matches `CheckoutFormInput` and plays
 * nicely with React Hook Form's controlled inputs (which always pass
 * strings). "Optional" fields validate as empty-string-OK via `.refine()`.
 */

import { z } from "zod";

const PHONE_REGEX = /^01[0125]\d{8}$/;

function tr(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function checkoutFormSchema(lang: "ar" | "en") {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  return z.object({
    fullName: z
      .string()
      .refine(
        (v) => v.trim().length >= 3,
        t("يرجى إدخال الاسم الكامل بشكل صحيح.", "Please enter a valid full name."),
      ),
    phone: z
      .string()
      .refine(
        (v) => PHONE_REGEX.test(tr(v)),
        t(
          "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01.",
          "Please enter a valid Egyptian mobile number starting with 01.",
        ),
      ),
    city: z
      .string()
      .refine(
        (v) => v.trim().length > 0,
        t("يرجى اختيار المدينة والمنطقة.", "Please select a city and region."),
      ),
    streetName: z
      .string()
      .refine(
        (v) => v.trim().length >= 3,
        t("يرجى إدخال اسم الشارع.", "Please enter the main street or address line."),
      ),
    buildingNumber: z
      .string()
      .refine(
        (v) => v.trim().length > 0,
        t("يرجى إدخال رقم العمارة.", "Please enter the building number."),
      ),
    floor: z
      .string()
      .refine(
        (v) => v.trim().length <= 20,
        t("قيمة الدور طويلة جداً.", "Floor value is too long."),
      ),
    apartmentNumber: z
      .string()
      .refine(
        (v) => v.trim().length > 0,
        t("يرجى إدخال رقم الشقة.", "Please enter the apartment number."),
      ),
    note: z.string(),
    promoCode: z.string(),
  });
}

export type CheckoutFormSchema = z.infer<ReturnType<typeof checkoutFormSchema>>;
