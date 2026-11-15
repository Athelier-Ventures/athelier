"use client";
import { useCallback, useEffect, useState } from "react";
import type { Language } from "./brand";
const KEY = "athelier:language:v1";
const CHANGED = "athelier-language-changed";
export function useSiteLanguage() {
  const [language, setLanguage] = useState<Language>("es");
  useEffect(() => {
    const sync = () => {
      const next = window.localStorage.getItem(KEY) === "en" ? "en" : "es";
      setLanguage(next);
      document.documentElement.lang = next === "en" ? "en" : "es-MX";
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGED, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(CHANGED, sync); };
  }, []);
  const changeLanguage = useCallback((next: Language) => {
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event(CHANGED));
    setLanguage(next);
    document.documentElement.lang = next === "en" ? "en" : "es-MX";
  }, []);
  return { language, changeLanguage };
}
