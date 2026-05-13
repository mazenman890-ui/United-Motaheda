import { I18nManager } from "react-native";

export function formatPrice(amount: number, lang: "ar" | "en" = "ar"): string {
  const formatted = amount.toFixed(2);
  return lang === "ar" ? `${formatted} ج.م` : `EGP ${formatted}`;
}

export function formatCount(count: number, lang: "ar" | "en" = "ar"): string {
  if (lang === "ar") {
    if (count === 0) return "لا يوجد";
    if (count === 1) return "منتج واحد";
    if (count === 2) return "منتجان";
    if (count <= 10) return `${count} منتجات`;
    return `${count} منتج`;
  }
  return count === 1 ? "1 product" : `${count} products`;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max - 1) + "…";
}

export function isRtl(): boolean {
  return I18nManager.isRTL;
}

export function localeName(nameAr?: string, nameEn?: string, lang: "ar" | "en" = "ar"): string {
  if (lang === "ar") return nameAr ?? nameEn ?? "";
  return nameEn ?? nameAr ?? "";
}
