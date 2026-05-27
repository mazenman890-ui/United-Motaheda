/**
 * LanguageProvider — exposes i18n + language switch to the tree.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  getStoredLanguage,
  initI18n,
  setAppLanguage,
  type AppLanguage,
} from "./index";

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  initI18n();
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<AppLanguage>(getStoredLanguage);

  useEffect(() => {
    const onChange = (lng: string) => {
      setLanguageState(lng === "en" ? "en" : "ar");
    };
    i18n.on("languageChanged", onChange);
    return () => { i18n.off("languageChanged", onChange); };
  }, [i18n]);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    await setAppLanguage(lang);
    setLanguageState(lang);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isRtl: language === "ar",
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useAppLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useAppLanguage must be used within LanguageProvider");
  }
  return ctx;
}
