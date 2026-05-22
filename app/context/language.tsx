"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type Lang } from "../lib/translations";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof translations.en;
}

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("mogrank_lang") as Lang | null;
    if (saved === "en" || saved === "fr") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("mogrank_lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] as typeof translations.en }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === "en" ? "fr" : "en")}
      className={className}
      aria-label="Toggle language"
    >
      <span style={{ opacity: lang === "en" ? 1 : 0.3 }}>EN</span>
      <span style={{ opacity: 0.3, margin: "0 3px" }}>/</span>
      <span style={{ opacity: lang === "fr" ? 1 : 0.3 }}>FR</span>
    </button>
  );
}
