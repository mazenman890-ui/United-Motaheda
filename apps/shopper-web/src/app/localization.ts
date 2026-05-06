import type { CatalogCategory, CatalogProduct } from "./catalog";

const warnedKeys = new Set<string>();

function warnMissingTranslationOnce(key: string, message: string) {
  if (warnedKeys.has(key)) {
    return;
  }
  warnedKeys.add(key);

  if (import.meta.env.DEV && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("united:i18n-warning", {
        detail: {
          key,
          message,
        },
      }),
    );
  }
}

export function getLocalizedProductName(product: CatalogProduct, lang: "ar" | "en") {
  const nameAr = (product.nameAr || product.name || "").trim();
  const nameEn = (product.nameEn || "").trim();

  if (lang === "ar") {
    if (!nameAr && nameEn) {
      warnMissingTranslationOnce(
        `product-name-ar:${product.id}`,
        `[i18n] Missing Arabic product name for ${product.id}; using English fallback.`,
      );
      return nameEn;
    }
    return nameAr || nameEn || product.id;
  }

  if (!nameEn && nameAr) {
    warnMissingTranslationOnce(
      `product-name-en:${product.id}`,
      `[i18n] Missing English product name for ${product.id}; using Arabic fallback.`,
    );
    return nameAr;
  }
  return nameEn || nameAr || product.id;
}

export function getLocalizedCategoryName(category: CatalogCategory, lang: "ar" | "en") {
  const nameAr = (category.name || "").trim();
  const nameEn = (category.nameEn || "").trim();

  if (lang === "ar") {
    if (!nameAr && nameEn) {
      warnMissingTranslationOnce(
        `category-name-ar:${category.id}`,
        `[i18n] Missing Arabic category name for ${category.id}; using English fallback.`,
      );
      return nameEn;
    }
    return nameAr || nameEn || category.id;
  }

  if (!nameEn && nameAr) {
    warnMissingTranslationOnce(
      `category-name-en:${category.id}`,
      `[i18n] Missing English category name for ${category.id}; using Arabic fallback.`,
    );
    return nameAr;
  }
  return nameEn || nameAr || category.id;
}
