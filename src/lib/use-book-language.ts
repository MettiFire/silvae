import { useEffect, useState } from "react";
import { resolveBookLanguage } from "./book-language";
export function useBookLanguage(preference: unknown) {
  const [locale, setLocale] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setLocale(navigator.language || "en");
    update();
    window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);
  return {
    language: resolveBookLanguage(preference, locale ?? "en"),
    locale,
    ready: locale !== null,
  };
}
