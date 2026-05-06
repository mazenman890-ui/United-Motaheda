import type { CheckoutFieldErrors, CheckoutFieldName } from "../config";
import type { CheckoutFormInput } from "./types";

const EGYPTIAN_PHONE_REGEX = /^01[0125]\d{8}$/;

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function validateCheckoutInput(
  values: Partial<CheckoutFormInput>,
  lang: "ar" | "en",
): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  const fullName = values.fullName?.trim() ?? "";
  const phone = normalizePhone(values.phone ?? "");
  const city = values.city?.trim() ?? "";
  const streetName = values.streetName?.trim() ?? "";
  const buildingNumber = values.buildingNumber?.trim() ?? "";
  const apartmentNumber = values.apartmentNumber?.trim() ?? "";
  const floor = values.floor?.trim() ?? "";

  if (fullName.length < 3) {
    errors.fullName =
      lang === "ar"
        ? "يرجى إدخال الاسم الكامل بشكل صحيح."
        : "Please enter a valid full name.";
  }

  if (!EGYPTIAN_PHONE_REGEX.test(phone)) {
    errors.phone =
      lang === "ar"
        ? "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01."
        : "Please enter a valid Egyptian mobile number starting with 01.";
  }

  if (!city) {
    errors.city =
      lang === "ar" ? "يرجى اختيار المدينة والمنطقة." : "Please select a city and region.";
  }

  if (streetName.length < 3) {
    errors.streetName =
      lang === "ar"
        ? "يرجى إدخال اسم الشارع أو الوصف الرئيسي للعنوان."
        : "Please enter the main street or address line.";
  }

  if (!buildingNumber) {
    errors.buildingNumber =
      lang === "ar" ? "يرجى إدخال رقم العمارة." : "Please enter the building number.";
  }

  if (!apartmentNumber) {
    errors.apartmentNumber =
      lang === "ar" ? "يرجى إدخال رقم الشقة." : "Please enter the apartment number.";
  }

  if (floor.length > 20) {
    errors.floor =
      lang === "ar" ? "قيمة الدور طويلة جداً." : "Floor value is too long.";
  }

  return errors;
}

export function hasCheckoutValidationErrors(errors: Partial<Record<CheckoutFieldName, string>>) {
  return Object.values(errors).some(Boolean);
}
