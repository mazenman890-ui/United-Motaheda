// config.ts – updated for cascading address selects and dynamic fee

import { publicEnv } from "./env";
import { calculateShipping, type ShippingAddressInput } from "./shippingConfig";

type Language = "ar" | "en";

export type CheckoutFormValues = {
  // Core fields
  fullName: string;
  phone: string;
  note: string;
  promoCode: string;

  // Legacy address fields (kept for compatibility)
  city: string;
  streetName: string;
  buildingNumber: string;
  floor: string;
  apartmentNumber: string;

  // New cascading address fields
  cityId: string;
  regionId: string;
  subRegionId: string;
  building: string;
  apartment: string;
};

export type CheckoutFieldName = keyof Pick<
  CheckoutFormValues,
  | "fullName"
  | "phone"
  | "city"
  | "streetName"
  | "buildingNumber"
  | "floor"
  | "apartmentNumber"
  | "cityId"
  | "regionId"
  | "subRegionId"
  | "building"
  | "apartment"
>;

export type CheckoutFieldErrors = Partial<Record<CheckoutFieldName, string>>;

const DELIVERY_RANGE_SEPARATOR = "\u2013";
const EGYPTIAN_PHONE_REGEX = /^01[0125]\d{8}$/;
const PROMO_CODE = "UNITED10";

export const DELIVERY_MIN_MINUTES = publicEnv.deliveryMinMinutes;
export const DELIVERY_MAX_MINUTES = publicEnv.deliveryMaxMinutes;
/** @deprecated Tax removed from checkout — kept for sheet/API backward compatibility at zero. */
export const ORDER_TAX_RATE = 0;

export const EMPTY_PRODUCTS_MESSAGE = {
  ar: "لا توجد منتجات متاحة الآن",
  en: "No products available right now",
} as const;

export function normalizeEgyptianPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function isValidEgyptianPhone(value: string) {
  return EGYPTIAN_PHONE_REGEX.test(normalizeEgyptianPhone(value));
}

export function isPromoCodeValid(value: string) {
  return value.trim().toUpperCase() === PROMO_CODE;
}

export function getDeliveryWindowLabel(lang: Language) {
  return lang === "ar"
    ? `${DELIVERY_MIN_MINUTES}${DELIVERY_RANGE_SEPARATOR}${DELIVERY_MAX_MINUTES} دقيقة`
    : `${DELIVERY_MIN_MINUTES}${DELIVERY_RANGE_SEPARATOR}${DELIVERY_MAX_MINUTES} minutes`;
}

export function getDeliveryWindowCompactLabel(lang: Language) {
  return lang === "ar"
    ? `${DELIVERY_MIN_MINUTES}${DELIVERY_RANGE_SEPARATOR}${DELIVERY_MAX_MINUTES} د`
    : `${DELIVERY_MIN_MINUTES}${DELIVERY_RANGE_SEPARATOR}${DELIVERY_MAX_MINUTES} min`;
}

export function getDeliveryWindowSentence(lang: Language) {
  return lang === "ar"
    ? `التوصيل داخل القاهرة خلال ${getDeliveryWindowLabel(lang)}`
    : `Delivery in Cairo within ${getDeliveryWindowLabel(lang)}`;
}

export function getServiceHoursLabel(_lang: Language) {
  return "24/7";
}

export function getServiceHoursSentence(lang: Language) {
  return lang === "ar"
    ? "الخدمة متاحة 24 ساعة طوال الأسبوع"
    : "Service available 24/7";
}

export function getProductsEmptyDescription(lang: Language) {
  return lang === "ar"
    ? "سيظهر هذا القسم بمجرد وصول منتجات جديدة من المصدر المباشر."
    : "This area will update as soon as new products arrive from the live source.";
}

/**
 * Calculate order pricing.
 * @param subtotal - Cart subtotal before discounts and fees.
 * @param promoApplied - Whether a valid promo code was applied.
 * @param shippingFeeOverride - Optional explicit shipping fee (from delivery quote).
 *   If not provided, falls back to `calculateShipping` (returns 0 when no zone match).
 */
