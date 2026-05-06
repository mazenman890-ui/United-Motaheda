import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "../i18n";
import type { TranslationKey } from "../i18n/translationData";

type Language = "ar" | "en";

type LanguageContextType = {
  lang: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function LanguageContextBridge({ children }: { children: ReactNode }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const lang: Language = i18nInstance.language.startsWith("ar") ? "ar" : "en";

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang === "ar" ? "ar" : "en";
    document.body.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("app_lang", lang);
  }, [lang]);

  const toggleLanguage = () => {
    void i18nInstance.changeLanguage(lang === "ar" ? "en" : "ar");
  };

  const translate = useMemo(
    () => (key: TranslationKey) => t(key) as string,
    [t],
  );

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContextBridge>{children}</LanguageContextBridge>
    </I18nextProvider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
