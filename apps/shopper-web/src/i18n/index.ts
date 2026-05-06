import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { normalizeTextEncoding } from "../utils/textEncoding";
import { rawTranslationBundles } from "./translationData";

const resources = normalizeTextEncoding(rawTranslationBundles);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: resources.ar },
      en: { translation: resources.en },
    },
    fallbackLng: "ar",
    supportedLngs: ["ar", "en"],
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "app_lang",
    },
  });

export default i18n;
