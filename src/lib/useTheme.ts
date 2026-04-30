"use client";

import { useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "canonix-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored || "system";
    setThemeState(initial);
    const r = initial === "system" ? getSystemTheme() : initial;
    setResolved(r);
    applyTheme(initial);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const r = getSystemTheme();
        setResolved(r);
        applyTheme("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    const r = t === "system" ? getSystemTheme() : t;
    setResolved(r);
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  return { theme, resolved, setTheme };
}