export function getOrderPricing(
  subtotal: number,
  promoApplied = false,
  shippingFeeOverride?: number | null,
) {
  const normalizedSubtotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0;
  const discount = promoApplied ? normalizedSubtotal * 0.1 : 0;
  const tax = 0;

  let shipping: number;
  if (typeof shippingFeeOverride === "number" && shippingFeeOverride >= 0) {
    shipping = shippingFeeOverride;
  } else if (normalizedSubtotal > 0) {
    // Fallback to dynamic calculation via shippingConfig (if any)
    shipping = calculateShipping(null);
  } else {
    shipping = 0;
  }

  const total = normalizedSubtotal + shipping - discount;

  return {
    subtotal: Number(normalizedSubtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

export function validateCheckoutForm(
  values: Partial<CheckoutFormValues>,
  lang: Language,
): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};

  // Full name
  const fullName = values.fullName?.trim() ?? "";
  if (fullName.length < 3) {
    errors.fullName =
      lang === "ar"
        ? "يرجى إدخال الاسم الكامل بشكل صحيح."
        : "Please enter a valid full name.";
  }

  // Phone
  if (!values.phone || !isValidEgyptianPhone(values.phone)) {
    errors.phone =
      lang === "ar"
        ? "يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 01."
        : "Please enter a valid Egyptian mobile number starting with 01.";
  }

  // New cascading address fields (required)
  if (!values.cityId?.trim()) {
    errors.cityId =
      lang === "ar" ? "يرجى اختيار المدينة." : "Please select a city.";
  }

  if (!values.regionId?.trim()) {
    errors.regionId =
      lang === "ar" ? "يرجى اختيار المنطقة." : "Please select a region.";
  }

  if (!values.subRegionId?.trim()) {
    errors.subRegionId =
      lang === "ar"
        ? "يرجى اختيار المنطقة الفرعية."
        : "Please select a sub-region.";
  }

  const building = values.building?.trim() ?? "";
  if (building.length < 1) {
    errors.building =
      lang === "ar"
        ? "يرجى إدخال رقم العمارة."
        : "Please enter the building number.";
  }

  const apartment = values.apartment?.trim() ?? "";
  if (apartment.length < 1) {
    errors.apartment =
      lang === "ar"
        ? "يرجى إدخال رقم الشقة."
        : "Please enter the apartment number.";
  }

  // Optional floor validation
  const floor = values.floor?.trim() ?? "";
  if (floor.length > 20) {
    errors.floor =
      lang === "ar"
        ? "قيمة الدور طويلة جداً."
        : "Floor value is too long.";
  }

  return errors;
}

export function hasCheckoutErrors(errors: CheckoutFieldErrors) {
  return Object.values(errors).some(Boolean);
}

/**
 * Build a full address string from form values.
 * Prefers new cascading fields, falls back to legacy if needed.
 */
export function buildCheckoutAddress(values: Partial<CheckoutFormValues>): string {
  const floor = values.floor?.trim() || "";
  const floorLine = floor ? (floor) : null;

  const parts = [
    values.streetName?.trim() || "",
    values.buildingNumber?.trim() && `${values.buildingNumber.trim()}`,
    floorLine,
    values.apartmentNumber?.trim() && `${values.apartmentNumber.trim()}`,
    values.city?.trim() || "",
  ].filter(Boolean) as string[];

  return parts.join(" — ");
}

/**
 * Build a street line string (used for Supabase fallback).
 */
export function buildCheckoutStreetLine(values: Partial<CheckoutFormValues>): string {
  const floor = values.floor?.trim();
  return [
    values.streetName?.trim(),
    values.buildingNumber?.trim() && `Bld ${values.buildingNumber.trim()}`,
    floor && `Fl ${floor}`,
    values.apartmentNumber?.trim() && `Apt ${values.apartmentNumber.trim()}`,
  ]
    .filter(Boolean)
    .join(", ");
}