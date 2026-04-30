"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/i18n";

export function HtmlLang() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
