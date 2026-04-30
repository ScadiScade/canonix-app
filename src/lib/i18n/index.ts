"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import type { Locale } from "./types";
import { ru } from "./ru";
import { en } from "./en";
import type { TranslationKey } from "./ru";

const STORAGE_KEY = "canonix-locale";

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { ru, en };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "ru",
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ru");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (saved === "ru" || saved === "en")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>): string => {
    let str = dictionaries[locale]?.[key] || dictionaries.ru[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return str;
  }, [locale]);

  return React.createElement(LocaleContext.Provider, { value: { locale, setLocale, t } }, children);
}

export function useLocale() {
  return useContext(LocaleContext);
}

export type { TranslationKey };
