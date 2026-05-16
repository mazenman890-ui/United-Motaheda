/**
 * Zod schema mirroring `validateCheckoutInput` for RHF/Zod integration.
 * Co-exists with the imperative validator — use whichever fits the surface.
 */

import { z } from "zod";

const PHONE_REGEX = /^01[0125]\d{8}$/;

export function checkoutFormSchema(lang: "ar" | "en") {
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  return z.object({
    fullName: z
      .string()
      .trim()
      .min(3, t("يرجى إدخال الاسم الكامل بشكل صحيح.", "Please enter a valid full name.")),
    phone: z
      .string()
      .transform((v) => v.replace(/\D/g, "").slice(0, 11))
      .pipe(
        z
          .string()
          .regex(
            PHONE_REGEX,
            t(
              "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01.",
              "Please enter a valid Egyptian mobile number starting with 01.",
            ),
          ),
      ),
    city: z.string().trim().min(1, t("يرجى اختيار المدينة والمنطقة.", "Please select a city and region.")),
    streetName: z
      .string()
      .trim()
      .min(3, t("يرجى إدخال اسم الشارع.", "Please enter the main street or address line.")),
    buildingNumber: z.string().trim().min(1, t("يرجى إدخال رقم العمارة.", "Please enter the building number.")),
    floor: z.string().trim().max(20, t("قيمة الدور طويلة جداً.", "Floor value is too long.")).optional().default(""),
    apartmentNumber: z.string().trim().min(1, t("يرجى إدخال رقم الشقة.", "Please enter the apartment number.")),
    note: z.string().optional().default(""),
    promoCode: z.string().optional().default(""),
  });
}

export type CheckoutFormSchema = z.infer<ReturnType<typeof checkoutFormSchema>>;
